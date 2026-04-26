package com.ticketrush.features.payment.service;

import com.ticketrush.features.payment.dto.PaymentOrderDto;
import com.ticketrush.features.payment.dto.SeatRealtimeUpdateDto;
import com.ticketrush.features.event.entity.Event;
import com.ticketrush.features.event.service.MinioStorageService;
import com.ticketrush.features.order.entity.OrderStatus;
import com.ticketrush.features.payment.entity.PaymentStatus;
import com.ticketrush.features.event.entity.Seat;
import com.ticketrush.features.event.entity.SeatStatus;
import com.ticketrush.features.order.entity.TicketOrder;
import com.ticketrush.features.order.entity.TicketOrderItem;
import com.ticketrush.features.user.entity.User;
import com.ticketrush.features.event.repository.EventRepository;
import com.ticketrush.features.event.repository.SeatRepository;
import com.ticketrush.features.order.repository.TicketOrderRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
public class PaymentService {

    @Value("${app.seats.hold-minutes:10}")
    private int defaultSeatHoldMinutes;

    private final EventRepository eventRepository;
    private final SeatRepository seatRepository;
    private final TicketOrderRepository ticketOrderRepository;
    private final MinioStorageService minioStorageService;
    private final SimpMessagingTemplate messagingTemplate;

    public PaymentService(EventRepository eventRepository,
                          SeatRepository seatRepository,
                          TicketOrderRepository ticketOrderRepository,
                          MinioStorageService minioStorageService,
                          SimpMessagingTemplate messagingTemplate) {
        this.eventRepository = eventRepository;
        this.seatRepository = seatRepository;
        this.ticketOrderRepository = ticketOrderRepository;
        this.minioStorageService = minioStorageService;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public PaymentOrderDto createCheckoutOrder(User user, Long eventId, List<Long> seatIds, MultipartFile paymentProofFile) {
        ensureBookingProfileCompleted(user);

        if (seatIds == null || seatIds.isEmpty()) {
            throw new IllegalArgumentException("Bạn chưa chọn ghế để thanh toán");
        }

        if (paymentProofFile == null || paymentProofFile.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng tải lên ảnh chuyển khoản để tiếp tục");
        }

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Sự kiện không tồn tại"));

        seatRepository.releaseExpiredLocksByEventId(event.getId(), LocalDateTime.now());

        List<Long> requestedSeatIds = seatIds.stream()
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();

        List<Seat> seats = seatRepository.findAllByEventIdAndIdInForUpdate(eventId, requestedSeatIds);
        validateSeatCoverage(requestedSeatIds, seats);

        BigDecimal total = BigDecimal.ZERO;
        TicketOrder order = new TicketOrder();
        order.setQueueId("PAY-" + UUID.randomUUID());
        order.setUser(user);
        order.setEvent(event);
        order.setStatus(OrderStatus.SUCCESS);
        order.setPaymentStatus(PaymentStatus.PENDING_REVIEW);
        order.setPaymentRequestedAt(LocalDateTime.now());
        order.setPaymentProofImageUrl(minioStorageService.uploadPaymentProof(paymentProofFile));

        for (Seat seat : seats) {
            if (!seat.getEvent().getId().equals(event.getId())) {
                throw new IllegalArgumentException("Có ghế không thuộc sự kiện đã chọn");
            }

            boolean available = seat.getStatus() == SeatStatus.AVAILABLE;
            boolean lockedByCurrentUser = seat.getStatus() == SeatStatus.LOCKED
                    && Objects.equals(seat.getLockedByUserId(), user.getId())
                    && (seat.getLockedUntil() == null || seat.getLockedUntil().isAfter(LocalDateTime.now()));

            if (!available && !lockedByCurrentUser) {
                throw new IllegalArgumentException("Ghế " + seat.getSeatCode() + " không còn khả dụng");
            }

            seat.setStatus(SeatStatus.SOLD);
            seat.setLockedByUserId(null);
            seat.setLockedUntil(null);

            TicketOrderItem item = new TicketOrderItem();
            item.setSeat(seat);
            item.setPrice(seat.getPrice());
            order.addItem(item);

            total = total.add(seat.getPrice());
        }

        order.setTotalAmount(total);
        seatRepository.saveAll(seats);
        publishSeatStatusAfterCommit(event.getId(), seats);

        TicketOrder saved = ticketOrderRepository.save(order);
        return toDto(saved);
    }

    @Transactional
    public com.ticketrush.features.payment.dto.SeatHoldResponseDto holdSeatsForCheckout(User user, Long eventId, List<Long> seatIds) {
        ensureBookingProfileCompleted(user);

        if (seatIds == null || seatIds.isEmpty()) {
            throw new IllegalArgumentException("Bạn chưa chọn ghế để giữ chỗ");
        }

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Sự kiện không tồn tại"));

        seatRepository.releaseExpiredLocksByEventId(event.getId(), LocalDateTime.now());

        List<Long> requestedSeatIds = seatIds.stream()
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();

        List<Seat> seats = seatRepository.findAllByEventIdAndIdInForUpdate(eventId, requestedSeatIds);
        validateSeatCoverage(requestedSeatIds, seats);

        LocalDateTime now = LocalDateTime.now();
        int holdMinutes = Math.max(1, defaultSeatHoldMinutes);
        LocalDateTime lockedUntil = now.plusMinutes(holdMinutes);

        for (Seat seat : seats) {
            if (!Objects.equals(seat.getEvent().getId(), event.getId())) {
                throw new IllegalArgumentException("Có ghế không thuộc sự kiện đã chọn");
            }

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
        return new com.ticketrush.features.payment.dto.SeatHoldResponseDto(
                event.getId(),
                seatCodes,
                lockedUntil,
                holdMinutes
        );
    }

    @Transactional
    public com.ticketrush.features.payment.dto.SeatReleaseResponseDto releaseHeldSeats(User user, Long eventId, List<Long> seatIds) {
        if (seatIds == null || seatIds.isEmpty()) {
            throw new IllegalArgumentException("Bạn chưa chọn ghế để xóa giữ chỗ");
        }

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Sự kiện không tồn tại"));

        List<Long> requestedSeatIds = seatIds.stream()
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();

        List<Seat> seats = seatRepository.findAllByEventIdAndIdInForUpdate(eventId, requestedSeatIds);
        validateSeatCoverage(requestedSeatIds, seats);

        List<String> releasedSeatCodes = new ArrayList<>();
        for (Seat seat : seats) {
            if (!Objects.equals(seat.getEvent().getId(), event.getId())) {
                throw new IllegalArgumentException("Có ghế không thuộc sự kiện đã chọn");
            }

            if (seat.getStatus() == SeatStatus.LOCKED && Objects.equals(seat.getLockedByUserId(), user.getId())) {
                seat.setStatus(SeatStatus.AVAILABLE);
                seat.setLockedByUserId(null);
                seat.setLockedUntil(null);
                releasedSeatCodes.add(seat.getSeatCode());
            }
        }

        seatRepository.saveAll(seats);
        publishSeatStatusAfterCommit(event.getId(), seats);

        return new com.ticketrush.features.payment.dto.SeatReleaseResponseDto(
                event.getId(),
                releasedSeatCodes
        );
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

    @Transactional
    public PaymentOrderDto approvePayment(Long orderId, String note) {
        TicketOrder order = ticketOrderRepository.findDetailById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng"));

        if (order.getPaymentStatus() != PaymentStatus.PENDING_REVIEW) {
            throw new IllegalArgumentException("Đơn hàng không ở trạng thái chờ duyệt");
        }

        order.setPaymentStatus(PaymentStatus.APPROVED);
        order.setPaymentReviewedAt(LocalDateTime.now());
        order.setPaymentNote(cleanNote(note));

        return toDto(ticketOrderRepository.save(order));
    }

    @Transactional
    public PaymentOrderDto rejectPayment(Long orderId, String note) {
        TicketOrder order = ticketOrderRepository.findDetailById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng"));

        if (order.getPaymentStatus() != PaymentStatus.PENDING_REVIEW) {
            throw new IllegalArgumentException("Đơn hàng không ở trạng thái chờ duyệt");
        }

        for (TicketOrderItem item : order.getItems()) {
            Seat seat = item.getSeat();
            seat.setStatus(SeatStatus.AVAILABLE);
            seat.setLockedByUserId(null);
            seat.setLockedUntil(null);
        }

        List<Seat> updatedSeats = order.getItems().stream().map(TicketOrderItem::getSeat).toList();
        publishSeatStatusAfterCommit(order.getEvent().getId(), updatedSeats);

        order.setPaymentStatus(PaymentStatus.REJECTED);
        order.setPaymentReviewedAt(LocalDateTime.now());
        order.setPaymentNote(cleanNote(note));

        return toDto(ticketOrderRepository.save(order));
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
        Set<Long> loaded = loadedSeats.stream().map(Seat::getId).collect(java.util.stream.Collectors.toSet());

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
}
