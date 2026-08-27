package com.ferrecontrol.repository;

import com.ferrecontrol.model.SunatPadron;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SunatPadronRepository extends JpaRepository<SunatPadron, Long> {
    Optional<SunatPadron> findByRuc(String ruc);
    long count();
}
