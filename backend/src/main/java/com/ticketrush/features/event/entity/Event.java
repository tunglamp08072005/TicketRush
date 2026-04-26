package com.ticketrush.features.event.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "events")
public class Event {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 300)
    private String name;

    @Column(nullable = false, length = 2000)
    private String description;

    @Column(nullable = false, length = 500)
    private String location;

    @Column(nullable = false)
    private LocalDateTime openSaleDate;

    @Column
    private LocalDateTime saleEndDate;

    @Column
    private LocalDateTime eventStartDate;

    @Column(nullable = false, length = 1000)
    private String heroImageUrl;

    @Column(nullable = false, length = 1000)
    private String thumbnailUrl;

    @Column(length = 1000)
    private String layoutMapUrl;

    @Column
    private Integer seatHoldMinutes = 10;

    @Column(nullable = false)
    private boolean featured = true;

    @Column
    private Boolean publicVisible = Boolean.TRUE;

    @Column
    private Boolean archived = Boolean.FALSE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EventStatus status = EventStatus.UPCOMING;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "event", cascade = jakarta.persistence.CascadeType.ALL, orphanRemoval = true)
    private List<EventZone> zones = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        applyDefaults();
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (publicVisible == null) {
            publicVisible = Boolean.TRUE;
        }
        if (archived == null) {
            archived = Boolean.FALSE;
        }
    }

    @jakarta.persistence.PreUpdate
    public void preUpdate() {
        applyDefaults();
    }

    private void applyDefaults() {
        if (eventStartDate == null) {
            eventStartDate = openSaleDate;
        }
        if (layoutMapUrl == null || layoutMapUrl.isBlank()) {
            layoutMapUrl = thumbnailUrl;
        }
        if (seatHoldMinutes == null || seatHoldMinutes < 1) {
            seatHoldMinutes = 10;
        }
    }

    public void addZone(EventZone zone) {
        zones.add(zone);
        zone.setEvent(this);
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
        return eventStartDate != null ? eventStartDate : openSaleDate;
    }

    public void setEventStartDate(LocalDateTime eventStartDate) {
        this.eventStartDate = eventStartDate;
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
        return (layoutMapUrl == null || layoutMapUrl.isBlank()) ? thumbnailUrl : layoutMapUrl;
    }

    public void setLayoutMapUrl(String layoutMapUrl) {
        this.layoutMapUrl = layoutMapUrl;
    }

    public int getSeatHoldMinutes() {
        return seatHoldMinutes == null || seatHoldMinutes < 1 ? 10 : seatHoldMinutes;
    }

    public void setSeatHoldMinutes(Integer seatHoldMinutes) {
        this.seatHoldMinutes = seatHoldMinutes;
    }

    public boolean isFeatured() {
        return featured;
    }

    public void setFeatured(boolean featured) {
        this.featured = featured;
    }

    public boolean isPublicVisible() {
        return publicVisible == null || publicVisible;
    }

    public void setPublicVisible(boolean publicVisible) {
        this.publicVisible = publicVisible;
    }

    public boolean isArchived() {
        return Boolean.TRUE.equals(archived);
    }

    public void setArchived(boolean archived) {
        this.archived = archived;
    }

    public EventStatus getStatus() {
        return status;
    }

    public void setStatus(EventStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public List<EventZone> getZones() {
        return zones;
    }

    public void setZones(List<EventZone> zones) {
        this.zones = zones;
    }
}
