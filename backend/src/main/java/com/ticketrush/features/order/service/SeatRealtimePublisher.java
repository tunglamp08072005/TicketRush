package com.ticketrush.features.order.service;

import com.ticketrush.features.order.dto.SeatRealtimeMessage;
import com.ticketrush.features.event.entity.SeatStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class SeatRealtimePublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public SeatRealtimePublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publishSeatStatus(Long eventId, Long seatId, SeatStatus status) {
        SeatRealtimeMessage payload = new SeatRealtimeMessage(seatId, status, eventId);
        messagingTemplate.convertAndSend("/topic/event/" + eventId, payload);
    }
}
