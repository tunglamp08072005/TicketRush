package com.ticketrush.features.support.service;

import com.ticketrush.features.user.entity.User;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.StringJoiner;

@Service
@RequiredArgsConstructor
public class SupportRequestEmailService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Value("${app.support.email:${spring.mail.username:}}")
    private String supportEmail;

    public void sendSupportRequest(
            String issueType,
            String title,
            String content,
            String contactEmail,
            User user,
            MultipartFile evidence
    ) {
        if (supportEmail == null || supportEmail.isBlank()) {
            throw new IllegalStateException("Support email is not configured");
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            boolean hasEvidence = evidence != null && !evidence.isEmpty();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, hasEvidence, StandardCharsets.UTF_8.name());
            helper.setTo(supportEmail);
            if (fromEmail != null && !fromEmail.isBlank()) {
                helper.setFrom(fromEmail);
            }
            if (contactEmail != null && !contactEmail.isBlank()) {
                helper.setReplyTo(contactEmail);
            } else if (user != null && user.getEmail() != null && !user.getEmail().isBlank()) {
                helper.setReplyTo(user.getEmail());
            }

            helper.setSubject("[TicketRush Support] " + title);
            helper.setText(buildContent(issueType, title, content, contactEmail, user), false);

            if (hasEvidence) {
                helper.addAttachment(
                        sanitizeAttachmentName(evidence.getOriginalFilename()),
                        new ByteArrayResource(evidence.getBytes())
                );
            }

            mailSender.send(mimeMessage);
        } catch (Exception ex) {
            throw new IllegalStateException("Cannot send support request", ex);
        }
    }

    private String buildContent(String issueType, String title, String content, String contactEmail, User user) {
        StringJoiner sj = new StringJoiner("\n");
        sj.add("TICKETRUSH SUPPORT REQUEST");
        sj.add("");
        sj.add("Thoi gian gui: " + LocalDateTime.now().format(DATE_TIME_FORMATTER));
        sj.add("Loai su co: " + issueType);
        sj.add("Tieu de: " + title);
        sj.add("");
        sj.add("THONG TIN NGUOI GUI");
        if (user != null) {
            sj.add("User ID: " + user.getId());
            sj.add("Username: " + user.getUsername());
            sj.add("Email tai khoan: " + nullToEmpty(user.getEmail()));
            sj.add("Role: " + user.getRole());
        } else {
            sj.add("Trang thai: Chua dang nhap hoac khong co token hop le");
        }
        sj.add("Email lien he: " + nullToEmpty(contactEmail));
        sj.add("");
        sj.add("NOI DUNG");
        sj.add(content);
        return sj.toString();
    }

    private String sanitizeAttachmentName(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return "ticket-rush-evidence";
        }
        return originalFilename.replaceAll("[\\\\/\\r\\n]", "_");
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
