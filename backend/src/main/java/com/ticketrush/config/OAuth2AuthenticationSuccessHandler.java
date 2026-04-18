package com.ticketrush.config;

import com.ticketrush.entity.User;
import com.ticketrush.service.UserService;
import com.ticketrush.util.JwtUtil;
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

            String targetUrl = UriComponentsBuilder.fromUriString(redirectUri)
                    .queryParam("token", token)
                    .queryParam("role", role)
                    .queryParam("username", user.getUsername())
                    .build()
                    .toUriString();

            response.sendRedirect(targetUrl);
        } catch (Exception ex) {
            log.error("Google authentication success handler failed", ex);
            response.sendRedirect(UriComponentsBuilder.fromUriString(redirectUri)
                    .queryParam("error", "google_auth_internal_error")
                    .build()
                    .toUriString());
        }
    }

    private User resolveOrCreateGoogleUser(String normalizedEmail) {
        User user = userService.findByEmail(normalizedEmail);
        if (user != null) {
            return user;
        }

        user = userService.findByUsername(normalizedEmail);
        if (user != null) {
            if (user.getEmail() == null || user.getEmail().isBlank()) {
                try {
                    user.setEmail(normalizedEmail);
                    return userService.saveExistingUser(user);
                } catch (Exception ex) {
                    log.warn("Cannot backfill email for legacy Google user '{}'", user.getUsername(), ex);
                    return userService.findByEmail(normalizedEmail);
                }
            }
            return user;
        }

        try {
            User newUser = new User();
            newUser.setUsername(userService.resolveAvailableUsername(extractEmailPrefix(normalizedEmail), "user", null));
            newUser.setEmail(normalizedEmail);
            newUser.setPassword(UUID.randomUUID().toString());
            newUser.setRole("USER");
            return userService.saveUser(newUser);
        } catch (Exception ex) {
            log.warn("Cannot create Google user for email '{}'", normalizedEmail, ex);
            return userService.findByEmail(normalizedEmail);
        }
    }

    private String extractEmailPrefix(String email) {
        int separatorIndex = email.indexOf('@');
        if (separatorIndex <= 0) {
            return email;
        }
        return email.substring(0, separatorIndex);
    }
}
