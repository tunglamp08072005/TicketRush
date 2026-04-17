package com.ticketrush.repository;

import com.ticketrush.entity.User;
import org.springframework.data.mongodb.repository.MongoRepository; 
import java.util.Optional;

// THAY THẾ: JpaRepository bằng MongoRepository
// Lưu ý: ID của User trong MongoDB thường là String, hãy kiểm tra lại file User.java
public interface UserRepository extends MongoRepository<User, String> {
    
    Optional<User> findByUsername(String username);
    
    boolean existsByUsername(String username);
}