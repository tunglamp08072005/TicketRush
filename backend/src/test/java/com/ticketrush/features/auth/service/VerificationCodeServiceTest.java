package com.ticketrush.features.auth.service;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class VerificationCodeServiceTest {

    @Test
    void issueAndConsumeRegistrationCode_successAndOneTime() {
        VerificationCodeService service = new VerificationCodeService();
        ReflectionTestUtils.setField(service, "expirationMinutes", 10L);

        String code = service.issueRegistrationCode("  USER@Mail.Com ", "alice", "secret");

        assertNotNull(code);
        assertEquals(6, code.length());

        VerificationCodeService.PendingRegistration pending =
                service.consumeValidRegistration("user@mail.com", code);
        assertNotNull(pending);
        assertEquals("alice", pending.username());
        assertEquals("secret", pending.rawPassword());

        VerificationCodeService.PendingRegistration consumedAgain =
                service.consumeValidRegistration("user@mail.com", code);
        assertNull(consumedAgain);
    }

    @Test
    void consumeRegistrationCode_returnsNullWhenExpired() throws InterruptedException {
        VerificationCodeService service = new VerificationCodeService();
        ReflectionTestUtils.setField(service, "expirationMinutes", 0L);

        String code = service.issueRegistrationCode("user@mail.com", "alice", "secret");
        Thread.sleep(5L);

        VerificationCodeService.PendingRegistration pending =
                service.consumeValidRegistration("user@mail.com", code);
        assertNull(pending);
    }

    @Test
    void resetCode_validateAndConsume() {
        VerificationCodeService service = new VerificationCodeService();
        ReflectionTestUtils.setField(service, "expirationMinutes", 10L);

        String code = service.issueResetCode("user@mail.com");

        assertTrue(service.validateAndConsumeResetCode("user@mail.com", code));
        assertFalse(service.validateAndConsumeResetCode("user@mail.com", code));
    }

    @Test
    void resetCode_returnsFalseWhenWrongCode() {
        VerificationCodeService service = new VerificationCodeService();
        ReflectionTestUtils.setField(service, "expirationMinutes", 10L);
        service.issueResetCode("user@mail.com");

        assertFalse(service.validateAndConsumeResetCode("user@mail.com", "000000"));
    }
}
