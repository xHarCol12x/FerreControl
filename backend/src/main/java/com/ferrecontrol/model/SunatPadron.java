package com.ferrecontrol.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "sunat_padron", indexes = {
    @Index(name = "idx_padron_ruc", columnList = "ruc", unique = true)
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SunatPadron {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 11)
    private String ruc;

    @Column(nullable = false, length = 300)
    private String razonSocial;

    @Column(length = 50)
    private String estado;

    @Column(length = 50)
    private String condicion;

    @Column(length = 10)
    private String ubigeo;

    @Column(length = 50)
    private String tipoVia;

    @Column(length = 200)
    private String nombreVia;

    @Column(length = 50)
    private String codigoZona;

    @Column(length = 50)
    private String tipoZona;

    @Column(length = 50)
    private String numero;

    @Column(length = 50)
    private String interior;

    @Column(length = 50)
    private String lote;

    @Column(length = 100)
    private String departamento;

    @Column(length = 50)
    private String manzana;

    @Column(length = 50)
    private String kilometro;

    @Column(length = 500)
    private String direccion; // Para compatibilidad con el POS
}
