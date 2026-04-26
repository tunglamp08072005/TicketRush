package com.ticketrush.features.order.worker;

import com.ticketrush.features.order.service.VirtualQueueService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class VirtualQueueDispatchWorker {

    private final VirtualQueueService virtualQueueService;

    public VirtualQueueDispatchWorker(VirtualQueueService virtualQueueService) {
        this.virtualQueueService = virtualQueueService;
    }

    @Scheduled(fixedDelayString = "${app.virtual-queue.worker-interval-ms:1000}")
    public void dispatchWaitingUsers() {
        virtualQueueService.dispatchAllTrackedEvents();
    }
}
