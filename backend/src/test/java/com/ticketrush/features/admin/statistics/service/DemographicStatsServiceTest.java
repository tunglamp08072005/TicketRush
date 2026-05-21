package com.ticketrush.features.admin.statistics.service;

import com.ticketrush.features.admin.statistics.dto.DemographicStatsResponse;
import com.ticketrush.features.event.entity.Event;
import com.ticketrush.features.order.entity.OrderStatus;
import com.ticketrush.features.order.entity.TicketOrder;
import com.ticketrush.features.order.repository.TicketOrderRepository;
import com.ticketrush.features.payment.entity.PaymentStatus;
import com.ticketrush.features.user.entity.User;
import com.ticketrush.features.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DemographicStatsServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private TicketOrderRepository ticketOrderRepository;

    @InjectMocks
    private DemographicStatsService demographicStatsService;

    @Test
    void getDemographicStats_countsUniqueApprovedSuccessfulBuyersOnly() {
        User maleBuyer = user(1L, "MALE", 23, null);
        User femaleBuyer = user(2L, "FEMALE", null, LocalDate.now().minusYears(31));
        User unknownBuyer = user(3L, null, null, null);

        when(ticketOrderRepository.findAll()).thenReturn(List.of(
                order(maleBuyer, 1L, OrderStatus.SUCCESS, PaymentStatus.APPROVED),
                order(maleBuyer, 1L, OrderStatus.SUCCESS, PaymentStatus.APPROVED),
                order(femaleBuyer, 2L, OrderStatus.SUCCESS, PaymentStatus.APPROVED),
                order(unknownBuyer, 2L, OrderStatus.SUCCESS, PaymentStatus.APPROVED),
                order(user(4L, "OTHER", 45, null), 2L, OrderStatus.PENDING, PaymentStatus.PENDING_REVIEW),
                order(user(5L, "MALE", 19, null), 2L, OrderStatus.FAILED, PaymentStatus.REJECTED)
        ));

        DemographicStatsResponse stats = demographicStatsService.getDemographicStats(null);

        assertThat(stats.getTotalBuyers()).isEqualTo(3);
        assertThat(stats.getMaleCount()).isEqualTo(1);
        assertThat(stats.getFemaleCount()).isEqualTo(1);
        assertThat(stats.getOtherCount()).isZero();
        assertThat(stats.getUnknownGenderCount()).isEqualTo(1);
        assertThat(stats.getAge18_24()).isEqualTo(1);
        assertThat(stats.getAge25_34()).isEqualTo(1);
        assertThat(stats.getUnknownAgeCount()).isEqualTo(1);
        assertThat(stats.getGenderDistribution()).containsAllEntriesOf(Map.of(
                "MALE", 1L,
                "FEMALE", 1L,
                "UNKNOWN", 1L
        ));
    }

    @Test
    void getDemographicStats_usesEventSpecificRepositoryWhenEventIdIsProvided() {
        Long eventId = 10L;
        User buyer = user(1L, "NAM", 17, null);
        when(ticketOrderRepository.findAllByEventIdWithItems(eventId)).thenReturn(List.of(
                order(buyer, eventId, OrderStatus.SUCCESS, PaymentStatus.APPROVED)
        ));

        DemographicStatsResponse stats = demographicStatsService.getDemographicStats(eventId);

        verify(ticketOrderRepository).findAllByEventIdWithItems(eventId);
        assertThat(stats.getTotalBuyers()).isEqualTo(1);
        assertThat(stats.getMaleCount()).isEqualTo(1);
        assertThat(stats.getAge0_17()).isEqualTo(1);
        assertThat(stats.getGenderAgeBreakdown())
                .anySatisfy(item -> {
                    assertThat(item.getGender()).isEqualTo("MALE");
                    assertThat(item.getAgeGroup()).isEqualTo("0-17");
                    assertThat(item.getCount()).isEqualTo(1);
                });
    }

    private static User user(Long id, String gender, Integer age, LocalDate birthday) {
        User user = new User();
        user.setId(id);
        user.setUsername("user" + id);
        user.setEmail("user" + id + "@example.com");
        user.setPassword("secret");
        user.setRole("USER");
        user.setGender(gender);
        user.setAge(age);
        user.setBirthday(birthday);
        return user;
    }

    private static TicketOrder order(User user, Long eventId, OrderStatus orderStatus, PaymentStatus paymentStatus) {
        Event event = new Event();
        event.setId(eventId);

        TicketOrder order = new TicketOrder();
        order.setQueueId("Q-" + user.getId() + "-" + eventId + "-" + orderStatus + "-" + paymentStatus);
        order.setUser(user);
        order.setEvent(event);
        order.setStatus(orderStatus);
        order.setPaymentStatus(paymentStatus);
        return order;
    }
}
