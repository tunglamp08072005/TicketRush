package com.ticketrush.features.user.dto;

public class UserProfileResponse {
    private String username;
    private String email;
    private String role;
    private String profile;
    private String avatarUrl;
    private String phoneNumber;
    private String gender;
    private String birthday;
    private boolean emailNotificationEnabled;
    private boolean systemNotificationEnabled;
    private String loginProvider;

    public UserProfileResponse() {
    }

    public UserProfileResponse(String username, String email, String role, String profile, String avatarUrl, String phoneNumber, String gender, String birthday, boolean emailNotificationEnabled, boolean systemNotificationEnabled) {
        this.username = username;
        this.email = email;
        this.role = role;
        this.profile = profile;
        this.avatarUrl = avatarUrl;
        this.phoneNumber = phoneNumber;
        this.gender = gender;
        this.birthday = birthday;
        this.emailNotificationEnabled = emailNotificationEnabled;
        this.systemNotificationEnabled = systemNotificationEnabled;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getProfile() {
        return profile;
    }

    public void setProfile(String profile) {
        this.profile = profile;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getBirthday() {
        return birthday;
    }

    public void setBirthday(String birthday) {
        this.birthday = birthday;
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

    public String getLoginProvider() {
        return loginProvider;
    }

    public void setLoginProvider(String loginProvider) {
        this.loginProvider = loginProvider;
    }
}
