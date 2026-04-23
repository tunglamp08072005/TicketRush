package com.ticketrush.features.event.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;

public class CreateZoneRequest {
    @NotBlank(message = "Zone name is required")
    private String name;

    @NotNull(message = "Zone price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Zone price must be greater than 0")
    private BigDecimal price;

    @NotNull(message = "Row count is required")
    @Min(value = 1, message = "Row count must be at least 1")
    @Max(value = 26, message = "Row count must not exceed 26")
    private Integer rowCount;

    @NotNull(message = "Seats per row is required")
    @Min(value = 1, message = "Seats per row must be at least 1")
    @Max(value = 100, message = "Seats per row must not exceed 100")
    private Integer seatsPerRow;

    @NotBlank(message = "Zone color is required")
    @Pattern(regexp = "^#([A-Fa-f0-9]{6})$", message = "Zone color must be a valid hex color")
    private String colorHex;

    private String locationDescription;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public Integer getRowCount() {
        return rowCount;
    }

    public void setRowCount(Integer rowCount) {
        this.rowCount = rowCount;
    }

    public Integer getSeatsPerRow() {
        return seatsPerRow;
    }

    public void setSeatsPerRow(Integer seatsPerRow) {
        this.seatsPerRow = seatsPerRow;
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
}
