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
  console.log(`🔎 Search: "${query}" | Brands: ${brands?.join(", ")} | Category: ${category}`);

  if (!brands || !Array.isArray(brands) || brands.length === 0) {
    return res.status(400).json({ error: "brands array is required" });
  }

  const categoryFilter = category && category !== "All" ? category : "";
  const searchQuery = query?.trim() || categoryFilter || "new arrivals";

  try {
    const products = await scrapeAllBrands(brands, searchQuery, 3);

    let filtered = products;
    if (categoryFilter) {
      const byCat = products.filter(p => p.category?.toLowerCase() === categoryFilter.toLowerCase());
      filtered = byCat.length > 0 ? byCat : products;
    }

    console.log(`✅ Total products returned: ${filtered.length}`);
    res.json({ products: filtered, count: filtered.length });
  } catch (err) {
    console.error("Search error:", err.message);
    res.status(500).json({ error: `Search failed: ${err.message}` });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ PriceHunt running on port ${PORT}`);
});
