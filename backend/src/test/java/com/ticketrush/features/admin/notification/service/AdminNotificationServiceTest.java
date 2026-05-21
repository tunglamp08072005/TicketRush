package com.ticketrush.features.admin.notification.service;

import com.ticketrush.features.admin.notification.entity.AdminNotification;
import com.ticketrush.features.admin.notification.repository.AdminNotificationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminNotificationServiceTest {

    @Mock
    private AdminNotificationRepository repository;

    @InjectMocks
    private AdminNotificationService service;

    @Test
    void createNotification_setsAllFieldsAndSaves() {
        when(repository.save(any(AdminNotification.class))).thenAnswer(inv -> inv.getArgument(0));

        AdminNotification created = service.createNotification(
                "Thanh toán chờ duyệt",
                "Đơn #5",
                AdminNotificationService.NotificationType.PAYMENT_PENDING,
                5L,
                "/admin/payments"
        );

        assertEquals("Thanh toán chờ duyệt", created.getTitle());
        assertEquals("Đơn #5", created.getMessage());
        assertEquals("payment_pending", created.getType());
        assertFalse(created.getIsRead());
        assertEquals(5L, created.getRelatedId());
        assertEquals("/admin/payments", created.getActionUrl());
        assertNotNull(created.getCreatedAt());
    }

    @Test
    void getAllNotifications_appliesLimit() {
        when(repository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(
                notif("a", false), notif("b", true), notif("c", false)
        ));

        List<AdminNotification> result = service.getAllNotifications(2);

        assertEquals(2, result.size());
        assertEquals("a", result.get(0).getTitle());
    }

    @Test
    void getNotificationStats_countsByTypeAndUnread() {
        AdminNotification n1 = notif("1", false);
        n1.setType("payment_pending");
        AdminNotification n2 = notif("2", true);
        n2.setType("payment_review");
        AdminNotification n3 = notif("3", false);
        n3.setType("system");
        when(repository.findAll()).thenReturn(List.of(n1, n2, n3));

        Map<String, Object> stats = service.getNotificationStats();

        assertEquals(3, stats.get("total"));
        assertEquals(2L, stats.get("unread"));
        Map<?, ?> byType = (Map<?, ?>) stats.get("byType");
        assertEquals(1, byType.get("payment_pending"));
        assertEquals(1, byType.get("payment_review"));
        assertEquals(1, byType.get("system"));
    }

    @Test
    void markAsRead_updatesWhenFound() {
        AdminNotification notification = notif("x", false);
        when(repository.findById(10L)).thenReturn(Optional.of(notification));

        service.markAsRead(10L);

        assertTrue(notification.getIsRead());
        verify(repository).save(notification);
    }

    @Test
    void markAllAsRead_marksUnreadAndSavesAll() {
        AdminNotification a = notif("a", false);
        AdminNotification b = notif("b", false);
        when(repository.findByIsReadFalse()).thenReturn(List.of(a, b));

        service.markAllAsRead();

        assertTrue(a.getIsRead());
        assertTrue(b.getIsRead());
        ArgumentCaptor<List<AdminNotification>> captor = ArgumentCaptor.forClass(List.class);
        verify(repository).saveAll(captor.capture());
        assertEquals(2, captor.getValue().size());
    }

    @Test
    void deleteOldNotifications_deletesBeforeThirtyDays() {
        service.deleteOldNotifications();
        verify(repository).deleteByCreatedAtBefore(any(LocalDateTime.class));
    }

    @Test
    void getPendingPaymentsCount_castsRepositoryCount() {
        when(repository.countByTypeIn(List.of("payment_pending", "payment_review"))).thenReturn(7L);
        assertEquals(7, service.getPendingPaymentsCount());
    }

    private AdminNotification notif(String title, boolean isRead) {
        AdminNotification n = new AdminNotification();
        n.setTitle(title);
        n.setMessage("m");
        n.setType("event_alert");
        n.setIsRead(isRead);
        n.setCreatedAt(LocalDateTime.now());
        return n;
    }
}

