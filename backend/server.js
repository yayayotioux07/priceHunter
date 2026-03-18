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
  console.log("=== SEARCH REQUEST ===");
  console.log("Brands:", brands);
  console.log("Category:", category);
  console.log("Query:", query);

  if (!brands || !Array.isArray(brands) || brands.length === 0) {
    return res.status(400).json({ error: "brands array is required" });
  }

  const categoryFilter = category && category !== "All" ? category : "";
  const searchQuery = query?.trim() || categoryFilter || "new arrivals";

  try {
    console.log(`Starting scrape for: "${searchQuery}"`);
    const products = await scrapeAllBrands(brands, searchQuery, 3);
    console.log(`Scrape complete. Total products: ${products.length}`);
    console.log("Products:", JSON.stringify(products.slice(0, 2), null, 2));
    res.json({ products, count: products.length });
  } catch (err) {
    console.error("=== SCRAPE ERROR ===");
    console.error("Message:", err.message);
    console.error("Stack:", err.stack);
    res.status(500).json({ error: `Search failed: ${err.message}` });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ PriceHunt running on port ${PORT}`);
  // Test Puppeteer on startup
  const puppeteer = require("puppeteer");
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
  console.log("Puppeteer executable path:", executablePath || "default");
  puppeteer.launch({
    headless: "new",
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--single-process"],
  }).then(b => {
    console.log("✅ Puppeteer launched successfully");
    b.close();
  }).catch(e => {
    console.error("❌ Puppeteer launch FAILED:", e.message);
  });
});
