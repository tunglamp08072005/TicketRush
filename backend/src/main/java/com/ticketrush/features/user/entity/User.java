package com.ticketrush.features.user.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String role;

    @Column(name = "profile_text", length = 1000)
    private String profileText;

    @Column(name = "avatar_url", length = 1000)
    private String avatarUrl;

    @Column(name = "phone_number", length = 32)
    private String phoneNumber;

    @Column(name = "email_notification_enabled", nullable = false, columnDefinition = "boolean default true")
    private boolean emailNotificationEnabled = true;

    @Column(name = "system_notification_enabled", nullable = false, columnDefinition = "boolean default true")
    private boolean systemNotificationEnabled = true;

    @Column(name = "gender", length = 20)
    private String gender;

    @Column(name = "birthday")
    private LocalDate birthday;

    @Column(name = "age")
    private Integer age;

    @Column(name = "login_provider", length = 20)
    private String loginProvider; // "LOCAL" or "GOOGLE"

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getProfileText() { return profileText; }
    public void setProfileText(String profileText) { this.profileText = profileText; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    public boolean isEmailNotificationEnabled() { return emailNotificationEnabled; }
    public void setEmailNotificationEnabled(boolean emailNotificationEnabled) { this.emailNotificationEnabled = emailNotificationEnabled; }
    public boolean isSystemNotificationEnabled() { return systemNotificationEnabled; }
    public void setSystemNotificationEnabled(boolean systemNotificationEnabled) { this.systemNotificationEnabled = systemNotificationEnabled; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public LocalDate getBirthday() { return birthday; }
    public void setBirthday(LocalDate birthday) { this.birthday = birthday; }
    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }
    public String getLoginProvider() { return loginProvider; }
    public void setLoginProvider(String loginProvider) { this.loginProvider = loginProvider; }
}
