# Especificación Técnica: SaaS de Facturación para Ferreterías (Perú)

## 1. Arquitectura del Sistema
- **Backend:** Java 17 + Spring Boot 3.x
- **Perspectiva Multi-tenant:** Estrategia de "Discriminador por Columna" (tenant_id) en MySQL para escalabilidad inicial, con filtros automáticos via Hibernate @Filter.
- **Seguridad:** Spring Security + JWT.
- **Frontend:** Arquitectura SPA simulada con Bootstrap 5, DataTables.js para manejo de grandes inventarios y optimización para hardware básico.

## 2. Modelo de Datos (Resumen SQL)
```sql
-- Estructura simplificada
CREATE TABLE empresas (id INT PRIMARY KEY, ruc VARCHAR(11), nombre VARCHAR(255), plan VARCHAR(20));
CREATE TABLE usuarios (id INT PRIMARY KEY, empresa_id INT, username VARCHAR(50), rol VARCHAR(20));
CREATE TABLE productos (id INT PRIMARY KEY, empresa_id INT, codigo VARCHAR(50), nombre VARCHAR(255), stock DECIMAL(10,2), precio_venta DECIMAL(10,2), unidad_medida VARCHAR(20));
CREATE TABLE ventas (id INT PRIMARY KEY, empresa_id INT, cliente_id INT, tipo_comprobante VARCHAR(20), total DECIMAL(10,2), fecha TIMESTAMP);
CREATE TABLE detalle_ventas (id INT PRIMARY KEY, venta_id INT, producto_id INT, cantidad DECIMAL(10,2), precio_unitario DECIMAL(10,2));
```

## 3. Flujo de Facturación (Preparado para SUNAT)
El sistema generará una estructura JSON intermedia que mapea a los estándares UBL 2.1 (Boletas y Facturas Electrónicas), facilitando la integración futura con un PSE (Proveedor de Servicios Electrónicos) o OSE.

## 4. Diferenciador Local
- Soporte nativo para **Yape/Plin** en el flujo de caja.
- Manejo de unidades comunes en ferretería: Varillas, bolsas (cemento), metros, kilos y unidades.
