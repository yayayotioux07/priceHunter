require("dotenv").config();
const express = require("express");
const path = require("path");
const { scrapeWithAgent, SALE_URLS } = require("./agent");

const app = express();
const PORT = process.env.PORT || 3001;

app.set("trust proxy", 1);
app.use(express.json());

const frontendDist = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendDist));

// Cache 6 hours to preserve credits
const cache = new Map();
const CACHE_TTL = 6 * 60 * 60 * 1000;

// Queue to prevent concurrent API calls hitting rate limits
let isRunning = false;
const queue = [];

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    processQueue();
  });
}

async function processQueue() {
  if (isRunning || queue.length === 0) return;
  isRunning = true;
  const { fn, resolve, reject } = queue.shift();
  try { resolve(await fn()); }
  catch (e) { reject(e); }
  finally { isRunning = false; processQueue(); }
}

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.get("/api/products/:brandId", async (req, res) => {
  const { brandId } = req.params;
  const category = req.query.category || "All";
  const cacheKey = `${brandId}-${category}`;

  // Serve from cache if fresh
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`📦 Cache hit: ${cacheKey}`);
    return res.json({ ...cached.data, cached: true });
  }

  const urls = SALE_URLS[brandId];
  if (!urls) return res.status(404).json({ error: "Brand not found" });

  try {
    const result = await enqueue(() => scrapeWithAgent(brandId, category));
    const data = {
      products: result.products,
      saleUrl: result.saleUrl,
      blocked: result.products.length === 0,
    };
    cache.set(cacheKey, { data, timestamp: Date.now() });
    res.json(data);
  } catch (err) {
    console.error(`Error:`, err.message);
    const saleUrl = urls[category] || urls["All"];
    res.json({ products: [], saleUrl, blocked: true });
  }
});

// Cache stats endpoint
app.get("/api/cache", (req, res) => {
  const entries = [];
  cache.forEach((v, k) => {
    const ageMin = Math.round((Date.now() - v.timestamp) / 60000);
    entries.push({ key: k, products: v.data.products.length, ageMinutes: ageMin });
  });
  res.json({ cached: entries.length, entries });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, () => console.log(`✅ PriceHunt agent running on port ${PORT}`));
