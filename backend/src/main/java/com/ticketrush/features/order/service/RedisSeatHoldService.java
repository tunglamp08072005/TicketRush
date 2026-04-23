package com.ticketrush.features.order.service;

import com.ticketrush.features.event.entity.SeatStatus;
import com.ticketrush.features.event.repository.SeatRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Service
public class RedisSeatHoldService {

    private final StringRedisTemplate redisTemplate;
    private final SeatRepository seatRepository;

    @Value("${app.flash-sale.redis-hold-seconds:600}")
    private long defaultHoldSeconds;

    public RedisSeatHoldService(StringRedisTemplate redisTemplate, SeatRepository seatRepository) {
        this.redisTemplate = redisTemplate;
        this.seatRepository = seatRepository;
    }

    public void ensureAvailableSetLoaded(Long eventId) {
        String key = availableSetKey(eventId);
        Long size = redisTemplate.opsForSet().size(key);
        if (size != null && size > 0) {
            return;
        }

        List<Long> seatIds = seatRepository.findSeatIdsByEventIdAndStatus(eventId, SeatStatus.AVAILABLE);
        if (seatIds.isEmpty()) {
            return;
        }

        String[] values = seatIds.stream().map(String::valueOf).toArray(String[]::new);
        redisTemplate.opsForSet().add(key, values);
    }

    public List<Long> holdSeats(Long eventId, Long userId, List<Long> seatIds, Long holdSecondsOverride) {
        long ttlSeconds = holdSecondsOverride == null || holdSecondsOverride <= 0 ? defaultHoldSeconds : holdSecondsOverride;
        List<Long> held = new ArrayList<>();

        for (Long seatId : seatIds) {
            String availableKey = availableSetKey(eventId);
            String lockKey = lockKey(seatId);
            String seatValue = String.valueOf(seatId);

            Boolean inAvailableSet = redisTemplate.opsForSet().isMember(availableKey, seatValue);
            if (!Boolean.TRUE.equals(inAvailableSet)) {
                rollbackHeldSeats(eventId, held);
                throw new IllegalArgumentException("Seat " + seatId + " is not available");
            }

            Boolean lockOk = redisTemplate.opsForValue().setIfAbsent(lockKey, String.valueOf(userId), Duration.ofSeconds(ttlSeconds));
            if (!Boolean.TRUE.equals(lockOk)) {
                rollbackHeldSeats(eventId, held);
                throw new IllegalArgumentException("Seat " + seatId + " is currently locked");
            }

            Long removed = redisTemplate.opsForSet().remove(availableKey, seatValue);
            if (removed == null || removed == 0) {
                redisTemplate.delete(lockKey);
                rollbackHeldSeats(eventId, held);
                throw new IllegalArgumentException("Seat " + seatId + " is not available");
            }

            held.add(seatId);
        }

        return held;
    }

    public void rollbackHeldSeats(Long eventId, List<Long> seatIds) {
        if (seatIds == null || seatIds.isEmpty()) {
            return;
        }

        String availableKey = availableSetKey(eventId);
        for (Long seatId : seatIds) {
            redisTemplate.opsForSet().add(availableKey, String.valueOf(seatId));
            redisTemplate.delete(lockKey(seatId));
        }
    }

    public void markSeatsSold(List<Long> seatIds) {
        if (seatIds == null || seatIds.isEmpty()) {
            return;
        }
        for (Long seatId : seatIds) {
            redisTemplate.delete(lockKey(seatId));
        }
    }

    public void setQueueStatusPending(String queueId, Long userId) {
        String key = queueKey(queueId);
        redisTemplate.opsForHash().put(key, "status", "PENDING");
        redisTemplate.opsForHash().put(key, "message", "Waiting in queue");
        redisTemplate.opsForHash().put(key, "userId", String.valueOf(userId));
        redisTemplate.expire(key, Duration.ofHours(2));
    }

    public void setQueueStatusSuccess(String queueId, Long orderId) {
        String key = queueKey(queueId);
        redisTemplate.opsForHash().put(key, "status", "SUCCESS");
        redisTemplate.opsForHash().put(key, "message", "Order completed");
        redisTemplate.opsForHash().put(key, "orderId", String.valueOf(orderId));
        redisTemplate.expire(key, Duration.ofHours(12));
    }

    public void setQueueStatusFailed(String queueId, String reason) {
        String key = queueKey(queueId);
        redisTemplate.opsForHash().put(key, "status", "FAILED");
        redisTemplate.opsForHash().put(key, "message", reason == null || reason.isBlank() ? "Order failed" : reason);
        redisTemplate.expire(key, Duration.ofHours(2));
    }

    public String getQueueField(String queueId, String field) {
        Object value = redisTemplate.opsForHash().get(queueKey(queueId), field);
        return value == null ? null : value.toString();
    }

    private String availableSetKey(Long eventId) {
        return "flashsale:event:" + eventId + ":available-seats";
    }

    private String lockKey(Long seatId) {
        return "flashsale:seat-lock:" + seatId;
    }

    private String queueKey(String queueId) {
        return "flashsale:queue:" + queueId;
    }
}
