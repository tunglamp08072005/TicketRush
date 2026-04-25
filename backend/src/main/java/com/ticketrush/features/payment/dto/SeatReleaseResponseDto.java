package com.ticketrush.features.payment.dto;

import java.util.List;

public record SeatReleaseResponseDto(
        Long eventId,
        List<String> releasedSeatCodes
) {
}
