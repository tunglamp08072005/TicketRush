package com.ticketrush.features.payment.dto;

public record VnPayReturnResponseDto(
        boolean success,
        Long orderId,
        String queueId,
        String message
) {
}
