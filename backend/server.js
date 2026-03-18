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
app.use("/api/", rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests. Please wait a few minutes." },
}));

const frontendDist = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendDist));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

const OFFICIAL_DOMAINS = {
  "Guess":          "guess.com",
  "Michael Kors":   "michaelkors.com",
  "Calvin Klein":   "calvinklein",
  "Tommy Hilfiger": "tommy.com",
  "Adidas":         "adidas.com",
  "Nike":           "nike.com",
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Search a single brand with a small focused prompt
async function searchBrand(brand, searchQuery, categoryFilter) {
  const domain = OFFICIAL_DOMAINS[brand] || brand.toLowerCase().replace(/\s/g, "") + ".com";

  const systemPrompt = `You are a product search assistant. Use web search to find real products on ${domain}. Return ONLY a JSON array. Each item: {"name":"...","price":"$X.XX","url":"https://...","sale":false,"originalPrice":null,"category":"...","description":"..."}. URLs must be real URLs from ${domain} found in search results. Return 2-3 products max. No markdown.`;

  const userMsg = `Search site:${domain} for "${searchQuery}"${categoryFilter ? ` ${categoryFilter}` : ""}. Return real product URLs from ${domain} only.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: systemPrompt,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: userMsg }],
  });

  const text = response.content.filter(b => b.type === "text").map(b => b.text).join("");
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
  const searchQuery = query?.trim() || categoryFilter || "bestsellers";

  console.log(`🔎 "${searchQuery}" | Brands: ${brands.join(", ")}`);

  const allProducts = [];

  // Search brands one at a time with 1s delay to avoid rate limits
  for (const brand of brands) {
    try {
      console.log(`🔍 Searching ${brand}...`);
      const products = await searchBrand(brand, searchQuery, categoryFilter);
      console.log(`✅ ${brand}: ${products.length} products`);
      allProducts.push(...products);
    } catch (err) {
      console.error(`❌ ${brand} failed:`, err.message);
    }
    // Wait 1.5s between brands to stay under token rate limit
    if (brands.indexOf(brand) < brands.length - 1) {
      await sleep(1500);
    }
  }

  console.log(`✅ Total: ${allProducts.length} products`);
  res.json({ products: allProducts, count: allProducts.length });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, () => console.log(`✅ PriceHunt running on port ${PORT}`));
