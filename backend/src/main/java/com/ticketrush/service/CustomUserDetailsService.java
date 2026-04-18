package com.ticketrush.service;

import com.ticketrush.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
// Do not import org.springframework.security.core.userdetails.User to avoid ambiguity
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {
    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String usernameOrEmail) throws UsernameNotFoundException {
        String normalized = usernameOrEmail == null ? "" : usernameOrEmail.trim();
        com.ticketrush.entity.User user = userRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase(normalized, normalized)
            .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        String role = user.getRole() == null || user.getRole().isBlank() ? "USER" : user.getRole().toUpperCase();

        return org.springframework.security.core.userdetails.User.withUsername(user.getUsername())
            .password(user.getPassword())
            .roles(role)
            .build();
    }
}
