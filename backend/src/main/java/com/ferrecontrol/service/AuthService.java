package com.ferrecontrol.service;

import com.ferrecontrol.dto.AuthResponse;
import com.ferrecontrol.dto.LoginRequest;
import com.ferrecontrol.dto.RegisterRequestDto;
import com.ferrecontrol.model.Role;
import com.ferrecontrol.model.Tenant;
import com.ferrecontrol.model.User;
import com.ferrecontrol.repository.TenantRepository;
import com.ferrecontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository repository;
    private final TenantRepository tenantRepository;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public AuthResponse register(RegisterRequestDto request) {
        // 1. Create Tenant
        Tenant tenant = Tenant.builder()
                .name(request.getCompanyName())
                .ruc(request.getRuc())
                .invoiceSeries("F001")
                .lastInvoiceNumber(0)
                .boletaSeries("B001")
                .lastBoletaNumber(0)
                .build();
        
        tenant = tenantRepository.save(tenant);

        // 2. Create Admin User
        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(Role.ADMIN)
                .tenant(tenant)
                .build();

        repository.save(user);

        // 3. Generate token
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
        var jwtToken = jwtService.generateToken(userDetails);
        
        return AuthResponse.builder()
                .token(jwtToken)
                .username(user.getUsername())
                .tenantName(tenant.getName())
                .role(user.getRole().name())
                .fullName(user.getFullName())
                .build();
    }

    public AuthResponse authenticate(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );
        var user = repository.findByUsername(request.getUsername())
                .orElseThrow();
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
        var jwtToken = jwtService.generateToken(userDetails);
        return AuthResponse.builder()
                .token(jwtToken)
                .username(user.getUsername())
                .tenantName(user.getTenant().getName())
                .role(user.getRole().name())
                .fullName(user.getFullName())
                .build();
    }
}
