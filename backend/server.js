require("dotenv").config();
const express = require("express");
const path = require("path");
const { scrapeCostco, COSTCO_CATEGORIES } = require("./agent");

const app = express();
const PORT = process.env.PORT || 3001;

app.set("trust proxy", 1);
app.use(express.json());

const frontendDist = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendDist));

// Cache 3 hours per category+query combo
const cache = new Map();
const CACHE_TTL = 3 * 60 * 60 * 1000;

// Queue - one search at a time
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
    const result = await enqueue(() => scrapeCostco(category, query));
    const data = {
      products: result.products,
      pageUrl: result.pageUrl,
      category,
      query,
      blocked: result.products.length === 0,
    };
    cache.set(cacheKey, { data, timestamp: Date.now() });
    res.json(data);
  } catch (err) {
    console.error("Error:", err.message);
    res.json({ products: [], pageUrl: COSTCO_CATEGORIES[category] || COSTCO_CATEGORIES["All"], blocked: true });
  }
});

app.get("/api/cache", (req, res) => {
  const entries = [];
  cache.forEach((v, k) => {
    entries.push({ key: k, products: v.data.products.length, ageMinutes: Math.round((Date.now() - v.timestamp) / 60000) });
  });
  res.json({ cached: entries.length, entries });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, () => console.log(`✅ Costco PriceHunt running on port ${PORT}`));
