package com.ticketrush.features.payment.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record VnPayCheckoutResponseDto(
        Long orderId,
        String queueId,
        BigDecimal totalAmount,
        LocalDateTime expiresAt,
        String paymentUrl
) {
}
