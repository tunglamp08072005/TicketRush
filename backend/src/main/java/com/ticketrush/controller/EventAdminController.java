package com.ticketrush.controller;

import com.ticketrush.dto.CreateEventRequest;
import com.ticketrush.dto.EventDto;
import com.ticketrush.dto.PosterUploadResponse;
import com.ticketrush.service.EventService;
import com.ticketrush.service.MinioStorageService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/admin/events")
public class EventAdminController {

    private final EventService eventService;
    private final MinioStorageService minioStorageService;

    public EventAdminController(EventService eventService, MinioStorageService minioStorageService) {
        this.eventService = eventService;
        this.minioStorageService = minioStorageService;
    }

    @GetMapping
    public ResponseEntity<List<EventDto>> getAllEvents() {
        return ResponseEntity.ok(eventService.getAllEvents());
    }

    @PostMapping
    public ResponseEntity<?> createEvent(@Valid @RequestBody CreateEventRequest request) {
        try {
            EventDto created = eventService.createEvent(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(500).body("Cannot create event: " + ex.getMessage());
        }
    }

    @PostMapping("/upload-poster")
    public ResponseEntity<?> uploadPoster(@RequestParam("file") MultipartFile file) {
        try {
            String imageUrl = minioStorageService.uploadPoster(file);
            return ResponseEntity.ok(new PosterUploadResponse(imageUrl));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(500).body("Cannot upload poster: " + ex.getMessage());
        }
    }
}
