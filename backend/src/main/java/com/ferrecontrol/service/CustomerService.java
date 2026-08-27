package com.ferrecontrol.service;

import com.ferrecontrol.dto.CustomerDto;
import com.ferrecontrol.model.Customer;
import com.ferrecontrol.model.User;
import com.ferrecontrol.repository.CustomerRepository;
import com.ferrecontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final SunatPadronService sunatPadronService;

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

    public List<CustomerDto> getAllCustomers() {
        User currentUser = getCurrentUser();
        return customerRepository.findByTenantId(currentUser.getTenant().getId()).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public CustomerDto getCustomerByDocument(String documentNumber) {
        User currentUser = getCurrentUser();
        
        // 1. Buscar en tabla de clientes registrados del Tenant
        Optional<Customer> existing = customerRepository.findByDocumentNumberAndTenantId(documentNumber, currentUser.getTenant().getId());
        if (existing.isPresent()) {
            return mapToDto(existing.get());
        }

        // 2. Si es un RUC (11 dígitos), buscar en nuestro Padrón Local (¡MODO MAGIA!)
        if (documentNumber.length() == 11) {
            Map<String, Object> padronData = sunatPadronService.consultarRuc(documentNumber);
            if (padronData != null && padronData.containsKey("result")) {
                Map<String, Object> result = (Map<String, Object>) padronData.get("result");
                
                // Registrar automáticamente como cliente para no volver a preguntar
                Customer newCustomer = Customer.builder()
                        .documentType("RUC")
                        .documentNumber(documentNumber)
                        .name((String) result.get("razon_social"))
                        .address((String) result.get("direccion"))
                        .tenant(currentUser.getTenant())
                        .build();
                
                return mapToDto(customerRepository.save(newCustomer));
            }
        }

        return null;
    }

    public int importCustomersFromExcel(MultipartFile file) {
        User currentUser = getCurrentUser();
        int count = 0;

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {
            
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            // Skip header if exists
            if (rows.hasNext()) rows.next();

            List<Customer> customersToSave = new ArrayList<>();

            while (rows.hasNext()) {
                Row row = rows.next();
                
                String type = getCellValue(row.getCell(0));
                String doc = getCellValue(row.getCell(1));
                String name = getCellValue(row.getCell(2));
                
                if (doc == null || doc.isEmpty() || name == null || name.isEmpty()) continue;

                Customer customer = Customer.builder()
                        .documentType(type != null ? type : (doc.length() == 11 ? "RUC" : "DNI"))
                        .documentNumber(doc)
                        .name(name)
                        .address(getCellValue(row.getCell(3)))
                        .email(getCellValue(row.getCell(4)))
                        .phone(getCellValue(row.getCell(5)))
                        .tenant(currentUser.getTenant())
                        .build();
                
                customersToSave.add(customer);
                count++;
            }

            customerRepository.saveAll(customersToSave);
            
        } catch (Exception e) {
            throw new RuntimeException("Error al procesar archivo Excel: " + e.getMessage());
        }
        return count;
    }

    private String getCellValue(Cell cell) {
        if (cell == null) return null;
        switch (cell.getCellType()) {
            case STRING: return cell.getStringCellValue();
            case NUMERIC: 
                if (DateUtil.isCellDateFormatted(cell)) return cell.getDateCellValue().toString();
                return String.format("%.0f", cell.getNumericCellValue());
            case BOOLEAN: return String.valueOf(cell.getBooleanCellValue());
            default: return null;
        }
    }

    public CustomerDto createCustomer(CustomerDto dto) {
        User currentUser = getCurrentUser();
        
        Customer customer = Customer.builder()
                .name(dto.getName())
                .documentNumber(dto.getDocumentNumber())
                .documentType(dto.getDocumentType())
                .email(dto.getEmail())
                .phone(dto.getPhone())
                .address(dto.getAddress())
                .tenant(currentUser.getTenant())
                .build();
        
        return mapToDto(customerRepository.save(customer));
    }

    public CustomerDto updateCustomer(Long id, CustomerDto dto) {
        User currentUser = getCurrentUser();
        Customer customer = customerRepository.findById(id)
                .filter(c -> c.getTenant().getId().equals(currentUser.getTenant().getId()))
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        customer.setName(dto.getName());
        customer.setDocumentNumber(dto.getDocumentNumber());
        customer.setDocumentType(dto.getDocumentType());
        customer.setEmail(dto.getEmail());
        customer.setPhone(dto.getPhone());
        customer.setAddress(dto.getAddress());

        return mapToDto(customerRepository.save(customer));
    }

    public void deleteCustomer(Long id) {
        User currentUser = getCurrentUser();
        Customer customer = customerRepository.findById(id)
                .filter(c -> c.getTenant().getId().equals(currentUser.getTenant().getId()))
                .orElseThrow(() -> new RuntimeException("Customer not found"));
        customerRepository.delete(customer);
    }

    private CustomerDto mapToDto(Customer customer) {
        return CustomerDto.builder()
                .id(customer.getId())
                .name(customer.getName())
                .documentNumber(customer.getDocumentNumber())
                .documentType(customer.getDocumentType())
                .email(customer.getEmail())
                .phone(customer.getPhone())
                .address(customer.getAddress())
                .createdAt(customer.getCreatedAt())
                .build();
    }
}
