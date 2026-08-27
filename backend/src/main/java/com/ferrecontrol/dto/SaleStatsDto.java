package com.ferrecontrol.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaleStatsDto {
    private BigDecimal totalSales;
    private long totalOrders;
    private BigDecimal averageTicket;
    private List<DailySaleDto> dailySales;
    private List<ProductStatDto> topProducts;
    private Double salesGrowth;
}
