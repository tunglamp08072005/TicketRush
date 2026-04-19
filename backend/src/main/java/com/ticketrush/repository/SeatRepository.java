package com.ticketrush.repository;

import com.ticketrush.entity.Seat;
import com.ticketrush.entity.SeatStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.util.List;

public interface SeatRepository extends JpaRepository<Seat, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Seat s where s.id in :seatIds")
    List<Seat> findAllByIdInForUpdate(@Param("seatIds") List<Long> seatIds);

    @Query("select s.id from Seat s where s.event.id = :eventId and s.status = :status")
    List<Long> findSeatIdsByEventIdAndStatus(@Param("eventId") Long eventId, @Param("status") SeatStatus status);

    @Query("""
            select s
            from Seat s
            join fetch s.zone z
            where s.event.id = :eventId
            order by z.displayOrder asc, s.rowLabel asc, s.seatNumber asc
            """)
    List<Seat> findSeatMapByEventId(@Param("eventId") Long eventId);
}
