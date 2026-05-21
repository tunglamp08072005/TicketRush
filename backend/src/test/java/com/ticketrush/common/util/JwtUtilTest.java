package com.ticketrush.common.util;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilTest {

    @Test
    void generateAndExtractUsername_success() {
        JwtUtil jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "jwtSecret", "test-secret");
        ReflectionTestUtils.setField(jwtUtil, "jwtExpiration", 60_000L);

        String token = jwtUtil.generateToken("alice");

        assertNotNull(token);
        assertEquals("alice", jwtUtil.extractUsername(token));
        assertTrue(jwtUtil.isTokenValid(token));
    }

    @Test
    void isTokenValid_returnsFalseWhenTokenIsTampered() {
        JwtUtil jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "jwtSecret", "test-secret");
        ReflectionTestUtils.setField(jwtUtil, "jwtExpiration", 60_000L);

        String token = jwtUtil.generateToken("alice");
        String tampered = token + "x";

        assertFalse(jwtUtil.isTokenValid(tampered));
    }

    @Test
    void isTokenValid_returnsFalseWhenExpired() throws InterruptedException {
        JwtUtil jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "jwtSecret", "test-secret");
        ReflectionTestUtils.setField(jwtUtil, "jwtExpiration", 1L);

        String token = jwtUtil.generateToken("alice");
        Thread.sleep(5L);

        assertFalse(jwtUtil.isTokenValid(token));
    }
}

