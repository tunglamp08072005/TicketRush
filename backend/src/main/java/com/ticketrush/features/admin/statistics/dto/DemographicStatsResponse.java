package com.ticketrush.features.admin.statistics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DemographicStatsResponse {
    
    private long totalBuyers;
    
    // Gender distribution
    private Map<String, Long> genderDistribution;
    private long maleCount;
    private long femaleCount;
    private long otherCount;
    private long unknownGenderCount;
    
    // Age distribution
    private Map<String, Long> ageGroupDistribution;
    private long age0_17;
    private long age18_24;
    private long age25_34;
    private long age35_44;
    private long age45_54;
    private long age55_64;
    private long age65Plus;
    private long unknownAgeCount;
    
    // Detailed breakdown
    private List<GenderAgeBreakdown> genderAgeBreakdown;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GenderAgeBreakdown {
        private String gender;
        private String ageGroup;
        private long count;
    }
}