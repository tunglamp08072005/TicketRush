package com.ticketrush.features.order.entity;

import com.ticketrush.features.event.entity.Event;
import com.ticketrush.features.payment.entity.PaymentStatus;
import com.ticketrush.features.user.entity.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "ticket_orders", uniqueConstraints = {
        @UniqueConstraint(name = "uk_ticket_order_queue_id", columnNames = "queue_id")
})
public class TicketOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "queue_id", nullable = false, length = 80)
    private String queueId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status = OrderStatus.PENDING;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 30)
    private PaymentStatus paymentStatus = PaymentStatus.UNPAID;

    @Column(name = "payment_requested_at")
    private LocalDateTime paymentRequestedAt;

    @Column(name = "payment_reviewed_at")
    private LocalDateTime paymentReviewedAt;

    @Column(name = "payment_note", length = 500)
    private String paymentNote;

    @Column(name = "payment_proof_image_url", length = 1000)
    private String paymentProofImageUrl;

    @Column(name = "refund_bank_name", length = 150)
    private String refundBankName;

    @Column(name = "refund_bank_account_number", length = 50)
    private String refundBankAccountNumber;

    @Column(name = "refund_bank_account_holder", length = 150)
    private String refundBankAccountHolder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TicketOrderItem> items = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public void addItem(TicketOrderItem item) {
        items.add(item);
        item.setOrder(this);
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getQueueId() {
        return queueId;
    }

    public void setQueueId(String queueId) {
        this.queueId = queueId;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Event getEvent() {
        return event;
    }

    public void setEvent(Event event) {
        this.event = event;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public void setStatus(OrderStatus status) {
        this.status = status;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }

    public PaymentStatus getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(PaymentStatus paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public LocalDateTime getPaymentRequestedAt() {
        return paymentRequestedAt;
    }

    public void setPaymentRequestedAt(LocalDateTime paymentRequestedAt) {
        this.paymentRequestedAt = paymentRequestedAt;
    }

    public LocalDateTime getPaymentReviewedAt() {
        return paymentReviewedAt;
    }

    public void setPaymentReviewedAt(LocalDateTime paymentReviewedAt) {
        this.paymentReviewedAt = paymentReviewedAt;
    }

    public String getPaymentNote() {
        return paymentNote;
    }

    public void setPaymentNote(String paymentNote) {
        this.paymentNote = paymentNote;
    }

    public String getPaymentProofImageUrl() {
        return paymentProofImageUrl;
    }

    public void setPaymentProofImageUrl(String paymentProofImageUrl) {
        this.paymentProofImageUrl = paymentProofImageUrl;
    }

    public String getRefundBankName() {
        return refundBankName;
    }

    public void setRefundBankName(String refundBankName) {
        this.refundBankName = refundBankName;
    }

    public String getRefundBankAccountNumber() {
        return refundBankAccountNumber;
    }

    public void setRefundBankAccountNumber(String refundBankAccountNumber) {
        this.refundBankAccountNumber = refundBankAccountNumber;
    }

    public String getRefundBankAccountHolder() {
        return refundBankAccountHolder;
    }

    public void setRefundBankAccountHolder(String refundBankAccountHolder) {
        this.refundBankAccountHolder = refundBankAccountHolder;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public List<TicketOrderItem> getItems() {
        return items;
    }

    public void setItems(List<TicketOrderItem> items) {
        this.items = items;
    }
}
