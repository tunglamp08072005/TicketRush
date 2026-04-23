package com.ticketrush.common.security;

import com.ticketrush.features.user.entity.User;
import com.ticketrush.features.user.service.UserService;
import com.ticketrush.common.util.JwtUtil;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtUtil jwtUtil;
    private final UserService userService;

    public WebSocketAuthChannelInterceptor(JwtUtil jwtUtil, UserService userService) {
        this.jwtUtil = jwtUtil;
        this.userService = userService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authorization = firstNativeHeader(accessor, "Authorization");
            if (authorization == null || !authorization.startsWith("Bearer ")) {
                throw new AccessDeniedException("Missing Authorization header");
            }

            String token = authorization.substring(7).trim();
            if (!jwtUtil.isTokenValid(token)) {
                throw new AccessDeniedException("Invalid token");
            }

            String username = jwtUtil.extractUsername(token);
            User user = userService.findByUsername(username);
            if (user == null) {
                throw new AccessDeniedException("User not found");
            }

            String role = userService.normalizeRole(user.getRole());
            UsernamePasswordAuthenticationToken principal = new UsernamePasswordAuthenticationToken(
                    username,
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + role))
            );
            accessor.setUser(principal);
            accessor.getSessionAttributes().put("userId", user.getId());
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            if (accessor.getUser() == null) {
                throw new AccessDeniedException("Unauthorized subscription");
            }

            String destination = accessor.getDestination();
            if (destination != null && destination.startsWith("/topic/event/")) {
                return message;
            }

            throw new AccessDeniedException("Subscription destination is not allowed");
        }

        return message;
    }

    private String firstNativeHeader(StompHeaderAccessor accessor, String header) {
        List<String> values = accessor.getNativeHeader(header);
        if (values == null || values.isEmpty()) {
            return null;
        }
        return values.get(0);
    }
}
