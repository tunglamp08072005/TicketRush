package com.ticketrush.features.order.repository;

import com.ticketrush.features.order.entity.TicketOrder;
import com.ticketrush.features.payment.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.List;

public interface TicketOrderRepository extends JpaRepository<TicketOrder, Long> {
    interface EventOrderSalesSummary {
        Long getEventId();
        long getSoldSeatCount();
        BigDecimal getSoldRevenue();
    }

    Optional<TicketOrder> findByQueueId(String queueId);

    @Query("""
        select distinct o
        from TicketOrder o
        left join fetch o.items i
        where o.event.id = :eventId
        """)
    List<TicketOrder> findAllByEventIdWithItems(@Param("eventId") Long eventId);

    @Query("""
        select distinct o
        from TicketOrder o
        left join fetch o.event
        left join fetch o.user
        left join fetch o.items i
        left join fetch i.seat s
        where o.user.id = :userId
        order by o.createdAt desc
        """)
    List<TicketOrder> findAllByUserIdWithDetails(@Param("userId") Long userId);

    @Query("""
        select distinct o
        from TicketOrder o
        left join fetch o.event
        left join fetch o.user
        left join fetch o.items i
        left join fetch i.seat s
        where o.paymentStatus = :paymentStatus
        order by o.createdAt desc
        """)
    List<TicketOrder> findAllByPaymentStatusWithDetails(@Param("paymentStatus") PaymentStatus paymentStatus);

    @Query("""
        select distinct o
        from TicketOrder o
        left join fetch o.event
        left join fetch o.user
        left join fetch o.items i
        left join fetch i.seat s
        where o.id = :orderId
        """)
    Optional<TicketOrder> findDetailById(@Param("orderId") Long orderId);

        @Query("""
                select o.event.id as eventId,
                             count(i.id) as soldSeatCount,
                             coalesce(sum(i.price), 0) as soldRevenue
                from TicketOrder o
                join o.items i
                where o.status = com.ticketrush.features.order.entity.OrderStatus.SUCCESS
                    and o.paymentStatus <> :rejectedStatus
                group by o.event.id
                """)
        List<EventOrderSalesSummary> summarizeEventSales(@Param("rejectedStatus") PaymentStatus rejectedStatus);
}
