package com.ticketrush.dto;

import java.math.BigDecimal;

public class EventZoneDto {
    private Long id;
    private String name;
    private String code;
    private String colorHex;
    private String locationDescription;
    private BigDecimal price;
    private int rowCount;
    private int seatsPerRow;
    private int seatCount;

    public EventZoneDto() {
    }

    public EventZoneDto(Long id, String name, String code, String colorHex, String locationDescription, BigDecimal price, int rowCount, int seatsPerRow, int seatCount) {
        this.id = id;
        this.name = name;
        this.code = code;
        this.colorHex = colorHex;
        this.locationDescription = locationDescription;
        this.price = price;
        this.rowCount = rowCount;
        this.seatsPerRow = seatsPerRow;
        this.seatCount = seatCount;
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

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getColorHex() {
        return colorHex;
    }

    public void setColorHex(String colorHex) {
        this.colorHex = colorHex;
    }

    public String getLocationDescription() {
        return locationDescription;
    }

    public void setLocationDescription(String locationDescription) {
        this.locationDescription = locationDescription;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public int getRowCount() {
        return rowCount;
    }

    public void setRowCount(int rowCount) {
        this.rowCount = rowCount;
    }

    public int getSeatsPerRow() {
        return seatsPerRow;
    }

    public void setSeatsPerRow(int seatsPerRow) {
        this.seatsPerRow = seatsPerRow;
    }

    public int getSeatCount() {
        return seatCount;
    }

    public void setSeatCount(int seatCount) {
        this.seatCount = seatCount;
    }
}
