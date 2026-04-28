package com.ticketrush.features.admin.notification.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Helper class to send notifications to admin
 */
@Component
public class AdminNotificationHelper {
    @Autowired
    private AdminNotificationService notificationService;

    /**
     * Notify admin about new pending payment for review
     */
    public void notifyPendingPaymentSubmitted(Long paymentOrderId, String userName) {
        try {
            notificationService.createNotification(
                    "Thanh toan moi cho duyet",
                    "Nguoi dung " + (userName != null ? userName : "khong ro") + " da gui thanh toan moi.",
                    AdminNotificationService.NotificationType.PAYMENT_PENDING,
                    paymentOrderId,
                    "/admin/payments"
            );
        } catch (Exception e) {
            System.err.println("Error creating payment notification: " + e.getMessage());
        }
    }

    /**
     * Notify admin about payment needing review
     */
    public void notifyPaymentNeedsReview(Long paymentOrderId, String userName, String reason) {
        try {
            String message = "Thanh toan tu " + (userName != null ? userName : "nguoi dung") + " can xem xet.";
            if (reason != null && !reason.isBlank()) {
                message += " Ly do: " + reason;
            }

            notificationService.createNotification(
                    "Thanh toan can xem xet",
                    message,
                    AdminNotificationService.NotificationType.PAYMENT_REVIEW,
                    paymentOrderId,
                    "/admin/payments"
            );
        } catch (Exception e) {
            System.err.println("Error creating payment review notification: " + e.getMessage());
        }
    }

    /**
     * Notify admin about system event
     */
    public void notifySystemEvent(String title, String message) {
        try {
            notificationService.createNotification(
                    title,
                    message,
                    AdminNotificationService.NotificationType.SYSTEM,
                    null,
                    null
            );
        } catch (Exception e) {
            System.err.println("Error creating system notification: " + e.getMessage());
        }
    }

    /**
     * Notify admin about event alert
     */
    public void notifyEventAlert(Long eventId, String title, String message) {
        try {
            notificationService.createNotification(
                    title,
                    message,
                    AdminNotificationService.NotificationType.EVENT_ALERT,
                    eventId,
                    "/admin/events"
            );
        } catch (Exception e) {
            System.err.println("Error creating event alert notification: " + e.getMessage());
        }
    }
}
