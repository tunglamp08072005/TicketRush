package com.ticketrush.features.order.service;

import com.ticketrush.features.event.entity.Seat;
import com.ticketrush.features.event.entity.SeatStatus;
import com.ticketrush.features.event.repository.SeatRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class SeatLockCleanupService {

    private final SeatRepository seatRepository;
    private final RedisSeatHoldService redisSeatHoldService;
    private final SeatRealtimePublisher seatRealtimePublisher;

    public SeatLockCleanupService(SeatRepository seatRepository,
                                  RedisSeatHoldService redisSeatHoldService,
                                  SeatRealtimePublisher seatRealtimePublisher) {
        this.seatRepository = seatRepository;
        this.redisSeatHoldService = redisSeatHoldService;
        this.seatRealtimePublisher = seatRealtimePublisher;
    }

    @Scheduled(fixedDelayString = "${app.seat-lock-release.fixed-delay-ms:30000}")
    @Transactional
    public void cleanupExpiredSeatLocks() {
        List<ReleasedSeatSnapshot> releasedSeats = releaseExpiredSeatLocks();
        for (ReleasedSeatSnapshot releasedSeat : releasedSeats) {
            redisSeatHoldService.markSeatAvailable(releasedSeat.eventId(), releasedSeat.seatId());
            seatRealtimePublisher.publishSeatStatus(releasedSeat.eventId(), releasedSeat.seatId(), SeatStatus.AVAILABLE);
        }
    }

    @Transactional
    public List<ReleasedSeatSnapshot> releaseExpiredSeatLocks() {
        LocalDateTime now = LocalDateTime.now();
        List<Seat> expiredSeats = seatRepository.findAllExpiredLockedSeatsForUpdate(now);
        if (expiredSeats.isEmpty()) {
            return List.of();
        }

        List<ReleasedSeatSnapshot> releasedSeats = expiredSeats.stream()
                .map(seat -> new ReleasedSeatSnapshot(seat.getEvent().getId(), seat.getId()))
                .toList();

        for (Seat seat : expiredSeats) {
            seat.setStatus(SeatStatus.AVAILABLE);
            seat.setLockedByUserId(null);
            seat.setLockedUntil(null);
        }

        seatRepository.saveAll(expiredSeats);
        return releasedSeats;
    }

    public record ReleasedSeatSnapshot(Long eventId, Long seatId) {
    }
}
