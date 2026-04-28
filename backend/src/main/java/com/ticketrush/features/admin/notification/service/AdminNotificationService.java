package com.ticketrush.features.admin.notification.service;

import com.ticketrush.features.admin.notification.entity.AdminNotification;
import com.ticketrush.features.admin.notification.repository.AdminNotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdminNotificationService {
    @Autowired
    private AdminNotificationRepository notificationRepository;

    public enum NotificationType {
        PAYMENT_PENDING("payment_pending"),
        PAYMENT_REVIEW("payment_review"),
        EVENT_ALERT("event_alert"),
        SYSTEM("system");

        private final String value;

        NotificationType(String value) {
            this.value = value;
        }

        public String getValue() {
            return value;
        }
    }

    /**
     * Create a notification for admin
     */
    public AdminNotification createNotification(
            String title,
            String message,
            NotificationType type,
            Long relatedId,
            String actionUrl) {
        AdminNotification notification = new AdminNotification();
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type.getValue());
        notification.setIsRead(false);
        notification.setCreatedAt(LocalDateTime.now());
        notification.setRelatedId(relatedId);
        notification.setActionUrl(actionUrl);
        return notificationRepository.save(notification);
    }

    /**
     * Get all admin notifications sorted by date (latest first)
     */
    public List<AdminNotification> getAllNotifications(int limit) {
        return notificationRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .limit(limit)
                .collect(Collectors.toList());
    }

    /**
     * Get unread notifications count
     */
    public long getUnreadCount() {
        return notificationRepository.countByIsReadFalse();
    }

    /**
     * Get notification stats
     */
    public Map<String, Object> getNotificationStats() {
        List<AdminNotification> all = notificationRepository.findAll();
        
        Map<String, Integer> byType = new HashMap<>();
        byType.put("payment_pending", 0);
        byType.put("payment_review", 0);
        byType.put("event_alert", 0);
        byType.put("system", 0);

        long unreadCount = 0;
        for (AdminNotification notif : all) {
            byType.merge(notif.getType(), 1, Integer::sum);
            if (!notif.getIsRead()) {
                unreadCount++;
            }
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("total", all.size());
        stats.put("unread", unreadCount);
        stats.put("byType", byType);
        return stats;
    }

    /**
     * Mark notification as read
     */
    public void markAsRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(notif -> {
            notif.setIsRead(true);
            notificationRepository.save(notif);
        });
    }

    /**
     * Mark all notifications as read
     */
    public void markAllAsRead() {
        List<AdminNotification> unreadNotifications = notificationRepository.findByIsReadFalse();
        unreadNotifications.forEach(notif -> notif.setIsRead(true));
        notificationRepository.saveAll(unreadNotifications);
    }

    /**
     * Delete old notifications (older than 30 days)
     */
    public void deleteOldNotifications() {
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        notificationRepository.deleteByCreatedAtBefore(thirtyDaysAgo);
    }

    /**
     * Get pending payments count for notification
     */
    public int getPendingPaymentsCount() {
        long count = notificationRepository.countByTypeIn(Arrays.asList("payment_pending", "payment_review"));
        return (int) count;
    }
}
