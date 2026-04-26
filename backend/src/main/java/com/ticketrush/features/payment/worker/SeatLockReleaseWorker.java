package com.ticketrush.features.payment.worker;

import com.ticketrush.features.event.repository.SeatRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
public class SeatLockReleaseWorker {

    private static final Logger log = LoggerFactory.getLogger(SeatLockReleaseWorker.class);

    private final SeatRepository seatRepository;

    public SeatLockReleaseWorker(SeatRepository seatRepository) {
        this.seatRepository = seatRepository;
    }

    @Transactional
    @Scheduled(fixedDelayString = "${app.seats.release-worker-interval-ms:10000}")
    public void releaseExpiredSeatLocks() {
        int released = seatRepository.releaseExpiredLocks(LocalDateTime.now());
        if (released > 0) {
            log.info("Released {} expired seat lock(s)", released);
        }
    }
}
