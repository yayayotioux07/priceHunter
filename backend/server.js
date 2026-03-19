require("dotenv").config();
const express = require("express");
const path = require("path");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3001;

app.set("trust proxy", 1);
app.use(express.json());

const frontendDist = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendDist));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Brand sale page URLs
const SALE_URLS = {
  "guess": {
    "All":         "https://www.guess.com/en-us/guess/women/sale/",
    "Bags":        "https://www.guess.com/en-us/guess/women/sale/handbags/",
    "Shoes":       "https://www.guess.com/en-us/guess/women/sale/shoes/",
    "Clothing":    "https://www.guess.com/en-us/guess/women/sale/clothing/",
    "Accessories": "https://www.guess.com/en-us/guess/women/sale/accessories/",
    "Jackets":     "https://www.guess.com/en-us/guess/women/sale/clothing/jackets-coats/",
    "Sneakers":    "https://www.guess.com/en-us/guess/women/sale/shoes/sneakers/",
  },
  "michael_kors": {
    "All":         "https://www.michaelkors.com/sale/",
    "Bags":        "https://www.michaelkors.com/sale/handbags/",
    "Shoes":       "https://www.michaelkors.com/sale/shoes/",
    "Clothing":    "https://www.michaelkors.com/sale/clothing/",
    "Accessories": "https://www.michaelkors.com/sale/accessories/",
    "Jackets":     "https://www.michaelkors.com/sale/clothing/coats-jackets/",
    "Sneakers":    "https://www.michaelkors.com/sale/shoes/sneakers/",
  },
  "calvin_klein": {
    "All":         "https://www.calvinklein.us/sale/",
    "Bags":        "https://www.calvinklein.us/sale/bags-and-accessories/bags/",
    "Shoes":       "https://www.calvinklein.us/sale/shoes/",
    "Clothing":    "https://www.calvinklein.us/sale/womens-clothing/",
    "Accessories": "https://www.calvinklein.us/sale/bags-and-accessories/",
    "Jackets":     "https://www.calvinklein.us/sale/womens-clothing/jackets-and-coats/",
    "Sneakers":    "https://www.calvinklein.us/sale/shoes/sneakers/",
  },
  "tommy_hilfiger": {
    "All":         "https://usa.tommy.com/en/sale/",
    "Bags":        "https://usa.tommy.com/en/sale/bags/",
    "Shoes":       "https://usa.tommy.com/en/sale/shoes/",
    "Clothing":    "https://usa.tommy.com/en/sale/womens-clothing/",
    "Accessories": "https://usa.tommy.com/en/sale/accessories/",
    "Jackets":     "https://usa.tommy.com/en/sale/womens-clothing/jackets-coats/",
    "Sneakers":    "https://usa.tommy.com/en/sale/shoes/sneakers/",
  },
  "adidas": {
    "All":         "https://www.adidas.com/us/sale",
    "Bags":        "https://www.adidas.com/us/bags-and-backpacks-sale",
    "Shoes":       "https://www.adidas.com/us/shoes-sale",
    "Clothing":    "https://www.adidas.com/us/clothing-sale",
    "Accessories": "https://www.adidas.com/us/accessories-sale",
    "Jackets":     "https://www.adidas.com/us/jackets-sale",
    "Sneakers":    "https://www.adidas.com/us/shoes-sale",
  },
  "nike": {
    "All":         "https://www.nike.com/w/sale-3yaep",
    "Bags":        "https://www.nike.com/w/sale-bags-accessories-3yaepzy11j",
    "Shoes":       "https://www.nike.com/w/sale-shoes-3yaepznik1",
    "Clothing":    "https://www.nike.com/w/sale-clothing-3yaepz6ymx6",
    "Accessories": "https://www.nike.com/w/sale-bags-accessories-3yaepzy11j",
    "Jackets":     "https://www.nike.com/w/sale-jackets-vests-3yaepz9om13",
    "Sneakers":    "https://www.nike.com/w/sale-shoes-3yaepznik1",
  },
};

const BRAND_DOMAINS = {
  "guess":          "www.guess.com",
  "michael_kors":   "www.michaelkors.com",
  "calvin_klein":   "www.calvinklein.us",
  "tommy_hilfiger": "usa.tommy.com",
  "adidas":         "www.adidas.com",
  "nike":           "www.nike.com",
};

// Parse product cards from raw HTML
function parseProducts(html, brandId) {
  const domain = BRAND_DOMAINS[brandId];
  const baseUrl = "https://" + domain;
  const results = [];
  const seen = new Set();

  // Extract all <a href> links with prices nearby using regex (no DOM in Node)
  // Find product links — look for hrefs that seem like product pages
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const priceRegex = /\$[\d,]+\.?\d*/g;
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/i;
  const nameRegex = /<(?:h[1-6]|p|span|div)[^>]*class=["'][^"']*(?:name|title|product)[^"']*["'][^>]*>([^<]+)<\/(?:h[1-6]|p|span|div)>/i;

  // Split HTML into chunks around links and look for price patterns
  const chunks = html.split(/<li|<article|<div[^>]*class="[^"]*(?:product|tile|card|item)[^"]*"/i);

  for (const chunk of chunks) {
    const prices = chunk.match(priceRegex);
    if (!prices || prices.length === 0) continue;

    // Find a link in this chunk
    const linkMatch = chunk.match(/href=["']([^"'#][^"']*?)["']/);
    if (!linkMatch) continue;

    let href = linkMatch[1];
    if (href.includes("javascript:") || href.includes("mailto:")) continue;
    if (["/sale","/en/sale","/en-us/sale","/cart","/account","/login","/help","/stores"].some(s => href === s || href === s + "/")) continue;

    const fullUrl = href.startsWith("http") ? href : baseUrl + href;
    if (!fullUrl.includes(domain)) continue;
    if (seen.has(fullUrl)) continue;

    // Extract name — look for text content between tags
    const textContent = chunk.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const words = textContent.split(" ").filter(w => w.length > 1);
    // Name is usually the first meaningful non-price text
    const nameParts = [];
    for (const w of words) {
      if (w.match(/^\$/) || w.match(/^\d+%?$/)) break;
      nameParts.push(w);
      if (nameParts.length >= 8) break;
    }
    const name = nameParts.join(" ").trim();
    if (!name || name.length < 3) continue;

    // Extract image
    const imgMatch = chunk.match(/src=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*?)["']/i);
    const image = imgMatch ? (imgMatch[1].startsWith("http") ? imgMatch[1] : baseUrl + imgMatch[1]) : null;

    const salePrice = prices[prices.length - 1];
    const originalPrice = prices.length > 1 ? prices[0] : null;

    seen.add(fullUrl);
    results.push({ name, price: salePrice, originalPrice, sale: true, url: fullUrl, image });

    if (results.length >= 12) break;
  }

  return results;
}

// Fetch sale page server-side (no CORS issues)
app.get("/api/products/:brandId", async (req, res) => {
  const { brandId } = req.params;
  const category = req.query.category || "All";

  const urls = SALE_URLS[brandId];
  if (!urls) return res.status(404).json({ error: "Brand not found" });

  const saleUrl = urls[category] || urls["All"];
  console.log(`🔍 Fetching ${brandId} / ${category}: ${saleUrl}`);

  try {
    const response = await fetch(saleUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
      },
      timeout: 15000,
    });

    if (!response.ok) {
      console.warn(`⚠️ ${brandId}: HTTP ${response.status}`);
      return res.json({ products: [], saleUrl, blocked: true, status: response.status });
    }

    const html = await response.text();
    console.log(`📄 ${brandId}: got ${html.length} bytes`);

    const products = parseProducts(html, brandId);
    console.log(`✅ ${brandId}: parsed ${products.length} products`);

    res.json({ products, saleUrl, blocked: products.length === 0 });
  } catch (err) {
    console.error(`❌ ${brandId}:`, err.message);
    res.json({ products: [], saleUrl, blocked: true, error: err.message });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, () => console.log(`✅ PriceHunt running on port ${PORT}`));
