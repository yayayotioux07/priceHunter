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

// Rate limiting — 30 requests per 10 minutes per IP
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: { error: "Too many requests. Please wait a few minutes and try again." },
});
app.use("/api/", limiter);

// Serve built frontend static files
const frontendDist = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendDist));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Main search endpoint
app.post("/api/search", async (req, res) => {
  const { brands, category, query } = req.body;

  if (!brands || !Array.isArray(brands) || brands.length === 0) {
    return res.status(400).json({ error: "brands array is required" });
  }

  const categoryFilter = category && category !== "All" ? category : "";
  const productQuery = query?.trim() || categoryFilter || "popular products";

  const systemPrompt = `You are a fashion product pricing assistant. When given brand names and a product query, use web search to find REAL, CURRENT products with their actual prices from official brand websites or major retailers.

Return a JSON array of products. Each product must have:
- brand: string (brand name)
- name: string (product name)
- price: string (e.g. "$129.99" or "$89 - $149")
- category: string (e.g. Bags, Shoes, Clothing, Accessories)
- description: string (1 short sentence)
- url: string (direct product URL if found, else brand homepage)
- sale: boolean (true if on sale)
- originalPrice: string (only if on sale, the original price, otherwise omit)

Return ONLY valid JSON array, no markdown, no explanation. Find at least 2-3 products per brand if possible. Prioritize results from official brand websites.`;

  const userMessage = `Search for ${categoryFilter ? categoryFilter + " " : ""}products matching "${productQuery}" from these brands: ${brands.join(", ")}. Find real products with actual current prices.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
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

// All other routes serve the React app
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ PriceHunt running on port ${PORT}`);
});
