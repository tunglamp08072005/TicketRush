package com.ticketrush.controller;

import com.ticketrush.dto.UpdateProfileRequest;
import com.ticketrush.dto.UserProfileResponse;
import com.ticketrush.entity.User;
import com.ticketrush.service.UserService;
import com.ticketrush.util.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/user")
public class UserProfileController {

    private final UserService userService;
    private final JwtUtil jwtUtil;

    public UserProfileController(UserService userService, JwtUtil jwtUtil) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        User user = resolveUserFromAuthorizationHeader(authorizationHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Invalid or missing token");
        }

        return ResponseEntity.ok(toProfileResponse(user));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody UpdateProfileRequest request
    ) {
        User user = resolveUserFromAuthorizationHeader(authorizationHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Invalid or missing token");
        }

        String normalizedPhone = normalizePhoneNumber(request.getPhoneNumber());
        if (!normalizedPhone.isEmpty() && !normalizedPhone.matches("^[0-9+\\-()\\s]{8,20}$")) {
            return ResponseEntity.badRequest().body("Phone number format is invalid");
        }

        user.setProfileText(trimToNull(request.getProfile()));
        user.setAvatarUrl(trimToNull(request.getAvatarUrl()));
        user.setPhoneNumber(normalizedPhone.isEmpty() ? null : normalizedPhone);

        User saved = userService.saveExistingUser(user);
        return ResponseEntity.ok(toProfileResponse(saved));
    }

    private User resolveUserFromAuthorizationHeader(String authorizationHeader) {
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

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizePhoneNumber(String value) {
        if (value == null) {
            return "";
        }
        return value.trim();
    }

    private UserProfileResponse toProfileResponse(User user) {
        return new UserProfileResponse(
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                user.getProfileText(),
                user.getAvatarUrl(),
                user.getPhoneNumber()
        );
    }
}
