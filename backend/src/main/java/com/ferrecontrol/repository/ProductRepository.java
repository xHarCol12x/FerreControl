package com.ferrecontrol.repository;

import com.ferrecontrol.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    
    @Query("SELECT p FROM Product p WHERE p.tenant.id = :tenantId")
    Page<Product> findByTenantId(@Param("tenantId") Long tenantId, Pageable pageable);
    
    List<Product> findByTenantId(Long tenantId);
    
    Optional<Product> findByIdAndTenantId(Long id, Long tenantId);
    
    boolean existsBySkuAndTenantId(String sku, Long tenantId);
    
    @Query("SELECT p FROM Product p WHERE p.tenant.id = :tenantId AND p.stock < :threshold")
    List<Product> findLowStockByTenantId(@Param("tenantId") Long tenantId, @Param("threshold") Integer threshold);
    
    @Query("SELECT p FROM Product p WHERE p.tenant.id = :tenantId AND (LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Product> searchByTenantId(@Param("tenantId") Long tenantId, @Param("search") String search, Pageable pageable);
    
    @Query("SELECT p FROM Product p WHERE p.tenant.id = :tenantId AND p.category = :category")
    Page<Product> findByTenantIdAndCategory(@Param("tenantId") Long tenantId, @Param("category") String category, Pageable pageable);
    
    long countByTenantId(Long tenantId);
}
