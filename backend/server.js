require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");
const { scrapeAllBrands } = require("./scraper");

const app = express();
const PORT = process.env.PORT || 3001;

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

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/api/search", async (req, res) => {
  const { brands, category, query } = req.body;

  if (!brands || !Array.isArray(brands) || brands.length === 0) {
    return res.status(400).json({ error: "brands array is required" });
  }

  const categoryFilter = category && category !== "All" ? category : "";
  const searchQuery = query?.trim() || categoryFilter || "new arrivals";

  console.log(`🔎 Search: "${searchQuery}" | Brands: ${brands.join(", ")} | Category: ${categoryFilter || "All"}`);

  try {
    let products = await scrapeAllBrands(brands, searchQuery, 3);

    // Filter by category if specified
    if (categoryFilter) {
      const filtered = products.filter(
        (p) => p.category?.toLowerCase() === categoryFilter.toLowerCase()
      );
      // Fall back to all results if category filter returns nothing
      products = filtered.length > 0 ? filtered : products;
    }

    console.log(`✅ Total products returned: ${products.length}`);
    res.json({ products, count: products.length });

  } catch (err) {
    console.error("Scrape error:", err.message);
    res.status(500).json({ error: "Search failed. Please try again." });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ PriceHunt running on port ${PORT}`);
});
