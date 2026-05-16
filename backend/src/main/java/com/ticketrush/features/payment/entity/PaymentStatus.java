package com.ticketrush.features.payment.entity;

public enum PaymentStatus {
    UNPAID,
    PENDING_REVIEW,
    APPROVED,
    REJECTED,
    EXPIRED_PENDING_REFUND,
    REFUNDED
}
