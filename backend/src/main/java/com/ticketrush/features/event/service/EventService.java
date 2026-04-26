package com.ticketrush.features.event.service;

import com.ticketrush.features.event.dto.CreateEventRequest;
import com.ticketrush.features.event.dto.EventDto;
import com.ticketrush.features.event.dto.EventZoneDto;
import com.ticketrush.features.event.dto.CreateZoneRequest;
import com.ticketrush.features.event.entity.Event;
import com.ticketrush.features.event.entity.EventCategory;
import com.ticketrush.features.event.entity.EventZone;
import com.ticketrush.features.event.entity.EventStatus;
import com.ticketrush.features.event.entity.Seat;
import com.ticketrush.features.event.entity.SeatStatus;
import com.ticketrush.features.event.repository.EventRepository;
import com.ticketrush.features.event.repository.SeatRepository;
import com.ticketrush.features.order.repository.TicketOrderRepository;
import com.ticketrush.features.payment.entity.PaymentStatus;
import com.ticketrush.features.event.dto.SeatMapSeatDto;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class EventService {

    private final EventRepository eventRepository;
    private final SeatRepository seatRepository;
    private final TicketOrderRepository ticketOrderRepository;

    @Value("${app.events.featured-limit:6}")
    private int featuredLimit;

    @Value("${app.seats.hold-minutes:10}")
    private int defaultSeatHoldMinutes;

    public EventService(EventRepository eventRepository, SeatRepository seatRepository, TicketOrderRepository ticketOrderRepository) {
        this.eventRepository = eventRepository;
        this.seatRepository = seatRepository;
        this.ticketOrderRepository = ticketOrderRepository;
    }

    @Transactional
    public List<EventDto> getAllEvents() {
        syncEventPublicationState();
        Map<Long, TicketOrderRepository.EventOrderSalesSummary> salesByEventId = loadOrderSalesByEventId();
        return eventRepository.findAllByOrderByOpenSaleDateDesc().stream()
            .map(event -> toDto(event, salesByEventId))
                .toList();
    }

    @Transactional
    public List<EventDto> searchEvents(String keyword) {
        syncEventPublicationState();
        String normalizedKeyword = keyword == null ? null : keyword.trim();
        if (normalizedKeyword != null && normalizedKeyword.isEmpty()) {
            normalizedKeyword = null;
        }

        Map<Long, TicketOrderRepository.EventOrderSalesSummary> salesByEventId = loadOrderSalesByEventId();

        return eventRepository.searchAllByKeyword(normalizedKeyword).stream()
                .map(event -> toDto(event, salesByEventId))
                .toList();
    }

    @Transactional
    public EventDto createEvent(CreateEventRequest request) {
        Event event = new Event();
        applyEventRequest(event, request);

        Event saved = eventRepository.save(event);
        return toDto(saved, Map.of());
    }

    @Transactional
    public EventDto updateEvent(Long id, CreateEventRequest request) {
        Event event = eventRepository.findDetailById(id)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));

        event.getZones().clear();
        eventRepository.saveAndFlush(event);
        applyEventRequest(event, request);

        Event saved = eventRepository.save(event);
        return toDto(saved, Map.of());
    }

    @Transactional
    public void deleteEvent(Long id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));
        eventRepository.delete(event);
    }

    @Transactional
    public List<EventDto> getFeaturedEvents() {
        syncEventPublicationState();
        int max = Math.max(1, Math.min(featuredLimit, 20));
        Map<Long, TicketOrderRepository.EventOrderSalesSummary> salesByEventId = loadOrderSalesByEventId();
        return eventRepository.findByFeaturedTrueAndStatusInOrderByOpenSaleDateAsc(
                        List.of(EventStatus.UPCOMING, EventStatus.ON_SALE)
                ).stream()
                .limit(max)
            .map(event -> toDto(event, salesByEventId))
                .toList();
    }

    @Transactional
    public List<EventDto> getUserEvents(String keyword) {
        syncEventPublicationState();
        Map<Long, TicketOrderRepository.EventOrderSalesSummary> salesByEventId = loadOrderSalesByEventId();
        if (keyword == null || keyword.trim().isEmpty()) {
            return eventRepository.findPublicVisibleEvents().stream()
                    .map(event -> toDto(event, salesByEventId))
                    .toList();
        }
        String normalizedKeyword = keyword.trim();
        return eventRepository.searchPublicVisibleByKeyword(normalizedKeyword).stream()
                .map(event -> toDto(event, salesByEventId))
                .toList();
    }

    @Transactional
    public EventDto getPublicEventDetail(Long eventId) {
        syncEventPublicationState();
        Event event = eventRepository.findPublicDetailById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));
        Map<Long, TicketOrderRepository.EventOrderSalesSummary> salesByEventId = loadOrderSalesByEventId();
        return toDto(event, salesByEventId);
    }

    private Map<Long, TicketOrderRepository.EventOrderSalesSummary> loadOrderSalesByEventId() {
        return ticketOrderRepository.summarizeEventSales(PaymentStatus.REJECTED).stream()
                .collect(Collectors.toMap(TicketOrderRepository.EventOrderSalesSummary::getEventId, Function.identity()));
    }

    private void syncEventPublicationState() {
        LocalDateTime now = LocalDateTime.now();
        eventRepository.autoArchiveBySaleEndDate(now);
        eventRepository.autoPublishByOpenSaleDate(now);
    }

    @Transactional
    public List<SeatMapSeatDto> getSeatMap(Long eventId) {
        eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));

        seatRepository.releaseExpiredLocksByEventId(eventId, LocalDateTime.now());

        return seatRepository.findSeatMapByEventId(eventId).stream()
                .map(this::toSeatMapDto)
                .toList();
    }

    private void applyEventRequest(Event event, CreateEventRequest request) {
        if (request.getOpenSaleDate().isAfter(request.getEventStartDate())) {
            throw new IllegalArgumentException("Open sale date must be before event start date");
        }

        if (request.getOpenSaleDate().isAfter(request.getSaleEndDate())) {
            throw new IllegalArgumentException("Sale end date must be after open sale date");
        }

        if (request.getSaleEndDate().isAfter(request.getEventStartDate())) {
            throw new IllegalArgumentException("Sale end date must be before event start date");
        }

        event.setName(request.getName().trim());
        event.setDescription(request.getDescription().trim());
        event.setLocation(request.getLocation().trim());
        event.setOpenSaleDate(request.getOpenSaleDate());
        event.setSaleEndDate(request.getSaleEndDate());
        event.setEventStartDate(request.getEventStartDate());
        event.setHeroImageUrl(request.getHeroImageUrl().trim());
        event.setThumbnailUrl(request.getThumbnailUrl().trim());
        event.setLayoutMapUrl(request.getLayoutMapUrl().trim());
        event.setSeatHoldMinutes(Math.max(1, defaultSeatHoldMinutes));
        event.setCategory(request.getCategory() == null ? EventCategory.KHAC : request.getCategory());
        event.setFeatured(request.getFeatured() == null || request.getFeatured());

        LocalDateTime now = LocalDateTime.now();
        boolean autoArchived = !request.getSaleEndDate().isAfter(now);
        boolean autoPublicVisible = !autoArchived && !request.getOpenSaleDate().isAfter(now);

        boolean resolvedArchived = request.getArchived() != null
            ? request.getArchived()
            : autoArchived;
        boolean resolvedPublicVisible = request.getPublicVisible() != null
            ? request.getPublicVisible()
            : autoPublicVisible;

        // Archived events are always hidden from public listing.
        if (resolvedArchived) {
            resolvedPublicVisible = false;
        }

        event.setPublicVisible(resolvedPublicVisible);
        event.setArchived(resolvedArchived);
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
        zone.setLocationDescription(normalizeLocationDescription(request.getLocationDescription()));
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

    private String normalizeLocationDescription(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private EventDto toDto(Event event, Map<Long, TicketOrderRepository.EventOrderSalesSummary> salesByEventId) {
        List<EventZoneDto> zoneDtos = event.getZones().stream()
                .sorted((left, right) -> Integer.compare(left.getDisplayOrder(), right.getDisplayOrder()))
                .map(zone -> new EventZoneDto(
                        zone.getId(),
                        zone.getName(),
                        zone.getCode(),
                        zone.getColorHex(),
                    zone.getLocationDescription(),
                        zone.getPrice(),
                        zone.getRowCount(),
                        zone.getSeatsPerRow(),
                        zone.getSeats().size()
                ))
                .toList();

            TicketOrderRepository.EventOrderSalesSummary salesSummary = salesByEventId.get(event.getId());
            int soldSeatCount = salesSummary == null ? 0 : (int) Math.max(0, salesSummary.getSoldSeatCount());
            BigDecimal soldRevenue = salesSummary == null || salesSummary.getSoldRevenue() == null
                ? BigDecimal.ZERO
                : salesSummary.getSoldRevenue();

        return new EventDto(
                event.getId(),
                event.getName(),
                event.getDescription(),
                event.getLocation(),
                event.getHeroImageUrl(),
                event.getThumbnailUrl(),
                event.getLayoutMapUrl(),
                event.getOpenSaleDate(),
                event.getSaleEndDate(),
                event.getEventStartDate(),
                event.getSeatHoldMinutes(),
                event.getCategory(),
                event.getStatus(),
                event.isPublicVisible(),
                event.isArchived(),
                zoneDtos.stream().mapToInt(EventZoneDto::getSeatCount).sum(),
                soldSeatCount,
                soldRevenue,
                zoneDtos
        );
    }

    private SeatMapSeatDto toSeatMapDto(Seat seat) {
        EventZone zone = seat.getZone();
        return new SeatMapSeatDto(
                seat.getId(),
                zone.getId(),
                zone.getName(),
                zone.getCode(),
                zone.getColorHex(),
                seat.getRowLabel(),
                seat.getSeatNumber(),
                seat.getSeatCode(),
                seat.getPrice(),
                seat.getStatus()
        );
    }
}
