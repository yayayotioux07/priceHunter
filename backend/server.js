require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
const PORT = process.env.PORT || 3001;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.set("trust proxy", 1);
app.use(express.json());
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));

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

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Sale page URLs per brand per category
const SALE_URLS = {
  "Guess": {
    "All":        "https://www.guess.com/en-us/guess/women/sale/",
    "Bags":       "https://www.guess.com/en-us/guess/women/sale/handbags/",
    "Shoes":      "https://www.guess.com/en-us/guess/women/sale/shoes/",
    "Clothing":   "https://www.guess.com/en-us/guess/women/sale/clothing/",
    "Accessories":"https://www.guess.com/en-us/guess/women/sale/accessories/",
    "Jackets":    "https://www.guess.com/en-us/guess/women/sale/clothing/jackets-coats/",
  },
  "Michael Kors": {
    "All":        "https://www.michaelkors.com/sale/",
    "Bags":       "https://www.michaelkors.com/sale/handbags/",
    "Shoes":      "https://www.michaelkors.com/sale/shoes/",
    "Clothing":   "https://www.michaelkors.com/sale/clothing/",
    "Accessories":"https://www.michaelkors.com/sale/accessories/",
    "Jackets":    "https://www.michaelkors.com/sale/clothing/coats-jackets/",
  },
  "Calvin Klein": {
    "All":        "https://www.calvinklein.us/sale/",
    "Bags":       "https://www.calvinklein.us/sale/bags-and-accessories/bags/",
    "Shoes":      "https://www.calvinklein.us/sale/shoes/",
    "Clothing":   "https://www.calvinklein.us/sale/womens-clothing/",
    "Accessories":"https://www.calvinklein.us/sale/bags-and-accessories/",
    "Jackets":    "https://www.calvinklein.us/sale/womens-clothing/jackets-and-coats/",
  },
  "Tommy Hilfiger": {
    "All":        "https://usa.tommy.com/en/sale/",
    "Bags":       "https://usa.tommy.com/en/sale/bags/",
    "Shoes":      "https://usa.tommy.com/en/sale/shoes/",
    "Clothing":   "https://usa.tommy.com/en/sale/womens-clothing/",
    "Accessories":"https://usa.tommy.com/en/sale/accessories/",
    "Jackets":    "https://usa.tommy.com/en/sale/womens-clothing/jackets-coats/",
  },
  "Adidas": {
    "All":        "https://www.adidas.com/us/sale",
    "Bags":       "https://www.adidas.com/us/bags-and-backpacks-sale",
    "Shoes":      "https://www.adidas.com/us/shoes-sale",
    "Clothing":   "https://www.adidas.com/us/clothing-sale",
    "Accessories":"https://www.adidas.com/us/accessories-sale",
    "Jackets":    "https://www.adidas.com/us/jackets-sale",
  },
  "Nike": {
    "All":        "https://www.nike.com/w/sale-3yaep",
    "Bags":       "https://www.nike.com/w/sale-bags-accessories-3yaepzy11j",
    "Shoes":      "https://www.nike.com/w/sale-shoes-3yaepznik1",
    "Clothing":   "https://www.nike.com/w/sale-clothing-3yaepz6ymx6",
    "Accessories":"https://www.nike.com/w/sale-bags-accessories-3yaepzy11j",
    "Jackets":    "https://www.nike.com/w/sale-jackets-vests-3yaepz9om13",
  },
};

const OFFICIAL_DOMAINS = {
  "Guess":          "guess.com",
  "Michael Kors":   "michaelkors.com",
  "Calvin Klein":   "calvinklein.us",
  "Tommy Hilfiger": "tommy.com",
  "Adidas":         "adidas.com",
  "Nike":           "nike.com",
};

// Global queue to serialize requests and avoid rate limits
let isSearching = false;
const searchQueue = [];

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    searchQueue.push({ resolve, reject, fn });
    if (!isSearching) processQueue();
  });
}

async function processQueue() {
  if (isSearching || searchQueue.length === 0) return;
  isSearching = true;
  const { resolve, reject, fn } = searchQueue.shift();
  try { resolve(await fn()); }
  catch(e) { reject(e); }
  finally { isSearching = false; processQueue(); }
}

async function searchBrand(brand, category, queryHint) {
  const domain = OFFICIAL_DOMAINS[brand];
  const saleUrl = SALE_URLS[brand]?.[category] || SALE_URLS[brand]?.["All"];

  const systemPrompt = `You are a shopping assistant finding sale products. Use web_search to look up products on the sale page provided.
Return ONLY a raw JSON array (no markdown, no backticks) with 3 items max.
Each item must have: name, price (sale price e.g. "$49.99"), originalPrice (original price e.g. "$89.00"), url (full https:// URL from ${domain}), category, description (one sentence).
All fields "sale" must be true. URLs must be from ${domain}.
Only include products actually found in search results.`;

  const userMsg = `Search this sale page and find ${queryHint ? `products matching "${queryHint}"` : "sale products"}: ${saleUrl}
Return 3 real sale products with their discounted prices and original prices from ${domain}.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1200,
    system: systemPrompt,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: userMsg }],
  });

  const text = response.content.filter(b => b.type === "text").map(b => b.text).join("");
  console.log(`📝 ${brand}: ${text.substring(0, 200)}`);

  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) return [];

  const products = JSON.parse(match[0]);
  return products
    .filter(p => p.url && p.url.includes(domain))
    .map(p => ({ ...p, brand, source: domain, sale: true, salePageUrl: saleUrl }));
}

app.post("/api/search", async (req, res) => {
  const { brands, category, query } = req.body;
  if (!brands?.length) return res.status(400).json({ error: "brands required" });

  const cat = category && category !== "All" ? category : "All";
  const queryHint = query?.trim() || "";

  console.log(`🔎 Category: ${cat} | Query: "${queryHint}" | Brands: ${brands.join(", ")}`);

  const results = await enqueue(async () => {
    const all = [];
    for (let i = 0; i < brands.length; i++) {
      const brand = brands[i];
      try {
        console.log(`🔍 Searching ${brand} sale...`);
        const products = await searchBrand(brand, cat, queryHint);
        console.log(`✅ ${brand}: ${products.length} sale products`);
        all.push(...products);
      } catch (err) {
        console.error(`❌ ${brand}:`, err.message.substring(0, 100));
      }
      if (i < brands.length - 1) await sleep(5000);
    }
    return all;
  });

  console.log(`✅ Total: ${results.length}`);
  res.json({ products: results, count: results.length });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, () => console.log(`✅ PriceHunt running on port ${PORT}`));
