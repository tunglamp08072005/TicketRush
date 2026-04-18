package com.ticketrush.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class VerificationCodeService {
    private final Random random = new Random();

    @Value("${app.auth.code-expiration-minutes:10}")
    private long expirationMinutes;

    private final Map<String, CodeRecord> registerCodes = new ConcurrentHashMap<>();
    private final Map<String, PendingRegistration> pendingRegistrations = new ConcurrentHashMap<>();
    private final Map<String, CodeRecord> resetCodes = new ConcurrentHashMap<>();

    public String issueRegistrationCode(String email, String username, String rawPassword) {
        String normalizedEmail = normalize(email);
        String code = generateCode();
        Instant expiresAt = Instant.now().plusSeconds(expirationMinutes * 60);

        registerCodes.put(normalizedEmail, new CodeRecord(code, expiresAt));
        pendingRegistrations.put(normalizedEmail, new PendingRegistration(username, rawPassword));
        return code;
    }

    public PendingRegistration consumeValidRegistration(String email, String code) {
        String normalizedEmail = normalize(email);
        CodeRecord record = registerCodes.get(normalizedEmail);
        PendingRegistration pending = pendingRegistrations.get(normalizedEmail);

        if (record == null || pending == null || !record.code().equals(code) || record.expiresAt().isBefore(Instant.now())) {
            return null;
        }

        registerCodes.remove(normalizedEmail);
        pendingRegistrations.remove(normalizedEmail);
        return pending;
    }

    public String issueResetCode(String email) {
        String normalizedEmail = normalize(email);
        String code = generateCode();
        Instant expiresAt = Instant.now().plusSeconds(expirationMinutes * 60);
        resetCodes.put(normalizedEmail, new CodeRecord(code, expiresAt));
        return code;
    }

    public boolean validateAndConsumeResetCode(String email, String code) {
        String normalizedEmail = normalize(email);
        CodeRecord record = resetCodes.get(normalizedEmail);

        if (record == null || !record.code().equals(code) || record.expiresAt().isBefore(Instant.now())) {
            return false;
        }

        resetCodes.remove(normalizedEmail);
        return true;
    }

    private String generateCode() {
        int value = 100000 + random.nextInt(900000);
        return String.valueOf(value);
    }

    private String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    public record PendingRegistration(String username, String rawPassword) {
    }

    private record CodeRecord(String code, Instant expiresAt) {
    }
}
