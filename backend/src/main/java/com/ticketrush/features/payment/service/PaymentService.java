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
            throw new IllegalArgumentException("Vui lòng tải lên ảnh chuyển khoản để tiếp tục");
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
            throw new IllegalStateException("Không thể tạo liên kết thanh toán VNPAY", ex);
        }
    }

    @Transactional
    public VnPayReturnResponseDto handleVnPayReturn(Map<String, String> responseParams) {
        Long orderId = parseOrderId(responseParams.get("vnp_TxnRef"));
        if (!vnPayService.verifyCallback(responseParams)) {
            return new VnPayReturnResponseDto(false, orderId, null, "Chữ ký VNPAY không hợp lệ");
        }

        if (orderId == null) {
            return new VnPayReturnResponseDto(false, null, null, "Thiếu mã đơn hàng VNPAY");
        }

        TicketOrder order = ticketOrderRepository.findDetailByIdForUpdate(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng VNPAY"));

        if (order.getPaymentStatus() == PaymentStatus.APPROVED && order.getStatus() == OrderStatus.SUCCESS) {
            return new VnPayReturnResponseDto(true, order.getId(), order.getQueueId(), "Thanh toán đã được xác nhận trước đó");
        }

        if (order.getPaymentStatus() == PaymentStatus.REJECTED || order.getStatus() == OrderStatus.FAILED) {
            return new VnPayReturnResponseDto(false, order.getId(), order.getQueueId(), "Đơn hàng đã ở trạng thái thất bại");
        }

        BigDecimal callbackAmount = parseCallbackAmount(responseParams.get("vnp_Amount"));
        if (callbackAmount == null || callbackAmount.compareTo(order.getTotalAmount()) != 0) {
            failOrderAndReleaseSeats(order, buildFailureNote(responseParams, "Sai lệch số tiền thanh toán"));
            return new VnPayReturnResponseDto(false, order.getId(), order.getQueueId(), "Số tiền phản hồi từ VNPAY không khớp");
        }

        if (vnPayService.isSuccessfulResponse(responseParams)) {
            if (!canConfirmVnPayOrder(order)) {
                failOrderAndReleaseSeats(order, "Giao dịch VNPAY thành công nhưng ghế không còn được giữ cho đơn hàng");
                return new VnPayReturnResponseDto(false, order.getId(), order.getQueueId(), "Giao dịch thành công nhưng ghế đã hết thời gian giữ");
            }
            confirmOrderPayment(order, buildSuccessNote(responseParams));
            return new VnPayReturnResponseDto(true, order.getId(), order.getQueueId(), "Thanh toán VNPAY thành công");
        }

        failOrderAndReleaseSeats(order, buildFailureNote(responseParams, "Thanh toán VNPAY không thành công"));
        return new VnPayReturnResponseDto(false, order.getId(), order.getQueueId(), "Thanh toán VNPAY thất bại");
    }

    @Transactional
    public SeatHoldResponseDto holdSeatsForCheckout(User user, Long eventId, List<Long> seatIds) {
        ensureBookingProfileCompleted(user);

        if (seatIds == null || seatIds.isEmpty()) {
            throw new IllegalArgumentException("Bạn chưa chọn ghế để giữ chỗ");
        }

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Sự kiện không tồn tại"));

        seatRepository.releaseExpiredLocksByEventId(event.getId(), LocalDateTime.now());

        List<Long> requestedSeatIds = normalizeSeatIds(seatIds);
        // Database row lock boundary: from this point until commit, concurrent
        // requests for the same seat must wait and re-check the committed state.
        List<Seat> seats = seatRepository.findAllByEventIdAndIdInForUpdate(eventId, requestedSeatIds);
        validateSeatCoverage(requestedSeatIds, seats);

        LocalDateTime now = LocalDateTime.now();
        int holdMinutes = Math.max(1, event.getSeatHoldMinutes());
        LocalDateTime lockedUntil = now.plusMinutes(holdMinutes);

        for (Seat seat : seats) {
            ensureSeatBelongsToEvent(event, seat);

            if (seat.getStatus() == SeatStatus.SOLD) {
                throw new IllegalArgumentException("Ghế " + seat.getSeatCode() + " đã bán");
            }

            boolean lockedByAnotherUser = seat.getStatus() == SeatStatus.LOCKED
                    && !Objects.equals(seat.getLockedByUserId(), user.getId())
                    && (seat.getLockedUntil() == null || seat.getLockedUntil().isAfter(now));

            if (lockedByAnotherUser) {
                throw new IllegalArgumentException("Ghế " + seat.getSeatCode() + " đang được người khác giữ");
            }

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
            throw new IllegalArgumentException("Bạn chưa chọn ghế để xóa giữ chỗ");
        }

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Sự kiện không tồn tại"));

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
        return ticketOrderRepository.findAllByPaymentStatusWithDetails(PaymentStatus.EXPIRED_PENDING_REFUND)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public PaymentOrderDto approvePayment(Long orderId, String note) {
        TicketOrder order = ticketOrderRepository.findDetailByIdForUpdate(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng"));

        if (order.getPaymentStatus() == PaymentStatus.EXPIRED_PENDING_REFUND) {
            throw new IllegalArgumentException("Đơn hàng đã quá hạn duyệt và chỉ có thể xử lý hoàn tiền");
        }
        if (order.getPaymentStatus() == PaymentStatus.REFUNDED) {
            throw new IllegalArgumentException("Đơn hàng đã được hoàn tiền");
        }
        if (order.getPaymentStatus() != PaymentStatus.PENDING_REVIEW) {
            throw new IllegalArgumentException("Đơn hàng không ở trạng thái chờ duyệt");
        }

        confirmOrderPayment(order, cleanNote(note));
        return toDto(order);
    }

    @Transactional
    public PaymentOrderDto rejectPayment(Long orderId, String note) {
        TicketOrder order = ticketOrderRepository.findDetailByIdForUpdate(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng"));

        if (order.getPaymentStatus() != PaymentStatus.PENDING_REVIEW) {
            throw new IllegalArgumentException("Đơn hàng không ở trạng thái chờ duyệt");
        }

        failOrderAndReleaseSeats(order, cleanNote(note));
        return toDto(order);
    }

    @Transactional
    public PaymentOrderDto confirmRefund(Long orderId, String note) {
        TicketOrder order = ticketOrderRepository.findDetailByIdForUpdate(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng"));

        if (order.getPaymentStatus() != PaymentStatus.EXPIRED_PENDING_REFUND) {
            throw new IllegalArgumentException("Chỉ đơn quá hạn chờ hoàn tiền mới được xác nhận hoàn tiền");
        }

        releaseOrderSeats(order);
        order.setStatus(OrderStatus.FAILED);
        order.setPaymentStatus(PaymentStatus.REFUNDED);
        order.setPaymentReviewedAt(LocalDateTime.now());
        order.setPaymentNote(cleanNote(note) == null ? "Đã hoàn tiền 100% cho khách hàng" : cleanNote(note));

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
            order.setPaymentNote("Quá hạn duyệt trước thời điểm sự kiện. Chờ hoàn tiền 100%.");
        }
        ticketOrderRepository.saveAll(orders);
        return orders.size();
    }

    private CheckoutContext loadCheckoutContext(User user, Long eventId, List<Long> seatIds) {
        if (seatIds == null || seatIds.isEmpty()) {
            throw new IllegalArgumentException("Bạn chưa chọn ghế để thanh toán");
        }

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Sự kiện không tồn tại"));

        seatRepository.releaseExpiredLocksByEventId(event.getId(), LocalDateTime.now());

        List<Long> requestedSeatIds = normalizeSeatIds(seatIds);
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
                throw new IllegalArgumentException("Ghế " + seat.getSeatCode() + " không còn khả dụng");
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
            throw new IllegalArgumentException("Danh sách ghế không hợp lệ");
        }
        return requestedSeatIds;
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

    private void ensureSeatBelongsToEvent(Event event, Seat seat) {
        if (!Objects.equals(seat.getEvent().getId(), event.getId())) {
            throw new IllegalArgumentException("Có ghế không thuộc sự kiện đã chọn");
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
        return details.isEmpty() ? "Thanh toán VNPAY thành công" : String.join(" | ", details);
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

    private void ensureBookingProfileCompleted(User user) {
        String fullName = user.getProfileText() == null ? "" : user.getProfileText().trim();
        String phoneNumber = user.getPhoneNumber() == null ? "" : user.getPhoneNumber().trim();

        if (fullName.isEmpty() || phoneNumber.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng cập nhật hồ sơ (họ và tên, số điện thoại) trước khi đặt vé");
        }
    }

    private void validateSeatCoverage(List<Long> requestedSeatIds, List<Seat> loadedSeats) {
        Set<Long> requested = new HashSet<>(requestedSeatIds);
        Set<Long> loaded = loadedSeats.stream().map(Seat::getId).collect(Collectors.toSet());

        if (!loaded.containsAll(requested)) {
            throw new IllegalArgumentException("Có ghế không tồn tại trong hệ thống");
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
