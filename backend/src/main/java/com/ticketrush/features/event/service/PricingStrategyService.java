package com.ticketrush.features.event.service;

import com.ticketrush.features.event.entity.EventZone;
import com.ticketrush.features.event.entity.SeatStatus;
import com.ticketrush.features.event.repository.SeatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class PricingStrategyService {

    private static final BigDecimal SURGE_TIER_ONE = new BigDecimal("1.10");
    private static final BigDecimal SURGE_TIER_TWO = new BigDecimal("1.20");

    private final SeatRepository seatRepository;

    public BigDecimal calculateDynamicPrice(EventZone zone) {
        long locked = seatRepository.countByZoneIdAndStatus(zone.getId(), SeatStatus.LOCKED);
        long sold = seatRepository.countByZoneIdAndStatus(zone.getId(), SeatStatus.SOLD);
        return calculateDynamicPrice(zone, locked, sold);
    }

    public BigDecimal calculateDynamicPrice(EventZone zone, long lockedSeats, long soldSeats) {
        int total = zone.getRowCount() * zone.getSeatsPerRow();
        if (total <= 0) {
            return zone.getPrice();
        }

        long booked = Math.max(0, lockedSeats) + Math.max(0, soldSeats);
        double rate = (double) booked / total;
        BigDecimal base = zone.getPrice();

        if (rate > 0.9) {
            return base.multiply(SURGE_TIER_TWO).setScale(2, RoundingMode.HALF_UP);
        }

        if (rate > 0.7) {
            return base.multiply(SURGE_TIER_ONE).setScale(2, RoundingMode.HALF_UP);
        }

        return base.setScale(2, RoundingMode.HALF_UP);
    }
}
