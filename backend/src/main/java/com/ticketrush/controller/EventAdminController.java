package com.ticketrush.controller;

import com.ticketrush.dto.CreateEventRequest;
import com.ticketrush.dto.EventDto;
import com.ticketrush.dto.PosterUploadResponse;
import com.ticketrush.entity.User;
import com.ticketrush.service.EventService;
import com.ticketrush.service.MinioStorageService;
import com.ticketrush.service.UserService;
import com.ticketrush.util.JwtUtil;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/admin/events")
public class EventAdminController {

    private final EventService eventService;
    private final MinioStorageService minioStorageService;
    private final JwtUtil jwtUtil;
    private final UserService userService;

    public EventAdminController(
            EventService eventService,
            MinioStorageService minioStorageService,
            JwtUtil jwtUtil,
            UserService userService
    ) {
        this.eventService = eventService;
        this.minioStorageService = minioStorageService;
        this.jwtUtil = jwtUtil;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<?> getAllEvents(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam(value = "q", required = false) String keyword
    ) {
        if (!isAdminRequest(authorizationHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only admin can access this endpoint");
        }

        if (keyword == null) {
            return ResponseEntity.ok(eventService.getAllEvents());
        }
        return ResponseEntity.ok(eventService.searchEvents(keyword));
    }

    @PostMapping
    public ResponseEntity<?> createEvent(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @Valid @RequestBody CreateEventRequest request
    ) {
        if (!isAdminRequest(authorizationHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only admin can access this endpoint");
        }

        try {
            EventDto created = eventService.createEvent(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(500).body("Cannot create event: " + ex.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateEvent(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long id,
            @Valid @RequestBody CreateEventRequest request
    ) {
        if (!isAdminRequest(authorizationHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only admin can access this endpoint");
        }

        try {
            EventDto updated = eventService.updateEvent(id, request);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(500).body("Cannot update event: " + ex.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteEvent(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long id
    ) {
        if (!isAdminRequest(authorizationHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only admin can access this endpoint");
        }

        try {
            eventService.deleteEvent(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(500).body("Cannot delete event: " + ex.getMessage());
        }
    }

    @PostMapping("/upload-poster")
    public ResponseEntity<?> uploadPoster(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam("file") MultipartFile file
    ) {
        if (!isAdminRequest(authorizationHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only admin can access this endpoint");
        }

        try {
            String imageUrl = minioStorageService.uploadPoster(file);
            return ResponseEntity.ok(new PosterUploadResponse(imageUrl));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(500).body("Cannot upload poster: " + ex.getMessage());
        }
    }

    @PostMapping("/upload-layout-map")
    public ResponseEntity<?> uploadLayoutMap(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam("file") MultipartFile file
    ) {
        if (!isAdminRequest(authorizationHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only admin can access this endpoint");
        }

        try {
            String imageUrl = minioStorageService.uploadLayoutMap(file);
            return ResponseEntity.ok(new PosterUploadResponse(imageUrl));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(500).body("Cannot upload layout map: " + ex.getMessage());
        }
    }

    private boolean isAdminRequest(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return false;
        }

        String token = authorizationHeader.substring(7).trim();
        if (token.isEmpty() || !jwtUtil.isTokenValid(token)) {
            return false;
        }

        String username = jwtUtil.extractUsername(token);
        User user = userService.findByUsername(username);
        if (user == null) {
            return false;
        }

        return "ADMIN".equals(userService.normalizeRole(user.getRole()));
    }
}
