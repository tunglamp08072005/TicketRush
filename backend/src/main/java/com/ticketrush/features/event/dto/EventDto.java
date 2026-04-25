package com.ticketrush.features.event.dto;

import com.ticketrush.features.event.entity.EventStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class EventDto {
    private Long id;
    private String name;
    private String description;
    private String location;
    private String heroImageUrl;
    private String thumbnailUrl;
    private String layoutMapUrl;
    private LocalDateTime openSaleDate;
    private LocalDateTime saleEndDate;
    private LocalDateTime eventStartDate;
    private int seatHoldMinutes;
    private EventStatus status;
    private boolean publicVisible;
    private boolean archived;
    private int totalSeatCount;
    private int soldSeatCount;
    private BigDecimal soldRevenue;
    private List<EventZoneDto> zones;

    public EventDto() {
    }

    public EventDto(Long id, String name, String description, String location, String heroImageUrl, String thumbnailUrl, String layoutMapUrl, LocalDateTime openSaleDate, LocalDateTime saleEndDate, LocalDateTime eventStartDate, int seatHoldMinutes, EventStatus status, boolean publicVisible, boolean archived, int totalSeatCount, int soldSeatCount, BigDecimal soldRevenue, List<EventZoneDto> zones) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.location = location;
        this.heroImageUrl = heroImageUrl;
        this.thumbnailUrl = thumbnailUrl;
        this.layoutMapUrl = layoutMapUrl;
        this.openSaleDate = openSaleDate;
        this.saleEndDate = saleEndDate;
        this.eventStartDate = eventStartDate;
        this.seatHoldMinutes = seatHoldMinutes;
        this.status = status;
        this.publicVisible = publicVisible;
        this.archived = archived;
        this.totalSeatCount = totalSeatCount;
        this.soldSeatCount = soldSeatCount;
        this.soldRevenue = soldRevenue;
        this.zones = zones;
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

    public String getLayoutMapUrl() {
        return layoutMapUrl;
    }

    public void setLayoutMapUrl(String layoutMapUrl) {
        this.layoutMapUrl = layoutMapUrl;
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

    public int getSeatHoldMinutes() {
        return seatHoldMinutes;
    }

    public void setSeatHoldMinutes(int seatHoldMinutes) {
        this.seatHoldMinutes = seatHoldMinutes;
    }

    public EventStatus getStatus() {
        return status;
    }

    public void setStatus(EventStatus status) {
        this.status = status;
    }

    public boolean isPublicVisible() {
        return publicVisible;
    }

    public void setPublicVisible(boolean publicVisible) {
        this.publicVisible = publicVisible;
    }

    public boolean isArchived() {
        return archived;
    }

    public void setArchived(boolean archived) {
        this.archived = archived;
    }

    public int getTotalSeatCount() {
        return totalSeatCount;
    }

    public void setTotalSeatCount(int totalSeatCount) {
        this.totalSeatCount = totalSeatCount;
    }

    public int getSoldSeatCount() {
        return soldSeatCount;
    }

    public void setSoldSeatCount(int soldSeatCount) {
        this.soldSeatCount = soldSeatCount;
    }

    public BigDecimal getSoldRevenue() {
        return soldRevenue;
    }

    public void setSoldRevenue(BigDecimal soldRevenue) {
        this.soldRevenue = soldRevenue;
    }

    public List<EventZoneDto> getZones() {
        return zones;
    }

    public void setZones(List<EventZoneDto> zones) {
        this.zones = zones;
    }
}
