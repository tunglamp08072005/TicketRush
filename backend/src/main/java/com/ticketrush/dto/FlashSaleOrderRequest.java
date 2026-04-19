package com.ticketrush.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class FlashSaleOrderRequest {

    @NotNull(message = "Event id is required")
    private Long eventId;

    @NotEmpty(message = "At least one seat is required")
    private List<Long> seatIds;

    public Long getEventId() {
        return eventId;
    }

    public void setEventId(Long eventId) {
        this.eventId = eventId;
    }

    public List<Long> getSeatIds() {
        return seatIds;
    }

    public void setSeatIds(List<Long> seatIds) {
        this.seatIds = seatIds;
    }
}
