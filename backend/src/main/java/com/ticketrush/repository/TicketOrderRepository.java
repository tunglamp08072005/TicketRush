package com.ticketrush.repository;

import com.ticketrush.entity.TicketOrder;
import com.ticketrush.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.List;

public interface TicketOrderRepository extends JpaRepository<TicketOrder, Long> {
    Optional<TicketOrder> findByQueueId(String queueId);

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
}
