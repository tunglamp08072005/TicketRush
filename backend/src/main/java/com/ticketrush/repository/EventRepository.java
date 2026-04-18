package com.ticketrush.repository;

import com.ticketrush.entity.Event;
import com.ticketrush.entity.EventStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {
    @Query("select distinct e from Event e left join fetch e.zones z order by e.openSaleDate desc")
    List<Event> findAllByOrderByOpenSaleDateDesc();

    @Query("""
            select distinct e
            from Event e
            left join fetch e.zones z
            where (:keyword is null
                or lower(e.name) like lower(concat('%', :keyword, '%'))
                or lower(e.location) like lower(concat('%', :keyword, '%'))
                or lower(e.description) like lower(concat('%', :keyword, '%')))
            order by e.openSaleDate desc
            """)
    List<Event> searchAllByKeyword(@Param("keyword") String keyword);

    @Query("select distinct e from Event e left join fetch e.zones z where e.featured = true and e.status in :statuses order by e.openSaleDate asc")
    List<Event> findByFeaturedTrueAndStatusInOrderByOpenSaleDateAsc(List<EventStatus> statuses);

    @Query("select distinct e from Event e left join fetch e.zones z where e.id = :id")
    Optional<Event> findDetailById(@Param("id") Long id);
}
