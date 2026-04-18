package com.ticketrush;

import com.ticketrush.entity.User;
import com.ticketrush.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

@SpringBootApplication
public class TicketRushApplication {
    public static void main(String[] args) {
        SpringApplication.run(TicketRushApplication.class, args);
    }

    @Bean
    CommandLineRunner seedUsers(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            Optional<User> adminOptional = userRepository.findByUsername("admin");
            if (adminOptional.isEmpty()) {
                User admin = new User();
                admin.setUsername("admin");
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin.setRole("ADMIN");
                userRepository.save(admin);
            } else {
                User existingAdmin = adminOptional.get();
                if (!"ADMIN".equalsIgnoreCase(existingAdmin.getRole())) {
                    existingAdmin.setRole("ADMIN");
                    userRepository.save(existingAdmin);
                }
            }

            if (!userRepository.existsByUsername("user")) {
                User normalUser = new User();
                normalUser.setUsername("user");
                normalUser.setPassword(passwordEncoder.encode("user123"));
                normalUser.setRole("USER");
                userRepository.save(normalUser);
            }
        };
    }
}
