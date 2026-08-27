package com.ferrecontrol.repository;

import com.ferrecontrol.model.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    List<Customer> findByTenantId(Long tenantId);
    Optional<Customer> findByDocumentNumberAndTenantId(String documentNumber, Long tenantId);
    List<Customer> findByNameContainingIgnoreCaseAndTenantId(String name, Long tenantId);
}
