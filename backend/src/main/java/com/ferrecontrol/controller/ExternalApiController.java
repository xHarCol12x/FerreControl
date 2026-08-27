package com.ferrecontrol.controller;

import com.ferrecontrol.service.ExternalApiService;
import com.ferrecontrol.service.SunatPadronService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/consultas")
@RequiredArgsConstructor
public class ExternalApiController {

    private final ExternalApiService externalApiService;
    private final SunatPadronService sunatPadronService;

    /**
     * Consulta RUC con estrategia: LOCAL (Padrón SUNAT) -> EXTERNO (CodArt)
     * - Local = GRATIS e ILIMITADO
     * - Externo = Solo si no se encuentra localmente (consume créditos)
     */
    @GetMapping("/ruc/{ruc}")
    public ResponseEntity<Map<String, Object>> consultRuc(@PathVariable String ruc) {
        // Paso 1: Buscar en el padrón local (GRATIS)
        Map<String, Object> localResult = sunatPadronService.consultarRuc(ruc);
        if (localResult != null) {
            System.out.println("RUC " + ruc + " encontrado en PADRÓN LOCAL (0 créditos)");
            return ResponseEntity.ok(localResult);
        }

        // Paso 2: Fallback a CodArt (consume créditos)
        System.out.println("RUC " + ruc + " NO encontrado localmente, consultando API externa...");
        return ResponseEntity.ok(externalApiService.consultRuc(ruc));
    }

    /**
     * Consulta DNI directo a CodArt (RENIEC no es público)
     */
    @GetMapping("/dni/{dni}")
    public ResponseEntity<Map<String, Object>> consultDni(@PathVariable String dni) {
        return ResponseEntity.ok(externalApiService.consultDni(dni));
    }
}
