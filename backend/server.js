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
  max: 30,
  message: { error: "Too many requests. Please wait a few minutes." },
}));

const frontendDist = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendDist));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Official brand domains for URL validation
const OFFICIAL_DOMAINS = {
  "Guess":          "guess.com",
  "Michael Kors":   "michaelkors.com",
  "Calvin Klein":   "calvinklein",
  "Tommy Hilfiger": "tommy.com",
  "Adidas":         "adidas.com",
  "Nike":           "nike.com",
};

app.post("/api/search", async (req, res) => {
  const { brands, category, query } = req.body;
  if (!brands?.length) return res.status(400).json({ error: "brands required" });

  const categoryFilter = category && category !== "All" ? category : "";
  const searchQuery = query?.trim() || categoryFilter || "bestsellers";

  console.log(`🔎 "${searchQuery}" | Brands: ${brands.join(", ")}`);

  // Search one brand at a time with web search to get real URLs
  const systemPrompt = `You are a fashion product search assistant with web search access.

STRICT RULES:
1. Use web search to find products. Search each brand separately.
2. ONLY return URLs that you actually found in search results — never construct or guess URLs.
3. Every URL must be from the brand's official website domain.
4. If you cannot find a real product URL for a brand, skip that brand entirely.
5. Verify the product exists by checking search result snippets before including it.

For each product found return:
- brand: string
- name: string (exact product name from search result)
- price: string (exact price from search result, e.g. "$89.99")
- category: string (Bags/Shoes/Clothing/Accessories/Jackets)
- description: string (one sentence from the search result)
- url: string (EXACT URL from search results — must be from official brand site)
- sale: boolean
- originalPrice: string (if on sale)
- source: string (domain, e.g. "guess.com")

Return ONLY a valid JSON array. No markdown. No explanations. Skip any product where you are not 100% sure the URL is real and correct.`;

  const userMsg = `Search for "${searchQuery}" ${categoryFilter ? `in category ${categoryFilter}` : ""} from these brands: ${brands.join(", ")}.

For each brand, search: site:[official-domain] ${searchQuery}
Official domains: ${brands.map(b => `${b} → ${OFFICIAL_DOMAINS[b] || b.toLowerCase() + ".com"}`).join(", ")}

Only return products with URLs you actually found in search results. Find 2-3 per brand.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 5000,
      system: systemPrompt,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: userMsg }],
    });

    const text = response.content.filter(b => b.type === "text").map(b => b.text).join("");
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return res.status(502).json({ error: "No results found. Try a different search." });

    const products = JSON.parse(match[0]);

    // Hard filter: only keep products whose URL contains the official domain
    const verified = products.filter(p => {
      if (!p.url || !p.brand) return false;
      const domain = OFFICIAL_DOMAINS[p.brand];
      return domain && p.url.includes(domain);
    });

    console.log(`✅ ${verified.length} verified products (${products.length} raw)`);
    res.json({ products: verified, count: verified.length });

  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: "Search failed: " + err.message });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, () => console.log(`✅ PriceHunt running on port ${PORT}`));
