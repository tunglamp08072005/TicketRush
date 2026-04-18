package com.ticketrush.service;

import com.ticketrush.dto.CreateEventRequest;
import com.ticketrush.dto.EventDto;
import com.ticketrush.entity.Event;
import com.ticketrush.entity.EventStatus;
import com.ticketrush.repository.EventRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EventService {

    private final EventRepository eventRepository;

    @Value("${app.events.featured-limit:6}")
    private int featuredLimit;

    public EventService(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    public List<EventDto> getAllEvents() {
        return eventRepository.findAllByOrderByOpenSaleDateDesc().stream()
                .map(this::toDto)
                .toList();
    }

    public EventDto createEvent(CreateEventRequest request) {
        Event event = new Event();
        event.setName(request.getName().trim());
        event.setDescription(request.getDescription().trim());
        event.setLocation(request.getLocation().trim());
        event.setOpenSaleDate(request.getOpenSaleDate());
        event.setHeroImageUrl(request.getHeroImageUrl().trim());
        event.setThumbnailUrl(request.getThumbnailUrl().trim());
        event.setFeatured(request.getFeatured() == null || request.getFeatured());
        event.setStatus(request.getStatus() == null ? EventStatus.UPCOMING : request.getStatus());

        Event saved = eventRepository.save(event);
        return toDto(saved);
    }

    public List<EventDto> getFeaturedEvents() {
        int max = Math.max(1, Math.min(featuredLimit, 20));
        return eventRepository.findByFeaturedTrueAndStatusInOrderByOpenSaleDateAsc(
                        List.of(EventStatus.UPCOMING, EventStatus.ON_SALE)
                ).stream()
                .limit(max)
                .map(this::toDto)
                .toList();
    }

    private EventDto toDto(Event event) {
        return new EventDto(
                event.getId(),
                event.getName(),
                event.getDescription(),
                event.getLocation(),
                event.getHeroImageUrl(),
                event.getThumbnailUrl(),
                event.getOpenSaleDate(),
                event.getStatus()
        );
    }
}
