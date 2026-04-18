package com.ticketrush.config;

import com.ticketrush.entity.User;
import com.ticketrush.service.UserService;
import com.ticketrush.util.JwtUtil;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.UUID;

@Component
public class OAuth2AuthenticationSuccessHandler implements AuthenticationSuccessHandler {

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

            User user = userService.findByUsername(email);
            if (user == null) {
                User newUser = new User();
                newUser.setUsername(email);
                newUser.setPassword(UUID.randomUUID().toString());
                newUser.setRole("USER");
                user = userService.saveUser(newUser);
            }

            String role = user.getRole() == null ? "USER" : user.getRole().toUpperCase();
            String token = jwtUtil.generateToken(user.getUsername());

            String targetUrl = UriComponentsBuilder.fromUriString(redirectUri)
                    .queryParam("token", token)
                    .queryParam("role", role)
                    .queryParam("username", user.getUsername())
                    .build()
                    .toUriString();

            response.sendRedirect(targetUrl);
        } catch (Exception ex) {
            response.sendRedirect(UriComponentsBuilder.fromUriString(redirectUri)
                    .queryParam("error", "google_auth_internal_error")
                    .build()
                    .toUriString());
        }
    }
}
