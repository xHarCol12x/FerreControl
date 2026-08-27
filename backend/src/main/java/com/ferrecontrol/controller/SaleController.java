package com.ferrecontrol.controller;

import com.ferrecontrol.dto.SaleRequestDto;
import com.ferrecontrol.dto.SaleStatsDto;
import com.ferrecontrol.model.Sale;
import com.ferrecontrol.service.SaleService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/sales")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SaleController {

    private final SaleService saleService;

    @PostMapping
    public ResponseEntity<Sale> createSale(@RequestBody SaleRequestDto request) {
        System.out.println("Recibida petición de venta: " + request);
        return ResponseEntity.ok(saleService.createSale(request));
    }

    @GetMapping
    public ResponseEntity<List<Sale>> getAllSales(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        System.out.println("Filtro ventas - Start: " + start + ", End: " + end);
        return ResponseEntity.ok(saleService.getAllSalesByTenant(start, end));
    }

    @GetMapping("/stats")
    public ResponseEntity<SaleStatsDto> getSaleStats(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        System.out.println("Filtro stats - Start: " + start + ", End: " + end);
        return ResponseEntity.ok(saleService.getSaleStats(start, end));
    }
}
