package com.ticketrush.features.event.service;

import com.ticketrush.features.event.dto.CreateEventRequest;
import com.ticketrush.features.event.dto.CreateZoneRequest;
import com.ticketrush.features.event.entity.EventCategory;
import com.ticketrush.features.event.entity.EventStatus;
import com.ticketrush.features.event.repository.EventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Component
public class DemoEventSeedService implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoEventSeedService.class);

    private final EventRepository eventRepository;
    private final EventService eventService;

    @Value("${app.seed.demo-event.enabled:false}")
    private boolean seedEnabled;

    public DemoEventSeedService(EventRepository eventRepository, EventService eventService) {
        this.eventRepository = eventRepository;
        this.eventService = eventService;
    }

    @Override
    public void run(String... args) {
        if (!seedEnabled) {
            return;
        }

        if (!eventRepository.findPublicVisibleEvents().isEmpty()) {
            log.info("Skip demo event seeding because public events already exist");
            return;
        }

        CreateEventRequest request = new CreateEventRequest();
        LocalDateTime now = LocalDateTime.now();

        request.setName("TicketRush Demo Live Session");
        request.setDescription("Su kien demo de test luong seat map, dynamic pricing, checkout, VNPAY va email QR.");
        request.setLocation("Nha van hoa Thanh nien - San khau A");
        request.setHeroImageUrl("https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=80");
        request.setThumbnailUrl("https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80");
        request.setLayoutMapUrl("https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80");
        request.setOpenSaleDate(now.minusDays(1));
        request.setSaleEndDate(now.plusDays(5));
        request.setEventStartDate(now.plusDays(7));
        request.setCategory(EventCategory.NHAC_SONG);
        request.setFeatured(true);
        request.setPublicVisible(true);
        request.setArchived(false);
        request.setStatus(EventStatus.ON_SALE);
        request.setZones(List.of(
                buildZone("Standard", "Khu A gan san khau", "#3B82F6", new BigDecimal("450000"), 3, 6),
                buildZone("VIP", "Khu B trung tam", "#F97316", new BigDecimal("900000"), 2, 5)
        ));

        eventService.createEvent(request);
        log.info("Seeded demo event for payment testing because public event list was empty");
    }

    private CreateZoneRequest buildZone(String name,
                                        String locationDescription,
                                        String colorHex,
                                        BigDecimal price,
                                        int rowCount,
                                        int seatsPerRow) {
        CreateZoneRequest zone = new CreateZoneRequest();
        zone.setName(name);
        zone.setLocationDescription(locationDescription);
        zone.setColorHex(colorHex);
        zone.setPrice(price);
        zone.setRowCount(rowCount);
        zone.setSeatsPerRow(seatsPerRow);
        return zone;
    }
}
