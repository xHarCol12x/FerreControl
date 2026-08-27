package com.ferrecontrol.dto;

import lombok.Data;

@Data
public class SaleItemRequestDto {
    private Long productId;
    private Integer quantity;
}
