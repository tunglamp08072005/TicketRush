package com.ticketrush.features.admin.statistics.service;

import com.ticketrush.features.admin.statistics.dto.DemographicStatsResponse;
import com.ticketrush.features.order.entity.TicketOrder;
import com.ticketrush.features.order.entity.OrderStatus;
import com.ticketrush.features.payment.entity.PaymentStatus;
import com.ticketrush.features.user.entity.User;
import com.ticketrush.features.user.repository.UserRepository;
import com.ticketrush.features.order.repository.TicketOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DemographicStatsService {

    private final UserRepository userRepository;
    private final TicketOrderRepository ticketOrderRepository;

    @Transactional(readOnly = true)
    public DemographicStatsResponse getDemographicStats(Long eventId) {
        // Get unique buyers from orders
        Set<User> buyers = getBuyersFromOrders(eventId);
        
        long totalBuyers = buyers.size();
        
        // Calculate gender distribution
        Map<String, Long> genderDistribution = calculateGenderDistribution(buyers);
        long maleCount = genderDistribution.getOrDefault("MALE", 0L);
        long femaleCount = genderDistribution.getOrDefault("FEMALE", 0L);
        long otherCount = genderDistribution.getOrDefault("OTHER", 0L);
        long unknownGenderCount = genderDistribution.getOrDefault("UNKNOWN", 0L);
        
        // Calculate age group distribution
        Map<String, Long> ageGroupDistribution = calculateAgeGroupDistribution(buyers);
        long age0_17 = ageGroupDistribution.getOrDefault("0-17", 0L);
        long age18_24 = ageGroupDistribution.getOrDefault("18-24", 0L);
        long age25_34 = ageGroupDistribution.getOrDefault("25-34", 0L);
        long age35_44 = ageGroupDistribution.getOrDefault("35-44", 0L);
        long age45_54 = ageGroupDistribution.getOrDefault("45-54", 0L);
        long age55_64 = ageGroupDistribution.getOrDefault("55-64", 0L);
        long age65Plus = ageGroupDistribution.getOrDefault("65+", 0L);
        long unknownAgeCount = ageGroupDistribution.getOrDefault("UNKNOWN", 0L);
        
        // Calculate gender-age breakdown
        List<DemographicStatsResponse.GenderAgeBreakdown> genderAgeBreakdown = calculateGenderAgeBreakdown(buyers);
        
        return DemographicStatsResponse.builder()
                .totalBuyers(totalBuyers)
                .genderDistribution(genderDistribution)
                .maleCount(maleCount)
                .femaleCount(femaleCount)
                .otherCount(otherCount)
                .unknownGenderCount(unknownGenderCount)
                .ageGroupDistribution(ageGroupDistribution)
                .age0_17(age0_17)
                .age18_24(age18_24)
                .age25_34(age25_34)
                .age35_44(age35_44)
                .age45_54(age45_54)
                .age55_64(age55_64)
                .age65Plus(age65Plus)
                .unknownAgeCount(unknownAgeCount)
                .genderAgeBreakdown(genderAgeBreakdown)
                .build();
    }

    private Set<User> getBuyersFromOrders(Long eventId) {
        List<TicketOrder> orders;
        
        if (eventId != null) {
            orders = ticketOrderRepository.findAllByEventIdWithItems(eventId);
        } else {
            orders = ticketOrderRepository.findAll();
        }
        
        return orders.stream()
                .filter(o -> o.getStatus() == OrderStatus.SUCCESS 
                        && o.getPaymentStatus() == PaymentStatus.APPROVED)
                .map(TicketOrder::getUser)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private Map<String, Long> calculateGenderDistribution(Set<User> buyers) {
        Map<String, Long> distribution = new HashMap<>();
        
        for (User user : buyers) {
            String gender = normalizeGender(user.getGender());
            distribution.merge(gender, 1L, Long::sum);
        }
        
        return distribution;
    }

    private String normalizeGender(String gender) {
        if (gender == null || gender.isBlank()) {
            return "UNKNOWN";
        }
        
        String normalized = gender.trim().toUpperCase();
        return switch (normalized) {
            case "MALE", "NAM", "M", "0" -> "MALE";
            case "FEMALE", "NU", "F", "1" -> "FEMALE";
            case "OTHER", "KHAC", "O", "2" -> "OTHER";
            default -> "UNKNOWN";
        };
    }

    private Map<String, Long> calculateAgeGroupDistribution(Set<User> buyers) {
        Map<String, Long> distribution = new HashMap<>();
        
        for (User user : buyers) {
            String ageGroup = calculateAgeGroup(user);
            distribution.merge(ageGroup, 1L, Long::sum);
        }
        
        return distribution;
    }

    private String calculateAgeGroup(User user) {
        Integer age = user.getAge();
        LocalDate birthday = user.getBirthday();
        
        // Try to calculate age from birthday if not set
        if (age == null && birthday != null) {
            age = LocalDate.now().getYear() - birthday.getYear();
        }
        
        if (age == null) {
            return "UNKNOWN";
        }
        
        if (age < 18) return "0-17";
        if (age <= 24) return "18-24";
        if (age <= 34) return "25-34";
        if (age <= 44) return "35-44";
        if (age <= 54) return "45-54";
        if (age <= 64) return "55-64";
        return "65+";
    }

    private List<DemographicStatsResponse.GenderAgeBreakdown> calculateGenderAgeBreakdown(Set<User> buyers) {
        List<DemographicStatsResponse.GenderAgeBreakdown> breakdown = new ArrayList<>();
        
        // Group by gender and age group
        Map<String, Map<String, Long>> grouped = new HashMap<>();
        
        for (User user : buyers) {
            String gender = normalizeGender(user.getGender());
            String ageGroup = calculateAgeGroup(user);
            
            grouped.computeIfAbsent(gender, k -> new HashMap<>())
                    .merge(ageGroup, 1L, Long::sum);
        }
        
        // Convert to list
        for (Map.Entry<String, Map<String, Long>> genderEntry : grouped.entrySet()) {
            String gender = genderEntry.getKey();
            for (Map.Entry<String, Long> ageEntry : genderEntry.getValue().entrySet()) {
                breakdown.add(DemographicStatsResponse.GenderAgeBreakdown.builder()
                        .gender(gender)
                        .ageGroup(ageEntry.getKey())
                        .count(ageEntry.getValue())
                        .build());
            }
        }
        
        return breakdown;
    }
}