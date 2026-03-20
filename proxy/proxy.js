// CostcoHunt Local Proxy
// Run this on your Windows machine: node proxy.js
// Keeps running in the background and forwards Costco requests from your browser
// Your home IP is not blocked by Costco — datacenter IPs are

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = 3333;

app.use(cors()); // Allow requests from your browser
app.use(express.json());

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Referer": "https://www.costco.com/",
  "Cache-Control": "no-cache",
};

const CATEGORY_URLS = {
  "All":            "https://www.costco.com/savings-event.html",
  "Electronics":    "https://www.costco.com/electronics.html",
  "Clothing":       "https://www.costco.com/clothing.html",
  "Food & Grocery": "https://www.costco.com/grocery.html",
  "Home & Garden":  "https://www.costco.com/home-garden.html",
  "Appliances":     "https://www.costco.com/appliances.html",
  "Jewelry":        "https://www.costco.com/jewelry.html",
  "Toys":           "https://www.costco.com/toys-games.html",
  "Health & Beauty":"https://www.costco.com/health-beauty.html",
};

app.get("/health", (req, res) => res.json({ status: "ok", message: "CostcoHunt proxy running!" }));

app.get("/products", async (req, res) => {
  const category = req.query.category || "All";
  const query = req.query.q || "";

  try {
    let url;
    if (query) {
      url = `https://www.costco.com/CatalogSearch?keyword=${encodeURIComponent(query)}&pageSize=24`;
    } else {
      url = CATEGORY_URLS[category] || CATEGORY_URLS["All"];
    }

    console.log(`🔍 Fetching: ${url}`);
    const response = await fetch(url, { headers: HEADERS, timeout: 20000 });
    console.log(`📄 Status: ${response.status}`);

    if (!response.ok) {
      return res.status(response.status).json({ error: `Costco returned ${response.status}` });
    }

    const html = await response.text();
    console.log(`📄 Got ${html.length} bytes`);

    const products = parseProducts(html, url);
    console.log(`✅ Parsed ${products.length} products`);

    res.json({ products, pageUrl: url, category, query });
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

function parseProducts(html, pageUrl) {
  const products = [];
  const seen = new Set();

  // Try to extract embedded JSON first (most reliable)
  // Costco embeds product data as JSON in script tags
  const patterns = [
    /window\.__INITIAL_STATE__\s*=\s*({.+?});\s*<\/script>/s,
    /window\.searchResults\s*=\s*({.+?});\s*<\/script>/s,
    /"catalogEntryView"\s*:\s*(\[.+?\])\s*[,}]/s,
    /var\s+catalogEntries\s*=\s*(\[.+?\])\s*;/s,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        const data = JSON.parse(match[1]);
        const items = data?.catalog?.products ||
          data?.search?.catalogEntryView ||
          data?.catalogEntryView ||
          (Array.isArray(data) ? data : []);

        for (const item of items.slice(0, 16)) {
          const product = extractProduct(item);
          if (product) products.push(product);
        }
        if (products.length > 0) {
          console.log(`✅ Extracted from JSON pattern`);
          return products;
        }
      } catch (e) {}
    }
  }

  // Fallback: find product URLs in HTML
  const urlRegex = /href="(https:\/\/www\.costco\.com\/[^"]+\.product\.\d+\.html)"/g;
  let match;
  while ((match = urlRegex.exec(html)) !== null) {
    const productUrl = match[1];
    if (seen.has(productUrl)) continue;
    seen.add(productUrl);

    const idx = html.indexOf(match[0]);
    const chunk = html.substring(Math.max(0, idx - 1000), idx + 300);
    const clean = chunk.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const prices = clean.match(/\$[\d,]+\.?\d*/g);
    const itemNum = productUrl.match(/\.(\d+)\.html/)?.[1];

    // Get name from nearby text
    const nameMatch = chunk.match(/alt="([^"]{5,80})"/);
    const name = nameMatch?.[1] || clean.split(" ").filter(w =>
      w.length > 2 && !w.startsWith("$") && !/^\d+$/.test(w)
    ).slice(0, 8).join(" ");

    if (name && prices) {
      const p = parseFloat(prices[prices.length - 1].replace(/[$,]/g, ""));
      const o = prices.length > 1 ? parseFloat(prices[0].replace(/[$,]/g, "")) : null;
      products.push({
        name: name.trim().substring(0, 100),
        price: fmt(p),
        originalPrice: o && o > p ? fmt(o) : null,
        savings: o && o > p ? fmt(o - p) : null,
        url: productUrl,
        image: null,
        sale: !!(o && o > p),
        itemNumber: itemNum || null,
      });
    }
    if (products.length >= 16) break;
  }

  return products;
}

function extractProduct(item) {
  try {
    const name = item.name || item.shortDescription || item.title;
    if (!name || name.length < 3) return null;

    const itemId = item.partNumber || item.catalogEntryIdentifier?.uniqueID || item.itemNumber;
    const seoToken = (item.seo_token || item.urlKeyword || name)
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");

    const url = itemId
      ? `https://www.costco.com/${seoToken}.product.${itemId}.html`
      : null;
    if (!url) return null;

    const priceInfo = item.price?.[0] || {};
    const price = parseFloat(priceInfo.contractPrice || priceInfo.offerPrice || item.ourPrice || item.listPrice || 0);
    const original = parseFloat(priceInfo.listPrice || item.originalPrice || 0);
    if (!price) return null;

    const hasDiscount = original > price;
    const image = item.thumbnail
      ? (item.thumbnail.startsWith("http") ? item.thumbnail : `https://www.costco.com${item.thumbnail}`)
      : null;

    return {
      name,
      price: fmt(price),
      originalPrice: hasDiscount ? fmt(original) : null,
      savings: hasDiscount ? fmt(original - price) : null,
      url,
      image,
      sale: hasDiscount,
      itemNumber: itemId || null,
    };
  } catch (e) { return null; }
}

function fmt(num) {
  if (!num || isNaN(num)) return null;
  return `$${parseFloat(num).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

app.listen(PORT, () => {
  console.log(`\n✅ CostcoHunt Proxy running at http://localhost:${PORT}`);
  console.log(`   Your browser will use this to fetch Costco pages`);
  console.log(`   Keep this window open while using the app\n`);
});
