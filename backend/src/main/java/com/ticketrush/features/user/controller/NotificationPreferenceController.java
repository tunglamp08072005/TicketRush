package com.ticketrush.features.user.controller;

import com.ticketrush.features.user.dto.NotificationPreferenceRequest;
import com.ticketrush.features.user.dto.NotificationPreferenceResponse;
import com.ticketrush.features.user.entity.User;
import com.ticketrush.features.user.service.UserService;
import com.ticketrush.common.util.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/user/profile/notification-preferences")
public class NotificationPreferenceController {

    private final UserService userService;
    private final JwtUtil jwtUtil;

    public NotificationPreferenceController(UserService userService, JwtUtil jwtUtil) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping
    public ResponseEntity<?> getPreferences(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        User user = resolveUser(authorizationHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Invalid or missing token");
        }

        return ResponseEntity.ok(new NotificationPreferenceResponse(
                user.isEmailNotificationEnabled(),
                user.isSystemNotificationEnabled()
        ));
    }

    @PutMapping
    public ResponseEntity<?> updatePreferences(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody NotificationPreferenceRequest request) {
        User user = resolveUser(authorizationHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Invalid or missing token");
        }

        if (request.getEmailNotificationEnabled() != null) {
            user.setEmailNotificationEnabled(request.getEmailNotificationEnabled());
        }
        if (request.getSystemNotificationEnabled() != null) {
            user.setSystemNotificationEnabled(request.getSystemNotificationEnabled());
        }

        User saved = userService.saveExistingUser(user);
        return ResponseEntity.ok(new NotificationPreferenceResponse(
                saved.isEmailNotificationEnabled(),
                saved.isSystemNotificationEnabled()
        ));
    }

    private User resolveUser(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return null;
        }

        String token = authorizationHeader.substring(7).trim();
        if (token.isEmpty() || !jwtUtil.isTokenValid(token)) {
            return null;
        }

        String username = jwtUtil.extractUsername(token);
        return userService.findByUsername(username);
    }
}
