package com.ticketrush.features.user.controller;

import com.ticketrush.features.user.dto.UpdateProfileRequest;
import com.ticketrush.features.user.dto.UserProfileResponse;
import com.ticketrush.features.user.entity.User;
import com.ticketrush.features.event.service.MinioStorageService;
import com.ticketrush.features.user.service.UserService;
import com.ticketrush.common.util.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;

@RestController
@RequestMapping("/api/user")
public class UserProfileController {

    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final MinioStorageService minioStorageService;

    public UserProfileController(UserService userService, JwtUtil jwtUtil, MinioStorageService minioStorageService) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
        this.minioStorageService = minioStorageService;
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

        if (request.getAvatarUrl() != null) {
            String normalizedAvatarUrl = normalizeAvatarUrl(request.getAvatarUrl());
            if (!normalizedAvatarUrl.isEmpty() && !isAcceptedAvatarUrl(normalizedAvatarUrl)) {
                return ResponseEntity.badRequest().body("Avatar URL must be a direct image URL, not a profile page link");
            }
            user.setAvatarUrl(normalizedAvatarUrl.isEmpty() ? null : normalizedAvatarUrl);
        }

        user.setProfileText(trimToNull(request.getProfile()));
        user.setPhoneNumber(normalizedPhone.isEmpty() ? null : normalizedPhone);

        User saved = userService.saveExistingUser(user);
        return ResponseEntity.ok(toProfileResponse(saved));
    }

    @PostMapping("/profile/avatar")
    public ResponseEntity<?> uploadAvatar(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam("file") MultipartFile file
    ) {
        User user = resolveUserFromAuthorizationHeader(authorizationHeader);
        if (user == null) {
            return ResponseEntity.status(401).body("Invalid or missing token");
        }

        try {
            String avatarUrl = minioStorageService.uploadAvatar(file);
            user.setAvatarUrl(avatarUrl);
            User saved = userService.saveExistingUser(user);
            return ResponseEntity.ok(toProfileResponse(saved));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(500).body("Cannot upload avatar: " + ex.getMessage());
        }
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

    private String normalizeAvatarUrl(String value) {
        if (value == null) {
            return "";
        }
        return value.trim();
    }

    private boolean isAcceptedAvatarUrl(String value) {
        try {
            URI uri = new URI(value);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (scheme == null || host == null) {
                return false;
            }

            String normalizedScheme = scheme.toLowerCase(Locale.ROOT);
            String normalizedHost = host.toLowerCase(Locale.ROOT);
            if (!normalizedScheme.equals("http") && !normalizedScheme.equals("https")) {
                return false;
            }

            String path = uri.getPath() == null ? "" : uri.getPath().toLowerCase(Locale.ROOT);
            boolean directImagePath = path.endsWith(".jpg")
                    || path.endsWith(".jpeg")
                    || path.endsWith(".png")
                    || path.endsWith(".webp")
                    || path.endsWith(".gif")
                    || path.endsWith(".svg")
                    || path.endsWith(".bmp")
                    || path.endsWith(".avif");

            boolean socialProfileDomain = normalizedHost.contains("facebook.com")
                    || normalizedHost.contains("instagram.com")
                    || normalizedHost.contains("tiktok.com")
                    || normalizedHost.equals("x.com")
                    || normalizedHost.endsWith(".x.com")
                    || normalizedHost.contains("twitter.com");

            return directImagePath || !socialProfileDomain;
        } catch (URISyntaxException ex) {
            return false;
        }
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
