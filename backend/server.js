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

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: { error: "Too many requests. Please wait a few minutes and try again." },
});
app.use("/api/", limiter);

const frontendDist = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendDist));

const BRAND_OFFICIAL = {
  "Guess": "guess.com",
  "Michael Kors": "michaelkors.com",
  "Calvin Klein": "calvinklein.com",
  "Tommy Hilfiger": "tommy.com",
  "Adidas": "adidas.com",
  "Nike": "nike.com",
};

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/api/search", async (req, res) => {
  const { brands, category, query } = req.body;

  if (!brands || !Array.isArray(brands) || brands.length === 0) {
    return res.status(400).json({ error: "brands array is required" });
  }

  const categoryFilter = category && category !== "All" ? category : "";
  const productQuery = query?.trim() || categoryFilter || "popular products";

  const systemPrompt = `You are a fashion deal-finding assistant. For each product you find, you must gather TWO prices:
1. The LOWEST price available anywhere online (outlets, discount retailers, department stores, brand site, etc.)
2. The OFFICIAL price from the brand's own website

Search across retailers like: 6pm.com, nordstromrack.com, macys.com, zappos.com, amazon.com, shopbop.com, bloomingdales.com, saks.com, nordstrom.com, and the official brand sites.

Return a JSON array of products. Each product must have:
- brand: string (brand name)
- name: string (product name)
- category: string (e.g. Bags, Shoes, Clothing, Accessories)
- description: string (1 short sentence about the product)
- sale: boolean (true if any discount exists anywhere)
- originalPrice: string (original MSRP if discounted, otherwise omit)

- bestPrice: string (the LOWEST price found anywhere, e.g. "$41.74")
- bestRetailer: string (name of store with lowest price, e.g. "6pm.com")
- bestUrl: string (direct link to product at the cheapest retailer)

- officialPrice: string (price on the brand's own website, e.g. "$98.00")
- officialUrl: string (direct link to product on the official brand website)

CRITICAL: bestUrl must link to the actual page with the lowest price. officialUrl must link to the official brand website product page. If you cannot find one of them, set it to the brand homepage.

Return ONLY a valid JSON array, no markdown, no explanation. Find 2-3 products per brand.`;

  const userMessage = `Find products matching "${productQuery}" ${categoryFilter ? "in category: " + categoryFilter : ""} from these brands: ${brands.join(", ")}. For each product find: (1) the lowest price anywhere online with a direct link, and (2) the official brand website price and link. Official domains: ${brands.map(b => `${b} -> ${BRAND_OFFICIAL[b] || b.toLowerCase() + ".com"}`).join(", ")}.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 5000,
      system: systemPrompt,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: userMessage }],
    });

    const textContent = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const jsonMatch = textContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return res.status(502).json({ error: "No product data returned. Try a different search." });
    }

    const products = JSON.parse(jsonMatch[0]);
    res.json({ products, count: products.length });

  } catch (err) {
    console.error("Anthropic API error:", err.message);
    if (err.status === 401) {
      return res.status(500).json({ error: "Invalid API key. Check your ANTHROPIC_API_KEY environment variable." });
    }
    res.status(500).json({ error: "Search failed. Please try again." });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ PriceHunt running on port ${PORT}`);
});
