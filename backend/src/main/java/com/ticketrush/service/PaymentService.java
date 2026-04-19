package com.ticketrush.service;

import com.ticketrush.dto.PaymentOrderDto;
import com.ticketrush.entity.Event;
import com.ticketrush.entity.OrderStatus;
import com.ticketrush.entity.PaymentStatus;
import com.ticketrush.entity.Seat;
import com.ticketrush.entity.SeatStatus;
import com.ticketrush.entity.TicketOrder;
import com.ticketrush.entity.TicketOrderItem;
import com.ticketrush.entity.User;
import com.ticketrush.repository.EventRepository;
import com.ticketrush.repository.SeatRepository;
import com.ticketrush.repository.TicketOrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class PaymentService {

    private final EventRepository eventRepository;
    private final SeatRepository seatRepository;
    private final TicketOrderRepository ticketOrderRepository;
    private final MinioStorageService minioStorageService;

    public PaymentService(EventRepository eventRepository,
                          SeatRepository seatRepository,
                          TicketOrderRepository ticketOrderRepository,
                          MinioStorageService minioStorageService) {
        this.eventRepository = eventRepository;
        this.seatRepository = seatRepository;
        this.ticketOrderRepository = ticketOrderRepository;
        this.minioStorageService = minioStorageService;
    }

    @Transactional
    public PaymentOrderDto createCheckoutOrder(User user, Long eventId, List<Long> seatIds, MultipartFile paymentProofFile) {
        if (seatIds == null || seatIds.isEmpty()) {
            throw new IllegalArgumentException("Bạn chưa chọn ghế để thanh toán");
        }

        if (paymentProofFile == null || paymentProofFile.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng tải lên ảnh chuyển khoản để tiếp tục");
        }

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Sự kiện không tồn tại"));

        List<Long> requestedSeatIds = seatIds.stream()
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();

        List<Seat> seats = seatRepository.findAllByIdInForUpdate(requestedSeatIds);
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
            if (seat.getStatus() != SeatStatus.AVAILABLE) {
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

        TicketOrder saved = ticketOrderRepository.save(order);
        return toDto(saved);
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
}
