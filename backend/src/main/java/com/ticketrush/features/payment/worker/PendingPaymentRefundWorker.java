package com.ticketrush.features.payment.worker;

import com.ticketrush.features.payment.service.PaymentService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@Slf4j
public class PendingPaymentRefundWorker {

    private final PaymentService paymentService;

    @Value("${app.payment.pending-review-expire-hours:6}")
    private int pendingReviewExpireHours;

    public PendingPaymentRefundWorker(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @Scheduled(fixedDelayString = "${app.payment.pending-refund-scan-interval-ms:60000}")
    public void markExpiredPendingRefundOrders() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(Math.max(0, pendingReviewExpireHours));
        int updated = paymentService.markExpiredPendingRefundOrders(cutoff);
        if (updated > 0) {
            log.warn("Marked {} pending payment orders as EXPIRED_PENDING_REFUND", updated);
        }
    }
}
