package com.ticketrush.features.order.dto;

public class VirtualQueueStatusResponse {
    private Long eventId;
    private String queueToken;
    private String status;
    private Long position;
    private Integer batchSize;
    private String message;
    private Long admittedUntilEpochMs;
    private Long estimatedWaitSeconds;

    public VirtualQueueStatusResponse() {
    }

    public VirtualQueueStatusResponse(Long eventId,
                                      String queueToken,
                                      String status,
                                      Long position,
                                      Integer batchSize,
                                      String message,
                                      Long admittedUntilEpochMs,
                                      Long estimatedWaitSeconds) {
        this.eventId = eventId;
        this.queueToken = queueToken;
        this.status = status;
        this.position = position;
        this.batchSize = batchSize;
        this.message = message;
        this.admittedUntilEpochMs = admittedUntilEpochMs;
        this.estimatedWaitSeconds = estimatedWaitSeconds;
    }

    public Long getEventId() {
        return eventId;
    }

    public void setEventId(Long eventId) {
        this.eventId = eventId;
    }

    public String getQueueToken() {
        return queueToken;
    }

    public void setQueueToken(String queueToken) {
        this.queueToken = queueToken;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Long getPosition() {
        return position;
    }

    public void setPosition(Long position) {
        this.position = position;
    }

    public Integer getBatchSize() {
        return batchSize;
    }

    public void setBatchSize(Integer batchSize) {
        this.batchSize = batchSize;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Long getAdmittedUntilEpochMs() {
        return admittedUntilEpochMs;
    }

    public void setAdmittedUntilEpochMs(Long admittedUntilEpochMs) {
        this.admittedUntilEpochMs = admittedUntilEpochMs;
    }

    public Long getEstimatedWaitSeconds() {
        return estimatedWaitSeconds;
    }

    public void setEstimatedWaitSeconds(Long estimatedWaitSeconds) {
        this.estimatedWaitSeconds = estimatedWaitSeconds;
    }
}
