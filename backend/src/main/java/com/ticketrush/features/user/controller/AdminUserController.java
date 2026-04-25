package com.ticketrush.features.user.controller;

import com.ticketrush.common.util.JwtUtil;
import com.ticketrush.features.user.dto.AdminUsersOverviewResponse;
import com.ticketrush.features.user.entity.User;
import com.ticketrush.features.user.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final UserService userService;
    private final JwtUtil jwtUtil;

    public AdminUserController(UserService userService, JwtUtil jwtUtil) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping("/overview")
    public ResponseEntity<?> getOverview(@RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        try {
            User admin = resolveUser(authorizationHeader);
            if (!"ADMIN".equals(userService.normalizeRole(admin.getRole()))) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only admin can access this endpoint");
            }

            AdminUsersOverviewResponse response = userService.getAdminUsersOverview();
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Không thể tải tổng quan người dùng: " + ex.getMessage());
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
