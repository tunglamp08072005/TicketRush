package com.ticketrush.features.admin.notification.controller;

import com.ticketrush.common.util.JwtUtil;
import com.ticketrush.features.admin.notification.entity.AdminNotification;
import com.ticketrush.features.admin.notification.service.AdminNotificationService;
import com.ticketrush.features.user.entity.User;
import com.ticketrush.features.user.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class AdminNotificationControllerTest {

    private final AdminNotificationService notificationService = Mockito.mock(AdminNotificationService.class);
    private final JwtUtil jwtUtil = Mockito.mock(JwtUtil.class);
    private final UserService userService = Mockito.mock(UserService.class);

    private AdminNotificationController controller;

    @BeforeEach
    void setUp() {
        controller = new AdminNotificationController();
        ReflectionTestUtils.setField(controller, "notificationService", notificationService);
        ReflectionTestUtils.setField(controller, "jwtUtil", jwtUtil);
        ReflectionTestUtils.setField(controller, "userService", userService);
    }

    @Test
    void getNotifications_returnsForbiddenWhenNotAdmin() {
        ResponseEntity<?> response = controller.getNotifications(null, 20);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    void getNotifications_returnsDataWhenAdmin() {
        mockAdminAuthorization();
        when(notificationService.getAllNotifications(5)).thenReturn(List.of(new AdminNotification()));

        ResponseEntity<?> response = controller.getNotifications("Bearer token", 5);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, ((List<?>) response.getBody()).size());
    }

    @Test
    void getStats_returnsDataWhenAdmin() {
        mockAdminAuthorization();
        when(notificationService.getNotificationStats()).thenReturn(Map.of("total", 2));

        ResponseEntity<?> response = controller.getStats("Bearer token");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(2, ((Map<?, ?>) response.getBody()).get("total"));
    }

    @Test
    void markAsRead_callsServiceWhenAdmin() {
        mockAdminAuthorization();

        ResponseEntity<?> response = controller.markAsRead("Bearer token", 10L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(notificationService).markAsRead(10L);
    }

    @Test
    void markAllAsRead_callsServiceWhenAdmin() {
        mockAdminAuthorization();

        ResponseEntity<?> response = controller.markAllAsRead("Bearer token");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(notificationService).markAllAsRead();
    }

    @Test
    void getUnreadCount_returnsCountWhenAdmin() {
        mockAdminAuthorization();
        when(notificationService.getUnreadCount()).thenReturn(6L);

        ResponseEntity<?> response = controller.getUnreadCount("Bearer token");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(6L, ((Map<?, ?>) response.getBody()).get("unreadCount"));
    }

    private void mockAdminAuthorization() {
        when(jwtUtil.isTokenValid("token")).thenReturn(true);
        when(jwtUtil.extractUsername("token")).thenReturn("admin");
        User admin = new User();
        admin.setUsername("admin");
        admin.setRole("ROLE_ADMIN");
        when(userService.findByUsername("admin")).thenReturn(admin);
        when(userService.normalizeRole(anyString())).thenReturn("ADMIN");
    }
}

