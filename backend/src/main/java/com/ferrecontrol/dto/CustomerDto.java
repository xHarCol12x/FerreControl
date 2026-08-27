package com.ferrecontrol.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerDto {
    private Long id;
    private String name;
    private String documentNumber;
    private String documentType;
    private String email;
    private String phone;
    private String address;
    private LocalDateTime createdAt;
}
