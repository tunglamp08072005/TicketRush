package com.ticketrush.features.payment.dto;

public record SeatRealtimeUpdateDto(
        Long eventId,
        Long seatId,
        String seatCode,
        String status
) {
}
