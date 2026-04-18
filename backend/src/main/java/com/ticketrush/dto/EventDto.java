package com.ticketrush.dto;

import com.ticketrush.entity.EventStatus;

import java.time.LocalDateTime;

public class EventDto {
    private Long id;
    private String name;
    private String description;
    private String location;
    private String heroImageUrl;
    private String thumbnailUrl;
    private LocalDateTime openSaleDate;
    private EventStatus status;

    public EventDto() {
    }

    public EventDto(Long id, String name, String description, String location, String heroImageUrl, String thumbnailUrl, LocalDateTime openSaleDate, EventStatus status) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.location = location;
        this.heroImageUrl = heroImageUrl;
        this.thumbnailUrl = thumbnailUrl;
        this.openSaleDate = openSaleDate;
        this.status = status;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getHeroImageUrl() {
        return heroImageUrl;
    }

    public void setHeroImageUrl(String heroImageUrl) {
        this.heroImageUrl = heroImageUrl;
    }

    public String getThumbnailUrl() {
        return thumbnailUrl;
    }

    public void setThumbnailUrl(String thumbnailUrl) {
        this.thumbnailUrl = thumbnailUrl;
    }

    public LocalDateTime getOpenSaleDate() {
        return openSaleDate;
    }

    public void setOpenSaleDate(LocalDateTime openSaleDate) {
        this.openSaleDate = openSaleDate;
    }

    public EventStatus getStatus() {
        return status;
    }

    public void setStatus(EventStatus status) {
        this.status = status;
    }
}
