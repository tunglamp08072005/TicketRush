package com.ticketrush.service;

import com.ticketrush.dto.SeatRealtimeMessage;
import com.ticketrush.entity.SeatStatus;
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
