package com.ticketrush.features.event.repository;

import com.ticketrush.features.event.entity.Event;
import com.ticketrush.features.event.entity.EventStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
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

            @Query("""
                select distinct e
                from Event e
                left join fetch e.zones z
                    where coalesce(e.publicVisible, true) = true
                      and coalesce(e.archived, false) = false
                order by e.openSaleDate desc
                """)
            List<Event> findPublicVisibleEvents();

            @Query("""
                select distinct e
                from Event e
                left join fetch e.zones z
                where coalesce(e.publicVisible, true) = true
                  and coalesce(e.archived, false) = false
                  and (:keyword is null
                or lower(e.name) like lower(concat('%', :keyword, '%'))
                or lower(e.location) like lower(concat('%', :keyword, '%'))
                or lower(e.description) like lower(concat('%', :keyword, '%')))
                order by e.openSaleDate desc
                """)
            List<Event> searchPublicVisibleByKeyword(@Param("keyword") String keyword);

        @Query("select distinct e from Event e left join fetch e.zones z where e.featured = true and coalesce(e.publicVisible, true) = true and coalesce(e.archived, false) = false and e.status in :statuses order by e.openSaleDate asc")
    List<Event> findByFeaturedTrueAndStatusInOrderByOpenSaleDateAsc(List<EventStatus> statuses);

    @Query("select distinct e from Event e left join fetch e.zones z where e.id = :id")
    Optional<Event> findDetailById(@Param("id") Long id);

            @Query("select distinct e from Event e left join fetch e.zones z where e.id = :id and coalesce(e.publicVisible, true) = true and coalesce(e.archived, false) = false")
            Optional<Event> findPublicDetailById(@Param("id") Long id);

            @Modifying
            @Query("""
                    update Event e
                    set e.publicVisible = true
                    where coalesce(e.archived, false) = false
                      and coalesce(e.publicVisible, true) = false
                      and e.openSaleDate <= :now
                      and (e.saleEndDate is null or e.saleEndDate > :now)
                    """)
            int autoPublishByOpenSaleDate(@Param("now") LocalDateTime now);

            @Modifying
            @Query("""
                    update Event e
                    set e.archived = true,
                        e.publicVisible = false
                    where coalesce(e.archived, false) = false
                      and e.saleEndDate is not null
                      and e.saleEndDate <= :now
                    """)
            int autoArchiveBySaleEndDate(@Param("now") LocalDateTime now);
}