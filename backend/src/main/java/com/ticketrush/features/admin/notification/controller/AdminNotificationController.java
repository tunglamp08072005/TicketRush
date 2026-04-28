package com.ticketrush.features.admin.notification.controller;

import com.ticketrush.common.util.JwtUtil;
import com.ticketrush.features.admin.notification.entity.AdminNotification;
import com.ticketrush.features.admin.notification.service.AdminNotificationService;
import com.ticketrush.features.user.entity.User;
import com.ticketrush.features.user.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/admin/notifications")
public class AdminNotificationController {
    @Autowired
    private AdminNotificationService notificationService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserService userService;

    /**
     * Get all admin notifications
     */
    @GetMapping
    public ResponseEntity<?> getNotifications(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam(defaultValue = "20") int limit) {
        if (!isAdminRequest(authorizationHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only admin can access this endpoint");
        }
        try {
            List<AdminNotification> notifications = notificationService.getAllNotifications(limit);
            return ResponseEntity.ok(notifications);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error fetching notifications: " + e.getMessage());
        }
    }

    /**
     * Get notification stats
     */
    @GetMapping("/stats")
    public ResponseEntity<?> getStats(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        if (!isAdminRequest(authorizationHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only admin can access this endpoint");
        }
        try {
            Map<String, Object> stats = notificationService.getNotificationStats();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error fetching stats: " + e.getMessage());
        }
    }

    /**
     * Mark notification as read
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long id) {
        if (!isAdminRequest(authorizationHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only admin can access this endpoint");
        }
        try {
            notificationService.markAsRead(id);
            return ResponseEntity.ok("Notification marked as read");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error marking notification as read: " + e.getMessage());
        }
    }

    /**
     * Mark all notifications as read
     */
    @PutMapping("/read-all")
    public ResponseEntity<?> markAllAsRead(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        if (!isAdminRequest(authorizationHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only admin can access this endpoint");
        }
        try {
            notificationService.markAllAsRead();
            return ResponseEntity.ok("All notifications marked as read");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error marking all notifications as read: " + e.getMessage());
        }
    }

    /**
     * Get unread count
     */
    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        if (!isAdminRequest(authorizationHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only admin can access this endpoint");
        }
        try {
            long count = notificationService.getUnreadCount();
            return ResponseEntity.ok(Map.of("unreadCount", count));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error fetching unread count: " + e.getMessage());
        }
    }

    /**
     * Check if the request comes from an admin user
     */
    private boolean isAdminRequest(String authorizationHeader) {
        User user;
        try {
            user = resolveUser(authorizationHeader);
        } catch (Exception ex) {
            return false;
        }
        return user != null && "ADMIN".equals(userService.normalizeRole(user.getRole()));
    }

    private User resolveUser(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return null;
        }

        String token = authorizationHeader.substring(7).trim();
        if (!jwtUtil.isTokenValid(token)) {
            return null;
        }

        String username = jwtUtil.extractUsername(token);
        return userService.findByUsername(username);
    }
}
