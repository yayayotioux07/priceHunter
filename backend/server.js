require("dotenv").config();
const express = require("express");
const path = require("path");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3001;
const SCRAPINGBEE_KEY = process.env.SCRAPINGBEE_KEY;

app.set("trust proxy", 1);
app.use(express.json());

const frontendDist = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendDist));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// In-memory cache — store results for 6 hours to save credits
const cache = new Map();
const CACHE_TTL = 6 * 60 * 60 * 1000;

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

function parseProducts(html, brandId) {
  const domain = BRAND_DOMAINS[brandId];
  const baseUrl = "https://" + domain;
  const results = [];
  const seen = new Set();

  // Split into chunks that likely contain product cards
  const chunks = html.split(/<(?:li|article|div)[^>]*class="[^"]*(?:product|tile|card|item|plp)[^"]*"/i);

  for (const chunk of chunks) {
    const prices = chunk.match(/\$[\d,]+\.?\d*/g);
    if (!prices || prices.length === 0) continue;

    const linkMatch = chunk.match(/href=["']([^"'#][^"']*?)["']/);
    if (!linkMatch) continue;

    let href = linkMatch[1];
    if (href.includes("javascript:") || href.includes("mailto:")) continue;
    if (["/sale", "/en/sale", "/en-us/sale", "/cart", "/account", "/login", "/help", "/stores"]
      .some(s => href === s || href === s + "/")) continue;

    const fullUrl = href.startsWith("http") ? href : baseUrl + href;
    if (!fullUrl.includes(domain)) continue;
    if (seen.has(fullUrl)) continue;

    // Extract clean text for name
    const text = chunk.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const words = text.split(" ").filter(w => w.length > 1 && !w.match(/^\$/) && !w.match(/^\d+%?$/));
    const name = words.slice(0, 10).join(" ").trim();
    if (!name || name.length < 3) continue;

    // Extract image
    const imgMatch = chunk.match(/src=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"'?]*)/i);
    const image = imgMatch ? (imgMatch[1].startsWith("http") ? imgMatch[1] : baseUrl + imgMatch[1]) : null;

    const salePrice = prices[prices.length - 1];
    const originalPrice = prices.length > 1 ? prices[0] : null;

    seen.add(fullUrl);
    results.push({ name, price: salePrice, originalPrice, sale: true, url: fullUrl, image });
    if (results.length >= 12) break;
  }

  return results;
}

app.get("/api/products/:brandId", async (req, res) => {
  const { brandId } = req.params;
  const category = req.query.category || "All";
  const cacheKey = `${brandId}-${category}`;

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`📦 Cache hit: ${cacheKey}`);
    return res.json({ ...cached.data, cached: true });
  }

  const urls = SALE_URLS[brandId];
  if (!urls) return res.status(404).json({ error: "Brand not found" });

  const saleUrl = urls[category] || urls["All"];
  console.log(`🔍 ScrapingBee: ${brandId} / ${category}`);

  if (!SCRAPINGBEE_KEY) {
    return res.json({ products: [], saleUrl, blocked: true, error: "No ScrapingBee key configured" });
  }

  try {
    // Use ScrapingBee with JS rendering enabled
    const apiUrl = `https://app.scrapingbee.com/api/v1/?` + new URLSearchParams({
      api_key: SCRAPINGBEE_KEY,
      url: saleUrl,
      render_js: "true",
      wait: "3000",          // wait 3s for JS to render
      block_ads: "true",
      block_resources: "false",
    });

    const response = await fetch(apiUrl, { timeout: 60000 });
    console.log(`📄 ScrapingBee status: ${response.status} for ${brandId}`);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`❌ ScrapingBee error: ${errText.substring(0, 200)}`);
      return res.json({ products: [], saleUrl, blocked: true });
    }

    const html = await response.text();
    console.log(`📄 ${brandId}: got ${html.length} bytes`);

    const products = parseProducts(html, brandId);
    console.log(`✅ ${brandId}: ${products.length} products`);

    const data = { products, saleUrl, blocked: products.length === 0 };

    // Cache the result
    cache.set(cacheKey, { data, timestamp: Date.now() });

    res.json(data);
  } catch (err) {
    console.error(`❌ ${brandId}:`, err.message);
    res.json({ products: [], saleUrl, blocked: true, error: err.message });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, () => console.log(`✅ PriceHunt running on port ${PORT}`));
