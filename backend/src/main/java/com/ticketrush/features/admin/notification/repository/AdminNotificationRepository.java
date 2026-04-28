package com.ticketrush.features.admin.notification.repository;

import com.ticketrush.features.admin.notification.entity.AdminNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AdminNotificationRepository extends JpaRepository<AdminNotification, Long> {
    List<AdminNotification> findAllByOrderByCreatedAtDesc();

    List<AdminNotification> findByIsReadFalse();

    long countByIsReadFalse();

    long countByTypeIn(List<String> types);

    void deleteByCreatedAtBefore(LocalDateTime dateTime);
}
