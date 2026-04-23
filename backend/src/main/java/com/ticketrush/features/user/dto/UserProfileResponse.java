package com.ticketrush.features.user.dto;

public class UserProfileResponse {
    private String username;
    private String email;
    private String role;
    private String profile;
    private String avatarUrl;
    private String phoneNumber;

    public UserProfileResponse() {
    }

    public UserProfileResponse(String username, String email, String role, String profile, String avatarUrl, String phoneNumber) {
        this.username = username;
        this.email = email;
        this.role = role;
        this.profile = profile;
        this.avatarUrl = avatarUrl;
        this.phoneNumber = phoneNumber;
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
}
