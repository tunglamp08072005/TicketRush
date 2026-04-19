package com.ticketrush.dto;

import com.ticketrush.entity.SeatStatus;

import java.math.BigDecimal;

public class SeatMapSeatDto {
    private Long id;
    private Long zoneId;
    private String zoneName;
    private String zoneCode;
    private String zoneColorHex;
    private String rowLabel;
    private int seatNumber;
    private String seatCode;
    private BigDecimal price;
    private SeatStatus status;

    public SeatMapSeatDto() {
    }

    public SeatMapSeatDto(Long id, Long zoneId, String zoneName, String zoneCode, String zoneColorHex, String rowLabel, int seatNumber, String seatCode, BigDecimal price, SeatStatus status) {
        this.id = id;
        this.zoneId = zoneId;
        this.zoneName = zoneName;
        this.zoneCode = zoneCode;
        this.zoneColorHex = zoneColorHex;
        this.rowLabel = rowLabel;
        this.seatNumber = seatNumber;
        this.seatCode = seatCode;
        this.price = price;
        this.status = status;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getZoneId() {
        return zoneId;
    }

    public void setZoneId(Long zoneId) {
        this.zoneId = zoneId;
    }

    public String getZoneName() {
        return zoneName;
    }

    public void setZoneName(String zoneName) {
        this.zoneName = zoneName;
    }

    public String getZoneCode() {
        return zoneCode;
    }

    public void setZoneCode(String zoneCode) {
        this.zoneCode = zoneCode;
    }

    public String getZoneColorHex() {
        return zoneColorHex;
    }

    public void setZoneColorHex(String zoneColorHex) {
        this.zoneColorHex = zoneColorHex;
    }

    public String getRowLabel() {
        return rowLabel;
    }

    public void setRowLabel(String rowLabel) {
        this.rowLabel = rowLabel;
    }

    public int getSeatNumber() {
        return seatNumber;
    }

    public void setSeatNumber(int seatNumber) {
        this.seatNumber = seatNumber;
    }

    public String getSeatCode() {
        return seatCode;
    }

    public void setSeatCode(String seatCode) {
        this.seatCode = seatCode;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public SeatStatus getStatus() {
        return status;
    }

    public void setStatus(SeatStatus status) {
        this.status = status;
    }
}
