package com.ferrecontrol.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RegisterRequestDto {
    // Tenant Info
    private String companyName;
    private String ruc;
    
    // Admin User Info
    private String username;
    private String password;
    private String fullName;
}
