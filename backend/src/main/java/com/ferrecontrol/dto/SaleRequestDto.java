package com.ferrecontrol.dto;

import lombok.Data;

import java.util.List;

@Data
public class SaleRequestDto {
    private String paymentMethod;
    private String documentType; // BOLETA or FACTURA
    private Long customerId;
    private List<SaleItemRequestDto> items;
}
