package com.ticketrush.features.payment.controller;

import com.ticketrush.features.payment.dto.AdminPaymentReviewRequest;
import com.ticketrush.features.payment.dto.PaymentOrderDto;
import com.ticketrush.features.payment.dto.SeatHoldResponseDto;
import com.ticketrush.features.payment.dto.SeatReleaseResponseDto;
import com.ticketrush.features.payment.dto.VnPayCheckoutResponseDto;
import com.ticketrush.features.payment.dto.VnPayReturnResponseDto;
import com.ticketrush.features.order.service.VirtualQueueService;
import com.ticketrush.features.user.entity.User;
import com.ticketrush.features.payment.service.PaymentService;
import com.ticketrush.features.user.service.UserService;
import com.ticketrush.common.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
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
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.Arrays;

@RestController
@RequestMapping
public class PaymentController {

    private final PaymentService paymentService;
    private final VirtualQueueService virtualQueueService;
    private final JwtUtil jwtUtil;
    private final UserService userService;

    @Value("${app.payment.result-url:http://localhost:5173/payment-result}")
    private String paymentResultUrl;

    public PaymentController(PaymentService paymentService,
                             VirtualQueueService virtualQueueService,
                             JwtUtil jwtUtil,
                             UserService userService) {
        this.paymentService = paymentService;
        this.virtualQueueService = virtualQueueService;
        this.jwtUtil = jwtUtil;
        this.userService = userService;
    }

    @PostMapping("/api/user/payments/checkout")
    public ResponseEntity<?> checkoutPayment(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestHeader(value = "X-Queue-Token", required = false) String queueToken,
            @RequestParam("eventId") Long eventId,
            @RequestParam("seatIds") String seatIdsRaw,
            @RequestParam("paymentProof") MultipartFile paymentProof
    ) {
        try {
            User user = resolveUser(authorizationHeader);
            virtualQueueService.assertAdmittedAndRefresh(eventId, user.getId(), queueToken);
            List<Long> seatIds = Arrays.stream(seatIdsRaw.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(Long::valueOf)
                .toList();

            PaymentOrderDto response = paymentService.createCheckoutOrder(user, eventId, seatIds, paymentProof);
            virtualQueueService.releaseAdmission(eventId, user.getId(), queueToken);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Không thể tạo đơn thanh toán: " + ex.getMessage());
        }
    }

    @PostMapping("/api/user/payments/vnpay")
    public ResponseEntity<?> createVnPayPayment(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestHeader(value = "X-Queue-Token", required = false) String queueToken,
            @RequestParam("eventId") Long eventId,
            @RequestParam("seatIds") String seatIdsRaw,
            HttpServletRequest request
    ) {
        try {
            User user = resolveUser(authorizationHeader);
            virtualQueueService.assertAdmittedAndRefresh(eventId, user.getId(), queueToken);
            VnPayCheckoutResponseDto response = paymentService.createVnPayCheckout(
                    user,
                    eventId,
                    parseSeatIds(seatIdsRaw),
                    extractClientIp(request)
            );
            virtualQueueService.releaseAdmission(eventId, user.getId(), queueToken);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Không thể tạo thanh toán VNPAY: " + ex.getMessage());
        }
    }

    @GetMapping("/api/public/payments/vnpay/return")
    public ResponseEntity<Void> handleVnPayReturn(@RequestParam Map<String, String> requestParams) {
        VnPayReturnResponseDto result = paymentService.handleVnPayReturn(requestParams);
        URI redirectUri = UriComponentsBuilder.fromUriString(paymentResultUrl)
                .queryParam("success", result.success())
                .queryParam("orderId", result.orderId())
                .queryParam("queueId", result.queueId())
                .queryParam("message", result.message())
                .build()
                .encode()
                .toUri();
        return ResponseEntity.status(HttpStatus.FOUND).location(redirectUri).build();
    }

    @PostMapping("/api/user/payments/hold")
    public ResponseEntity<?> holdSeats(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestHeader(value = "X-Queue-Token", required = false) String queueToken,
            @RequestParam("eventId") Long eventId,
            @RequestParam("seatIds") String seatIdsRaw
    ) {
        try {
            User user = resolveUser(authorizationHeader);
            virtualQueueService.assertAdmittedAndRefresh(eventId, user.getId(), queueToken);
            List<Long> seatIds = Arrays.stream(seatIdsRaw.split(","))
                    .map(String::trim)
                    .filter(value -> !value.isBlank())
                    .map(Long::valueOf)
                    .toList();

            SeatHoldResponseDto response = paymentService.holdSeatsForCheckout(user, eventId, seatIds);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Không thể giữ ghế: " + ex.getMessage());
        }
    }

    @PostMapping("/api/user/payments/release-hold")
    public ResponseEntity<?> releaseHeldSeats(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam("eventId") Long eventId,
            @RequestParam("seatIds") String seatIdsRaw
    ) {
        try {
            User user = resolveUser(authorizationHeader);
            List<Long> seatIds = Arrays.stream(seatIdsRaw.split(","))
                    .map(String::trim)
                    .filter(value -> !value.isBlank())
                    .map(Long::valueOf)
                    .toList();

            SeatReleaseResponseDto response = paymentService.releaseHeldSeats(user, eventId, seatIds);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Không thể xóa giữ ghế: " + ex.getMessage());
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

    private List<Long> parseSeatIds(String seatIdsRaw) {
        return Arrays.stream(seatIdsRaw.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(Long::valueOf)
                .toList();
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
