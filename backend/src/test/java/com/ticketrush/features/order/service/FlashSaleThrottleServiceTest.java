package com.ticketrush.features.order.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class FlashSaleThrottleServiceTest {

    @Test
    void awaitTurn_enforcesMinimumInterval() {
        FlashSaleThrottleService service = new FlashSaleThrottleService(2);

        service.awaitTurn();
        long start = System.currentTimeMillis();
        service.awaitTurn();
        long elapsed = System.currentTimeMillis() - start;

        assertTrue(elapsed >= 400L);
    }

    @Test
    void awaitTurn_handlesInvalidRateByNormalizingToOne() {
        FlashSaleThrottleService service = new FlashSaleThrottleService(0);

        service.awaitTurn();
        long start = System.currentTimeMillis();
        service.awaitTurn();
        long elapsed = System.currentTimeMillis() - start;

        assertTrue(elapsed >= 900L);
    }
}

