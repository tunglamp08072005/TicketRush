package com.ticketrush.features.event.controller;

import com.ticketrush.features.event.dto.EventDto;
import com.ticketrush.features.event.dto.SeatMapSeatDto;
import com.ticketrush.features.event.service.EventService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @GetMapping("/featured")
    public ResponseEntity<List<EventDto>> getFeaturedEvents() {
        return ResponseEntity.ok(eventService.getFeaturedEvents());
    }

    @GetMapping
    public ResponseEntity<List<EventDto>> getEvents(
            @RequestParam(value = "keyword", required = false) String keyword
    ) {
        return ResponseEntity.ok(eventService.getUserEvents(keyword));
    }

    @GetMapping("/{eventId}")
    public ResponseEntity<EventDto> getEventDetail(@PathVariable Long eventId) {
        return ResponseEntity.ok(eventService.getEventDetail(eventId));
    }

    @GetMapping("/{eventId}/seat-map")
    public ResponseEntity<List<SeatMapSeatDto>> getSeatMap(@PathVariable Long eventId) {
        return ResponseEntity.ok(eventService.getSeatMap(eventId));
    }
}
