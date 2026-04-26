package com.ticketrush.features.order.controller;

import com.ticketrush.common.util.JwtUtil;
import com.ticketrush.features.order.dto.VirtualQueueStatusResponse;
import com.ticketrush.features.order.service.VirtualQueueService;
import com.ticketrush.features.user.entity.User;
import com.ticketrush.features.user.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/virtual-queue/events")
public class VirtualQueueController {

    private final VirtualQueueService virtualQueueService;
    private final JwtUtil jwtUtil;
    private final UserService userService;

    public VirtualQueueController(VirtualQueueService virtualQueueService,
                                  JwtUtil jwtUtil,
                                  UserService userService) {
        this.virtualQueueService = virtualQueueService;
        this.jwtUtil = jwtUtil;
        this.userService = userService;
    }

    @PostMapping("/{eventId}/enter")
    public ResponseEntity<?> enterQueue(@RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                        @PathVariable Long eventId) {
        try {
            User user = resolveUser(authorizationHeader);
            VirtualQueueStatusResponse response = virtualQueueService.enterQueue(eventId, user.getId());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Cannot enter waiting room: " + ex.getMessage());
        }
    }

    @GetMapping("/{eventId}/status/{queueToken}")
    public ResponseEntity<?> getStatus(@RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                       @PathVariable Long eventId,
                                       @PathVariable String queueToken) {
        try {
            User user = resolveUser(authorizationHeader);
            VirtualQueueStatusResponse response = virtualQueueService.getStatus(eventId, user.getId(), queueToken);
            if (response == null) {
                return ResponseEntity.badRequest().body("Queue token not found or expired");
            }
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Cannot fetch waiting room status: " + ex.getMessage());
        }
    }

    @PostMapping("/{eventId}/heartbeat/{queueToken}")
    public ResponseEntity<?> heartbeat(@RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                       @PathVariable Long eventId,
                                       @PathVariable String queueToken) {
        try {
            User user = resolveUser(authorizationHeader);
            VirtualQueueStatusResponse response = virtualQueueService.heartbeat(eventId, user.getId(), queueToken);
            if (response == null) {
                return ResponseEntity.badRequest().body("Queue token not found or expired");
            }
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Cannot heartbeat waiting room: " + ex.getMessage());
        }
    }

    @PostMapping("/{eventId}/beacon-release/{queueToken}")
    public ResponseEntity<?> beaconRelease(@PathVariable Long eventId,
                                           @PathVariable String queueToken) {
        try {
            virtualQueueService.releaseAdmissionByToken(eventId, queueToken);
            return ResponseEntity.ok().build();
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Cannot release waiting room token: " + ex.getMessage());
        }
    }

    private User resolveUser(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Missing bearer token");
        }

        String token = authorizationHeader.substring(7).trim();
        if (!jwtUtil.isTokenValid(token)) {
            throw new IllegalArgumentException("Invalid bearer token");
        }

        String username = jwtUtil.extractUsername(token);
        User user = userService.findByUsername(username);
        if (user == null) {
            throw new IllegalArgumentException("User not found");
        }

        return user;
    }
}
