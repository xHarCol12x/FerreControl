package com.ferrecontrol.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class ExternalApiService {

    @Value("${external.api.token}")
    private String token;

    @Value("${external.api.base-url}")
    private String baseUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public Map<String, Object> consultRuc(String ruc) {
        String url = baseUrl + "/sunat/ruc/" + ruc;
        return makeRequest(url);
    }

    public Map<String, Object> consultDni(String dni) {
        String url = baseUrl + "/reniec/dni/" + dni;
        return makeRequest(url);
    }

    private Map<String, Object> makeRequest(String url) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + token);
        headers.set("Accept", "application/json");
        headers.set("Content-Type", "application/json");

        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            System.out.println("Consultando API Externa: " + url);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            return (Map<String, Object>) response.getBody();
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            System.err.println("Error de API CodArt (" + e.getStatusCode() + "): " + e.getResponseBodyAsString());
            return Map.of("success", false, "message", "No se encontró información o error de token");
        } catch (Exception e) {
            System.err.println("Error crítico de conexión: " + e.getMessage());
            throw new RuntimeException("Error al consultar API externa: " + e.getMessage());
        }
    }
}
