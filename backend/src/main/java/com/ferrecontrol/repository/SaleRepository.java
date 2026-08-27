package com.ferrecontrol.repository;

import com.ferrecontrol.model.Sale;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SaleRepository extends JpaRepository<Sale, Long> {
    
    @Query("SELECT s FROM Sale s LEFT JOIN FETCH s.items i LEFT JOIN FETCH i.product p LEFT JOIN FETCH s.customer c WHERE s.tenant.id = :tenantId")
    Page<Sale> findByTenantId(@Param("tenantId") Long tenantId, Pageable pageable);
    
    @Query("SELECT s FROM Sale s LEFT JOIN FETCH s.items i LEFT JOIN FETCH i.product p LEFT JOIN FETCH s.customer c WHERE s.tenant.id = :tenantId")
    List<Sale> findByTenantId(@Param("tenantId") Long tenantId);
    
    @Query("SELECT MAX(s.invoiceNumber) FROM Sale s WHERE s.tenant.id = :tenantId AND s.invoiceNumber LIKE :prefix")
    Optional<String> findLastInvoiceNumberByTenant(@Param("tenantId") Long tenantId, @Param("prefix") String prefix);

    @Query("SELECT s FROM Sale s LEFT JOIN FETCH s.items i LEFT JOIN FETCH i.product p LEFT JOIN FETCH s.customer c WHERE s.tenant.id = :tenantId AND s.createdAt >= :startDate AND s.createdAt <= :endDate")
    List<Sale> findByTenantIdAndDateRange(@Param("tenantId") Long tenantId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT SUM(s.totalAmount) FROM Sale s WHERE s.tenant.id = :tenantId AND s.createdAt >= :startDate AND s.createdAt <= :endDate")
    java.math.BigDecimal sumTotalByTenantIdAndDateRange(@Param("tenantId") Long tenantId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT COUNT(s) FROM Sale s WHERE s.tenant.id = :tenantId AND s.createdAt >= :startDate AND s.createdAt <= :endDate")
    long countByTenantIdAndDateRange(@Param("tenantId") Long tenantId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
}
