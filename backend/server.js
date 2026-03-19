require("dotenv").config();
const express = require("express");
const path = require("path");
const { scrapeBrand, SALE_URLS } = require("./scraper");

const app = express();
const PORT = process.env.PORT || 3001;

app.set("trust proxy", 1);
app.use(express.json());

const frontendDist = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendDist));

// Cache results for 6 hours to avoid re-scraping
const cache = new Map();
const CACHE_TTL = 6 * 60 * 60 * 1000;

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.get("/api/products/:brandId", async (req, res) => {
  const { brandId } = req.params;
  const category = req.query.category || "All";
  const cacheKey = `${brandId}-${category}`;

  // Return cached result if fresh
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`📦 Cache hit: ${cacheKey}`);
    return res.json({ ...cached.data, cached: true });
  }

  const urls = SALE_URLS[brandId];
  if (!urls) return res.status(404).json({ error: "Brand not found" });

  const saleUrl = urls[category] || urls["All"];

  try {
    const products = await scrapeBrand(brandId, category);
    const data = { products, saleUrl, blocked: products.length === 0 };
    cache.set(cacheKey, { data, timestamp: Date.now() });
    res.json(data);
  } catch (err) {
    console.error(`Error scraping ${brandId}:`, err.message);
    res.json({ products: [], saleUrl, blocked: true, error: err.message });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, () => console.log(`✅ PriceHunt running on port ${PORT}`));
