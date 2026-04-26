package com.ticketrush.features.event.dto;

import com.ticketrush.features.event.entity.EventStatus;
import com.ticketrush.features.event.entity.EventCategory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

import java.time.LocalDateTime;

public class CreateEventRequest {
    @NotBlank(message = "Event name is required")
    private String name;

    @NotBlank(message = "Event description is required")
    private String description;

    @NotBlank(message = "Event location is required")
    private String location;

    @NotBlank(message = "Hero image URL is required")
    private String heroImageUrl;

    @NotBlank(message = "Thumbnail URL is required")
    private String thumbnailUrl;

    @NotBlank(message = "Layout map URL is required")
    private String layoutMapUrl;

    @NotNull(message = "Open sale date is required")
    private LocalDateTime openSaleDate;

    @NotNull(message = "Sale end date is required")
    private LocalDateTime saleEndDate;

    @NotNull(message = "Event start date is required")
    private LocalDateTime eventStartDate;

    private EventCategory category;

    @NotNull(message = "At least one zone is required")
    @Size(min = 1, message = "At least one zone is required")
    @Valid
    private List<CreateZoneRequest> zones;

    private Boolean featured;
    private Boolean publicVisible;
    private Boolean archived;
    private EventStatus status;

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

    public LocalDateTime getOpenSaleDate() {
        return openSaleDate;
    }

    public void setOpenSaleDate(LocalDateTime openSaleDate) {
        this.openSaleDate = openSaleDate;
    }

    public LocalDateTime getSaleEndDate() {
        return saleEndDate;
    }

    public void setSaleEndDate(LocalDateTime saleEndDate) {
        this.saleEndDate = saleEndDate;
    }

    public LocalDateTime getEventStartDate() {
        return eventStartDate;
    }

    public void setEventStartDate(LocalDateTime eventStartDate) {
        this.eventStartDate = eventStartDate;
    }

    public List<CreateZoneRequest> getZones() {
        return zones;
    }

    public void setZones(List<CreateZoneRequest> zones) {
        this.zones = zones;
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

    public String getLayoutMapUrl() {
        return layoutMapUrl;
    }

    public void setLayoutMapUrl(String layoutMapUrl) {
        this.layoutMapUrl = layoutMapUrl;
    }

    public EventCategory getCategory() {
        return category;
    }

    public void setCategory(EventCategory category) {
        this.category = category;
    }

    public Boolean getFeatured() {
        return featured;
    }

    public void setFeatured(Boolean featured) {
        this.featured = featured;
    }

    public Boolean getPublicVisible() {
        return publicVisible;
    }

    public void setPublicVisible(Boolean publicVisible) {
        this.publicVisible = publicVisible;
    }

    public Boolean getArchived() {
        return archived;
    }

    public void setArchived(Boolean archived) {
        this.archived = archived;
    }

    public EventStatus getStatus() {
        return status;
    }

    public void setStatus(EventStatus status) {
        this.status = status;
    }
}
