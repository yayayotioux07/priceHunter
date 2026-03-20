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

const cache = new Map();
const CACHE_TTL = 2 * 60 * 60 * 1000;

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Referer": "https://www.costco.com/",
  "Cache-Control": "no-cache",
};

// Costco search URL patterns
const CATEGORY_SEARCH_TERMS = {
  "All":            "savings",
  "Electronics":    "electronics",
  "Clothing":       "clothing",
  "Food & Grocery": "food snacks",
  "Home & Garden":  "home furniture",
  "Appliances":     "appliances",
  "Jewelry":        "jewelry",
  "Toys":           "toys",
  "Health & Beauty":"vitamins health",
};

app.get("/api/products", async (req, res) => {
  const category = req.query.category || "All";
  const query = req.query.q || "";
  const cacheKey = `${category}-${query}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`📦 Cache hit: ${cacheKey}`);
    return res.json({ ...cached.data, cached: true });
  }

  const searchTerm = query || CATEGORY_SEARCH_TERMS[category] || "deals";
  const pageUrl = `https://www.costco.com/CatalogSearch?keyword=${encodeURIComponent(searchTerm)}`;

  try {
    const products = await searchCostco(searchTerm);
    const data = { products, pageUrl, category, query, blocked: products.length === 0 };
    cache.set(cacheKey, { data, timestamp: Date.now() });
    console.log(`✅ "${searchTerm}": ${products.length} products`);
    res.json(data);
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ products: [], blocked: true, error: err.message });
  }
});

async function searchCostco(keyword) {
  // Try Costco's GraphQL/search API endpoints
  const endpoints = [
    // Current search endpoint
    `https://www.costco.com/CatalogSearch?keyword=${encodeURIComponent(keyword)}&pageSize=24&currentPage=1&sortBy=all`,
    // Alternate search
    `https://www.costco.com/CatalogSearch?keyword=${encodeURIComponent(keyword)}`,
  ];

  for (const url of endpoints) {
    console.log(`🔍 Trying: ${url}`);
    try {
      const res = await fetch(url, {
        headers: HEADERS,
        timeout: 20000,
        follow: 5,
      });

      console.log(`📄 Status: ${res.status}, Content-Type: ${res.headers.get("content-type")}`);

      if (!res.ok) continue;

      const contentType = res.headers.get("content-type") || "";
      const text = await res.text();
      console.log(`📄 Response size: ${text.length} bytes, preview: ${text.substring(0, 150)}`);

      if (contentType.includes("json")) {
        const data = JSON.parse(text);
        const products = parseCostcoJSON(data, keyword);
        if (products.length > 0) return products;
      } else {
        // HTML response - parse it
        const products = parseHTMLProducts(text);
        if (products.length > 0) return products;
      }
    } catch (e) {
      console.error(`❌ Endpoint failed: ${e.message}`);
    }
  }

  return [];
}

function parseCostcoJSON(data, keyword) {
  const products = [];
  const items = data?.catalogEntryView || data?.items || data?.results ||
    data?.products || data?.SearchResult?.catalogEntryView || [];

  for (const item of items.slice(0, 12)) {
    try {
      const name = item.name || item.shortDescription || item.title || item.catalogEntryDescription;
      if (!name || name.length < 3) continue;

      const itemId = item.partNumber || item.catalogEntryIdentifier?.uniqueID || item.itemNumber;
      const seoToken = (item.seo_token || item.urlKeyword || name)
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");

      const url = itemId
        ? `https://www.costco.com/${seoToken}.product.${itemId}.html`
        : `https://www.costco.com/CatalogSearch?keyword=${encodeURIComponent(name)}`;

      const priceInfo = item.price?.[0] || {};
      const price = priceInfo.contractPrice || priceInfo.offerPrice || item.ourPrice || item.listPrice;
      const original = priceInfo.listPrice || item.originalPrice;

      if (!price) continue;

      const p = parseFloat(price);
      const o = parseFloat(original);
      const hasDiscount = !isNaN(o) && o > p;

      products.push({
        name,
        price: fmt(p),
        originalPrice: hasDiscount ? fmt(o) : null,
        savings: hasDiscount ? fmt(o - p) : null,
        url,
        image: item.thumbnail ? `https://www.costco.com${item.thumbnail}` : null,
        sale: hasDiscount,
        itemNumber: itemId || null,
      });
    } catch (e) {}
  }

  return products;
}

function parseHTMLProducts(html) {
  const products = [];
  const seen = new Set();

  // Look for JSON data embedded in the page (Costco embeds product data as JSON)
  const jsonMatches = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});\s*<\/script>/);
  if (jsonMatches) {
    try {
      const state = JSON.parse(jsonMatches[1]);
      const items = state?.catalog?.products || state?.search?.products || [];
      if (items.length > 0) return parseCostcoJSON({ items }, "");
    } catch (e) {}
  }

  // Try another JSON embed pattern
  const catalogMatch = html.match(/catalogEntryView['"]\s*:\s*(\[[\s\S]*?\])\s*[,}]/);
  if (catalogMatch) {
    try {
      const items = JSON.parse(catalogMatch[1]);
      const parsed = parseCostcoJSON({ catalogEntryView: items }, "");
      if (parsed.length > 0) return parsed;
    } catch (e) {}
  }

  // Fall back to regex scraping product URLs
  const urlRegex = /https:\/\/www\.costco\.com\/[^"'\s]+\.product\.\d+\.html/g;
  let match;
  while ((match = urlRegex.exec(html)) !== null) {
    if (!seen.has(match[0])) {
      seen.add(match[0]);
      const idx = html.indexOf(match[0]);
      const chunk = html.substring(Math.max(0, idx - 800), idx + 200);
      const clean = chunk.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const prices = clean.match(/\$[\d,]+\.?\d*/g);
      const words = clean.split(" ").filter(w => w.length > 2 && !w.startsWith("$") && !/^\d+$/.test(w));
      const name = words.slice(0, 10).join(" ").trim();
      const itemNum = match[0].match(/\.(\d+)\.html/)?.[1];

      if (name && prices) {
        products.push({
          name: name.substring(0, 80),
          price: prices[0],
          originalPrice: prices.length > 1 ? prices[1] : null,
          savings: null,
          url: match[0],
          image: null,
          sale: prices.length > 1,
          itemNumber: itemNum || null,
        });
      }
    }
    if (products.length >= 12) break;
  }

  return products;
}

function fmt(num) {
  if (isNaN(num)) return null;
  return `$${parseFloat(num).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

app.get("/api/cache/clear", (req, res) => { cache.clear(); res.json({ ok: true }); });

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, () => console.log(`✅ CostcoHunt running on port ${PORT}`));
