package com.ferrecontrol.controller;

import com.ferrecontrol.model.Tenant;
import com.ferrecontrol.model.User;
import com.ferrecontrol.repository.TenantRepository;
import com.ferrecontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tenants")
@RequiredArgsConstructor
public class TenantController {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;

    private Tenant getCurrentTenant() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String username;
        if (principal instanceof UserDetails) {
            username = ((UserDetails) principal).getUsername();
        } else {
            username = principal.toString();
        }
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getTenant();
    }

    @GetMapping("/me")
    public ResponseEntity<Tenant> getMyTenant() {
        return ResponseEntity.ok(getCurrentTenant());
    }

    @PutMapping("/me")
    public ResponseEntity<Tenant> updateMyTenant(@RequestBody Tenant tenantDetails) {
        Tenant tenant = getCurrentTenant();
        
        tenant.setName(tenantDetails.getName());
        tenant.setRuc(tenantDetails.getRuc());
        tenant.setAddress(tenantDetails.getAddress());
        tenant.setPhone(tenantDetails.getPhone());
        tenant.setLogoUrl(tenantDetails.getLogoUrl());
        tenant.setInvoiceSeries(tenantDetails.getInvoiceSeries());
        tenant.setLastInvoiceNumber(tenantDetails.getLastInvoiceNumber());
        tenant.setBoletaSeries(tenantDetails.getBoletaSeries());
        tenant.setLastBoletaNumber(tenantDetails.getLastBoletaNumber());
        
        return ResponseEntity.ok(tenantRepository.save(tenant));
    }
}
