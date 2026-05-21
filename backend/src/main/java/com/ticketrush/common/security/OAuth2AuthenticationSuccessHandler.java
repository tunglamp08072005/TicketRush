package com.ticketrush.common.security;

import com.ticketrush.features.user.entity.User;
import com.ticketrush.features.user.service.UserService;
import com.ticketrush.common.util.JwtUtil;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Locale;
import java.util.UUID;

@Component
public class OAuth2AuthenticationSuccessHandler implements AuthenticationSuccessHandler {
    private static final Logger log = LoggerFactory.getLogger(OAuth2AuthenticationSuccessHandler.class);

    private final UserService userService;
    private final JwtUtil jwtUtil;

    @Value("${app.oauth2.redirect-uri}")
    private String redirectUri;

    public OAuth2AuthenticationSuccessHandler(UserService userService, JwtUtil jwtUtil) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        try {
            OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();
            String email = oauth2User.getAttribute("email");

            if (email == null || email.isBlank()) {
                response.sendRedirect(UriComponentsBuilder.fromUriString(redirectUri)
                        .queryParam("error", "google_email_not_found")
                        .build()
                        .toUriString());
                return;
            }

            String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
            User user = resolveOrCreateGoogleUser(normalizedEmail);
            if (user == null) {
                response.sendRedirect(UriComponentsBuilder.fromUriString(redirectUri)
                        .queryParam("error", "google_user_resolution_failed")
                        .build()
                        .toUriString());
                return;
            }

            String role = user.getRole() == null ? "USER" : user.getRole().toUpperCase(Locale.ROOT);
            String token = jwtUtil.generateToken(user.getUsername());
            String displayUsername = user.getEmail() == null || user.getEmail().isBlank()
                    ? user.getUsername()
                    : user.getEmail();

            String targetUrl = UriComponentsBuilder.fromUriString(redirectUri)
                    .queryParam("token", token)
                    .queryParam("role", role)
                    .queryParam("username", displayUsername)
                    .build()
                    .toUriString();

            response.sendRedirect(targetUrl);
        } catch (Exception ex) {
            log.error("Google authentication success handler failed", ex);
            String detail = ex.getMessage();
            if (detail != null && detail.length() > 240) {
                detail = detail.substring(0, 240);
            }
            response.sendRedirect(UriComponentsBuilder.fromUriString(redirectUri)
                    .queryParam("error", "google_auth_internal_error")
                    .queryParam("error_detail", detail)
                    .build()
                    .toUriString());
        }
    }

    private User resolveOrCreateGoogleUser(String normalizedEmail) {
        User user = userService.findByEmail(normalizedEmail);
        if (user != null) {
            // Ensure legacy Google users have loginProvider set
            if (user.getLoginProvider() == null || user.getLoginProvider().isBlank()) {
                user.setLoginProvider("GOOGLE");
                user = userService.saveExistingUser(user);
            }
            return ensureGoogleUsernameUsesEmail(user, normalizedEmail);
        }

        user = userService.findByUsername(normalizedEmail);
        if (user != null) {
            if (user.getEmail() == null || user.getEmail().isBlank()) {
                try {
                    user.setEmail(normalizedEmail);
                    // Ensure legacy Google users have loginProvider set
                    if (user.getLoginProvider() == null || user.getLoginProvider().isBlank()) {
                        user.setLoginProvider("GOOGLE");
                    }
                    return userService.saveExistingUser(user);
                } catch (Exception ex) {
                    log.warn("Cannot backfill email for legacy Google user '{}'", user.getUsername(), ex);
                    return userService.findByEmail(normalizedEmail);
                }
            }
            // Ensure legacy Google users have loginProvider set
            if (user.getLoginProvider() == null || user.getLoginProvider().isBlank()) {
                user.setLoginProvider("GOOGLE");
                user = userService.saveExistingUser(user);
            }
            return user;
        }

        try {
            User newUser = new User();
            newUser.setUsername(normalizedEmail);
            newUser.setEmail(normalizedEmail);
            newUser.setPassword(UUID.randomUUID().toString());
            newUser.setRole("USER");
            newUser.setLoginProvider("GOOGLE");
            return userService.saveUser(newUser);
        } catch (Exception ex) {
            log.warn("Cannot create Google user for email '{}'", normalizedEmail, ex);
            return userService.findByEmail(normalizedEmail);
        }
    }

    private User ensureGoogleUsernameUsesEmail(User user, String normalizedEmail) {
        if (user == null) {
            return null;
        }

        String currentUsername = user.getUsername() == null ? "" : user.getUsername().trim();
        if (normalizedEmail.equalsIgnoreCase(currentUsername)) {
            return user;
        }

        User userByEmailAsUsername = userService.findByUsername(normalizedEmail);
        boolean emailUsernameAvailable = userByEmailAsUsername == null
                || (user.getId() != null && user.getId().equals(userByEmailAsUsername.getId()));    

        if (!emailUsernameAvailable) {
            return user;
        }

        try {
            user.setUsername(normalizedEmail);
            return userService.saveExistingUser(user);
        } catch (Exception ex) {
            log.warn("Cannot switch Google username to email for '{}'", normalizedEmail, ex);
            return user;
        }
    }
}
