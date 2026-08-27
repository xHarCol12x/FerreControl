package com.ferrecontrol.controller;

import com.ferrecontrol.dto.ProductDto;
import com.ferrecontrol.service.ProductService;
import com.ferrecontrol.service.ScraperService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;
    private final ScraperService scraperService;

    @PostMapping("/scrape")
    public ResponseEntity<com.ferrecontrol.dto.ScrapedProductDto> scrapeProduct(@RequestBody java.util.Map<String, String> payload) {
        String url = payload.get("url");
        if (url == null || url.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(scraperService.scrapeProduct(url));
    }

    @GetMapping
    public ResponseEntity<Page<ProductDto>> getProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category) {
        return ResponseEntity.ok(productService.getProducts(page, size, search, category));
    }

    @GetMapping("/all")
    public ResponseEntity<List<ProductDto>> getAllProducts() {
        return ResponseEntity.ok(productService.getAllProducts());
    }

    @GetMapping("/low-stock")
    public ResponseEntity<List<ProductDto>> getLowStockProducts() {
        return ResponseEntity.ok(productService.getLowStockProducts());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDto> getProductById(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getProductById(id));
    }

    @GetMapping("/{id}/kardex")
    public ResponseEntity<List<com.ferrecontrol.model.KardexMovement>> getKardex(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getKardexByProduct(id));
    }

    @PostMapping
    public ResponseEntity<ProductDto> createProduct(@RequestBody ProductDto productDto) {
        return new ResponseEntity<>(productService.createProduct(productDto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductDto> updateProduct(
            @PathVariable Long id, 
            @RequestBody ProductDto productDto) {
        return ResponseEntity.ok(productService.updateProduct(id, productDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/stock")
    public ResponseEntity<ProductDto> registerStockMovement(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, Object> payload) {
        Number quantityNum = (Number) payload.get("quantity");
        Integer quantity = quantityNum.intValue();
        String type = (String) payload.get("type");
        String reference = (String) payload.get("reference");
        return ResponseEntity.ok(productService.registerMovement(id, quantity, type, reference));
    }
}
