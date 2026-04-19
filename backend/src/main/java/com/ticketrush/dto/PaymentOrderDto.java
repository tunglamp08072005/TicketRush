package com.ticketrush.dto;

import com.ticketrush.entity.OrderStatus;
import com.ticketrush.entity.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record PaymentOrderDto(
        Long orderId,
        String queueId,
        Long eventId,
        String eventName,
        Long userId,
        String username,
        OrderStatus orderStatus,
        PaymentStatus paymentStatus,
        BigDecimal totalAmount,
        List<String> seatCodes,
        String paymentNote,
        String paymentProofImageUrl,
        LocalDateTime paymentRequestedAt,
        LocalDateTime paymentReviewedAt,
        LocalDateTime createdAt
) {
}
