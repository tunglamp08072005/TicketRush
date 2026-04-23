package com.ticketrush.features.auth.controller;


import com.ticketrush.features.auth.dto.AuthResponse;
import com.ticketrush.features.auth.dto.ForgotPasswordRequest;
import com.ticketrush.features.auth.dto.LoginRequest;
import com.ticketrush.features.auth.dto.RegisterRequest;
import com.ticketrush.features.auth.dto.RegisterVerifyRequest;
import com.ticketrush.features.auth.dto.ResetPasswordRequest;
import com.ticketrush.common.util.JwtUtil;
import com.ticketrush.features.auth.service.EmailService;
import com.ticketrush.features.auth.service.VerificationCodeService;
import com.ticketrush.features.user.entity.User;
import com.ticketrush.features.user.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailService emailService;

    @Autowired
    private VerificationCodeService verificationCodeService;

    @Value("${app.auth.dev-return-code:true}")
    private boolean devReturnCode;

    @PostMapping("/register/request")
    public ResponseEntity<?> requestRegister(@RequestBody RegisterRequest request) {
        String email = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase();
        String username = request.getUsername() == null ? "" : request.getUsername().trim();
        String password = request.getPassword() == null ? "" : request.getPassword();

        if (email.isBlank() || username.isBlank() || password.isBlank()) {
            return ResponseEntity.badRequest().body("Email, username and password are required");
        }
        if (password.length() < 6) {
            return ResponseEntity.badRequest().body("Password must be at least 6 characters");
        }
        if (userService.existsByUsername(username)) {
            return ResponseEntity.badRequest().body("Username already exists");
        }
        if (userService.existsByEmail(email)) {
            return ResponseEntity.badRequest().body("Email already exists");
        }

        String code = verificationCodeService.issueRegistrationCode(email, username, password);
        try {
            emailService.sendVerificationCode(
                email,
                "TicketRush - Ma xac thuc dang ky",
                "Ma xac thuc dang ky cua ban la: " + code + "\nMa co hieu luc trong 10 phut."
            );
            return ResponseEntity.ok("Verification code sent to email");
        } catch (Exception ex) {
            if (devReturnCode) {
                return ResponseEntity.ok("[DEV] OTP registration code: " + code);
            }
            return ResponseEntity.status(500).body("Cannot send verification email: " + ex.getMessage());
        }
    }

    @GetMapping("/register/request")
    public ResponseEntity<?> requestRegisterGetNotSupported() {
        return ResponseEntity.status(405).body("Method not allowed. Use POST /api/auth/register/request");
    }

    @PostMapping("/register/verify")
    public ResponseEntity<?> verifyRegister(@RequestBody RegisterVerifyRequest request) {
        String email = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase();
        String code = request.getCode() == null ? "" : request.getCode().trim();

        if (email.isBlank() || code.isBlank()) {
            return ResponseEntity.badRequest().body("Email and code are required");
        }
        if (userService.existsByEmail(email)) {
            return ResponseEntity.badRequest().body("Email already exists");
        }

        VerificationCodeService.PendingRegistration pending = verificationCodeService.consumeValidRegistration(email, code);
        if (pending == null) {
            return ResponseEntity.badRequest().body("Invalid or expired verification code");
        }
        if (userService.existsByUsername(pending.username())) {
            return ResponseEntity.badRequest().body("Username already exists");
        }

        User user = new User();
        user.setEmail(email);
        user.setUsername(pending.username());
        user.setPassword(pending.rawPassword());
        user.setRole("USER");
        userService.saveUser(user);
        return ResponseEntity.ok("User registered successfully");
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        // Backward compatibility: keep old route but enforce email verification flow.
        return requestRegister(request);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        String identifier = request.resolveIdentifier();
        String rawPassword = request.getPassword() == null ? "" : request.getPassword();

        if (identifier == null || identifier.isBlank() || rawPassword.isBlank()) {
            return ResponseEntity.badRequest().body("Username/email and password are required");
        }

        User user = userService.findByUsernameOrEmail(identifier);
        if (user == null || !passwordMatches(rawPassword, user.getPassword())) {
            return ResponseEntity.status(401).body("Invalid username or password");
        }

        String token = jwtUtil.generateToken(user.getUsername());
        String role = user.getRole() != null
                ? userService.normalizeRole(user.getRole())
                : "USER";
        return ResponseEntity.ok(new AuthResponse(token, role));
    }

    @PostMapping("/password/forgot")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        String email = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase();
        if (email.isBlank()) {
            return ResponseEntity.badRequest().body("Email is required");
        }

        User user = userService.findByEmail(email);
        if (user == null) {
            return ResponseEntity.badRequest().body("Email does not exist");
        }

        String code = verificationCodeService.issueResetCode(email);
        try {
            emailService.sendVerificationCode(
                email,
                "TicketRush - Ma xac thuc dat lai mat khau",
                "Ma xac thuc dat lai mat khau cua ban la: " + code + "\nMa co hieu luc trong 10 phut."
            );
            return ResponseEntity.ok("Reset code sent to email");
        } catch (Exception ex) {
            if (devReturnCode) {
                return ResponseEntity.ok("[DEV] OTP reset code: " + code);
            }
            return ResponseEntity.status(500).body("Cannot send reset email: " + ex.getMessage());
        }
    }

    @GetMapping("/password/forgot")
    public ResponseEntity<?> forgotPasswordGetNotSupported() {
        return ResponseEntity.status(405).body("Method not allowed. Use POST /api/auth/password/forgot");
    }

    @PostMapping("/password/reset")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
        String email = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase();
        String code = request.getCode() == null ? "" : request.getCode().trim();
        String newPassword = request.getNewPassword() == null ? "" : request.getNewPassword();

        if (email.isBlank() || code.isBlank() || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body("Email, code and new password are required");
        }
        if (newPassword.length() < 8) {
            return ResponseEntity.badRequest().body("Password must be at least 8 characters");
        }

        User user = userService.findByEmail(email);
        if (user == null) {
            return ResponseEntity.badRequest().body("Email does not exist");
        }

        boolean ok = verificationCodeService.validateAndConsumeResetCode(email, code);
        if (!ok) {
            return ResponseEntity.badRequest().body("Invalid or expired reset code");
        }

        userService.updatePassword(user, newPassword);
        return ResponseEntity.ok("Password reset successfully");
    }

    @GetMapping("/password/reset")
    public ResponseEntity<?> resetPasswordGetNotSupported() {
        return ResponseEntity.status(405).body("Method not allowed. Use POST /api/auth/password/reset");
    }

    private boolean passwordMatches(String rawPassword, String storedPassword) {
        if (storedPassword == null || storedPassword.isBlank()) {
            return false;
        }

        try {
            if (passwordEncoder.matches(rawPassword, storedPassword)) {
                return true;
            }
        } catch (Exception ignored) {
            // Continue to legacy plain-text comparison below.
        }

        return storedPassword.equals(rawPassword);
    }
}
