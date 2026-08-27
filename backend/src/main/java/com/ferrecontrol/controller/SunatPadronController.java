package com.ferrecontrol.controller;

import com.ferrecontrol.service.SunatPadronService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/padron")
@RequiredArgsConstructor
public class SunatPadronController {

    private final SunatPadronService padronService;

    /**
     * Consulta un RUC en el padrón local.
     * Retorna datos en formato compatible con CodArt.
     */
    @GetMapping("/ruc/{ruc}")
    public ResponseEntity<Map<String, Object>> consultarRuc(@PathVariable String ruc) {
        Map<String, Object> result = padronService.consultarRuc(ruc);
        if (result != null) {
            return ResponseEntity.ok(result);
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * Inicia la descarga y carga del padrón reducido de SUNAT en segundo plano.
     */
    @PostMapping("/sync")
    public ResponseEntity<Map<String, Object>> sincronizarPadron() {
        if (padronService.isSyncing()) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Ya existe una sincronización en curso. Por favor, espera a que termine."
            ));
        }

        // Iniciar proceso asíncrono
        padronService.descargarYCargarPadron();

        return ResponseEntity.accepted().body(Map.of(
            "success", true,
            "message", "Sincronización iniciada en segundo plano. El proceso tomará varios minutos."
        ));
    }

    /**
     * Devuelve el total de registros en el padrón local.
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> estadoPadron() {
        long total = padronService.getTotalRegistros();
        return ResponseEntity.ok(Map.of(
            "totalRegistros", total,
            "disponible", total > 0
        ));
    }
}
