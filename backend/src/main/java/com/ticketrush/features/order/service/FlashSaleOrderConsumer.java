package com.ticketrush.features.order.service;

import com.ticketrush.features.event.entity.SeatStatus;
import com.ticketrush.features.order.messaging.OrderRequestMessage;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class FlashSaleOrderConsumer {

    private final FlashSalePersistenceService persistenceService;
    private final RedisSeatHoldService redisSeatHoldService;
    private final FlashSaleThrottleService throttleService;
    private final SeatRealtimePublisher seatRealtimePublisher;

    @Value("${app.flash-sale.queue-name}")
    private String queueName;

    public FlashSaleOrderConsumer(FlashSalePersistenceService persistenceService,
                                  RedisSeatHoldService redisSeatHoldService,
                                  FlashSaleThrottleService throttleService,
                                  SeatRealtimePublisher seatRealtimePublisher) {
        this.persistenceService = persistenceService;
        this.redisSeatHoldService = redisSeatHoldService;
        this.throttleService = throttleService;
        this.seatRealtimePublisher = seatRealtimePublisher;
    }

    @RabbitListener(queues = "${app.flash-sale.queue-name}")
    public void consume(OrderRequestMessage message) {
        throttleService.awaitTurn();

        try {
            FlashSalePersistenceService.CompletedOrder completed = persistenceService.completeOrder(message);
            redisSeatHoldService.markSeatsSold(completed.soldSeatIds());
            redisSeatHoldService.setQueueStatusSuccess(message.getQueueId(), completed.orderId());

            for (Long seatId : completed.soldSeatIds()) {
                seatRealtimePublisher.publishSeatStatus(completed.eventId(), seatId, SeatStatus.SOLD);
            }
        } catch (Exception ex) {
            FlashSalePersistenceService.ReleasedSeats released = persistenceService.releaseLockedSeats(message, ex.getMessage());
            redisSeatHoldService.rollbackHeldSeats(released.eventId(), released.seatIds());
            redisSeatHoldService.setQueueStatusFailed(message.getQueueId(), ex.getMessage());

            for (Long seatId : released.seatIds()) {
                seatRealtimePublisher.publishSeatStatus(released.eventId(), seatId, SeatStatus.AVAILABLE);
            }
        }
    }
}
