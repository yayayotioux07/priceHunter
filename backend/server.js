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
  "Calvin Klein":   "calvinklein.us",
  "Tommy Hilfiger": "tommy.com",
  "Adidas":         "adidas.com",
  "Nike":           "nike.com",
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function searchBrand(brand, searchQuery, categoryFilter) {
  const domain = OFFICIAL_DOMAINS[brand];

  const systemPrompt = `You are a shopping assistant. Use web_search to find products. 
Search for products on ${domain} and return results as a JSON array.
Each item must have: name, price (like "$89.99"), url (full https URL from ${domain}), category, description, sale (boolean), originalPrice (or null).
Return ONLY the raw JSON array. No markdown, no backticks, no explanation.`;

  const userMsg = `Find 3 ${categoryFilter || ""} products matching "${searchQuery}" on ${domain}. Search for them now and return their real URLs and prices.`;

  console.log(`📤 Sending request for ${brand}...`);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: systemPrompt,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: userMsg }],
  });

  // Log ALL content blocks
  console.log(`📥 ${brand} response blocks:`, response.content.map(b => b.type).join(", "));

  const text = response.content.filter(b => b.type === "text").map(b => b.text).join("");
  console.log(`📝 ${brand} raw text (first 300 chars):`, text.substring(0, 300));

  // Try to extract JSON
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) {
    console.log(`⚠️ ${brand}: no JSON array found in response`);
    return [];
  }

  try {
    const products = JSON.parse(match[0]);
    console.log(`🛍️ ${brand} parsed ${products.length} products, filtering by domain: ${domain}`);
    products.forEach(p => console.log(`  - ${p.name} | ${p.price} | ${p.url}`));

    const filtered = products.filter(p => p.url && p.url.includes(domain));
    console.log(`✅ ${brand}: ${filtered.length} passed domain filter`);
    return filtered.map(p => ({ ...p, brand, source: domain }));
  } catch(e) {
    console.log(`❌ ${brand}: JSON parse failed:`, e.message);
    return [];
  }
}

app.post("/api/search", async (req, res) => {
  const { brands, category, query } = req.body;
  if (!brands?.length) return res.status(400).json({ error: "brands required" });

  const categoryFilter = category && category !== "All" ? category : "";
  const searchQuery = query?.trim() || "handbag";

  console.log(`🔎 "${searchQuery}" | Brands: ${brands.join(", ")}`);

  const allProducts = [];

  for (let i = 0; i < brands.length; i++) {
    const brand = brands[i];
    try {
      console.log(`\n--- Searching ${brand} ---`);
      const products = await searchBrand(brand, searchQuery, categoryFilter);
      allProducts.push(...products);
    } catch (err) {
      console.error(`❌ ${brand} failed:`, err.message);
    }
    if (i < brands.length - 1) await sleep(2000);
  }

  console.log(`\n✅ Total returned: ${allProducts.length}`);
  res.json({ products: allProducts, count: allProducts.length });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, () => console.log(`✅ PriceHunt running on port ${PORT}`));
