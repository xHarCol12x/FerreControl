package com.ferrecontrol.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "kardex_movements")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KardexMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false, length = 20)
    private String type; // ENTRY, EXIT, ADJUSTMENT

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private Integer balanceAfter; // Stock level after this movement

    @Column(length = 100)
    private String reference; // e.g., "Sale #B001-00000001"

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
