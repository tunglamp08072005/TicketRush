package com.ticketrush.service;

import com.ticketrush.dto.CreateEventRequest;
import com.ticketrush.dto.EventDto;
import com.ticketrush.dto.EventZoneDto;
import com.ticketrush.dto.CreateZoneRequest;
import com.ticketrush.entity.Event;
import com.ticketrush.entity.EventZone;
import com.ticketrush.entity.EventStatus;
import com.ticketrush.entity.Seat;
import com.ticketrush.entity.SeatStatus;
import com.ticketrush.repository.EventRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class EventService {

    private final EventRepository eventRepository;

    @Value("${app.events.featured-limit:6}")
    private int featuredLimit;

    public EventService(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    @Transactional
    public List<EventDto> getAllEvents() {
        return eventRepository.findAllByOrderByOpenSaleDateDesc().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public List<EventDto> searchEvents(String keyword) {
        String normalizedKeyword = keyword == null ? null : keyword.trim();
        if (normalizedKeyword != null && normalizedKeyword.isEmpty()) {
            normalizedKeyword = null;
        }

        return eventRepository.searchAllByKeyword(normalizedKeyword).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public EventDto createEvent(CreateEventRequest request) {
        Event event = new Event();
        applyEventRequest(event, request);

        Event saved = eventRepository.save(event);
        return toDto(saved);
    }

    @Transactional
    public EventDto updateEvent(Long id, CreateEventRequest request) {
        Event event = eventRepository.findDetailById(id)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));

        event.getZones().clear();
        eventRepository.saveAndFlush(event);
        applyEventRequest(event, request);

        Event saved = eventRepository.save(event);
        return toDto(saved);
    }

    @Transactional
    public void deleteEvent(Long id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));
        eventRepository.delete(event);
    }

    @Transactional
    public List<EventDto> getFeaturedEvents() {
        int max = Math.max(1, Math.min(featuredLimit, 20));
        return eventRepository.findByFeaturedTrueAndStatusInOrderByOpenSaleDateAsc(
                        List.of(EventStatus.UPCOMING, EventStatus.ON_SALE)
                ).stream()
                .limit(max)
                .map(this::toDto)
                .toList();
    }

    private void applyEventRequest(Event event, CreateEventRequest request) {
        event.setName(request.getName().trim());
        event.setDescription(request.getDescription().trim());
        event.setLocation(request.getLocation().trim());
        event.setOpenSaleDate(request.getOpenSaleDate());
        event.setHeroImageUrl(request.getHeroImageUrl().trim());
        event.setThumbnailUrl(request.getThumbnailUrl().trim());
        event.setFeatured(request.getFeatured() == null || request.getFeatured());
        event.setStatus(request.getStatus() == null ? EventStatus.UPCOMING : request.getStatus());

        AtomicInteger zoneOrder = new AtomicInteger(0);
        request.getZones().forEach(zoneRequest -> event.addZone(buildZone(event, zoneRequest, zoneOrder.getAndIncrement())));
    }

    private EventZone buildZone(Event event, CreateZoneRequest request, int displayOrder) {
        EventZone zone = new EventZone();
        String normalizedName = request.getName().trim();
        zone.setEvent(event);
        zone.setName(normalizedName);
        zone.setCode(generateZoneCode(normalizedName, displayOrder));
        zone.setColorHex(request.getColorHex().trim().toUpperCase(Locale.ROOT));
        zone.setPrice(request.getPrice());
        zone.setRowCount(request.getRowCount());
        zone.setSeatsPerRow(request.getSeatsPerRow());
        zone.setDisplayOrder(displayOrder);

        for (int rowIndex = 0; rowIndex < request.getRowCount(); rowIndex++) {
            String rowLabel = String.valueOf((char) ('A' + rowIndex));
            for (int seatNumber = 1; seatNumber <= request.getSeatsPerRow(); seatNumber++) {
                zone.addSeat(buildSeat(event, zone, rowLabel, seatNumber, request.getPrice()));
            }
        }

        return zone;
    }

    private Seat buildSeat(Event event, EventZone zone, String rowLabel, int seatNumber, BigDecimal price) {
        Seat seat = new Seat();
        seat.setEvent(event);
        seat.setZone(zone);
        seat.setRowLabel(rowLabel);
        seat.setSeatNumber(seatNumber);
        seat.setPrice(price);
        seat.setStatus(SeatStatus.AVAILABLE);
        seat.setSeatCode(zone.getCode() + "-" + rowLabel + seatNumber);
        return seat;
    }

    private String generateZoneCode(String name, int displayOrder) {
        String normalized = name.toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9]+", "_")
                .replaceAll("^_+|_+$", "");

        if (normalized.isBlank()) {
            normalized = "ZONE";
        }

        return normalized + "_" + (displayOrder + 1);
    }

    private EventDto toDto(Event event) {
        List<EventZoneDto> zoneDtos = event.getZones().stream()
                .sorted((left, right) -> Integer.compare(left.getDisplayOrder(), right.getDisplayOrder()))
                .map(zone -> new EventZoneDto(
                        zone.getId(),
                        zone.getName(),
                        zone.getCode(),
                        zone.getColorHex(),
                        zone.getPrice(),
                        zone.getRowCount(),
                        zone.getSeatsPerRow(),
                        zone.getSeats().size()
                ))
                .toList();

        return new EventDto(
                event.getId(),
                event.getName(),
                event.getDescription(),
                event.getLocation(),
                event.getHeroImageUrl(),
                event.getThumbnailUrl(),
                event.getOpenSaleDate(),
                event.getStatus(),
                zoneDtos.stream().mapToInt(EventZoneDto::getSeatCount).sum(),
                zoneDtos
        );
    }
}
