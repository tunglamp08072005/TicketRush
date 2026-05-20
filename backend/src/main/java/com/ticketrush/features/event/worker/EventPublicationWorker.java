package com.ticketrush.features.event.worker;

import com.ticketrush.features.event.service.EventService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class EventPublicationWorker {

    private final EventService eventService;

    public EventPublicationWorker(EventService eventService) {
        this.eventService = eventService;
    }

    @Scheduled(fixedDelayString = "${app.events.publication-sync-interval-ms:60000}")
    public void syncPublicationState() {
        int changed = eventService.syncEventPublicationState();
        if (changed > 0) {
            log.info("Event publication lifecycle sync updated {} events", changed);
        }
    }
}
