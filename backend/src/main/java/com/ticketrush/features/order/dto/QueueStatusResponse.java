package com.ticketrush.features.order.dto;

public class QueueStatusResponse {
    private String queueId;
    private String status;
    private String message;
    private String orderId;

    public QueueStatusResponse() {
    }

    public QueueStatusResponse(String queueId, String status, String message, String orderId) {
        this.queueId = queueId;
        this.status = status;
        this.message = message;
        this.orderId = orderId;
    }

    public String getQueueId() {
        return queueId;
    }

    public void setQueueId(String queueId) {
        this.queueId = queueId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getOrderId() {
        return orderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }
}
