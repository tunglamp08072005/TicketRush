package com.ticketrush.features.order.dto;

import com.ticketrush.features.event.entity.SeatStatus;

public class SeatRealtimeMessage {
    private Long seatId;
    private SeatStatus status;
    private Long eventId;

    public SeatRealtimeMessage() {
    }

    public SeatRealtimeMessage(Long seatId, SeatStatus status, Long eventId) {
        this.seatId = seatId;
        this.status = status;
        this.eventId = eventId;
    }

    public Long getSeatId() {
        return seatId;
    }

    public void setSeatId(Long seatId) {
        this.seatId = seatId;
    }

    public SeatStatus getStatus() {
        return status;
    }

    public void setStatus(SeatStatus status) {
        this.status = status;
    }

    public Long getEventId() {
        return eventId;
    }

    public void setEventId(Long eventId) {
        this.eventId = eventId;
    }
}
