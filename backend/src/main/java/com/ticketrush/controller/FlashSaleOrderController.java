package com.ticketrush.controller;

import com.ticketrush.dto.FlashSaleOrderAcceptedResponse;
import com.ticketrush.dto.FlashSaleOrderRequest;
import com.ticketrush.dto.QueueStatusResponse;
import com.ticketrush.entity.User;
import com.ticketrush.service.FlashSaleOrderService;
import com.ticketrush.service.UserService;
import com.ticketrush.util.JwtUtil;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/flash-sale/orders")
public class FlashSaleOrderController {

    private final FlashSaleOrderService flashSaleOrderService;
    private final JwtUtil jwtUtil;
    private final UserService userService;

    public FlashSaleOrderController(FlashSaleOrderService flashSaleOrderService, JwtUtil jwtUtil, UserService userService) {
        this.flashSaleOrderService = flashSaleOrderService;
        this.jwtUtil = jwtUtil;
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<?> submitOrder(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @Valid @RequestBody FlashSaleOrderRequest request
    ) {
        try {
            User user = resolveUser(authorizationHeader);
            FlashSaleOrderAcceptedResponse response = flashSaleOrderService.submitOrder(user, request);
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Cannot process flash-sale request: " + ex.getMessage());
        }
    }

    @GetMapping("/{queueId}")
    public ResponseEntity<?> getQueueStatus(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable String queueId
    ) {
        try {
            User user = resolveUser(authorizationHeader);
            QueueStatusResponse response = flashSaleOrderService.getQueueStatus(user, queueId);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Cannot fetch queue status: " + ex.getMessage());
        }
    }

    private User resolveUser(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Missing bearer token");
        }

        String token = authorizationHeader.substring(7).trim();
        if (!jwtUtil.isTokenValid(token)) {
            throw new IllegalArgumentException("Invalid bearer token");
        }

        String username = jwtUtil.extractUsername(token);
        User user = userService.findByUsername(username);
        if (user == null) {
            throw new IllegalArgumentException("User not found");
        }

        return user;
    }
}
