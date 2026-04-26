package com.ticketrush.features.order.service;

import com.ticketrush.features.order.dto.VirtualQueueStatusResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class VirtualQueueService {

    private static final Logger log = LoggerFactory.getLogger(VirtualQueueService.class);

    private final StringRedisTemplate redisTemplate;

    @Value("${app.virtual-queue.enabled:true}")
    private boolean enabled;

    @Value("${app.virtual-queue.batch-size}")
    private int batchSize;

    @Value("${app.virtual-queue.max-active-tokens}")
    private int maxActiveTokens;

    @Value("${app.virtual-queue.admit-ttl-seconds:180}")
    private long admitTtlSeconds;

    @Value("${app.virtual-queue.waiting-record-ttl-seconds:3600}")
    private long waitingRecordTtlSeconds;

    @Value("${app.virtual-queue.estimated-batch-seconds:8}")
    private long estimatedBatchSeconds;

    @Value("${app.virtual-queue.dispatch-cooldown-ms:400}")
    private long dispatchCooldownMs;

    @Value("${app.virtual-queue.enter-lock-ms:3000}")
    private long enterLockMs;

    @Value("${app.virtual-queue.immediate-admit-retries:3}")
    private int immediateAdmitRetries;

    @Value("${app.virtual-queue.immediate-admit-retry-delay-ms:80}")
    private long immediateAdmitRetryDelayMs;

    public VirtualQueueService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public VirtualQueueStatusResponse enterQueue(Long eventId, Long userId) {
        if (!enabled) {
            return disabledResponse(eventId);
        }

        trackEvent(eventId);
        cleanupExpiredAdmissions(eventId);

        String enterLockKey = enterLockKey(eventId, userId);
        Boolean enterLock = redisTemplate.opsForValue().setIfAbsent(
                enterLockKey,
                "1",
                Duration.ofMillis(Math.max(500L, enterLockMs))
        );
        if (!Boolean.TRUE.equals(enterLock)) {
            VirtualQueueStatusResponse inFlightStatus = waitForInFlightStatus(eventId, userId);
            if (inFlightStatus != null) {
                log.debug("virtual-queue enter dedup hit eventId={}, userId={}, status={}", eventId, userId, inFlightStatus.getStatus());
                return inFlightStatus;
            }
            throw new IllegalArgumentException("Queue request is being processed. Please retry in a moment.");
        }

        try {
            String existingToken = redisTemplate.opsForValue().get(userEventKey(eventId, userId));
            if (existingToken != null && !existingToken.isBlank()) {
                VirtualQueueStatusResponse existingStatus = getStatus(eventId, userId, existingToken);
                if (existingStatus != null) {
                    if ("EXPIRED".equals(existingStatus.getStatus())) {
                        redisTemplate.delete(userEventKey(eventId, userId));
                        redisTemplate.opsForZSet().remove(waitingQueueKey(eventId), existingToken);
                        redisTemplate.opsForZSet().remove(admittedQueueKey(eventId), existingToken);
                    } else {
                    return existingStatus;
                    }
                }
            }

            String queueToken = UUID.randomUUID().toString();
            if (tryAdmitImmediatelyWithRetry(eventId, userId, queueToken)) {
                log.debug("virtual-queue enter admitted immediately eventId={}, userId={}, token={}", eventId, userId, queueToken);
                return getStatus(eventId, userId, queueToken);
            }

            Long sequence = redisTemplate.opsForValue().increment(sequenceKey(eventId));
            long score = sequence == null ? Instant.now().toEpochMilli() : sequence;

            String tokenKey = tokenKey(queueToken);
            redisTemplate.opsForHash().put(tokenKey, "eventId", String.valueOf(eventId));
            redisTemplate.opsForHash().put(tokenKey, "userId", String.valueOf(userId));
            redisTemplate.opsForHash().put(tokenKey, "status", "WAITING");
            redisTemplate.opsForHash().put(tokenKey, "message", "Bạn đang ở trong phòng chờ");
            redisTemplate.opsForHash().put(tokenKey, "joinedAt", String.valueOf(Instant.now().toEpochMilli()));
            redisTemplate.expire(tokenKey, Duration.ofSeconds(Math.max(waitingRecordTtlSeconds, admitTtlSeconds)));

            redisTemplate.opsForValue().set(userEventKey(eventId, userId), queueToken, Duration.ofSeconds(waitingRecordTtlSeconds));
            redisTemplate.opsForZSet().add(waitingQueueKey(eventId), queueToken, score);
            redisTemplate.expire(waitingQueueKey(eventId), Duration.ofHours(6));

                Long active = redisTemplate.opsForZSet().size(admittedQueueKey(eventId));
                Long waiting = redisTemplate.opsForZSet().size(waitingQueueKey(eventId));
                log.debug(
                    "virtual-queue enter moved to waiting eventId={}, userId={}, token={}, activeCount={}, waitingCount={}",
                    eventId,
                    userId,
                    queueToken,
                    active == null ? 0L : active,
                    waiting == null ? 0L : waiting
                );

            dispatchBatch(eventId);
            return getStatus(eventId, userId, queueToken);
        } finally {
            redisTemplate.delete(enterLockKey);
        }
    }

    private boolean canAdmitImmediately(Long eventId) {
        Long waitingCount = redisTemplate.opsForZSet().size(waitingQueueKey(eventId));
        if (waitingCount != null && waitingCount > 0L) {
            return false;
        }

        Long activeCount = redisTemplate.opsForZSet().size(admittedQueueKey(eventId));
        long active = activeCount == null ? 0L : activeCount;
        return active < Math.max(1, maxActiveTokens);
    }

    private boolean tryAdmitImmediately(Long eventId, Long userId, String queueToken) {
        String dispatchLockKey = dispatchLockKey(eventId);
        Boolean lock = redisTemplate.opsForValue().setIfAbsent(
                dispatchLockKey,
                "1",
                Duration.ofMillis(Math.max(50L, dispatchCooldownMs))
        );
        if (!Boolean.TRUE.equals(lock)) {
            return false;
        }

        if (!canAdmitImmediately(eventId)) {
            return false;
        }

        long now = Instant.now().toEpochMilli();
        long admitUntil = now + Math.max(1L, admitTtlSeconds) * 1000L;
        String tokenKey = tokenKey(queueToken);

        redisTemplate.opsForHash().put(tokenKey, "eventId", String.valueOf(eventId));
        redisTemplate.opsForHash().put(tokenKey, "userId", String.valueOf(userId));
        redisTemplate.opsForHash().put(tokenKey, "status", "ADMITTED");
        redisTemplate.opsForHash().put(tokenKey, "message", "Đến lượt bạn, hãy vào chọn ghế");
        redisTemplate.opsForHash().put(tokenKey, "joinedAt", String.valueOf(now));
        redisTemplate.opsForHash().put(tokenKey, "admittedUntil", String.valueOf(admitUntil));
        redisTemplate.expire(tokenKey, Duration.ofSeconds(Math.max(admitTtlSeconds, 60L)));

        redisTemplate.opsForValue().set(userEventKey(eventId, userId), queueToken, Duration.ofSeconds(waitingRecordTtlSeconds));
        redisTemplate.opsForZSet().add(admittedQueueKey(eventId), queueToken, admitUntil);
        redisTemplate.expire(admittedQueueKey(eventId), Duration.ofHours(6));
        return true;
    }

    private boolean tryAdmitImmediatelyWithRetry(Long eventId, Long userId, String queueToken) {
        int retries = Math.max(0, immediateAdmitRetries);
        long retryDelayMs = Math.max(20L, immediateAdmitRetryDelayMs);
        long requiredRetryWindowMs = Math.max(0L, dispatchCooldownMs) + 80L;
        long configuredRetryWindowMs = (long) retries * retryDelayMs;
        if (configuredRetryWindowMs < requiredRetryWindowMs) {
            retries = (int) Math.ceil((double) requiredRetryWindowMs / (double) retryDelayMs);
        }

        for (int attempt = 0; attempt <= retries; attempt++) {
            if (tryAdmitImmediately(eventId, userId, queueToken)) {
                return true;
            }

            // If capacity is actually full (or someone is ahead in waiting queue), stop retrying and enqueue.
            if (!canAdmitImmediately(eventId)) {
                return false;
            }

            if (attempt == retries) {
                break;
            }

            try {
                Thread.sleep(retryDelayMs);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                return false;
            }
        }

        return false;
    }

    public VirtualQueueStatusResponse getStatus(Long eventId, Long userId, String queueToken) {
        if (!enabled) {
            return disabledResponse(eventId);
        }

        trackEvent(eventId);

        if (queueToken == null || queueToken.isBlank()) {
            throw new IllegalArgumentException("Missing queue token");
        }

        String tokenKey = tokenKey(queueToken);
        Map<Object, Object> data = redisTemplate.opsForHash().entries(tokenKey);
        if (data == null || data.isEmpty()) {
            return null;
        }

        Long tokenEventId = parseLong(data.get("eventId"));
        Long tokenUserId = parseLong(data.get("userId"));
        if (!eventId.equals(tokenEventId) || !userId.equals(tokenUserId)) {
            // Stale mapping can happen when an old token remains in Redis.
            // Clear user-event pointer so caller can re-enter and receive a fresh token.
            redisTemplate.delete(userEventKey(eventId, userId));
            return null;
        }

        dispatchBatch(eventId);

        data = redisTemplate.opsForHash().entries(tokenKey);
        if (data == null || data.isEmpty()) {
            return null;
        }

        String status = readString(data.get("status"));
        Long admittedUntil = parseLong(data.get("admittedUntil"));
        long now = Instant.now().toEpochMilli();

        if ("ADMITTED".equals(status) && admittedUntil != null && admittedUntil <= now) {
            expireAdmission(eventId, userId, queueToken, tokenKey);
            status = "EXPIRED";
            admittedUntil = null;
        }

        if ("WAITING".equals(status)) {
            Long rank = redisTemplate.opsForZSet().rank(waitingQueueKey(eventId), queueToken);
            long position = rank == null ? 1L : rank + 1L;
            long estimatedWait = ((position - 1L) / Math.max(1, batchSize) + 1L) * Math.max(1, estimatedBatchSeconds);
            String message = "Bạn đang ở vị trí thứ " + position + " trong hàng đợi. Vui lòng không tải lại trang...";

            redisTemplate.opsForHash().put(tokenKey, "message", message);
            redisTemplate.expire(tokenKey, Duration.ofSeconds(waitingRecordTtlSeconds));

            return new VirtualQueueStatusResponse(
                    eventId,
                    queueToken,
                    "WAITING",
                    position,
                    Math.max(1, batchSize),
                    message,
                    null,
                    estimatedWait
            );
        }

        if ("ADMITTED".equals(status)) {
            String message = "Đến lượt bạn. Bạn đã được cấp quyền vào màn hình chọn ghế.";
            return new VirtualQueueStatusResponse(
                    eventId,
                    queueToken,
                    "ADMITTED",
                    0L,
                    Math.max(1, batchSize),
                    message,
                    admittedUntil,
                    0L
            );
        }

        String message = "Lượt truy cập đã hết hạn. Vui lòng vào lại phòng chờ.";
        return new VirtualQueueStatusResponse(
                eventId,
                queueToken,
                "EXPIRED",
                null,
                Math.max(1, batchSize),
                message,
                null,
                null
        );
    }

    public void assertAdmitted(Long eventId, Long userId, String queueToken) {
        if (!enabled) {
            return;
        }

        VirtualQueueStatusResponse status = getStatus(eventId, userId, queueToken);
        if (status == null || !"ADMITTED".equals(status.getStatus())) {
            throw new IllegalArgumentException("Bạn chưa đến lượt. Vui lòng vào phòng chờ để nhận quyền đặt vé.");
        }
    }

    public void assertAdmittedAndRefresh(Long eventId, Long userId, String queueToken) {
        assertAdmitted(eventId, userId, queueToken);

        // Extend access TTL at operation start to reduce expiry races during payment upload/confirmation.
        heartbeat(eventId, userId, queueToken);
    }

    public void releaseAdmission(Long eventId, Long userId, String queueToken) {
        if (!enabled || queueToken == null || queueToken.isBlank()) {
            return;
        }

        trackEvent(eventId);

        String tokenKey = tokenKey(queueToken);
        Map<Object, Object> data = redisTemplate.opsForHash().entries(tokenKey);
        if (data == null || data.isEmpty()) {
            return;
        }

        Long tokenEventId = parseLong(data.get("eventId"));
        Long tokenUserId = parseLong(data.get("userId"));
        if (!eventId.equals(tokenEventId) || !userId.equals(tokenUserId)) {
            return;
        }

        redisTemplate.opsForZSet().remove(admittedQueueKey(eventId), queueToken);
        redisTemplate.delete(userEventKey(eventId, userId));
        redisTemplate.opsForHash().put(tokenKey, "status", "COMPLETED");
        redisTemplate.opsForHash().put(tokenKey, "message", "Quyền truy cập đã được sử dụng");
        redisTemplate.expire(tokenKey, Duration.ofMinutes(20));

        dispatchBatch(eventId);
    }

    public VirtualQueueStatusResponse heartbeat(Long eventId, Long userId, String queueToken) {
        if (!enabled) {
            return disabledResponse(eventId);
        }

        if (queueToken == null || queueToken.isBlank()) {
            throw new IllegalArgumentException("Missing queue token");
        }

        trackEvent(eventId);
        cleanupExpiredAdmissions(eventId);

        String tokenKey = tokenKey(queueToken);
        Map<Object, Object> data = redisTemplate.opsForHash().entries(tokenKey);
        if (data == null || data.isEmpty()) {
            return null;
        }

        Long tokenEventId = parseLong(data.get("eventId"));
        Long tokenUserId = parseLong(data.get("userId"));
        if (!eventId.equals(tokenEventId) || !userId.equals(tokenUserId)) {
            return null;
        }

        String status = readString(data.get("status"));
        if ("ADMITTED".equals(status)) {
            long newAdmitUntil = Instant.now().toEpochMilli() + Math.max(1L, admitTtlSeconds) * 1000L;
            redisTemplate.opsForHash().put(tokenKey, "admittedUntil", String.valueOf(newAdmitUntil));
            redisTemplate.expire(tokenKey, Duration.ofSeconds(Math.max(admitTtlSeconds, 60L)));
            redisTemplate.opsForZSet().add(admittedQueueKey(eventId), queueToken, newAdmitUntil);
            redisTemplate.expire(admittedQueueKey(eventId), Duration.ofHours(6));
        }

        return getStatus(eventId, userId, queueToken);
    }

    public void releaseAdmissionByToken(Long eventId, String queueToken) {
        if (!enabled || queueToken == null || queueToken.isBlank()) {
            return;
        }

        String tokenKey = tokenKey(queueToken);
        Map<Object, Object> data = redisTemplate.opsForHash().entries(tokenKey);
        if (data == null || data.isEmpty()) {
            return;
        }

        Long tokenEventId = parseLong(data.get("eventId"));
        Long tokenUserId = parseLong(data.get("userId"));
        if (!eventId.equals(tokenEventId) || tokenUserId == null) {
            return;
        }

        redisTemplate.opsForZSet().remove(admittedQueueKey(eventId), queueToken);
        redisTemplate.opsForZSet().remove(waitingQueueKey(eventId), queueToken);
        redisTemplate.delete(userEventKey(eventId, tokenUserId));
        redisTemplate.opsForHash().put(tokenKey, "status", "EXPIRED");
        redisTemplate.opsForHash().put(tokenKey, "message", "Phiên truy cập đã đóng");
        redisTemplate.expire(tokenKey, Duration.ofMinutes(5));

        dispatchBatch(eventId);
    }

    public void dispatchAllTrackedEvents() {
        if (!enabled) {
            return;
        }

        Set<String> trackedEventIds = redisTemplate.opsForSet().members(trackedEventsKey());
        if (trackedEventIds == null || trackedEventIds.isEmpty()) {
            return;
        }

        for (String rawEventId : trackedEventIds) {
            Long eventId = parseLong(rawEventId);
            if (eventId == null) {
                redisTemplate.opsForSet().remove(trackedEventsKey(), rawEventId);
                continue;
            }

            dispatchBatch(eventId);
            cleanupTrackedEventIfIdle(eventId);
        }
    }

    private void dispatchBatch(Long eventId) {
        String dispatchLockKey = dispatchLockKey(eventId);
        Boolean lock = redisTemplate.opsForValue().setIfAbsent(
                dispatchLockKey,
                "1",
                Duration.ofMillis(Math.max(50L, dispatchCooldownMs))
        );
        if (!Boolean.TRUE.equals(lock)) {
            return;
        }

        cleanupExpiredAdmissions(eventId);

        Long active = redisTemplate.opsForZSet().size(admittedQueueKey(eventId));
        long activeCount = active == null ? 0L : active;
        long availableSlots = Math.max(0L, Math.max(1, maxActiveTokens) - activeCount);
        long admitCount = Math.min(Math.max(1, batchSize), availableSlots);
        if (admitCount <= 0) {
            return;
        }

        Set<String> waitingTokens = redisTemplate.opsForZSet().range(waitingQueueKey(eventId), 0, admitCount - 1);
        if (waitingTokens == null || waitingTokens.isEmpty()) {
            return;
        }

        long now = Instant.now().toEpochMilli();
        long admitUntil = now + Math.max(1L, admitTtlSeconds) * 1000L;

        for (String token : waitingTokens) {
            Long removed = redisTemplate.opsForZSet().remove(waitingQueueKey(eventId), token);
            if (removed == null || removed <= 0) {
                continue;
            }

            String tokenKey = tokenKey(token);
            redisTemplate.opsForHash().put(tokenKey, "status", "ADMITTED");
            redisTemplate.opsForHash().put(tokenKey, "message", "Đến lượt bạn, hãy vào chọn ghế");
            redisTemplate.opsForHash().put(tokenKey, "admittedUntil", String.valueOf(admitUntil));
            redisTemplate.expire(tokenKey, Duration.ofSeconds(Math.max(admitTtlSeconds, 60L)));
            redisTemplate.opsForZSet().add(admittedQueueKey(eventId), token, admitUntil);
        }

        redisTemplate.expire(admittedQueueKey(eventId), Duration.ofHours(6));
    }

    private void cleanupExpiredAdmissions(Long eventId) {
        long now = Instant.now().toEpochMilli();
        Set<String> expiredTokens = redisTemplate.opsForZSet().rangeByScore(admittedQueueKey(eventId), Double.NEGATIVE_INFINITY, now);
        if (expiredTokens == null || expiredTokens.isEmpty()) {
            return;
        }

        for (String token : expiredTokens) {
            String tokenKey = tokenKey(token);
            Long tokenUserId = parseLong(redisTemplate.opsForHash().get(tokenKey, "userId"));
            if (tokenUserId != null) {
                redisTemplate.delete(userEventKey(eventId, tokenUserId));
            }
            redisTemplate.opsForHash().put(tokenKey, "status", "EXPIRED");
            redisTemplate.opsForHash().put(tokenKey, "message", "Lượt truy cập đã hết hạn");
            redisTemplate.expire(tokenKey, Duration.ofMinutes(20));
            redisTemplate.opsForZSet().remove(admittedQueueKey(eventId), token);
        }
    }

    private void expireAdmission(Long eventId, Long userId, String queueToken, String tokenKey) {
        redisTemplate.opsForZSet().remove(admittedQueueKey(eventId), queueToken);
        redisTemplate.delete(userEventKey(eventId, userId));
        redisTemplate.opsForHash().put(tokenKey, "status", "EXPIRED");
        redisTemplate.opsForHash().put(tokenKey, "message", "Lượt truy cập đã hết hạn");
        redisTemplate.expire(tokenKey, Duration.ofMinutes(20));
    }

    private VirtualQueueStatusResponse disabledResponse(Long eventId) {
        return new VirtualQueueStatusResponse(
                eventId,
                null,
                "DISABLED",
                0L,
                Math.max(1, batchSize),
                "Virtual queue is disabled",
                null,
                0L
        );
    }

    private Long parseLong(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String readString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private String waitingQueueKey(Long eventId) {
        return "virtual-queue:event:" + eventId + ":waiting";
    }

    private String admittedQueueKey(Long eventId) {
        return "virtual-queue:event:" + eventId + ":admitted";
    }

    private String sequenceKey(Long eventId) {
        return "virtual-queue:event:" + eventId + ":seq";
    }

    private String tokenKey(String queueToken) {
        return "virtual-queue:token:" + queueToken;
    }

    private String userEventKey(Long eventId, Long userId) {
        return "virtual-queue:event:" + eventId + ":user:" + userId + ":token";
    }

    private String dispatchLockKey(Long eventId) {
        return "virtual-queue:event:" + eventId + ":dispatch-lock";
    }

    private String enterLockKey(Long eventId, Long userId) {
        return "virtual-queue:event:" + eventId + ":user:" + userId + ":enter-lock";
    }

    private VirtualQueueStatusResponse waitForInFlightStatus(Long eventId, Long userId) {
        int retries = 6;
        long waitMs = 80L;

        for (int i = 0; i < retries; i++) {
            String inFlightToken = redisTemplate.opsForValue().get(userEventKey(eventId, userId));
            if (inFlightToken != null && !inFlightToken.isBlank()) {
                VirtualQueueStatusResponse inFlightStatus = getStatus(eventId, userId, inFlightToken);
                if (inFlightStatus != null) {
                    return inFlightStatus;
                }
            }

            try {
                Thread.sleep(waitMs);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                return null;
            }
        }

        return null;
    }

    private void trackEvent(Long eventId) {
        if (eventId == null) {
            return;
        }

        redisTemplate.opsForSet().add(trackedEventsKey(), String.valueOf(eventId));
        redisTemplate.expire(trackedEventsKey(), Duration.ofDays(7));
    }

    private void cleanupTrackedEventIfIdle(Long eventId) {
        Long waitingCount = redisTemplate.opsForZSet().size(waitingQueueKey(eventId));
        Long admittedCount = redisTemplate.opsForZSet().size(admittedQueueKey(eventId));

        long waiting = waitingCount == null ? 0L : waitingCount;
        long admitted = admittedCount == null ? 0L : admittedCount;
        if (waiting == 0L && admitted == 0L) {
            redisTemplate.opsForSet().remove(trackedEventsKey(), String.valueOf(eventId));
        }
    }

    private String trackedEventsKey() {
        return "virtual-queue:events";
    }
}
