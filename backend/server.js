require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
const PORT = process.env.PORT || 3001;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(express.json());
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));

// Strict rate limit — only 3 searches per minute per IP
app.use("/api/search", rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { error: "Please wait a moment before searching again." },
}));

app.use("/api/", rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many requests." },
}));

const frontendDist = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendDist));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

const OFFICIAL_DOMAINS = {
  "Guess":          "guess.com",
  "Michael Kors":   "michaelkors.com",
  "Calvin Klein":   "calvinklein.us",
  "Tommy Hilfiger": "tommy.com",
  "Adidas":         "adidas.com",
  "Nike":           "nike.com",
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Global queue to prevent concurrent Anthropic calls
let isSearching = false;
const searchQueue = [];

async function processQueue() {
  if (isSearching || searchQueue.length === 0) return;
  isSearching = true;
  const { resolve, reject, fn } = searchQueue.shift();
  try {
    const result = await fn();
    resolve(result);
  } catch(e) {
    reject(e);
  } finally {
    isSearching = false;
    processQueue();
  }
}

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    searchQueue.push({ resolve, reject, fn });
    processQueue();
  });
}

async function searchBrand(brand, searchQuery, categoryFilter) {
  const domain = OFFICIAL_DOMAINS[brand];

  const systemPrompt = `You are a shopping assistant. Use web_search to find real products on ${domain}.
Return ONLY a raw JSON array (no markdown, no backticks) with 2-3 items.
Each item: {"name":"...","price":"$X.XX","url":"https://...from ${domain}...","category":"...","description":"one sentence","sale":false,"originalPrice":null}
Only include products whose URLs you actually found in search results on ${domain}.`;

  const userMsg = `Find 2 ${categoryFilter || ""} products matching "${searchQuery}" on ${domain}. Search now and return real product URLs and prices from ${domain} only.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1200,
    system: systemPrompt,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: userMsg }],
  });

  const text = response.content.filter(b => b.type === "text").map(b => b.text).join("");
  console.log(`📝 ${brand}: ${text.substring(0, 150)}`);

  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) return [];

  const products = JSON.parse(match[0]);
  return products
    .filter(p => p.url && p.url.includes(domain))
    .map(p => ({ ...p, brand, source: domain }));
}

app.post("/api/search", async (req, res) => {
  const { brands, category, query } = req.body;
  if (!brands?.length) return res.status(400).json({ error: "brands required" });

  const categoryFilter = category && category !== "All" ? category : "";
  const searchQuery = query?.trim() || "handbag";

  console.log(`🔎 "${searchQuery}" | Brands: ${brands.join(", ")}`);

  // Run all brands sequentially inside the queue with 5s delay between each
  const results = await enqueue(async () => {
    const allProducts = [];
    for (let i = 0; i < brands.length; i++) {
      const brand = brands[i];
      try {
        console.log(`🔍 Searching ${brand}...`);
        const products = await searchBrand(brand, searchQuery, categoryFilter);
        console.log(`✅ ${brand}: ${products.length} products`);
        allProducts.push(...products);
      } catch (err) {
        console.error(`❌ ${brand}:`, err.message.substring(0, 80));
      }
      // 5s delay between brands to stay under 30k tokens/min rate limit
      if (i < brands.length - 1) await sleep(5000);
    }
    return allProducts;
  });

  console.log(`✅ Total: ${results.length}`);
  res.json({ products: results, count: results.length });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, () => console.log(`✅ PriceHunt running on port ${PORT}`));
