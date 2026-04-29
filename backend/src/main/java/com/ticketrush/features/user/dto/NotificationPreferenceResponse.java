package com.ticketrush.features.user.dto;

public class NotificationPreferenceResponse {
    private boolean emailNotificationEnabled;
    private boolean systemNotificationEnabled;

    public NotificationPreferenceResponse() {
    }

    public NotificationPreferenceResponse(boolean emailNotificationEnabled, boolean systemNotificationEnabled) {
        this.emailNotificationEnabled = emailNotificationEnabled;
        this.systemNotificationEnabled = systemNotificationEnabled;
    }

    public boolean isEmailNotificationEnabled() {
        return emailNotificationEnabled;
    }

    public void setEmailNotificationEnabled(boolean emailNotificationEnabled) {
        this.emailNotificationEnabled = emailNotificationEnabled;
    }

    public boolean isSystemNotificationEnabled() {
        return systemNotificationEnabled;
    }

    public void setSystemNotificationEnabled(boolean systemNotificationEnabled) {
        this.systemNotificationEnabled = systemNotificationEnabled;
    }
}
