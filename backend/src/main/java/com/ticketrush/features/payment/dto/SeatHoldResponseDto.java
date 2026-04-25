package com.ticketrush.features.payment.dto;

import java.time.LocalDateTime;
import java.util.List;

public record SeatHoldResponseDto(
        Long eventId,
        List<String> seatCodes,
        LocalDateTime lockedUntil,
        int holdMinutes
) {
}
