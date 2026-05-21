package com.ticketrush.features.payment.service;

import com.ticketrush.features.admin.notification.service.AdminNotificationHelper;
import com.ticketrush.features.auth.service.EmailService;
import com.ticketrush.features.event.entity.Event;
import com.ticketrush.features.event.entity.EventZone;
import com.ticketrush.features.event.entity.Seat;
import com.ticketrush.features.event.entity.SeatStatus;
import com.ticketrush.features.event.repository.EventRepository;
import com.ticketrush.features.event.repository.SeatRepository;
import com.ticketrush.features.event.service.MinioStorageService;
import com.ticketrush.features.event.service.PricingStrategyService;
import com.ticketrush.features.order.entity.OrderStatus;
import com.ticketrush.features.order.entity.TicketOrder;
import com.ticketrush.features.order.entity.TicketOrderItem;
import com.ticketrush.features.order.repository.TicketOrderRepository;
import com.ticketrush.features.payment.dto.PaymentOrderDto;
import com.ticketrush.features.payment.dto.SeatHoldResponseDto;
import com.ticketrush.features.payment.dto.SeatRealtimeUpdateDto;
import com.ticketrush.features.payment.dto.SeatReleaseResponseDto;
import com.ticketrush.features.payment.dto.VnPayCheckoutResponseDto;
import com.ticketrush.features.payment.dto.VnPayReturnResponseDto;
import com.ticketrush.features.payment.entity.PaymentStatus;
import com.ticketrush.features.user.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.UnsupportedEncodingException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PaymentService {

    @Value("${vnpay.expire-minutes:15}")
    private int vnpayExpireMinutes;
    @Value("${app.seats.max-hold-per-user:6}")
    private int maxHoldSeatsPerUser;

    private final EventRepository eventRepository;
    private final SeatRepository seatRepository;
    private final TicketOrderRepository ticketOrderRepository;
    private final MinioStorageService minioStorageService;
    private final SimpMessagingTemplate messagingTemplate;
    private final EmailTicketService emailTicketService;
    private final PricingStrategyService pricingStrategyService;
    private final VnPayService vnPayService;
    private final AdminNotificationHelper notificationHelper;
    private final EmailService emailService;

    public PaymentService(EventRepository eventRepository,
                          SeatRepository seatRepository,
                          TicketOrderRepository ticketOrderRepository,
                          MinioStorageService minioStorageService,
                          SimpMessagingTemplate messagingTemplate,
                          EmailTicketService emailTicketService,
                          PricingStrategyService pricingStrategyService,
                          VnPayService vnPayService,
                          AdminNotificationHelper notificationHelper,
                          EmailService emailService) {
        this.eventRepository = eventRepository;
        this.seatRepository = seatRepository;
        this.ticketOrderRepository = ticketOrderRepository;
        this.minioStorageService = minioStorageService;
        this.messagingTemplate = messagingTemplate;
        this.emailTicketService = emailTicketService;
        this.pricingStrategyService = pricingStrategyService;
        this.vnPayService = vnPayService;
        this.notificationHelper = notificationHelper;
        this.emailService = emailService;
    }

    @Transactional
    public PaymentOrderDto createCheckoutOrder(User user, Long eventId, List<Long> seatIds, MultipartFile paymentProofFile) {
        ensureBookingProfileCompleted(user);

        if (paymentProofFile == null || paymentProofFile.isEmpty()) {
            throw new IllegalArgumentException("Vui lÄ‚Â²ng tĂ¡ÂºÂ£i lÄ‚Âªn Ă¡ÂºÂ£nh chuyĂ¡Â»Æ’n khoĂ¡ÂºÂ£n Ă„â€˜Ă¡Â»Æ’ tiĂ¡ÂºÂ¿p tĂ¡Â»Â¥c");
        }

        CheckoutContext context = loadCheckoutContext(user, eventId, seatIds);
        Map<Long, BigDecimal> priceByZoneId = resolveDynamicPriceByZoneId(context.seats(), user.getId());

        TicketOrder order = createPendingOrder(user, context.event());
        order.setPaymentStatus(PaymentStatus.PENDING_REVIEW);
        order.setPaymentProofImageUrl(minioStorageService.uploadPaymentProof(paymentProofFile));

        for (Seat seat : context.seats()) {
            seat.setStatus(SeatStatus.SOLD);
            seat.setLockedByUserId(null);
            seat.setLockedUntil(null);
        }

        order.setTotalAmount(addOrderItems(order, context.seats(), priceByZoneId));
        seatRepository.saveAll(context.seats());
        publishSeatStatusAfterCommit(context.event().getId(), context.seats());

        TicketOrder saved = ticketOrderRepository.save(order);
        
        // Send notification to admin
        String userName = user.getUsername() != null ? user.getUsername() : user.getEmail();
        notificationHelper.notifyPendingPaymentSubmitted(saved.getId(), userName);
        
        return toDto(saved);
    }

    @Transactional
    public VnPayCheckoutResponseDto createVnPayCheckout(User user, Long eventId, List<Long> seatIds, String ipAddress) {
        ensureBookingProfileCompleted(user);

        CheckoutContext context = loadCheckoutContext(user, eventId, seatIds);
        Map<Long, BigDecimal> priceByZoneId = resolveDynamicPriceByZoneId(context.seats(), user.getId());
        LocalDateTime lockedUntil = LocalDateTime.now().plusMinutes(Math.max(1, vnpayExpireMinutes));

        for (Seat seat : context.seats()) {
            seat.setStatus(SeatStatus.LOCKED);
            seat.setLockedByUserId(user.getId());
            seat.setLockedUntil(lockedUntil);
        }

        TicketOrder order = createPendingOrder(user, context.event());
        order.setPaymentStatus(PaymentStatus.UNPAID);
        order.setTotalAmount(addOrderItems(order, context.seats(), priceByZoneId));

        seatRepository.saveAll(context.seats());
        publishSeatStatusAfterCommit(context.event().getId(), context.seats());

        TicketOrder saved = ticketOrderRepository.save(order);
        try {
            String paymentUrl = vnPayService.createPaymentUrl(saved, ipAddress);
            return new VnPayCheckoutResponseDto(
                    saved.getId(),
                    saved.getQueueId(),
                    saved.getTotalAmount(),
                    lockedUntil,
                    paymentUrl
            );
        } catch (UnsupportedEncodingException ex) {
            throw new IllegalStateException("KhÄ‚Â´ng thĂ¡Â»Æ’ tĂ¡ÂºÂ¡o liÄ‚Âªn kĂ¡ÂºÂ¿t thanh toÄ‚Â¡n VNPAY", ex);
        }
    }

    @Transactional
    public VnPayReturnResponseDto handleVnPayReturn(Map<String, String> responseParams) {
        Long orderId = parseOrderId(responseParams.get("vnp_TxnRef"));
        if (!vnPayService.verifyCallback(responseParams)) {
            return new VnPayReturnResponseDto(false, orderId, null, "ChĂ¡Â»Â¯ kÄ‚Â½ VNPAY khÄ‚Â´ng hĂ¡Â»Â£p lĂ¡Â»â€¡");
        }

        if (orderId == null) {
            return new VnPayReturnResponseDto(false, null, null, "ThiĂ¡ÂºÂ¿u mÄ‚Â£ Ă„â€˜Ă†Â¡n hÄ‚Â ng VNPAY");
        }

        TicketOrder order = ticketOrderRepository.findDetailByIdForUpdate(orderId)
                .orElseThrow(() -> new IllegalArgumentException("KhÄ‚Â´ng tÄ‚Â¬m thĂ¡ÂºÂ¥y Ă„â€˜Ă†Â¡n hÄ‚Â ng VNPAY"));

        if (order.getPaymentStatus() == PaymentStatus.APPROVED && order.getStatus() == OrderStatus.SUCCESS) {
            return new VnPayReturnResponseDto(true, order.getId(), order.getQueueId(), "Thanh toÄ‚Â¡n Ă„â€˜Ä‚Â£ Ă„â€˜Ă†Â°Ă¡Â»Â£c xÄ‚Â¡c nhĂ¡ÂºÂ­n trĂ†Â°Ă¡Â»â€ºc Ă„â€˜Ä‚Â³");
        }

        if (order.getPaymentStatus() == PaymentStatus.REJECTED || order.getStatus() == OrderStatus.FAILED) {
            return new VnPayReturnResponseDto(false, order.getId(), order.getQueueId(), "Ă„ÂĂ†Â¡n hÄ‚Â ng Ă„â€˜Ä‚Â£ Ă¡Â»Å¸ trĂ¡ÂºÂ¡ng thÄ‚Â¡i thĂ¡ÂºÂ¥t bĂ¡ÂºÂ¡i");
        }

        BigDecimal callbackAmount = parseCallbackAmount(responseParams.get("vnp_Amount"));
        if (callbackAmount == null || callbackAmount.compareTo(order.getTotalAmount()) != 0) {
            failOrderAndReleaseSeats(order, buildFailureNote(responseParams, "Sai lĂ¡Â»â€¡ch sĂ¡Â»â€˜ tiĂ¡Â»Ân thanh toÄ‚Â¡n"));
            return new VnPayReturnResponseDto(false, order.getId(), order.getQueueId(), "SĂ¡Â»â€˜ tiĂ¡Â»Ân phĂ¡ÂºÂ£n hĂ¡Â»â€œi tĂ¡Â»Â« VNPAY khÄ‚Â´ng khĂ¡Â»â€ºp");
        }

        if (vnPayService.isSuccessfulResponse(responseParams)) {
            if (!canConfirmVnPayOrder(order)) {
                failOrderAndReleaseSeats(order, "Giao dĂ¡Â»â€¹ch VNPAY thÄ‚Â nh cÄ‚Â´ng nhĂ†Â°ng ghĂ¡ÂºÂ¿ khÄ‚Â´ng cÄ‚Â²n Ă„â€˜Ă†Â°Ă¡Â»Â£c giĂ¡Â»Â¯ cho Ă„â€˜Ă†Â¡n hÄ‚Â ng");
                return new VnPayReturnResponseDto(false, order.getId(), order.getQueueId(), "Giao dĂ¡Â»â€¹ch thÄ‚Â nh cÄ‚Â´ng nhĂ†Â°ng ghĂ¡ÂºÂ¿ Ă„â€˜Ä‚Â£ hĂ¡ÂºÂ¿t thĂ¡Â»Âi gian giĂ¡Â»Â¯");
            }
            confirmOrderPayment(order, buildSuccessNote(responseParams));
            return new VnPayReturnResponseDto(true, order.getId(), order.getQueueId(), "Thanh toÄ‚Â¡n VNPAY thÄ‚Â nh cÄ‚Â´ng");
        }

        failOrderAndReleaseSeats(order, buildFailureNote(responseParams, "Thanh toÄ‚Â¡n VNPAY khÄ‚Â´ng thÄ‚Â nh cÄ‚Â´ng"));
        return new VnPayReturnResponseDto(false, order.getId(), order.getQueueId(), "Thanh toÄ‚Â¡n VNPAY thĂ¡ÂºÂ¥t bĂ¡ÂºÂ¡i");
    }

    @Transactional
    public SeatHoldResponseDto holdSeatsForCheckout(User user, Long eventId, List<Long> seatIds) {
        ensureBookingProfileCompleted(user);

        if (seatIds == null || seatIds.isEmpty()) {
            throw new IllegalArgumentException("Ban chua chon ghe de giu cho");
        }

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Su kien khong ton tai"));

        seatRepository.releaseExpiredLocksByEventId(event.getId(), LocalDateTime.now());

        List<Long> requestedSeatIds = normalizeSeatIds(seatIds);
        int normalizedMaxHoldSeats = Math.max(1, maxHoldSeatsPerUser);
        if (requestedSeatIds.size() > normalizedMaxHoldSeats) {
            throw new IllegalArgumentException("Ban chi duoc giu toi da " + normalizedMaxHoldSeats + " ghe trong mot lan.");
        }

        ensureNoDifferentActiveLockForUser(event.getId(), user.getId(), requestedSeatIds);
        List<Seat> seats = seatRepository.findAllByEventIdAndIdInForUpdate(eventId, requestedSeatIds);
        validateSeatCoverage(requestedSeatIds, seats);

        LocalDateTime now = LocalDateTime.now();
        int holdMinutes = Math.max(1, event.getSeatHoldMinutes());
        LocalDateTime lockedUntil = now.plusMinutes(holdMinutes);
        boolean allAlreadyLockedByCurrentUser = true;

        for (Seat seat : seats) {
            ensureSeatBelongsToEvent(event, seat);

            if (seat.getStatus() == SeatStatus.SOLD) {
                throw new IllegalArgumentException("Ghe " + seat.getSeatCode() + " da ban");
            }

            boolean lockedByAnotherUser = seat.getStatus() == SeatStatus.LOCKED
                    && !Objects.equals(seat.getLockedByUserId(), user.getId())
                    && (seat.getLockedUntil() == null || seat.getLockedUntil().isAfter(now));

            if (lockedByAnotherUser) {
                throw new IllegalArgumentException("Ghe " + seat.getSeatCode() + " dang duoc nguoi khac giu");
            }

            boolean lockedByCurrentUser = seat.getStatus() == SeatStatus.LOCKED
                    && Objects.equals(seat.getLockedByUserId(), user.getId())
                    && seat.getLockedUntil() != null
                    && seat.getLockedUntil().isAfter(now);
            if (!lockedByCurrentUser) {
                allAlreadyLockedByCurrentUser = false;
            }
        }

        if (allAlreadyLockedByCurrentUser) {
            LocalDateTime earliestLockedUntil = seats.stream()
                    .map(Seat::getLockedUntil)
                    .filter(Objects::nonNull)
                    .min(LocalDateTime::compareTo)
                    .orElse(lockedUntil);
            int remainingHoldMinutes = (int) Math.max(1L, java.time.Duration.between(now, earliestLockedUntil).toMinutes());
            List<String> seatCodes = seats.stream().map(Seat::getSeatCode).toList();
            return new SeatHoldResponseDto(event.getId(), seatCodes, earliestLockedUntil, remainingHoldMinutes);
        }

        for (Seat seat : seats) {
            seat.setStatus(SeatStatus.LOCKED);
            seat.setLockedByUserId(user.getId());
            seat.setLockedUntil(lockedUntil);
        }

        seatRepository.saveAll(seats);
        publishSeatStatusAfterCommit(event.getId(), seats);

        List<String> seatCodes = seats.stream().map(Seat::getSeatCode).toList();
        return new SeatHoldResponseDto(event.getId(), seatCodes, lockedUntil, holdMinutes);
    }

    @Transactional
    public SeatReleaseResponseDto releaseHeldSeats(User user, Long eventId, List<Long> seatIds) {
        if (seatIds == null || seatIds.isEmpty()) {
            throw new IllegalArgumentException("BĂ¡ÂºÂ¡n chĂ†Â°a chĂ¡Â»Ân ghĂ¡ÂºÂ¿ Ă„â€˜Ă¡Â»Æ’ xÄ‚Â³a giĂ¡Â»Â¯ chĂ¡Â»â€”");
        }

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("SĂ¡Â»Â± kiĂ¡Â»â€¡n khÄ‚Â´ng tĂ¡Â»â€œn tĂ¡ÂºÂ¡i"));

        List<Long> requestedSeatIds = normalizeSeatIds(seatIds);
        List<Seat> seats = seatRepository.findAllByEventIdAndIdInForUpdate(eventId, requestedSeatIds);
        validateSeatCoverage(requestedSeatIds, seats);

        List<String> releasedSeatCodes = new ArrayList<>();
        for (Seat seat : seats) {
            ensureSeatBelongsToEvent(event, seat);

            if (seat.getStatus() == SeatStatus.LOCKED && Objects.equals(seat.getLockedByUserId(), user.getId())) {
                seat.setStatus(SeatStatus.AVAILABLE);
                seat.setLockedByUserId(null);
                seat.setLockedUntil(null);
                releasedSeatCodes.add(seat.getSeatCode());
            }
        }

        seatRepository.saveAll(seats);
        publishSeatStatusAfterCommit(event.getId(), seats);

        return new SeatReleaseResponseDto(event.getId(), releasedSeatCodes);
    }

    @Transactional(readOnly = true)
    public List<PaymentOrderDto> getMyOrders(User user) {
        return ticketOrderRepository.findAllByUserIdWithDetails(user.getId())
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PaymentOrderDto> getPendingPaymentOrders() {
        return ticketOrderRepository.findAllByPaymentStatusWithDetails(PaymentStatus.PENDING_REVIEW)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PaymentOrderDto> getExpiredPendingRefundOrders() {
        return ticketOrderRepository.findAllExpiredPendingRefundReadyForTransferWithDetails()
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public PaymentOrderDto submitRefundBankInfo(User user, Long orderId, String bankName, String bankAccountNumber, String bankAccountHolder) {
        TicketOrder order = ticketOrderRepository.findDetailByIdForUpdate(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay don hang"));

        if (!Objects.equals(order.getUser().getId(), user.getId())) {
            throw new IllegalArgumentException("Ban khong co quyen cap nhat don hang nay");
        }
        if (order.getPaymentStatus() != PaymentStatus.EXPIRED_PENDING_REFUND) {
            throw new IllegalArgumentException("Chi don qua han duyet moi duoc nhap thong tin nhan hoan tien");
        }

        order.setRefundBankName(requireRefundValue(bankName, "Vui long nhap ten ngan hang"));
        order.setRefundBankAccountNumber(requireRefundValue(bankAccountNumber, "Vui long nhap so tai khoan"));
        order.setRefundBankAccountHolder(requireRefundValue(bankAccountHolder, "Vui long nhap ten chu tai khoan"));
        order.setPaymentNote("Khach da cung cap thong tin tai khoan nhan hoan tien.");
        return toDto(ticketOrderRepository.save(order));
    }

    @Transactional
    public PaymentOrderDto approvePayment(Long orderId, String note) {
        TicketOrder order = ticketOrderRepository.findDetailByIdForUpdate(orderId)
                .orElseThrow(() -> new IllegalArgumentException("KhÄ‚Â´ng tÄ‚Â¬m thĂ¡ÂºÂ¥y Ă„â€˜Ă†Â¡n hÄ‚Â ng"));

        if (order.getPaymentStatus() == PaymentStatus.EXPIRED_PENDING_REFUND) {
            throw new IllegalArgumentException("Ă„ÂĂ†Â¡n hÄ‚Â ng Ă„â€˜Ä‚Â£ quÄ‚Â¡ hĂ¡ÂºÂ¡n duyĂ¡Â»â€¡t vÄ‚Â  chĂ¡Â»â€° cÄ‚Â³ thĂ¡Â»Æ’ xĂ¡Â»Â­ lÄ‚Â½ hoÄ‚Â n tiĂ¡Â»Ân");
        }
        if (order.getPaymentStatus() == PaymentStatus.REFUNDED) {
            throw new IllegalArgumentException("Ă„ÂĂ†Â¡n hÄ‚Â ng Ă„â€˜Ä‚Â£ Ă„â€˜Ă†Â°Ă¡Â»Â£c hoÄ‚Â n tiĂ¡Â»Ân");
        }
        if (order.getPaymentStatus() != PaymentStatus.PENDING_REVIEW) {
            throw new IllegalArgumentException("Ă„ÂĂ†Â¡n hÄ‚Â ng khÄ‚Â´ng Ă¡Â»Å¸ trĂ¡ÂºÂ¡ng thÄ‚Â¡i chĂ¡Â»Â duyĂ¡Â»â€¡t");
        }

        confirmOrderPayment(order, cleanNote(note));
        return toDto(order);
    }

    @Transactional
    public PaymentOrderDto rejectPayment(Long orderId, String note) {
        TicketOrder order = ticketOrderRepository.findDetailByIdForUpdate(orderId)
                .orElseThrow(() -> new IllegalArgumentException("KhÄ‚Â´ng tÄ‚Â¬m thĂ¡ÂºÂ¥y Ă„â€˜Ă†Â¡n hÄ‚Â ng"));

        if (order.getPaymentStatus() != PaymentStatus.PENDING_REVIEW) {
            throw new IllegalArgumentException("Ă„ÂĂ†Â¡n hÄ‚Â ng khÄ‚Â´ng Ă¡Â»Å¸ trĂ¡ÂºÂ¡ng thÄ‚Â¡i chĂ¡Â»Â duyĂ¡Â»â€¡t");
        }

        failOrderAndReleaseSeats(order, cleanNote(note));
        return toDto(order);
    }

    @Transactional
    public PaymentOrderDto confirmRefund(Long orderId, String note) {
        TicketOrder order = ticketOrderRepository.findDetailByIdForUpdate(orderId)
                .orElseThrow(() -> new IllegalArgumentException("KhÄ‚Â´ng tÄ‚Â¬m thĂ¡ÂºÂ¥y Ă„â€˜Ă†Â¡n hÄ‚Â ng"));

        if (order.getPaymentStatus() != PaymentStatus.EXPIRED_PENDING_REFUND) {
            throw new IllegalArgumentException("ChĂ¡Â»â€° Ă„â€˜Ă†Â¡n quÄ‚Â¡ hĂ¡ÂºÂ¡n chĂ¡Â»Â hoÄ‚Â n tiĂ¡Â»Ân mĂ¡Â»â€ºi Ă„â€˜Ă†Â°Ă¡Â»Â£c xÄ‚Â¡c nhĂ¡ÂºÂ­n hoÄ‚Â n tiĂ¡Â»Ân");
        }

        releaseOrderSeats(order);
        order.setStatus(OrderStatus.FAILED);
        order.setPaymentStatus(PaymentStatus.REFUNDED);
        order.setPaymentReviewedAt(LocalDateTime.now());
        order.setPaymentNote(cleanNote(note) == null ? "Ă„ÂÄ‚Â£ hoÄ‚Â n tiĂ¡Â»Ân 100% cho khÄ‚Â¡ch hÄ‚Â ng" : cleanNote(note));

        TicketOrder saved = ticketOrderRepository.save(order);
        sendRefundEmailAfterCommit(saved);
        return toDto(saved);
    }

    @Transactional
    public int markExpiredPendingRefundOrders(LocalDateTime cutoff) {
        List<TicketOrder> orders = ticketOrderRepository.findExpiredPendingReviewOrdersForUpdate(cutoff);
        for (TicketOrder order : orders) {
            releaseOrderSeats(order);
            order.setStatus(OrderStatus.FAILED);
            order.setPaymentStatus(PaymentStatus.EXPIRED_PENDING_REFUND);
            order.setPaymentReviewedAt(LocalDateTime.now());
            order.setPaymentNote("QuÄ‚Â¡ hĂ¡ÂºÂ¡n duyĂ¡Â»â€¡t trĂ†Â°Ă¡Â»â€ºc thĂ¡Â»Âi Ă„â€˜iĂ¡Â»Æ’m sĂ¡Â»Â± kiĂ¡Â»â€¡n. ChĂ¡Â»Â hoÄ‚Â n tiĂ¡Â»Ân 100%.");
            order.setRefundBankName(null);
            order.setRefundBankAccountNumber(null);
            order.setRefundBankAccountHolder(null);
            sendExpiredPendingRefundEmailAfterCommit(order);
        }
        ticketOrderRepository.saveAll(orders);
        return orders.size();
    }

    private CheckoutContext loadCheckoutContext(User user, Long eventId, List<Long> seatIds) {
        if (seatIds == null || seatIds.isEmpty()) {
            throw new IllegalArgumentException("BĂ¡ÂºÂ¡n chĂ†Â°a chĂ¡Â»Ân ghĂ¡ÂºÂ¿ Ă„â€˜Ă¡Â»Æ’ thanh toÄ‚Â¡n");
        }

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("SĂ¡Â»Â± kiĂ¡Â»â€¡n khÄ‚Â´ng tĂ¡Â»â€œn tĂ¡ÂºÂ¡i"));

        seatRepository.releaseExpiredLocksByEventId(event.getId(), LocalDateTime.now());

        List<Long> requestedSeatIds = normalizeSeatIds(seatIds);
        ensureNoDifferentActiveLockForUser(event.getId(), user.getId(), requestedSeatIds);
        List<Seat> seats = seatRepository.findAllByEventIdAndIdInForUpdate(eventId, requestedSeatIds);
        validateSeatCoverage(requestedSeatIds, seats);

        LocalDateTime now = LocalDateTime.now();
        for (Seat seat : seats) {
            ensureSeatBelongsToEvent(event, seat);
            boolean available = seat.getStatus() == SeatStatus.AVAILABLE;
            boolean lockedByCurrentUser = seat.getStatus() == SeatStatus.LOCKED
                    && Objects.equals(seat.getLockedByUserId(), user.getId())
                    && (seat.getLockedUntil() == null || seat.getLockedUntil().isAfter(now));

            if (!available && !lockedByCurrentUser) {
                throw new IllegalArgumentException("GhĂ¡ÂºÂ¿ " + seat.getSeatCode() + " khÄ‚Â´ng cÄ‚Â²n khĂ¡ÂºÂ£ dĂ¡Â»Â¥ng");
            }
        }

        return new CheckoutContext(event, seats);
    }

    private List<Long> normalizeSeatIds(List<Long> seatIds) {
        List<Long> requestedSeatIds = seatIds.stream()
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();

        if (requestedSeatIds.isEmpty()) {
            throw new IllegalArgumentException("Danh sÄ‚Â¡ch ghĂ¡ÂºÂ¿ khÄ‚Â´ng hĂ¡Â»Â£p lĂ¡Â»â€¡");
        }
        return requestedSeatIds;
    }

    private void ensureNoDifferentActiveLockForUser(Long eventId, Long userId, List<Long> requestedSeatIds) {
        List<Long> activeLockedSeatIds = seatRepository.findActiveLockedSeatIdsByEventIdAndUserId(
                eventId,
                userId,
                LocalDateTime.now()
        );

        if (activeLockedSeatIds.isEmpty()) {
            return;
        }

        Set<Long> activeSet = new HashSet<>(activeLockedSeatIds);
        Set<Long> requestedSet = new HashSet<>(requestedSeatIds);
        if (!activeSet.equals(requestedSet)) {
            throw new IllegalArgumentException(
                    "Báº¡n Ä‘ang cĂ³ gháº¿ giá»¯ chá»— cho sá»± kiá»‡n nĂ y. Vui lĂ²ng hoĂ n táº¥t hoáº·c há»§y Ä‘Æ¡n hiá»‡n táº¡i trÆ°á»›c khi chá»n gháº¿ khĂ¡c."
            );
        }
    }

    private TicketOrder createPendingOrder(User user, Event event) {
        TicketOrder order = new TicketOrder();
        order.setQueueId("PAY-" + UUID.randomUUID());
        order.setUser(user);
        order.setEvent(event);
        order.setStatus(OrderStatus.PENDING);
        order.setPaymentRequestedAt(LocalDateTime.now());
        return order;
    }

    private BigDecimal addOrderItems(TicketOrder order, List<Seat> seats, Map<Long, BigDecimal> priceByZoneId) {
        BigDecimal total = BigDecimal.ZERO;
        for (Seat seat : seats) {
            BigDecimal finalPrice = priceByZoneId.getOrDefault(seat.getZone().getId(), seat.getPrice());
            TicketOrderItem item = new TicketOrderItem();
            item.setSeat(seat);
            item.setPrice(finalPrice);
            order.addItem(item);
            total = total.add(finalPrice);
        }
        return total;
    }

    private Map<Long, BigDecimal> resolveDynamicPriceByZoneId(List<Seat> seats, Long userId) {
        Map<Long, List<Seat>> seatsByZoneId = seats.stream()
                .collect(Collectors.groupingBy(seat -> seat.getZone().getId(), LinkedHashMap::new, Collectors.toList()));

        Map<Long, BigDecimal> priceByZoneId = new HashMap<>();
        for (Map.Entry<Long, List<Seat>> entry : seatsByZoneId.entrySet()) {
            Long zoneId = entry.getKey();
            EventZone zone = entry.getValue().get(0).getZone();
            long currentLockedSeats = seatRepository.countByZoneIdAndStatus(zoneId, SeatStatus.LOCKED);
            long currentSoldSeats = seatRepository.countByZoneIdAndStatus(zoneId, SeatStatus.SOLD);
            long seatsLockedByCurrentUser = entry.getValue().stream()
                    .filter(seat -> seat.getStatus() == SeatStatus.LOCKED)
                    .filter(seat -> Objects.equals(seat.getLockedByUserId(), userId))
                    .count();

            BigDecimal dynamicPrice = pricingStrategyService.calculateDynamicPrice(
                    zone,
                    Math.max(0, currentLockedSeats - seatsLockedByCurrentUser),
                    currentSoldSeats
            );
            priceByZoneId.put(zoneId, dynamicPrice);
        }
        return priceByZoneId;
    }

    private void confirmOrderPayment(TicketOrder order, String note) {
        List<Seat> updatedSeats = new ArrayList<>();
        for (TicketOrderItem item : order.getItems()) {
            Seat seat = item.getSeat();
            if (seat.getStatus() != SeatStatus.SOLD
                    || seat.getLockedByUserId() != null
                    || seat.getLockedUntil() != null) {
                seat.setStatus(SeatStatus.SOLD);
                seat.setLockedByUserId(null);
                seat.setLockedUntil(null);
                updatedSeats.add(seat);
            }
        }

        order.setStatus(OrderStatus.SUCCESS);
        order.setPaymentStatus(PaymentStatus.APPROVED);
        order.setPaymentReviewedAt(LocalDateTime.now());
        order.setPaymentNote(cleanNote(note));

        if (!updatedSeats.isEmpty()) {
            seatRepository.saveAll(updatedSeats);
            publishSeatStatusAfterCommit(order.getEvent().getId(), updatedSeats);
        }

        ticketOrderRepository.save(order);
        sendTicketEmailAfterCommit(order);
    }

    private boolean canConfirmVnPayOrder(TicketOrder order) {
        for (TicketOrderItem item : order.getItems()) {
            Seat seat = item.getSeat();
            boolean lockedForCurrentUser = seat.getStatus() == SeatStatus.LOCKED
                    && Objects.equals(seat.getLockedByUserId(), order.getUser().getId())
                    && seat.getLockedUntil() != null
                    && seat.getLockedUntil().isAfter(LocalDateTime.now());

            if (!lockedForCurrentUser) {
                return false;
            }
        }
        return true;
    }

    private void failOrderAndReleaseSeats(TicketOrder order, String note) {
        releaseOrderSeats(order);

        order.setStatus(OrderStatus.FAILED);
        order.setPaymentStatus(PaymentStatus.REJECTED);
        order.setPaymentReviewedAt(LocalDateTime.now());
        order.setPaymentNote(cleanNote(note));

        ticketOrderRepository.save(order);
    }

    private void releaseOrderSeats(TicketOrder order) {
        List<Seat> updatedSeats = new ArrayList<>();
        for (TicketOrderItem item : order.getItems()) {
            Seat seat = item.getSeat();
            if (seat.getStatus() != SeatStatus.AVAILABLE
                    || seat.getLockedByUserId() != null
                    || seat.getLockedUntil() != null) {
                seat.setStatus(SeatStatus.AVAILABLE);
                seat.setLockedByUserId(null);
                seat.setLockedUntil(null);
                updatedSeats.add(seat);
            }
        }

        if (!updatedSeats.isEmpty()) {
            seatRepository.saveAll(updatedSeats);
            publishSeatStatusAfterCommit(order.getEvent().getId(), updatedSeats);
        }
    }

    private void sendTicketEmailAfterCommit(TicketOrder order) {
        Runnable sender = () -> emailTicketService.sendTicketConfirmation(order);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    sender.run();
                }
            });
            return;
        }
        sender.run();
    }

    private void sendRefundEmailAfterCommit(TicketOrder order) {
        Runnable sender = () -> {
            String toEmail = order.getUser().getEmail();
            if (toEmail == null || toEmail.isBlank()) {
                return;
            }
            emailService.sendVerificationCode(
                    toEmail,
                    "TicketRush - Xac nhan hoan tien don " + order.getQueueId(),
                    "Xin chao " + order.getUser().getUsername() + ",\n\n"
                            + "Don hang " + order.getQueueId() + " da duoc TicketRush xac nhan hoan tien thanh cong.\n"
                            + "So tien hoan: " + order.getTotalAmount().stripTrailingZeros().toPlainString() + " VND.\n\n"
                            + "TicketRush thanh that xin loi vi yeu cau thanh toan cua ban khong duoc xu ly kip truoc su kien.\n"
                            + "TicketRush"
            );
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    sender.run();
                }
            });
            return;
        }
        sender.run();
    }

    private void sendExpiredPendingRefundEmailAfterCommit(TicketOrder order) {
        Runnable sender = () -> {
            String toEmail = order.getUser().getEmail();
            if (toEmail == null || toEmail.isBlank()) {
                return;
            }
            emailService.sendVerificationCode(
                    toEmail,
                    "TicketRush - Xin loi va thong bao hoan tien don " + order.getQueueId(),
                    "Xin chao " + order.getUser().getUsername() + ",\n\n"
                            + "Ban to chuc rat tiec vi khong kip xu ly ve cua ban truoc gio dien.\n"
                            + "Don hang " + order.getQueueId() + " da duoc huy va chung toi se hoan lai 100% so tien ban da thanh toan.\n\n"
                            + "Vui long vao muc Lich su thanh toan de nhap thong tin ngan hang nhan hoan tien.\n"
                            + "TicketRush thanh that xin loi vi bat tien nay.\n\n"
                            + "TicketRush"
            );
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    sender.run();
                }
            });
            return;
        }
        sender.run();
    }

    private void ensureSeatBelongsToEvent(Event event, Seat seat) {
        if (!Objects.equals(seat.getEvent().getId(), event.getId())) {
            throw new IllegalArgumentException("CÄ‚Â³ ghĂ¡ÂºÂ¿ khÄ‚Â´ng thuĂ¡Â»â„¢c sĂ¡Â»Â± kiĂ¡Â»â€¡n Ă„â€˜Ä‚Â£ chĂ¡Â»Ân");
        }
    }

    private String buildSuccessNote(Map<String, String> responseParams) {
        String transactionNo = responseParams.get("vnp_TransactionNo");
        String bankCode = responseParams.get("vnp_BankCode");
        String payDate = responseParams.get("vnp_PayDate");
        List<String> details = new ArrayList<>();
        if (transactionNo != null && !transactionNo.isBlank()) {
            details.add("VNPAY transaction " + transactionNo);
        }
        if (bankCode != null && !bankCode.isBlank()) {
            details.add("bank " + bankCode);
        }
        if (payDate != null && !payDate.isBlank()) {
            details.add("paidAt " + payDate);
        }
        return details.isEmpty() ? "Thanh toÄ‚Â¡n VNPAY thÄ‚Â nh cÄ‚Â´ng" : String.join(" | ", details);
    }

    private String buildFailureNote(Map<String, String> responseParams, String fallbackMessage) {
        String responseCode = responseParams.get("vnp_ResponseCode");
        String transactionStatus = responseParams.get("vnp_TransactionStatus");
        List<String> details = new ArrayList<>();
        if (fallbackMessage != null && !fallbackMessage.isBlank()) {
            details.add(fallbackMessage);
        }
        if (responseCode != null && !responseCode.isBlank()) {
            details.add("responseCode=" + responseCode);
        }
        if (transactionStatus != null && !transactionStatus.isBlank()) {
            details.add("transactionStatus=" + transactionStatus);
        }
        return String.join(" | ", details);
    }

    private BigDecimal parseCallbackAmount(String rawAmount) {
        if (rawAmount == null || rawAmount.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(rawAmount).movePointLeft(2);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Long parseOrderId(String rawOrderId) {
        if (rawOrderId == null || rawOrderId.isBlank()) {
            return null;
        }
        try {
            return Long.valueOf(rawOrderId);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String cleanNote(String note) {
        if (note == null) {
            return null;
        }
        String trimmed = note.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String requireRefundValue(String value, String message) {
        String cleaned = cleanNote(value);
        if (cleaned == null) {
            throw new IllegalArgumentException(message);
        }
        return cleaned;
    }

    private void ensureBookingProfileCompleted(User user) {
        String fullName = user.getProfileText() == null ? "" : user.getProfileText().trim();
        String phoneNumber = user.getPhoneNumber() == null ? "" : user.getPhoneNumber().trim();

        if (fullName.isEmpty() || phoneNumber.isEmpty()) {
            throw new IllegalArgumentException("Vui lÄ‚Â²ng cĂ¡ÂºÂ­p nhĂ¡ÂºÂ­t hĂ¡Â»â€œ sĂ†Â¡ (hĂ¡Â»Â vÄ‚Â  tÄ‚Âªn, sĂ¡Â»â€˜ Ă„â€˜iĂ¡Â»â€¡n thoĂ¡ÂºÂ¡i) trĂ†Â°Ă¡Â»â€ºc khi Ă„â€˜Ă¡ÂºÂ·t vÄ‚Â©");
        }
    }

    private void validateSeatCoverage(List<Long> requestedSeatIds, List<Seat> loadedSeats) {
        Set<Long> requested = new HashSet<>(requestedSeatIds);
        Set<Long> loaded = loadedSeats.stream().map(Seat::getId).collect(Collectors.toSet());

        if (!loaded.containsAll(requested)) {
            throw new IllegalArgumentException("CÄ‚Â³ ghĂ¡ÂºÂ¿ khÄ‚Â´ng tĂ¡Â»â€œn tĂ¡ÂºÂ¡i trong hĂ¡Â»â€¡ thĂ¡Â»â€˜ng");
        }
    }

    private PaymentOrderDto toDto(TicketOrder order) {
        List<String> seatCodes = new ArrayList<>();
        for (TicketOrderItem item : order.getItems()) {
            seatCodes.add(item.getSeat().getSeatCode());
        }

        return new PaymentOrderDto(
                order.getId(),
                order.getQueueId(),
                order.getEvent().getId(),
                order.getEvent().getName(),
                order.getUser().getId(),
                order.getUser().getUsername(),
                order.getStatus(),
                order.getPaymentStatus(),
                order.getTotalAmount(),
                seatCodes,
                order.getPaymentNote(),
                order.getPaymentProofImageUrl(),
                order.getRefundBankName(),
                order.getRefundBankAccountNumber(),
                order.getRefundBankAccountHolder(),
                order.getPaymentRequestedAt(),
                order.getPaymentReviewedAt(),
                order.getCreatedAt()
        );
    }

    private void publishSeatStatusAfterCommit(Long eventId, List<Seat> seats) {
        if (eventId == null || seats == null || seats.isEmpty()) {
            return;
        }

        List<SeatRealtimeUpdateDto> updates = seats.stream()
                .map(seat -> new SeatRealtimeUpdateDto(
                        eventId,
                        seat.getId(),
                        seat.getSeatCode(),
                        seat.getStatus().name()
                ))
                .toList();

        Runnable sender = () -> {
            String topic = "/topic/event/" + eventId;
            for (SeatRealtimeUpdateDto update : updates) {
                messagingTemplate.convertAndSend(topic, update);
            }
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    sender.run();
                }
            });
            return;
        }

        sender.run();
    }

    private record CheckoutContext(Event event, List<Seat> seats) {
    }
}


