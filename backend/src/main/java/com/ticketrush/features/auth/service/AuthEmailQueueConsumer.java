package com.ticketrush.features.auth.service;

import com.ticketrush.features.auth.messaging.AuthEmailMessage;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

@Service
public class AuthEmailQueueConsumer {

    private final EmailService emailService;

    public AuthEmailQueueConsumer(EmailService emailService) {
        this.emailService = emailService;
    }

    @RabbitListener(queues = "${app.auth.email.queue-name}")
    public void consume(AuthEmailMessage message) {
        emailService.sendVerificationCode(message.getToEmail(), message.getSubject(), message.getContent());
    }
}
