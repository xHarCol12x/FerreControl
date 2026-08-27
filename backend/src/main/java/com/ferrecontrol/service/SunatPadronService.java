package com.ferrecontrol.service;

import com.ferrecontrol.model.SunatPadron;
import com.ferrecontrol.repository.SunatPadronRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.*;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
@RequiredArgsConstructor
public class SunatPadronService {

    private final SunatPadronRepository padronRepository;
    private final JdbcTemplate jdbcTemplate;
    private boolean isSyncing = false;

    private static final String PADRON_URL = "http://www2.sunat.gob.pe/padron_reducido_ruc.zip";

    public boolean isSyncing() {
        return isSyncing;
    }

    /**
     * Consulta un RUC en la base de datos local del padrón.
     */
    public Map<String, Object> consultarRuc(String ruc) {
        Optional<SunatPadron> padron = padronRepository.findByRuc(ruc);

        if (padron.isPresent()) {
            SunatPadron p = padron.get();
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("razon_social", p.getRazonSocial());
            result.put("tipo_documento", "6");
            result.put("numero_documento", p.getRuc());
            result.put("estado", p.getEstado());
            result.put("condicion", p.getCondicion());
            
            // Construir dirección completa si no existe la columna consolidada
            String fullAddress = p.getDireccion();
            if (fullAddress == null || fullAddress.isEmpty()) {
                fullAddress = buildFullDireccion(p);
            }
            result.put("direccion", fullAddress != null ? fullAddress : "");
            result.put("departamento", p.getDepartamento());
            result.put("ubigeo", p.getUbigeo());

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("source", "PADRON_LOCAL");
            response.put("result", result);
            return response;
        }

        return null;
    }

    private String buildFullDireccion(SunatPadron p) {
        StringBuilder sb = new StringBuilder();
        if (p.getTipoVia() != null && !p.getTipoVia().equals("-")) sb.append(p.getTipoVia()).append(" ");
        if (p.getNombreVia() != null && !p.getNombreVia().equals("-")) sb.append(p.getNombreVia()).append(" ");
        if (p.getNumero() != null && !p.getNumero().equals("-")) sb.append("NRO. ").append(p.getNumero()).append(" ");
        if (p.getInterior() != null && !p.getInterior().equals("-")) sb.append("INT. ").append(p.getInterior()).append(" ");
        if (p.getLote() != null && !p.getLote().equals("-")) sb.append("LTE. ").append(p.getLote()).append(" ");
        if (p.getManzana() != null && !p.getManzana().equals("-")) sb.append("MZA. ").append(p.getManzana()).append(" ");
        if (p.getKilometro() != null && !p.getKilometro().equals("-")) sb.append("KM. ").append(p.getKilometro());
        return sb.toString().trim().isEmpty() ? null : sb.toString().trim();
    }

    public long getTotalRegistros() {
        return padronRepository.count();
    }

    @Async
    public void descargarYCargarPadron() {
        if (isSyncing) return;
        
        isSyncing = true;
        System.out.println("=== MODO NITRO INICIADO: Descarga SUNAT ===");
        int totalImported = 0;

        try {
            // 1. VACIAR TABLA PARA VELOCIDAD MÁXIMA
            System.out.println("Vaciando tabla sunat_padron...");
            jdbcTemplate.execute("TRUNCATE TABLE sunat_padron");

            URL url = new URL(PADRON_URL);
            try (ZipInputStream zis = new ZipInputStream(url.openStream())) {
                ZipEntry entry;
                while ((entry = zis.getNextEntry()) != null) {
                    if (entry.getName().endsWith(".txt") || entry.getName().endsWith(".csv")) {
                        totalImported = procesarArchivo(zis);
                    }
                    zis.closeEntry();
                }
            }
        } catch (Exception e) {
            System.err.println("Error en modo nitro: " + e.getMessage());
        } finally {
            isSyncing = false;
            System.out.println("=== MODO NITRO FINALIZADO: " + totalImported + " registros ===");
        }
    }

    private int procesarArchivo(InputStream is) throws IOException {
        BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.ISO_8859_1));
        int count = 0;
        int batchSize = 10000;
        List<Object[]> batch = new ArrayList<>(batchSize);

        String header = reader.readLine(); 
        String line;
        
        // SQL con las 15 columnas del formato oficial/SQL Dump
        String sql = "INSERT INTO sunat_padron (ruc, razon_social, estado, condicion, ubigeo, tipo_via, nombre_via, codigo_zona, tipo_zona, numero, interior, lote, departamento, manzana, kilometro) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        while ((line = reader.readLine()) != null) {
            try {
                String[] cols = line.split("\\|", -1);
                if (cols.length < 2) continue;

                String ruc = cols[0].trim();
                if (ruc.length() != 11) continue;

                batch.add(new Object[]{
                    ruc,                                  // ruc
                    cols[1].trim(),                       // razon_social
                    cols.length > 2 ? cols[2].trim() : null,  // estado
                    cols.length > 3 ? cols[3].trim() : null,  // condicion
                    cols.length > 4 ? cols[4].trim() : null,  // ubigeo
                    cols.length > 5 ? cols[5].trim() : null,  // tipo_via
                    cols.length > 6 ? cols[6].trim() : null,  // nombre_via
                    cols.length > 7 ? cols[7].trim() : null,  // codigo_zona
                    cols.length > 8 ? cols[8].trim() : null,  // tipo_zona
                    cols.length > 9 ? cols[9].trim() : null,  // numero
                    cols.length > 10 ? cols[10].trim() : null, // interior
                    cols.length > 11 ? cols[11].trim() : null, // lote
                    cols.length > 12 ? cols[12].trim() : null, // departamento
                    cols.length > 13 ? cols[13].trim() : null, // manzana
                    cols.length > 14 ? cols[14].trim() : null  // kilometro
                });

                count++;

                if (batch.size() >= batchSize) {
                    jdbcTemplate.batchUpdate(sql, batch);
                    batch.clear();
                    if (count % 100000 == 0) {
                        System.out.println("🏎️ Nitro: " + count + " registros...");
                    }
                }
            } catch (Exception e) {
                continue;
            }
        }
        if (!batch.isEmpty()) {
            jdbcTemplate.batchUpdate(sql, batch);
        }
        return count;
    }
}
