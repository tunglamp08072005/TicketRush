package com.ticketrush.features.order.service;

import com.ticketrush.features.order.dto.FlashSaleOrderAcceptedResponse;
import com.ticketrush.features.order.dto.FlashSaleOrderRequest;
import com.ticketrush.features.order.dto.QueueStatusResponse;
import com.ticketrush.features.event.entity.Event;
import com.ticketrush.features.event.entity.SeatStatus;
import com.ticketrush.features.order.messaging.OrderRequestMessage;
import com.ticketrush.features.order.entity.TicketOrder;
import com.ticketrush.features.user.entity.User;
import com.ticketrush.features.event.repository.EventRepository;
import com.ticketrush.features.order.repository.TicketOrderRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class FlashSaleOrderService {

    private final EventRepository eventRepository;
    private final TicketOrderRepository ticketOrderRepository;
    private final RedisSeatHoldService redisSeatHoldService;
    private final FlashSalePersistenceService flashSalePersistenceService;
    private final FlashSaleOrderProducer flashSaleOrderProducer;
    private final SeatRealtimePublisher seatRealtimePublisher;

    public FlashSaleOrderService(EventRepository eventRepository,
                                 TicketOrderRepository ticketOrderRepository,
                                 RedisSeatHoldService redisSeatHoldService,
                                 FlashSalePersistenceService flashSalePersistenceService,
                                 FlashSaleOrderProducer flashSaleOrderProducer,
                                 SeatRealtimePublisher seatRealtimePublisher) {
        this.eventRepository = eventRepository;
        this.ticketOrderRepository = ticketOrderRepository;
        this.redisSeatHoldService = redisSeatHoldService;
        this.flashSalePersistenceService = flashSalePersistenceService;
        this.flashSaleOrderProducer = flashSaleOrderProducer;
        this.seatRealtimePublisher = seatRealtimePublisher;
    }

    public FlashSaleOrderAcceptedResponse submitOrder(User user, FlashSaleOrderRequest request) {
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));

        List<Long> seatIds = normalizeSeatIds(request.getSeatIds());
        if (seatIds.isEmpty()) {
            throw new IllegalArgumentException("Seat list is empty");
        }

        redisSeatHoldService.ensureAvailableSetLoaded(event.getId());
        List<Long> heldSeats = redisSeatHoldService.holdSeats(
                event.getId(),
                user.getId(),
                seatIds,
                (long) event.getSeatHoldMinutes() * 60L
        );

        String queueId = UUID.randomUUID().toString();

        try {
            flashSalePersistenceService.lockSeatsForUser(event.getId(), user.getId(), heldSeats, event.getSeatHoldMinutes());
            for (Long seatId : heldSeats) {
                seatRealtimePublisher.publishSeatStatus(event.getId(), seatId, SeatStatus.LOCKED);
            }

            OrderRequestMessage message = new OrderRequestMessage();
            message.setQueueId(queueId);
            message.setEventId(event.getId());
            message.setUserId(user.getId());
            message.setSeatIds(heldSeats);
            message.setRequestedAt(LocalDateTime.now());

            flashSaleOrderProducer.enqueue(message);
            redisSeatHoldService.setQueueStatusPending(queueId, user.getId());
            return new FlashSaleOrderAcceptedResponse(queueId, "PENDING");
        } catch (Exception ex) {
            redisSeatHoldService.rollbackHeldSeats(event.getId(), heldSeats);
            throw ex;
        }
    }

    public QueueStatusResponse getQueueStatus(User user, String queueId) {
        String status = redisSeatHoldService.getQueueField(queueId, "status");
        String message = redisSeatHoldService.getQueueField(queueId, "message");
        String orderId = redisSeatHoldService.getQueueField(queueId, "orderId");
        String ownerId = redisSeatHoldService.getQueueField(queueId, "userId");

        if (ownerId != null && !ownerId.equals(String.valueOf(user.getId())) && !"ADMIN".equalsIgnoreCase(user.getRole())) {
            throw new IllegalArgumentException("Queue does not belong to current user");
        }

        if (status != null) {
            return new QueueStatusResponse(queueId, status, message, orderId);
        }

        TicketOrder order = ticketOrderRepository.findByQueueId(queueId)
                .orElseThrow(() -> new IllegalArgumentException("Queue id not found"));

        if (!order.getUser().getId().equals(user.getId()) && !"ADMIN".equalsIgnoreCase(user.getRole())) {
            throw new IllegalArgumentException("Queue does not belong to current user");
        }

        return new QueueStatusResponse(
                queueId,
                order.getStatus().name(),
                order.getFailureReason(),
                order.getId() == null ? null : String.valueOf(order.getId())
        );
    }

    private List<Long> normalizeSeatIds(List<Long> seatIds) {
        Set<Long> orderedUnique = new LinkedHashSet<>();
        for (Long seatId : seatIds) {
            if (seatId != null && seatId > 0) {
                orderedUnique.add(seatId);
            }
        }
        return new ArrayList<>(orderedUnique);
    }
}
