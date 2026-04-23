package com.ticketrush.features.order.dto;

public class FlashSaleOrderAcceptedResponse {
    private String queueId;
    private String status;

    public FlashSaleOrderAcceptedResponse() {
    }

    public FlashSaleOrderAcceptedResponse(String queueId, String status) {
        this.queueId = queueId;
        this.status = status;
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
}
