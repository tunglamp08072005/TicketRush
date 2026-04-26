package com.ticketrush.features.auth.service;

import com.ticketrush.features.auth.messaging.AuthEmailMessage;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AuthEmailQueueProducer {

    private final RabbitTemplate rabbitTemplate;

    @Value("${app.auth.email.exchange-name}")
    private String exchangeName;

    @Value("${app.auth.email.routing-key}")
    private String routingKey;

    public AuthEmailQueueProducer(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void enqueueVerificationEmail(String toEmail, String subject, String content) {
        AuthEmailMessage message = new AuthEmailMessage(toEmail, subject, content);
        rabbitTemplate.convertAndSend(exchangeName, routingKey, message);
    }
}
