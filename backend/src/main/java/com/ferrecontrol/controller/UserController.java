package com.ferrecontrol.controller;

import com.ferrecontrol.model.Role;
import com.ferrecontrol.model.User;
import com.ferrecontrol.repository.UserRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    private User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String username;
        if (principal instanceof UserDetails) {
            username = ((UserDetails) principal).getUsername();
        } else {
            username = principal.toString();
        }
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping
    public ResponseEntity<List<User>> getTenantUsers() {
        User currentUser = getCurrentUser();
        return ResponseEntity.ok(userRepository.findByTenantId(currentUser.getTenant().getId()));
    }

    @PostMapping
    public ResponseEntity<User> createUser(@RequestBody User newUser) {
        User currentUser = getCurrentUser();
        
        // Only admins can create users
        if (currentUser.getRole() != Role.ADMIN) {
            return ResponseEntity.status(403).build();
        }

        newUser.setTenant(currentUser.getTenant());
        newUser.setPassword(passwordEncoder.encode(newUser.getPassword()));
        
        return ResponseEntity.ok(userRepository.save(newUser));
    }

    @PatchMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody PasswordChangeRequest request) {
        User user = getCurrentUser();
        
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            return ResponseEntity.badRequest().body("Contraseña actual incorrecta");
        }
        
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        
        return ResponseEntity.ok().body("Contraseña actualizada con éxito");
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody User userDetails) {
        User currentUser = getCurrentUser();
        if (currentUser.getRole() != Role.ADMIN) {
            return ResponseEntity.status(403).build();
        }

        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Security: Ensure user belongs to the same tenant
        if (!user.getTenant().getId().equals(currentUser.getTenant().getId())) {
            return ResponseEntity.status(403).build();
        }

        user.setFullName(userDetails.getFullName());
        user.setRole(userDetails.getRole());
        
        // Only update password if provided
        if (userDetails.getPassword() != null && !userDetails.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(userDetails.getPassword()));
        }

        return ResponseEntity.ok(userRepository.save(user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        if (currentUser.getRole() != Role.ADMIN) {
            return ResponseEntity.status(403).build();
        }

        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Security: Ensure user belongs to the same tenant
        if (!user.getTenant().getId().equals(currentUser.getTenant().getId())) {
            return ResponseEntity.status(403).build();
        }

        // Prevent self-deletion
        if (user.getId().equals(currentUser.getId())) {
            return ResponseEntity.badRequest().body("No puedes eliminar tu propio usuario");
        }

        userRepository.delete(user);
        return ResponseEntity.ok().build();
    }

    @Data
    public static class PasswordChangeRequest {
        private String currentPassword;
        private String newPassword;
    }
}
