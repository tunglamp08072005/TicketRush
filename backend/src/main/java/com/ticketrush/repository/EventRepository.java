package com.ticketrush.repository;

import com.ticketrush.entity.Event;
import com.ticketrush.entity.EventStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {
    List<Event> findAllByOrderByOpenSaleDateDesc();

    List<Event> findByFeaturedTrueAndStatusInOrderByOpenSaleDateAsc(List<EventStatus> statuses);
}
