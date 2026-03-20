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

// Cache results for 2 hours
const cache = new Map();
const CACHE_TTL = 2 * 60 * 60 * 1000;

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Costco category IDs for their search API
const CATEGORY_IDS = {
  "All":            "",
  "Electronics":    "3",
  "Clothing":       "9",
  "Food & Grocery": "10",
  "Home & Garden":  "1",
  "Appliances":     "12695",
  "Jewelry":        "18",
  "Toys":           "14",
  "Health & Beauty":"4",
};

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://www.costco.com/",
  "Origin": "https://www.costco.com",
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

  try {
    let products = [];

    if (query) {
      // Use Costco's search API
      products = await searchCostco(query, category);
    } else {
      // Browse category
      products = await browseCostco(category);
    }

    const catId = CATEGORY_IDS[category] || "";
    const pageUrl = query
      ? `https://www.costco.com/CatalogSearch?keyword=${encodeURIComponent(query)}`
      : `https://www.costco.com/${category.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")}.html`;

    const data = { products, pageUrl, category, query, blocked: products.length === 0 };
    cache.set(cacheKey, { data, timestamp: Date.now() });
    console.log(`✅ ${category} "${query}": ${products.length} products`);
    res.json(data);

  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ products: [], blocked: true, error: err.message });
  }
});

async function searchCostco(query, category) {
  const catId = CATEGORY_IDS[category] || "";
  // Costco's internal search API
  const url = `https://www.costco.com/AjaxCatalogRouter?catalogId=10701&langId=-1&storeId=10301` +
    `&pageSize=24&currentPage=1&keyword=${encodeURIComponent(query)}` +
    (catId ? `&categoryId=${catId}` : "") +
    `&sortBy=all&sortOrder=asc`;

  console.log(`🔍 Searching Costco: "${query}"`);
  const res = await fetch(url, { headers: HEADERS, timeout: 15000 });

  if (!res.ok) {
    console.warn(`⚠️ Search API returned ${res.status}, trying HTML search...`);
    return await searchCostcoHTML(query);
  }

  const data = await res.json();
  return parseCostcoAPIResponse(data);
}

async function browseCostco(category) {
  const catId = CATEGORY_IDS[category];
  if (!catId) return await searchCostco("savings deals", category);

  const url = `https://www.costco.com/AjaxCatalogRouter?catalogId=10701&langId=-1&storeId=10301` +
    `&pageSize=24&currentPage=1&categoryId=${catId}&sortBy=all&sortOrder=asc`;

  console.log(`📂 Browsing Costco: ${category}`);
  const res = await fetch(url, { headers: HEADERS, timeout: 15000 });

  if (!res.ok) {
    console.warn(`⚠️ Browse API returned ${res.status}`);
    return [];
  }

  const data = await res.json();
  return parseCostcoAPIResponse(data);
}

function parseCostcoAPIResponse(data) {
  const products = [];

  // Costco API returns products in different formats
  const items = data?.catalogEntryView || data?.items || data?.products || [];

  for (const item of items) {
    try {
      const name = item.name || item.shortDescription || item.title;
      if (!name) continue;

      const itemId = item.catalogEntryIdentifier?.uniqueID || item.partNumber || item.itemNumber || item.id;
      const seoToken = item.seo_token || item.urlKeyword || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      const url = itemId
        ? `https://www.costco.com/${seoToken}.product.${itemId}.html`
        : `https://www.costco.com/CatalogSearch?keyword=${encodeURIComponent(name)}`;

      // Price info
      const priceData = item.price?.[0] || item.offerPrice || {};
      const price = priceData.contractPrice || priceData.offerPrice || item.ourPrice || item.listPrice;
      const originalPrice = priceData.listPrice || item.originalPrice;

      if (!price) continue;

      const formattedPrice = formatPrice(price);
      const formattedOriginal = originalPrice && parseFloat(originalPrice) > parseFloat(price)
        ? formatPrice(originalPrice) : null;

      const savings = formattedOriginal
        ? formatPrice(parseFloat(originalPrice) - parseFloat(price))
        : null;

      // Image
      const image = item.thumbnail || item.fullImage
        ? `https://www.costco.com${item.thumbnail || item.fullImage}`
        : null;

      products.push({
        name,
        price: formattedPrice,
        originalPrice: formattedOriginal,
        savings,
        url,
        image,
        sale: !!formattedOriginal,
        itemNumber: itemId || null,
      });
    } catch (e) {}
  }

  return products;
}

// Fallback: parse HTML search results
async function searchCostcoHTML(query) {
  const url = `https://www.costco.com/CatalogSearch?keyword=${encodeURIComponent(query)}&pageSize=24`;
  console.log(`🔍 HTML search fallback: "${query}"`);

  const res = await fetch(url, { headers: { ...HEADERS, "Accept": "text/html" }, timeout: 15000 });
  if (!res.ok) return [];

  const html = await res.text();
  return parseHTMLProducts(html);
}

function parseHTMLProducts(html) {
  const products = [];
  const seen = new Set();

  // Match Costco product blocks from HTML
  const productRegex = /href="(https:\/\/www\.costco\.com\/[^"]+\.product\.\d+\.html)"/g;
  const nameRegex = /<span[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)<\/span>/gi;
  const priceRegex = /\$(\d+[\d,]*\.?\d*)/g;

  let match;
  const urls = [];
  while ((match = productRegex.exec(html)) !== null) {
    if (!seen.has(match[1])) {
      urls.push(match[1]);
      seen.add(match[1]);
    }
  }

  // Extract product chunks around each URL
  for (const url of urls.slice(0, 12)) {
    const idx = html.indexOf(url);
    const chunk = html.substring(Math.max(0, idx - 500), idx + 500);
    const text = chunk.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const prices = text.match(/\$[\d,]+\.?\d*/g);
    const name = text.split(" ").filter(w => w.length > 2 && !w.includes("$") && !w.match(/^\d+$/)).slice(0, 8).join(" ");

    if (name && prices) {
      products.push({
        name,
        price: prices[0],
        originalPrice: prices.length > 1 ? prices[1] : null,
        savings: null,
        url,
        image: null,
        sale: prices.length > 1,
        itemNumber: url.match(/\.(\d+)\.html/)?.[1] || null,
      });
    }
  }

  return products;
}

function formatPrice(price) {
  const num = parseFloat(price);
  if (isNaN(num)) return null;
  return `$${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

app.get("/api/cache/clear", (req, res) => {
  cache.clear();
  res.json({ message: "Cache cleared" });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, () => console.log(`✅ CostcoHunt running on port ${PORT}`));
