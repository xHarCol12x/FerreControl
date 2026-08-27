package com.ferrecontrol.service;

import com.ferrecontrol.dto.DailySaleDto;
import com.ferrecontrol.dto.SaleRequestDto;
import com.ferrecontrol.dto.SaleStatsDto;
import com.ferrecontrol.model.*;
import com.ferrecontrol.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

import com.ferrecontrol.dto.*;

@Service
@RequiredArgsConstructor
public class SaleService {

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final KardexRepository kardexRepository;

    @Transactional
    public Sale createSale(SaleRequestDto request) {
        User currentUser = getCurrentUser();
        Tenant tenant = currentUser.getTenant();

        // 1. Generar Correlativo (B001-XXXXXXXX o F001-XXXXXXXX)
        String prefix = "boleta".equalsIgnoreCase(request.getDocumentType()) ? "B001" : "F001";
        String nextInvoiceNumber = generateNextInvoiceNumber(tenant, prefix);

        // 2. Buscar Cliente si existe
        Customer customer = null;
        if (request.getCustomerId() != null) {
            customer = customerRepository.findById(request.getCustomerId()).orElse(null);
        }

        // 3. Crear cabecera de venta
        Sale sale = Sale.builder()
                .invoiceNumber(nextInvoiceNumber)
                .paymentMethod(request.getPaymentMethod())
                .tenant(tenant)
                .user(currentUser)
                .customer(customer)
                .totalAmount(BigDecimal.ZERO)
                .items(new ArrayList<>())
                .build();

        BigDecimal total = BigDecimal.ZERO;

        // 3. Procesar items y descontar stock
        for (var itemReq : request.getItems()) {
            System.out.println("Procesando item: " + itemReq.getProductId());
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + itemReq.getProductId()));

            // Validar que el producto pertenezca al mismo tenant
            if (!product.getTenant().getId().equals(tenant.getId())) {
                throw new RuntimeException("Acceso denegado al producto");
            }

            // Validar stock
            if (product.getStock() < itemReq.getQuantity()) {
                throw new RuntimeException("Stock insuficiente para: " + product.getName());
            }

            // Descontar stock
            product.setStock(product.getStock() - itemReq.getQuantity());
            productRepository.save(product);

            // Registrar Movimiento en Kardex
            KardexMovement movement = KardexMovement.builder()
                    .product(product)
                    .type("EXIT")
                    .quantity(itemReq.getQuantity())
                    .balanceAfter(product.getStock())
                    .reference("Venta " + nextInvoiceNumber)
                    .build();
            kardexRepository.save(movement);

            // Crear detalle
            BigDecimal subtotal = product.getPrice().multiply(new BigDecimal(itemReq.getQuantity()));
            SaleItem item = SaleItem.builder()
                    .sale(sale)
                    .product(product)
                    .quantity(itemReq.getQuantity())
                    .unitPrice(product.getPrice())
                    .subtotal(subtotal)
                    .build();

            sale.getItems().add(item);
            total = total.add(subtotal);
        }

        sale.setTotalAmount(total);
        return saleRepository.save(sale);
    }

    private String generateNextInvoiceNumber(Tenant tenant, String prefix) {
        String lastNumberFromDbStr = saleRepository.findLastInvoiceNumberByTenant(tenant.getId(), prefix + "-%")
                .orElse(prefix + "-00000000");

        // Separar serie de número de la DB
        String[] parts = lastNumberFromDbStr.split("-");
        int lastNumberFromDb = Integer.parseInt(parts[1]);
        
        // Obtener el número base configurado en el tenant
        int baseNumber = "B001".equalsIgnoreCase(prefix) 
                ? (tenant.getLastBoletaNumber() != null ? tenant.getLastBoletaNumber() : 0)
                : (tenant.getLastInvoiceNumber() != null ? tenant.getLastInvoiceNumber() : 0);

        int nextNumber = Math.max(lastNumberFromDb, baseNumber) + 1;

        return String.format("%s-%08d", prefix, nextNumber);
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    @Transactional(readOnly = true)
    public List<Sale> getAllSalesByTenant(LocalDateTime start, LocalDateTime end) {
        User user = getCurrentUser();
        if (start != null && end != null) {
            return saleRepository.findByTenantIdAndDateRange(user.getTenant().getId(), start, end);
        }
        return saleRepository.findByTenantId(user.getTenant().getId());
    }

    @Transactional(readOnly = true)
    public SaleStatsDto getSaleStats(LocalDateTime start, LocalDateTime end) {
        User user = getCurrentUser();
        Long tenantId = user.getTenant().getId();
        
        if (start == null || end == null) {
            start = LocalDateTime.now().minusDays(30);
            end = LocalDateTime.now();
        }

        List<Sale> sales = saleRepository.findByTenantIdAndDateRange(tenantId, start, end);

        BigDecimal totalSales = sales.stream()
                .map(Sale::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long totalOrders = sales.size();
        BigDecimal averageTicket = totalOrders > 0
                ? totalSales.divide(new BigDecimal(totalOrders), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        Map<String, BigDecimal> dailyMap = sales.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getCreatedAt().format(formatter),
                        LinkedHashMap::new,
                        Collectors.reducing(BigDecimal.ZERO, Sale::getTotalAmount, BigDecimal::add)));

        List<DailySaleDto> dailySales = dailyMap.entrySet().stream()
                .map(e -> new DailySaleDto(e.getKey(), e.getValue()))
                .collect(Collectors.toList());

        Map<String, ProductStatDto> productMap = new HashMap<>();
        sales.stream().flatMap(s -> s.getItems().stream()).forEach(item -> {
            String name = item.getProduct().getName();
            ProductStatDto stat = productMap.getOrDefault(name, new ProductStatDto(name, 0.0, BigDecimal.ZERO, 0.0));
            stat.setQuantity(stat.getQuantity() + item.getQuantity());
            stat.setTotalRevenue(stat.getTotalRevenue().add(item.getSubtotal()));
            productMap.put(name, stat);
        });

        List<ProductStatDto> topProducts = productMap.values().stream()
                .sorted(Comparator.comparing(ProductStatDto::getTotalRevenue).reversed())
                .limit(5)
                .collect(Collectors.toList());

        BigDecimal totalRevenue = topProducts.stream()
                .map(ProductStatDto::getTotalRevenue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalRevenue.compareTo(BigDecimal.ZERO) > 0) {
            topProducts.forEach(p -> {
                double pct = p.getTotalRevenue().divide(totalRevenue, 4, RoundingMode.HALF_UP).doubleValue() * 100;
                p.setPercentage(Math.round(pct * 10.0) / 10.0);
            });
        }

        Double salesGrowth = 0.0;
        if (start != null && end != null) {
            long days = ChronoUnit.DAYS.between(start, end) + 1;
            LocalDateTime prevStart = start.minusDays(days);
            LocalDateTime prevEnd = end.minusDays(days);
            
            BigDecimal prevTotal = saleRepository.sumTotalByTenantIdAndDateRange(tenantId, prevStart, prevEnd);
            
            if (prevTotal == null) prevTotal = BigDecimal.ZERO;
            
            if (prevTotal.compareTo(BigDecimal.ZERO) > 0) {
                salesGrowth = totalSales.subtract(prevTotal).divide(prevTotal, 4, RoundingMode.HALF_UP).doubleValue() * 100;
            } else if (totalSales.compareTo(BigDecimal.ZERO) > 0) {
                salesGrowth = 100.0;
            }
        }

        return SaleStatsDto.builder()
                .totalSales(totalSales)
                .totalOrders(totalOrders)
                .averageTicket(averageTicket)
                .dailySales(dailySales)
                .topProducts(topProducts)
                .salesGrowth(salesGrowth)
                .build();
    }
}
