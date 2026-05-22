package com.ticketrush.features.payment.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.ticketrush.features.event.entity.Event;
import com.ticketrush.features.order.entity.TicketOrder;
import com.ticketrush.features.order.entity.TicketOrderItem;
import com.ticketrush.features.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.StringJoiner;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailTicketService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Async
    public void sendTicketConfirmation(TicketOrder order) {
        try {
            User user = order.getUser();
            Event event = order.getEvent();

            if (!user.isEmailNotificationEnabled()) {
                log.info("Skipping ticket email for user {} - email notifications disabled", user.getId());
                return;
            }

            if (user.getEmail() == null || user.getEmail().isBlank()) {
                log.warn("Cannot send ticket email - user {} has no email", user.getId());
                return;
            }

            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, StandardCharsets.UTF_8.name());
            helper.setTo(user.getEmail());
            if (fromEmail != null && !fromEmail.isBlank()) {
                helper.setFrom(fromEmail);
            }
            helper.setSubject(buildSubject(event.getName()));
            helper.setText(buildEmailContent(order, event, user), false);
            helper.addAttachment(buildAttachmentName(order), new ByteArrayResource(generateQrCode(order)));

            mailSender.send(mimeMessage);
            log.info("Ticket confirmation email sent to {} for order {}", user.getEmail(), order.getId());
        } catch (Exception ex) {
            log.error("Failed to send ticket confirmation email for order {}: {}", order.getId(), ex.getMessage(), ex);
        }
    }

    private String buildSubject(String eventName) {
        return "TicketRush xác nhận vé - " + eventName;
    }

   private String buildEmailContent(TicketOrder order, Event event, User user) {
    StringJoiner sj = new StringJoiner("\n");

    sj.add("Xin chào " + resolveDisplayName(user) + ",");
    sj.add("");

    sj.add("Đơn đặt vé của bạn đã được xác nhận thành công.");
    sj.add("");

    sj.add("THÔNG TIN VÉ");
    sj.add("Sự kiện: " + event.getName());
    sj.add("Địa điểm: " + event.getLocation());
    sj.add("Thời gian: " + event.getEventStartDate().format(DATE_FORMATTER));
    sj.add("Mã đơn: " + order.getQueueId());
    sj.add("");

    sj.add("DANH SÁCH GHẾ");
    for (TicketOrderItem item : order.getItems()) {
        sj.add("- " + item.getSeat().getSeatCode() + " - " + formatPrice(item.getPrice()));
    }

    sj.add("");
    sj.add("Tổng tiền: " + formatPrice(order.getTotalAmount()));
    sj.add("");

    sj.add("Mã QR vào cổng đã được đính kèm trong email này.");
    sj.add("Vui lòng đến trước giờ mở cửa ít nhất 30 phút và xuất trình mã QR tại cổng check-in.");
    sj.add("");

    sj.add("TicketRush");

    return sj.toString();
}

    private String resolveDisplayName(User user) {
        String profileText = user.getProfileText() == null ? "" : user.getProfileText().trim();
        if (!profileText.isEmpty()) {
            return profileText;
        }
        return user.getUsername();
    }

    private String buildAttachmentName(TicketOrder order) {
        return "ticket-qr-" + order.getQueueId() + ".png";
    }

    private byte[] generateQrCode(TicketOrder order) throws WriterException, IOException {
        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        Map<EncodeHintType, Object> hints = new HashMap<>();
        hints.put(EncodeHintType.MARGIN, 1);

        BitMatrix bitMatrix = qrCodeWriter.encode(buildQrPayload(order), BarcodeFormat.QR_CODE, 320, 320, hints);
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);
        return outputStream.toByteArray();
    }

    private String buildQrPayload(TicketOrder order) {
        String seatCodes = order.getItems().stream()
                .map(item -> item.getSeat().getSeatCode())
                .sorted()
                .reduce((left, right) -> left + "," + right)
                .orElse("");

        return "queueId=" + order.getQueueId()
                + ";orderId=" + order.getId()
                + ";eventId=" + order.getEvent().getId()
                + ";event=" + order.getEvent().getName()
                + ";time=" + order.getEvent().getEventStartDate().format(DATE_FORMATTER)
                + ";seats=" + seatCodes;
    }

    private String formatPrice(java.math.BigDecimal price) {
        return price.stripTrailingZeros().toPlainString() + " VND";
    }
}
