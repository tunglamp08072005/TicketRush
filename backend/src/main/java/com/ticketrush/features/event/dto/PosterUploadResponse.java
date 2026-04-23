package com.ticketrush.features.event.dto;

public class PosterUploadResponse {
    private String imageUrl;

    public PosterUploadResponse() {
    }

    public PosterUploadResponse(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }
}
