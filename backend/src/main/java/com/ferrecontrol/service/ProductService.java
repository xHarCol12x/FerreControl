package com.ferrecontrol.service;

import com.ferrecontrol.dto.ProductDto;
import com.ferrecontrol.model.Product;
import com.ferrecontrol.model.User;
import com.ferrecontrol.repository.ProductRepository;
import com.ferrecontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final com.ferrecontrol.repository.KardexRepository kardexRepository;

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public Page<ProductDto> getProducts(int page, int size, String search, String category) {
        User currentUser = getCurrentUser();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "name"));
        
        Page<Product> productsPage;
        if (search != null && !search.isBlank()) {
            productsPage = productRepository.searchByTenantId(currentUser.getTenant().getId(), search, pageable);
        } else if (category != null && !category.isBlank()) {
            productsPage = productRepository.findByTenantIdAndCategory(currentUser.getTenant().getId(), category, pageable);
        } else {
            productsPage = productRepository.findByTenantId(currentUser.getTenant().getId(), pageable);
        }
        
        return productsPage.map(this::mapToDto);
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<ProductDto> getLowStockProducts() {
        User currentUser = getCurrentUser();
        List<Product> products = productRepository.findLowStockByTenantId(currentUser.getTenant().getId(), 10);
        
        return products.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<com.ferrecontrol.model.KardexMovement> getKardexByProduct(Long productId) {
        User currentUser = getCurrentUser();
        productRepository.findByIdAndTenantId(productId, currentUser.getTenant().getId())
                .orElseThrow(() -> new RuntimeException("Product not found or access denied"));
        
        return kardexRepository.findByProductIdOrderByCreatedAtDesc(productId);
    }

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

    public List<ProductDto> getLowStockProducts() {
        User currentUser = getCurrentUser();
        List<Product> products = productRepository.findLowStockByTenantId(currentUser.getTenant().getId(), 10);
        
        return products.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public List<ProductDto> getAllProducts() {
        User currentUser = getCurrentUser();
        List<Product> products = productRepository.findByTenantId(currentUser.getTenant().getId());
        
        return products.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public ProductDto getProductById(Long id) {
        User currentUser = getCurrentUser();
        Product product = productRepository.findByIdAndTenantId(id, currentUser.getTenant().getId())
                .orElseThrow(() -> new RuntimeException("Product not found"));
        return mapToDto(product);
    }

    public ProductDto createProduct(ProductDto productDto) {
        User currentUser = getCurrentUser();
        
        if (productRepository.existsBySkuAndTenantId(productDto.getSku(), currentUser.getTenant().getId())) {
            throw new RuntimeException("SKU already exists for this tenant");
        }

        Product product = Product.builder()
                .sku(productDto.getSku())
                .name(productDto.getName())
                .price(productDto.getPrice())
                .stock(productDto.getStock())
                .category(productDto.getCategory())
                .imageUrl(productDto.getImageUrl())
                .tenant(currentUser.getTenant())
                .build();

        Product savedProduct = productRepository.save(product);
        return mapToDto(savedProduct);
    }

    public ProductDto updateProduct(Long id, ProductDto productDto) {
        User currentUser = getCurrentUser();
        
        Product product = productRepository.findByIdAndTenantId(id, currentUser.getTenant().getId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        product.setSku(productDto.getSku());
        product.setName(productDto.getName());
        product.setPrice(productDto.getPrice());
        product.setStock(productDto.getStock());
        product.setCategory(productDto.getCategory());
        product.setImageUrl(productDto.getImageUrl());

        Product updatedProduct = productRepository.save(product);
        return mapToDto(updatedProduct);
    }

    public void deleteProduct(Long id) {
        User currentUser = getCurrentUser();
        
        Product product = productRepository.findByIdAndTenantId(id, currentUser.getTenant().getId())
                .orElseThrow(() -> new RuntimeException("Product not found"));
                
        productRepository.delete(product);
    }

    @org.springframework.transaction.annotation.Transactional
    public ProductDto registerMovement(Long id, Integer quantity, String type, String reference) {
        User currentUser = getCurrentUser();
        Product product = productRepository.findByIdAndTenantId(id, currentUser.getTenant().getId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if ("EXIT".equals(type) && product.getStock() < quantity) {
            throw new RuntimeException("Insufficient stock");
        }

        int newStock = "ENTRY".equals(type) ? product.getStock() + quantity : product.getStock() - quantity;
        product.setStock(newStock);
        productRepository.save(product);

        com.ferrecontrol.model.KardexMovement movement = com.ferrecontrol.model.KardexMovement.builder()
                .product(product)
                .type(type)
                .quantity(quantity)
                .balanceAfter(newStock)
                .reference(reference)
                .build();
        kardexRepository.save(movement);

        return mapToDto(product);
    }

    private ProductDto mapToDto(Product product) {
        return ProductDto.builder()
                .id(product.getId())
                .sku(product.getSku())
                .name(product.getName())
                .price(product.getPrice())
                .stock(product.getStock())
                .category(product.getCategory())
                .imageUrl(product.getImageUrl())
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }
}
