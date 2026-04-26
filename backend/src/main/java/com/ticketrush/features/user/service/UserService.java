package com.ticketrush.features.user.service;

import com.ticketrush.features.user.dto.AdminUserItemDto;
import com.ticketrush.features.user.dto.AdminUsersOverviewResponse;
import com.ticketrush.features.user.entity.User;
import com.ticketrush.features.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public User saveUser(User user) {
        user.setUsername(normalizeUsername(user.getUsername()));
        user.setEmail(normalizeEmail(user.getEmail()));
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        if (user.getRole() == null || user.getRole().isBlank()) {
            user.setRole("USER");
        } else {
            user.setRole(normalizeRole(user.getRole()));
        }
        return userRepository.save(user);
    }

    public String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            return "USER";
        }

        String normalized = role.trim().toUpperCase();
        if (normalized.startsWith("ROLE_")) {
            normalized = normalized.substring(5);
        }

        return normalized;
    }

    public boolean existsByUsername(String username) {
        return userRepository.existsByUsernameIgnoreCase(normalizeUsername(username));
    }

    public boolean existsByEmail(String email) {
        return userRepository.existsByEmailIgnoreCase(normalizeEmail(email));
    }

    public User findByUsername(String username) {
        return userRepository.findByUsernameIgnoreCase(normalizeUsername(username)).orElse(null);
    }

    public User findByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(normalizeEmail(email)).orElse(null);
    }

    public User findByUsernameOrEmail(String value) {
        String normalizedValue = value == null ? null : value.trim();
        if (normalizedValue == null || normalizedValue.isBlank()) {
            return null;
        }
        return userRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase(normalizeUsername(normalizedValue), normalizeEmail(normalizedValue))
                .orElse(null);
    }

    public void updatePassword(User user, String rawPassword) {
        user.setPassword(passwordEncoder.encode(rawPassword));
        userRepository.save(user);
    }

    public User saveExistingUser(User user) {
        user.setUsername(normalizeUsername(user.getUsername()));
        user.setEmail(normalizeEmail(user.getEmail()));
        return userRepository.save(user);
    }

        public AdminUsersOverviewResponse getAdminUsersOverview() {
        List<User> users = userRepository.findAll().stream()
            .sorted(Comparator.comparing(User::getId).reversed())
            .toList();

        List<AdminUserItemDto> userItems = users.stream()
            .map(user -> {
                boolean hasProfile = hasText(user.getProfileText());
                boolean hasPhoneNumber = hasText(user.getPhoneNumber());
                String adminDisplayName = hasProfile ? user.getProfileText().trim() : user.getUsername();

                return new AdminUserItemDto(
                    user.getId(),
                    adminDisplayName,
                    user.getEmail(),
                    normalizeRole(user.getRole()),
                    hasProfile && hasPhoneNumber,
                    hasPhoneNumber
                );
            })
            .toList();

        int totalUsers = userItems.size();
        int totalAdmins = (int) userItems.stream().filter(item -> "ADMIN".equals(item.getRole())).count();
        int totalStandardUsers = (int) userItems.stream().filter(item -> "USER".equals(item.getRole())).count();
        int completedProfileUsers = (int) userItems.stream().filter(AdminUserItemDto::isProfileCompleted).count();
        int usersWithPhoneNumber = (int) userItems.stream().filter(AdminUserItemDto::isHasPhoneNumber).count();

        return new AdminUsersOverviewResponse(
            totalUsers,
            totalAdmins,
            totalStandardUsers,
            completedProfileUsers,
            usersWithPhoneNumber,
            userItems
        );
        }

    public String resolveAvailableUsername(String preferredUsername, String fallbackUsername, Long currentUserId) {
        String preferred = normalizeUsername(preferredUsername);
        String fallback = normalizeUsername(fallbackUsername);

        if (preferred != null && !preferred.isBlank() && isUsernameAvailableForUser(preferred, currentUserId)) {
            return preferred;
        }

        String base = (fallback != null && !fallback.isBlank()) ? fallback : "user";
        if (isUsernameAvailableForUser(base, currentUserId)) {
            return base;
        }

        int suffix = 1;
        while (true) {
            String candidate = base + suffix;
            if (isUsernameAvailableForUser(candidate, currentUserId)) {
                return candidate;
            }
            suffix++;
        }
    }

    private boolean isUsernameAvailableForUser(String username, Long currentUserId) {
        User existing = findByUsername(username);
        return existing == null || (currentUserId != null && currentUserId.equals(existing.getId()));
    }

    private String normalizeUsername(String username) {
        return username == null ? null : username.trim();
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        String trimmed = email.trim();
        return trimmed.isEmpty() ? null : trimmed.toLowerCase(Locale.ROOT);
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
