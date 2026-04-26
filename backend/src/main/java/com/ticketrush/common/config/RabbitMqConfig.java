package com.ticketrush.common.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;

@Configuration
public class RabbitMqConfig {

    @Bean
    public Queue flashSaleQueue(@Value("${app.flash-sale.queue-name}") String queueName) {
        return new Queue(queueName, true);
    }

    @Bean
    public DirectExchange flashSaleExchange(@Value("${app.flash-sale.exchange-name}") String exchangeName) {
        return new DirectExchange(exchangeName, true, false);
    }

    @Bean
    public Binding flashSaleBinding(Queue flashSaleQueue,
                                    DirectExchange flashSaleExchange,
                                    @Value("${app.flash-sale.routing-key}") String routingKey) {
        return BindingBuilder.bind(flashSaleQueue).to(flashSaleExchange).with(routingKey);
    }

    @Bean
    public Queue authEmailQueue(@Value("${app.auth.email.queue-name}") String queueName) {
        return new Queue(queueName, true);
    }

    @Bean
    public DirectExchange authEmailExchange(@Value("${app.auth.email.exchange-name}") String exchangeName) {
        return new DirectExchange(exchangeName, true, false);
    }

    @Bean
    public Binding authEmailBinding(Queue authEmailQueue,
                                    DirectExchange authEmailExchange,
                                    @Value("${app.auth.email.routing-key}") String routingKey) {
        return BindingBuilder.bind(authEmailQueue).to(authEmailExchange).with(routingKey);
    }

    @Bean
    public Jackson2JsonMessageConverter jackson2JsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                         Jackson2JsonMessageConverter converter) {
        RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
        rabbitTemplate.setMessageConverter(converter);
        return rabbitTemplate;
    }

    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
            ConnectionFactory connectionFactory,
            Jackson2JsonMessageConverter converter) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(converter);
        factory.setPrefetchCount(1);
        return factory;
    }
}
