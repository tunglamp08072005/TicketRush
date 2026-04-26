package com.ticketrush.features.event.repository;

import com.ticketrush.features.event.entity.Seat;
import com.ticketrush.features.event.entity.SeatStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.util.List;

import java.math.BigDecimal;

public interface SeatRepository extends JpaRepository<Seat, Long> {

    interface EventSeatSalesSummary {
        Long getEventId();
        long getSoldSeatCount();
        BigDecimal getSoldRevenue();
    }

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Seat s where s.event.id = :eventId and s.id in :seatIds order by s.id asc")
    List<Seat> findAllByEventIdAndIdInForUpdate(@Param("eventId") Long eventId, @Param("seatIds") List<Long> seatIds);

    @Query("select s.id from Seat s where s.event.id = :eventId and s.status = :status")
    List<Long> findSeatIdsByEventIdAndStatus(@Param("eventId") Long eventId, @Param("status") SeatStatus status);

        @Modifying
        @Query("""
                        update Seat s
                        set s.status = com.ticketrush.features.event.entity.SeatStatus.AVAILABLE,
                                s.lockedByUserId = null,
                                s.lockedUntil = null
                        where s.event.id = :eventId
                            and s.status = com.ticketrush.features.event.entity.SeatStatus.LOCKED
                            and s.lockedUntil is not null
                            and s.lockedUntil <= :now
                        """)
        int releaseExpiredLocksByEventId(@Param("eventId") Long eventId, @Param("now") java.time.LocalDateTime now);

        @Modifying
        @Query("""
                        update Seat s
                        set s.status = com.ticketrush.features.event.entity.SeatStatus.AVAILABLE,
                                s.lockedByUserId = null,
                                s.lockedUntil = null
                        where s.status = com.ticketrush.features.event.entity.SeatStatus.LOCKED
                            and s.lockedUntil is not null
                            and s.lockedUntil <= :now
                        """)
        int releaseExpiredLocks(@Param("now") java.time.LocalDateTime now);

    @Query("""
            select s
            from Seat s
            join fetch s.zone z
            where s.event.id = :eventId
            order by z.displayOrder asc, s.rowLabel asc, s.seatNumber asc
            """)
    List<Seat> findSeatMapByEventId(@Param("eventId") Long eventId);

            @Query("""
                select s.event.id as eventId,
                   count(s.id) as soldSeatCount,
                   coalesce(sum(s.price), 0) as soldRevenue
                from Seat s
                where s.status = :status
                group by s.event.id
                """)
            List<EventSeatSalesSummary> summarizeSoldSeatsByEvent(@Param("status") SeatStatus status);
}
