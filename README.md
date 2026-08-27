# 🛒 FerreControl — SaaS POS & Facturación Electrónica SUNAT

<div align="center">
  <img src="https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white" alt="Java 17">
  <img src="https://img.shields.io/badge/Spring%20Boot-3.x-6DB33F?style=for-the-badge&logo=springboot&logoColor=white" alt="Spring Boot 3">
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL 8">
  <img src="https://img.shields.io/badge/Spring%20Security-JWT-6DB33F?style=for-the-badge&logo=springsecurity&logoColor=white" alt="JWT">
  <img src="https://img.shields.io/badge/SUNAT-UBL%202.1-003366?style=for-the-badge" alt="SUNAT UBL 2.1">
</div>

<br />

**FerreControl** es un sistema SaaS multi-inquilino de **Punto de Venta (POS), Control de Inventario Ferretero y Facturación Electrónica** diseñado específicamente para el mercado peruano bajo el estándar **UBL 2.1 de SUNAT**.

---

## 🌟 Características Clave

- **🏢 Aislamiento Multi-Tenant:** Estrategia de *"Discriminador por Columna"* (`tenant_id`) en MySQL con filtrado automático mediante `@Filter` de Hibernate en la capa de persistencia.
- **📜 Facturación Electrónica SUNAT UBL 2.1:** Generación de estructuras JSON normalizadas para Boletas y Facturas electrónicas compatibles con OSE/PSE.
- **🏗️ Fraccionamiento de Unidades Ferreteras:** Soporte especializado para inventario en metros, bolsas (cemento), varillas, kilos y unidades.
- **📱 Pagos Digitales Integrados:** Registro e historial de pagos vía **Yape y Plin** directamente en la caja diaria.
- **⚡ Frontend Optimizado:** Interfaz ligera construida con Bootstrap 5 y DataTables.js para procesamiento rápido en hardware de bajo costo.

---

## ⚙️ Especificación Técnica y Arquitectura

```text
┌─────────────────────────────────────────────────────────┐
│              Frontend Web (Bootstrap 5 + JS)            │
└────────────────────────────┬────────────────────────────┘
                             │ REST API + JWT Header
                             ▼
┌─────────────────────────────────────────────────────────┐
│               Backend Spring Boot 3.x                   │
│   ┌──────────────────┐         ┌────────────────────┐   │
│   │  Spring Security │         │ Multi-Tenant Filter│   │
│   └──────────────────┘         └────────────────────┘   │
└────────────────────────────┬────────────────────────────┘
                             │ Hibernate ORM
                             ▼
┌─────────────────────────────────────────────────────────┐
│                   Base de Datos MySQL 8                 │
│              (Tablas aisladas por tenant_id)            │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Stack Tecnológico

- **Lenguaje & Core:** Java 17, Spring Boot 3.x
- **Persistencia & ORM:** Hibernate, JPA, MySQL 8
- **Seguridad:** Spring Security, JSON Web Token (JWT), BCrypt
- **Facturación:** Generador JSON compatible con estándares SUNAT UBL 2.1
- **Frontend:** HTML5, CSS3, JavaScript, Bootstrap 5, DataTables.js

---

## 🚦 Instalación y Ejecución

### Requisitos Previos
- Java JDK 17+
- Maven 3.8+
- MySQL 8.0+

### Pasos de Ejecución Local

1. **Clonar el proyecto:**
   ```bash
   git clone https://github.com/xHarCol12x/FerreControl.git
   cd FerreControl/backend
   ```

2. **Configurar la Base de Datos:**
   Crea la base de datos `ferrecontrol_db` en MySQL y ajusta las credenciales en `src/main/resources/application.properties`:
   ```properties
   spring.datasource.url=jdbc:mysql://localhost:3306/ferrecontrol_db
   spring.datasource.username=root
   spring.datasource.password=tu_password
   ```

3. **Compilar y Ejecutar:**
   ```bash
   mvn clean install
   mvn spring-boot:run
   ```

---

## 👤 Autor

Desarrollado por **Harol Fabricio Colán León**  
🎓 *Universidad Nacional José Faustino Sánchez Carrión*  
🔗 [GitHub: @xHarCol12x](https://github.com/xHarCol12x) | [LinkedIn](https://linkedin.com/in/harol-colan)
