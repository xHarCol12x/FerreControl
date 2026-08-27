package com.ferrecontrol.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductStatDto {
    private String name;
    private Double quantity;
    private BigDecimal totalRevenue;
    private Double percentage;
}
