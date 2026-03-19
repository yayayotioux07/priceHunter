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

// Brand-specific JS extraction scripts — run inside the browser via ScrapingBee
const EXTRACT_SCRIPTS = {
  "guess": `
    const items = [];
    document.querySelectorAll('.product-tile, [class*="product-tile"]').forEach(el => {
      const name = el.querySelector('[class*="name"], [class*="title"]')?.innerText?.trim();
      const prices = [...el.querySelectorAll('[class*="price"]')].map(p => p.innerText.trim()).filter(p => p.includes('$'));
      const url = el.querySelector('a')?.href;
      const img = el.querySelector('img')?.src;
      if (name && prices.length && url) items.push({ name, price: prices[prices.length-1], originalPrice: prices.length > 1 ? prices[0] : null, url, image: img, sale: true });
    });
    JSON.stringify(items.slice(0, 12));
  `,
  "michael_kors": `
    const items = [];
    document.querySelectorAll('[class*="product"], [class*="ProductTile"], [class*="product-tile"]').forEach(el => {
      const name = el.querySelector('[class*="name"], [class*="Name"], h3, h2')?.innerText?.trim();
      const prices = [...el.querySelectorAll('[class*="price"], [class*="Price"]')].map(p => p.innerText.trim()).filter(p => p.includes('$'));
      const url = el.querySelector('a')?.href;
      const img = el.querySelector('img')?.src;
      if (name && prices.length && url) items.push({ name, price: prices[prices.length-1], originalPrice: prices.length > 1 ? prices[0] : null, url, image: img, sale: true });
    });
    JSON.stringify(items.slice(0, 12));
  `,
  "calvin_klein": `
    const items = [];
    document.querySelectorAll('[class*="product-card"], [class*="ProductCard"], [class*="product-tile"]').forEach(el => {
      const name = el.querySelector('[class*="name"], [class*="title"], h3, h2')?.innerText?.trim();
      const prices = [...el.querySelectorAll('[class*="price"], [class*="Price"]')].map(p => p.innerText.trim()).filter(p => p.includes('$'));
      const url = el.querySelector('a')?.href;
      const img = el.querySelector('img')?.src;
      if (name && prices.length && url) items.push({ name, price: prices[prices.length-1], originalPrice: prices.length > 1 ? prices[0] : null, url, image: img, sale: true });
    });
    JSON.stringify(items.slice(0, 12));
  `,
  "tommy_hilfiger": `
    const items = [];
    document.querySelectorAll('[class*="product"], [class*="tile"], [class*="card"]').forEach(el => {
      const name = el.querySelector('[class*="name"], [class*="title"], h3, h2')?.innerText?.trim();
      const prices = [...el.querySelectorAll('[class*="price"], [class*="Price"]')].map(p => p.innerText.trim()).filter(p => p.includes('$'));
      const url = el.querySelector('a')?.href;
      const img = el.querySelector('img')?.src;
      if (name && prices.length && url) items.push({ name, price: prices[prices.length-1], originalPrice: prices.length > 1 ? prices[0] : null, url, image: img, sale: true });
    });
    JSON.stringify(items.slice(0, 12));
  `,
  "adidas": `
    const items = [];
    document.querySelectorAll('[class*="product-card"], [data-testid="product-card"], [class*="glass-product-card"]').forEach(el => {
      const name = el.querySelector('[class*="name"], [data-testid*="name"], h3, h2')?.innerText?.trim();
      const prices = [...el.querySelectorAll('[class*="price"], [data-testid*="price"]')].map(p => p.innerText.trim()).filter(p => p.includes('$'));
      const link = el.closest('a') || el.querySelector('a');
      const url = link?.href;
      const img = el.querySelector('img')?.src;
      if (name && prices.length && url) items.push({ name, price: prices[prices.length-1], originalPrice: prices.length > 1 ? prices[0] : null, url, image: img, sale: true });
    });
    JSON.stringify(items.slice(0, 12));
  `,
  "nike": `
    const items = [];
    document.querySelectorAll('[class*="product-card"], [data-testid="product-card"]').forEach(el => {
      const name = el.querySelector('[class*="title"], [class*="name"], h3, h2')?.innerText?.trim();
      const prices = [...el.querySelectorAll('[class*="price"]')].map(p => p.innerText.trim()).filter(p => p.includes('$'));
      const link = el.closest('a') || el.querySelector('a');
      const url = link?.href;
      const img = el.querySelector('img')?.src;
      if (name && prices.length && url) items.push({ name, price: prices[prices.length-1], originalPrice: prices.length > 1 ? prices[0] : null, url, image: img, sale: true });
    });
    JSON.stringify(items.slice(0, 12));
  `,
};

app.get("/api/products/:brandId", async (req, res) => {
  const { brandId } = req.params;
  const category = req.query.category || "All";
  const cacheKey = `${brandId}-${category}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`📦 Cache hit: ${cacheKey}`);
    return res.json({ ...cached.data, cached: true });
  }

  const urls = SALE_URLS[brandId];
  if (!urls) return res.status(404).json({ error: "Brand not found" });

  const saleUrl = urls[category] || urls["All"];
  const extractScript = EXTRACT_SCRIPTS[brandId];

  console.log(`🔍 ScrapingBee: ${brandId} / ${category}`);

  if (!SCRAPINGBEE_KEY) {
    return res.json({ products: [], saleUrl, blocked: true, error: "No SCRAPINGBEE_KEY set" });
  }

  try {
    const params = new URLSearchParams({
      api_key: SCRAPINGBEE_KEY,
      url: saleUrl,
      render_js: "true",
      wait: "5000",
      block_ads: "true",
      block_resources: "false",
      stealth_proxy: "true",
    });

    // Use JS execution to extract data directly from the rendered DOM
    if (extractScript) {
      params.set("js_scenario", JSON.stringify({
        instructions: [
          { wait: 5000 },
          { evaluate: extractScript }
        ]
      }));
    }

    const apiUrl = `https://app.scrapingbee.com/api/v1/?${params}`;
    const response = await fetch(apiUrl, { timeout: 60000 });

    console.log(`📄 ScrapingBee status: ${response.status} for ${brandId}`);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`❌ ScrapingBee error (${response.status}): ${errText.substring(0, 300)}`);
      return res.json({ products: [], saleUrl, blocked: true });
    }

    const text = await response.text();
    console.log(`📄 ${brandId}: got ${text.length} bytes, preview: ${text.substring(0, 200)}`);

    // Try to parse as JSON first (from js_scenario evaluate result)
    let products = [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        products = parsed;
      } else if (parsed && typeof parsed === "object") {
        // ScrapingBee wraps evaluate result
        const inner = parsed.body || parsed.result || parsed.data;
        if (typeof inner === "string") products = JSON.parse(inner);
        else if (Array.isArray(inner)) products = inner;
      }
    } catch (e) {
      // Not JSON — it's HTML, try parsing
      console.log(`📝 Not JSON, parsing as HTML...`);
      products = parseProductsFromHtml(text, brandId);
    }

    // Validate products
    const domain = BRAND_DOMAINS[brandId];
    products = products
      .filter(p => p && p.name && p.price && p.url)
      .filter(p => p.url.includes(domain) || p.url.includes(brandId.replace("_", "")))
      .slice(0, 12);

    console.log(`✅ ${brandId}: ${products.length} products`);

    const data = { products, saleUrl, blocked: products.length === 0 };
    cache.set(cacheKey, { data, timestamp: Date.now() });
    res.json(data);

  } catch (err) {
    console.error(`❌ ${brandId}:`, err.message);
    res.json({ products: [], saleUrl, blocked: true, error: err.message });
  }
});

// Fallback HTML parser
function parseProductsFromHtml(html, brandId) {
  const domain = BRAND_DOMAINS[brandId];
  const baseUrl = "https://" + domain;
  const results = [];
  const seen = new Set();

  const chunks = html.split(/<(?:li|article|div)[^>]*class="[^"]*(?:product|tile|card|item)[^"]*"/i);
  for (const chunk of chunks) {
    const prices = chunk.match(/\$[\d,]+\.?\d*/g);
    if (!prices) continue;

    const linkMatch = chunk.match(/href=["']([^"'#][^"']*?)["']/);
    if (!linkMatch) continue;

    const href = linkMatch[1];
    if (href.includes("javascript:") || href.includes("mailto:")) continue;

    const fullUrl = href.startsWith("http") ? href : baseUrl + href;
    if (!fullUrl.includes(domain)) continue;
    if (seen.has(fullUrl)) continue;

    const text = chunk.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const words = text.split(" ").filter(w => w.length > 1 && !w.match(/^\$/) && !w.match(/^\d+%?$/));
    const name = words.slice(0, 8).join(" ").trim();
    if (!name || name.length < 3) continue;

    const imgMatch = chunk.match(/src=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"'?]*)/i);
    const image = imgMatch ? (imgMatch[1].startsWith("http") ? imgMatch[1] : baseUrl + imgMatch[1]) : null;

    seen.add(fullUrl);
    results.push({ name, price: prices[prices.length - 1], originalPrice: prices.length > 1 ? prices[0] : null, sale: true, url: fullUrl, image });
    if (results.length >= 12) break;
  }
  return results;
}

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, () => console.log(`✅ PriceHunt running on port ${PORT}`));
