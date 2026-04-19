package com.ticketrush.service;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class FlashSaleOrderProducer {

    private final RabbitTemplate rabbitTemplate;

    @Value("${app.flash-sale.exchange-name}")
    private String exchangeName;

    @Value("${app.flash-sale.routing-key}")
    private String routingKey;

    public FlashSaleOrderProducer(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void enqueue(OrderRequestMessage message) {
        rabbitTemplate.convertAndSend(exchangeName, routingKey, message);
    }
}
