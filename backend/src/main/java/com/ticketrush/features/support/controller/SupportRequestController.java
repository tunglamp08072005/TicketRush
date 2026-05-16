package com.ticketrush.features.support.controller;

import com.ticketrush.common.util.JwtUtil;
import com.ticketrush.features.support.service.SupportRequestEmailService;
import com.ticketrush.features.user.entity.User;
import com.ticketrush.features.user.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Locale;
import java.util.Set;

@RestController
@RequestMapping("/api/support")
public class SupportRequestController {

    private static final Set<String> ALLOWED_ISSUE_TYPES = Set.of(
            "payment",
            "account",
            "ticket",
            "feedback",
            "other"
    );

    private final SupportRequestEmailService supportRequestEmailService;
    private final UserService userService;
    private final JwtUtil jwtUtil;

    public SupportRequestController(
            SupportRequestEmailService supportRequestEmailService,
            UserService userService,
            JwtUtil jwtUtil
    ) {
        this.supportRequestEmailService = supportRequestEmailService;
        this.userService = userService;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/requests")
    public ResponseEntity<?> submitSupportRequest(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam("issueType") String issueType,
            @RequestParam("title") String title,
            @RequestParam("content") String content,
            @RequestParam(value = "contactEmail", required = false) String contactEmail,
            @RequestParam(value = "evidence", required = false) MultipartFile evidence
    ) {
        String normalizedIssueType = normalizeIssueType(issueType);
        String normalizedTitle = normalizeRequired(title);
        String normalizedContent = normalizeRequired(content);
        String normalizedContactEmail = normalizeOptional(contactEmail);

        if (!ALLOWED_ISSUE_TYPES.contains(normalizedIssueType)) {
            return ResponseEntity.badRequest().body("Loại sự cố không hợp lệ");
        }
        if (normalizedTitle.length() < 5 || normalizedTitle.length() > 120) {
            return ResponseEntity.badRequest().body("Tiêu đề cần từ 5 đến 120 ký tự");
        }
        if (normalizedContent.length() < 20 || normalizedContent.length() > 4000) {
            return ResponseEntity.badRequest().body("Nội dung cần từ 20 đến 4000 ký tự");
        }
        if (!normalizedContactEmail.isEmpty() && !isValidEmail(normalizedContactEmail)) {
            return ResponseEntity.badRequest().body("Email liên hệ không hợp lệ");
        }
        if (evidence != null && !evidence.isEmpty() && !isAcceptedEvidence(evidence)) {
            return ResponseEntity.badRequest().body("Ảnh minh chứng chỉ hỗ trợ JPG, PNG hoặc WEBP");
        }

        try {
            User user = resolveUserFromAuthorizationHeader(authorizationHeader);
            supportRequestEmailService.sendSupportRequest(
                    normalizedIssueType,
                    normalizedTitle,
                    normalizedContent,
                    normalizedContactEmail,
                    user,
                    evidence
            );
            return ResponseEntity.ok("Yêu cầu hỗ trợ đã được gửi");
        } catch (Exception ex) {
            return ResponseEntity.status(500).body("Không thể gửi yêu cầu hỗ trợ. Vui lòng thử lại sau.");
        }
    }

    private User resolveUserFromAuthorizationHeader(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return null;
        }

        String token = authorizationHeader.substring(7).trim();
        if (token.isEmpty() || !jwtUtil.isTokenValid(token)) {
            return null;
        }

        String username = jwtUtil.extractUsername(token);
        return userService.findByUsername(username);
    }

    private String normalizeIssueType(String value) {
        return normalizeRequired(value).toLowerCase(Locale.ROOT);
    }

    private String normalizeRequired(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalizeOptional(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean isValidEmail(String value) {
        return value.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    }

    private boolean isAcceptedEvidence(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null) {
            return false;
        }
        return contentType.equalsIgnoreCase("image/jpeg")
                || contentType.equalsIgnoreCase("image/png")
                || contentType.equalsIgnoreCase("image/webp");
    }
}
