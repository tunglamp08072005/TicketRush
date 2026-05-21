package com.ticketrush.features.event.service;

import com.ticketrush.features.event.entity.EventZone;
import com.ticketrush.features.event.entity.SeatStatus;
import com.ticketrush.features.event.repository.SeatRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PricingStrategyServiceTest {

    @Mock
    private SeatRepository seatRepository;

    @InjectMocks
    private PricingStrategyService pricingStrategyService;

    @Test
    void calculateDynamicPrice_noSurgeWhenBelowThreshold() {
        EventZone zone = zone(10, 10, "100000");

        BigDecimal price = pricingStrategyService.calculateDynamicPrice(zone, 20, 20);

        assertEquals(new BigDecimal("100000.00"), price);
    }

    @Test
    void calculateDynamicPrice_tierOneSurgeWhenOverSeventyPercent() {
        EventZone zone = zone(10, 10, "100000");

        BigDecimal price = pricingStrategyService.calculateDynamicPrice(zone, 40, 31);

        assertEquals(new BigDecimal("110000.00"), price);
    }

    @Test
    void calculateDynamicPrice_tierTwoSurgeWhenOverNinetyPercent() {
        EventZone zone = zone(10, 10, "100000");

        BigDecimal price = pricingStrategyService.calculateDynamicPrice(zone, 45, 46);

        assertEquals(new BigDecimal("120000.00"), price);
    }

    @Test
    void calculateDynamicPrice_usesRepositoryCounts() {
        EventZone zone = zone(10, 10, "100000");
        zone.setId(99L);
        when(seatRepository.countByZoneIdAndStatus(99L, SeatStatus.LOCKED)).thenReturn(30L);
        when(seatRepository.countByZoneIdAndStatus(99L, SeatStatus.SOLD)).thenReturn(45L);

        BigDecimal price = pricingStrategyService.calculateDynamicPrice(zone);

        assertEquals(new BigDecimal("110000.00"), price);
    }

    @Test
    void calculateDynamicPrice_returnsBaseWhenInvalidCapacity() {
        EventZone zone = zone(0, 0, "99999");

        BigDecimal price = pricingStrategyService.calculateDynamicPrice(zone, 999, 999);

        assertEquals(new BigDecimal("99999"), price);
    }

    private EventZone zone(int rowCount, int seatsPerRow, String basePrice) {
        EventZone zone = new EventZone();
        zone.setRowCount(rowCount);
        zone.setSeatsPerRow(seatsPerRow);
        zone.setPrice(new BigDecimal(basePrice));
        return zone;
    }
}

