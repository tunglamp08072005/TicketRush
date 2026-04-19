package com.ticketrush.controller;

import com.ticketrush.dto.AdminPaymentReviewRequest;
import com.ticketrush.dto.PaymentOrderDto;
import com.ticketrush.entity.User;
import com.ticketrush.service.PaymentService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Arrays;

@RestController
@RequestMapping
public class PaymentController {

    private final PaymentService paymentService;
    private final JwtUtil jwtUtil;
    private final UserService userService;

    public PaymentController(PaymentService paymentService, JwtUtil jwtUtil, UserService userService) {
        this.paymentService = paymentService;
        this.jwtUtil = jwtUtil;
        this.userService = userService;
    }

    @PostMapping("/api/user/payments/checkout")
    public ResponseEntity<?> checkoutPayment(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam("eventId") Long eventId,
            @RequestParam("seatIds") String seatIdsRaw,
            @RequestParam("paymentProof") MultipartFile paymentProof
    ) {
        try {
            User user = resolveUser(authorizationHeader);
            List<Long> seatIds = Arrays.stream(seatIdsRaw.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(Long::valueOf)
                .toList();

            PaymentOrderDto response = paymentService.createCheckoutOrder(user, eventId, seatIds, paymentProof);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Không thể tạo đơn thanh toán: " + ex.getMessage());
        }
    }

    @GetMapping("/api/user/payments")
    public ResponseEntity<?> getMyPayments(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        try {
            User user = resolveUser(authorizationHeader);
            List<PaymentOrderDto> response = paymentService.getMyOrders(user);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Không thể tải danh sách thanh toán: " + ex.getMessage());
        }
    }

    @GetMapping("/api/admin/payments")
    public ResponseEntity<?> getPendingPayments(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        if (!isAdminRequest(authorizationHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only admin can access this endpoint");
        }

        try {
            List<PaymentOrderDto> response = paymentService.getPendingPaymentOrders();
            return ResponseEntity.ok(response);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Không thể tải danh sách cần duyệt: " + ex.getMessage());
        }
    }

    @PostMapping("/api/admin/payments/{orderId}/approve")
    public ResponseEntity<?> approvePayment(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long orderId,
            @RequestBody(required = false) AdminPaymentReviewRequest request
    ) {
        if (!isAdminRequest(authorizationHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only admin can access this endpoint");
        }

        try {
            String note = request == null ? null : request.getNote();
            PaymentOrderDto response = paymentService.approvePayment(orderId, note);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Không thể duyệt thanh toán: " + ex.getMessage());
        }
    }

    @PostMapping("/api/admin/payments/{orderId}/reject")
    public ResponseEntity<?> rejectPayment(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long orderId,
            @RequestBody(required = false) AdminPaymentReviewRequest request
    ) {
        if (!isAdminRequest(authorizationHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only admin can access this endpoint");
        }

        try {
            String note = request == null ? null : request.getNote();
            PaymentOrderDto response = paymentService.rejectPayment(orderId, note);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Không thể từ chối thanh toán: " + ex.getMessage());
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

    private boolean isAdminRequest(String authorizationHeader) {
        User user;
        try {
            user = resolveUser(authorizationHeader);
        } catch (Exception ex) {
            return false;
        }
        return "ADMIN".equals(userService.normalizeRole(user.getRole()));
    }
}
