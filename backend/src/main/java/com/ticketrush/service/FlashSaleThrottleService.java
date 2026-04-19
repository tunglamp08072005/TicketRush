package com.ticketrush.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class FlashSaleThrottleService {

    private final long minIntervalMillis;
    private long lastProcessedAt;

    public FlashSaleThrottleService(@Value("${app.flash-sale.consumer.max-per-second:20}") int maxPerSecond) {
        int normalized = Math.max(1, maxPerSecond);
        this.minIntervalMillis = Math.max(1L, 1000L / normalized);
    }

    public synchronized void awaitTurn() {
        long now = System.currentTimeMillis();
        long nextAllowed = lastProcessedAt + minIntervalMillis;
        long waitMillis = Math.max(0, nextAllowed - now);

        if (waitMillis > 0) {
            try {
                Thread.sleep(waitMillis);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
            }
        }

        lastProcessedAt = System.currentTimeMillis();
    }
}
