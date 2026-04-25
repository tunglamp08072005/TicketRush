package com.ticketrush.features.user.dto;

public class AdminUserItemDto {
    private Long id;
    private String username;
    private String email;
    private String role;
    private boolean profileCompleted;
    private boolean hasPhoneNumber;

    public AdminUserItemDto() {
    }

    public AdminUserItemDto(Long id, String username, String email, String role, boolean profileCompleted, boolean hasPhoneNumber) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.role = role;
        this.profileCompleted = profileCompleted;
        this.hasPhoneNumber = hasPhoneNumber;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public boolean isProfileCompleted() {
        return profileCompleted;
    }

    public void setProfileCompleted(boolean profileCompleted) {
        this.profileCompleted = profileCompleted;
    }

    public boolean isHasPhoneNumber() {
        return hasPhoneNumber;
    }

    public void setHasPhoneNumber(boolean hasPhoneNumber) {
        this.hasPhoneNumber = hasPhoneNumber;
    }
}
