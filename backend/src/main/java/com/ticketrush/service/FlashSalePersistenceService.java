package com.ticketrush.service;

import com.ticketrush.entity.Event;
import com.ticketrush.entity.OrderStatus;
import com.ticketrush.entity.Seat;
import com.ticketrush.entity.SeatStatus;
import com.ticketrush.entity.TicketOrder;
import com.ticketrush.entity.TicketOrderItem;
import com.ticketrush.entity.User;
import com.ticketrush.repository.EventRepository;
import com.ticketrush.repository.SeatRepository;
import com.ticketrush.repository.TicketOrderRepository;
import com.ticketrush.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
public class FlashSalePersistenceService {

    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final SeatRepository seatRepository;
    private final TicketOrderRepository ticketOrderRepository;

    public FlashSalePersistenceService(EventRepository eventRepository,
                                      UserRepository userRepository,
                                      SeatRepository seatRepository,
                                      TicketOrderRepository ticketOrderRepository) {
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.seatRepository = seatRepository;
        this.ticketOrderRepository = ticketOrderRepository;
    }

    @Transactional
    public void lockSeatsForUser(Long eventId, Long userId, List<Long> seatIds, int holdMinutes) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));

        List<Seat> seats = seatRepository.findAllByIdInForUpdate(seatIds);
        validateSeatCoverage(seatIds, seats);
        LocalDateTime lockedUntil = LocalDateTime.now().plusMinutes(Math.max(1, holdMinutes));

        for (Seat seat : seats) {
            if (!Objects.equals(seat.getEvent().getId(), event.getId())) {
                throw new IllegalArgumentException("Seat " + seat.getId() + " does not belong to event " + eventId);
            }

            if (seat.getStatus() == SeatStatus.SOLD) {
                throw new IllegalArgumentException("Seat " + seat.getId() + " already sold");
            }

            if (seat.getStatus() == SeatStatus.LOCKED && !Objects.equals(seat.getLockedByUserId(), userId)) {
                throw new IllegalArgumentException("Seat " + seat.getId() + " already locked by another user");
            }

            seat.setStatus(SeatStatus.LOCKED);
            seat.setLockedByUserId(userId);
            seat.setLockedUntil(lockedUntil);
        }

        seatRepository.saveAll(seats);
    }

    @Transactional
    public CompletedOrder completeOrder(OrderRequestMessage message) {
        if (ticketOrderRepository.findByQueueId(message.getQueueId()).isPresent()) {
            throw new IllegalArgumentException("Queue id already processed");
        }

        Event event = eventRepository.findById(message.getEventId())
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));
        User user = userRepository.findById(message.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<Seat> seats = seatRepository.findAllByIdInForUpdate(message.getSeatIds());
        validateSeatCoverage(message.getSeatIds(), seats);

        BigDecimal total = BigDecimal.ZERO;
        List<Long> soldSeatIds = new ArrayList<>();

        for (Seat seat : seats) {
            if (seat.getStatus() != SeatStatus.LOCKED) {
                throw new IllegalArgumentException("Seat " + seat.getId() + " is not locked");
            }

            if (!Objects.equals(seat.getLockedByUserId(), user.getId())) {
                throw new IllegalArgumentException("Seat " + seat.getId() + " is locked by another user");
            }

            if (seat.getLockedUntil() != null && seat.getLockedUntil().isBefore(LocalDateTime.now())) {
                throw new IllegalArgumentException("Seat " + seat.getId() + " lock has expired");
            }

            seat.setStatus(SeatStatus.SOLD);
            seat.setLockedByUserId(null);
            seat.setLockedUntil(null);
            total = total.add(seat.getPrice());
            soldSeatIds.add(seat.getId());
        }

        TicketOrder order = new TicketOrder();
        order.setQueueId(message.getQueueId());
        order.setUser(user);
        order.setEvent(event);
        order.setStatus(OrderStatus.SUCCESS);
        order.setTotalAmount(total);

        for (Seat seat : seats) {
            TicketOrderItem item = new TicketOrderItem();
            item.setSeat(seat);
            item.setPrice(seat.getPrice());
            order.addItem(item);
        }

        seatRepository.saveAll(seats);
        TicketOrder saved = ticketOrderRepository.save(order);

        return new CompletedOrder(saved.getId(), event.getId(), soldSeatIds);
    }

    @Transactional
    public ReleasedSeats releaseLockedSeats(OrderRequestMessage message, String reason) {
        List<Seat> seats = seatRepository.findAllByIdInForUpdate(message.getSeatIds());
        validateSeatCoverage(message.getSeatIds(), seats);

        List<Long> released = new ArrayList<>();
        Long eventId = message.getEventId();

        for (Seat seat : seats) {
            if (seat.getStatus() == SeatStatus.LOCKED && Objects.equals(seat.getLockedByUserId(), message.getUserId())) {
                seat.setStatus(SeatStatus.AVAILABLE);
                seat.setLockedByUserId(null);
                seat.setLockedUntil(null);
                released.add(seat.getId());
            }
            eventId = seat.getEvent().getId();
        }

        seatRepository.saveAll(seats);

    TicketOrder existing = ticketOrderRepository.findByQueueId(message.getQueueId()).orElse(null);
    if (existing == null) {
        TicketOrder failureOrder = new TicketOrder();
        failureOrder.setQueueId(message.getQueueId());
        failureOrder.setUser(userRepository.findById(message.getUserId())
            .orElseThrow(() -> new IllegalArgumentException("User not found")));
        failureOrder.setEvent(eventRepository.findById(message.getEventId())
            .orElseThrow(() -> new IllegalArgumentException("Event not found")));
        failureOrder.setStatus(OrderStatus.FAILED);
        failureOrder.setFailureReason(reason);
        failureOrder.setTotalAmount(BigDecimal.ZERO);
        ticketOrderRepository.save(failureOrder);
    } else {
        existing.setStatus(OrderStatus.FAILED);
        existing.setFailureReason(reason);
        ticketOrderRepository.save(existing);
    }

        return new ReleasedSeats(eventId, released);
    }

    private void validateSeatCoverage(List<Long> requestedSeatIds, List<Seat> loadedSeats) {
        Set<Long> requested = new HashSet<>(requestedSeatIds);
        Set<Long> loaded = loadedSeats.stream().map(Seat::getId).collect(java.util.stream.Collectors.toSet());

        if (!loaded.containsAll(requested)) {
            throw new IllegalArgumentException("Some seats are not found");
        }
    }

    public record CompletedOrder(Long orderId, Long eventId, List<Long> soldSeatIds) {
    }

    public record ReleasedSeats(Long eventId, List<Long> seatIds) {
    }
}
