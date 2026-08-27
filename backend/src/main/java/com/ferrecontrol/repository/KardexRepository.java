package com.ferrecontrol.repository;

import com.ferrecontrol.model.KardexMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KardexRepository extends JpaRepository<KardexMovement, Long> {
    List<KardexMovement> findByProductIdOrderByCreatedAtDesc(Long productId);
}
