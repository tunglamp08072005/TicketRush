package com.ticketrush.features.user.dto;

public class NotificationPreferenceRequest {
    private Boolean emailNotificationEnabled;
    private Boolean systemNotificationEnabled;

    public Boolean getEmailNotificationEnabled() {
        return emailNotificationEnabled;
    }

    public void setEmailNotificationEnabled(Boolean emailNotificationEnabled) {
        this.emailNotificationEnabled = emailNotificationEnabled;
    }

    public Boolean getSystemNotificationEnabled() {
        return systemNotificationEnabled;
    }

    public void setSystemNotificationEnabled(Boolean systemNotificationEnabled) {
        this.systemNotificationEnabled = systemNotificationEnabled;
    }
}
