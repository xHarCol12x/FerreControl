package com.ferrecontrol.service;

import com.ferrecontrol.dto.ScrapedProductDto;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;

@Service
public class ScraperService {

    public ScrapedProductDto scrapeProduct(String url) {
        try {
            System.out.println("Attempting to scrape: " + url);
            Document doc = Jsoup.connect(url)
                    .userAgent(
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                    .timeout(15000)
                    .followRedirects(true)
                    .ignoreHttpErrors(true)
                    .get();

            String name = getMetaTag(doc, "og:title");
            if (name == null || name.isEmpty()) {
                name = doc.title();
            }
            if (name != null)
                name = name.split("\\|")[0].trim(); // Clean titles like "Product | Store"

            String imageUrl = getMetaTag(doc, "og:image");

            String priceStr = getMetaTag(doc, "product:price:amount");
            if (priceStr == null || priceStr.isEmpty()) {
                priceStr = getMetaTag(doc, "og:price:amount");
            }

            Double price = null;
            if (priceStr != null && !priceStr.isEmpty()) {
                try {
                    price = Double.parseDouble(priceStr.replaceAll("[^0-9.]", ""));
                } catch (NumberFormatException e) {
                    System.err.println("Failed to parse price from meta: " + priceStr);
                }
            }

            // Fallback for price (Promart specific)
            if (price == null) {
                Element priceEl = doc.select(".vtex-product-price-1-x-sellingPriceValue").first();
                if (priceEl != null) {
                    try {
                        price = Double.parseDouble(priceEl.text().replaceAll("[^0-9.]", ""));
                    } catch (Exception e) {
                        System.err.println("Failed to parse price from selector: " + priceEl.text());
                    }
                }
            }

            System.out.println("Scrape successful: " + name + " - S/ " + price);
            return ScrapedProductDto.builder()
                    .name(name)
                    .imageUrl(imageUrl)
                    .price(price)
                    .build();

        } catch (Exception e) {
            System.err.println("Critical error scraping URL: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Error al extraer datos: " + e.getMessage());
        }
    }

    private String getMetaTag(Document doc, String attr) {
        Element element = doc.select("meta[property=" + attr + "]").first();
        if (element != null) {
            return element.attr("content");
        }
        element = doc.select("meta[name=" + attr + "]").first();
        if (element != null) {
            return element.attr("content");
        }
        return null;
    }

}
