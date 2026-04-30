package com.ticketrush.features.admin.statistics.controller;

import com.ticketrush.features.admin.statistics.dto.DemographicStatsResponse;
import com.ticketrush.features.admin.statistics.service.DemographicStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/statistics")
@RequiredArgsConstructor
public class DemographicStatsController {

    private final DemographicStatsService demographicStatsService;

    @GetMapping("/demographics")
    public ResponseEntity<DemographicStatsResponse> getDemographicStats(
            @RequestParam(required = false) Long eventId) {
        DemographicStatsResponse stats = demographicStatsService.getDemographicStats(eventId);
        return ResponseEntity.ok(stats);
    }
}