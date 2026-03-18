const puppeteer = require("puppeteer");

// Brand scraper configurations
const SCRAPERS = {
  "Guess": {
    searchUrl: (q) => `https://www.guess.com/en-us/search?q=${encodeURIComponent(q)}`,
    waitFor: ".product-tile, .product-card, [class*='product']",
    extract: () => {
      const products = [];
      const tiles = document.querySelectorAll(".product-tile, .product-card, [class*='product-tile'], [class*='product-card']");
      tiles.forEach((tile) => {
        try {
          const name = tile.querySelector("[class*='name'], [class*='title'], h3, h2")?.innerText?.trim();
          const priceEl = tile.querySelector("[class*='price'], [class*='Price']");
          const price = priceEl?.innerText?.trim();
          const linkEl = tile.querySelector("a[href*='/en-us/']");
          const url = linkEl ? "https://www.guess.com" + linkEl.getAttribute("href") : null;
          const imgEl = tile.querySelector("img");
          const image = imgEl?.src || imgEl?.dataset?.src;
          if (name && price && url) products.push({ name, price, url, image });
        } catch (e) {}
      });
      return products;
    }
  },

  "Michael Kors": {
    searchUrl: (q) => `https://www.michaelkors.com/search#q=${encodeURIComponent(q)}&start=0`,
    waitFor: ".product-tile, [class*='ProductTile'], [class*='product-card']",
    extract: () => {
      const products = [];
      const tiles = document.querySelectorAll("[class*='ProductTile'], [class*='product-tile'], [class*='product-card']");
      tiles.forEach((tile) => {
        try {
          const name = tile.querySelector("[class*='name'], [class*='title'], [class*='Name']")?.innerText?.trim();
          const price = tile.querySelector("[class*='price'], [class*='Price']")?.innerText?.trim();
          const linkEl = tile.querySelector("a");
          const href = linkEl?.getAttribute("href");
          const url = href ? (href.startsWith("http") ? href : "https://www.michaelkors.com" + href) : null;
          const imgEl = tile.querySelector("img");
          const image = imgEl?.src || imgEl?.dataset?.src;
          if (name && price && url) products.push({ name, price, url, image });
        } catch (e) {}
      });
      return products;
    }
  },

  "Calvin Klein": {
    searchUrl: (q) => `https://www.calvinklein.us/search?q=${encodeURIComponent(q)}`,
    waitFor: "[class*='product'], [class*='Product']",
    extract: () => {
      const products = [];
      const tiles = document.querySelectorAll("[class*='product-tile'], [class*='ProductCard'], [class*='product-card']");
      tiles.forEach((tile) => {
        try {
          const name = tile.querySelector("[class*='name'], [class*='title'], [class*='Name']")?.innerText?.trim();
          const price = tile.querySelector("[class*='price'], [class*='Price']")?.innerText?.trim();
          const linkEl = tile.querySelector("a");
          const href = linkEl?.getAttribute("href");
          const url = href ? (href.startsWith("http") ? href : "https://www.calvinklein.us" + href) : null;
          const imgEl = tile.querySelector("img");
          const image = imgEl?.src || imgEl?.dataset?.src;
          if (name && price && url) products.push({ name, price, url, image });
        } catch (e) {}
      });
      return products;
    }
  },

  "Tommy Hilfiger": {
    searchUrl: (q) => `https://usa.tommy.com/en/search?q=${encodeURIComponent(q)}`,
    waitFor: "[class*='product'], [class*='Product']",
    extract: () => {
      const products = [];
      const tiles = document.querySelectorAll("[class*='product-tile'], [class*='ProductCard'], [class*='product-card'], [class*='plp-tile']");
      tiles.forEach((tile) => {
        try {
          const name = tile.querySelector("[class*='name'], [class*='title'], [class*='Name']")?.innerText?.trim();
          const price = tile.querySelector("[class*='price'], [class*='Price']")?.innerText?.trim();
          const linkEl = tile.querySelector("a");
          const href = linkEl?.getAttribute("href");
          const url = href ? (href.startsWith("http") ? href : "https://usa.tommy.com" + href) : null;
          const imgEl = tile.querySelector("img");
          const image = imgEl?.src || imgEl?.dataset?.src;
          if (name && price && url) products.push({ name, price, url, image });
        } catch (e) {}
      });
      return products;
    }
  },

  "Adidas": {
    searchUrl: (q) => `https://www.adidas.com/us/search?q=${encodeURIComponent(q)}`,
    waitFor: "[class*='product-card'], [data-testid*='product']",
    extract: () => {
      const products = [];
      const tiles = document.querySelectorAll("[class*='product-card'], [data-testid='product-card'], [class*='glass-product-card']");
      tiles.forEach((tile) => {
        try {
          const name = tile.querySelector("[class*='name'], [class*='title'], [data-testid*='name']")?.innerText?.trim();
          const price = tile.querySelector("[class*='price'], [data-testid*='price']")?.innerText?.trim();
          const linkEl = tile.querySelector("a");
          const href = linkEl?.getAttribute("href");
          const url = href ? (href.startsWith("http") ? href : "https://www.adidas.com" + href) : null;
          const imgEl = tile.querySelector("img");
          const image = imgEl?.src || imgEl?.dataset?.src;
          if (name && price && url) products.push({ name, price, url, image });
        } catch (e) {}
      });
      return products;
    }
  },

  "Nike": {
    searchUrl: (q) => `https://www.nike.com/w?q=${encodeURIComponent(q)}&vst=${encodeURIComponent(q)}`,
    waitFor: "[class*='product-card'], [data-testid='product-card']",
    extract: () => {
      const products = [];
      const tiles = document.querySelectorAll("[class*='product-card__body'], [data-testid='product-card']");
      tiles.forEach((tile) => {
        try {
          const name = tile.querySelector("[class*='product-card__title'], [class*='name']")?.innerText?.trim();
          const price = tile.querySelector("[class*='product-price'], [class*='price']")?.innerText?.trim();
          const linkEl = tile.closest("a") || tile.querySelector("a");
          const href = linkEl?.getAttribute("href");
          const url = href ? (href.startsWith("http") ? href : "https://www.nike.com" + href) : null;
          const imgEl = tile.querySelector("img");
          const image = imgEl?.src || imgEl?.dataset?.src;
          if (name && price && url) products.push({ name, price, url, image });
        } catch (e) {}
      });
      return products;
    }
  }
};

let browser = null;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch({
      headless: "new",
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-extensions",
      ],
    });
  }
  return browser;
}

async function scrapeBrand(brandName, query, maxProducts = 4) {
  const config = SCRAPERS[brandName];
  if (!config) return [];

  const url = config.searchUrl(query);
  console.log(`🔍 Scraping ${brandName}: ${url}`);

  let page = null;
  try {
    const b = await getBrowser();
    page = await b.newPage();

    // Block images/fonts/css to speed up loading
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const type = req.resourceType();
      if (["image", "font", "media"].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Wait for products to appear
    try {
      await page.waitForSelector(config.waitFor, { timeout: 15000 });
    } catch (e) {
      console.warn(`⚠️ ${brandName}: selector not found, trying anyway`);
    }

    // Small extra wait for JS to finish rendering prices
    await new Promise((r) => setTimeout(r, 2000));

    // Extract products from DOM
    const products = await page.evaluate(config.extract);

    console.log(`✅ ${brandName}: found ${products.length} products`);

    return products.slice(0, maxProducts).map((p) => ({
      brand: brandName,
      name: p.name,
      price: cleanPrice(p.price),
      url: p.url,
      image: p.image || null,
      category: inferCategory(p.name),
      description: "",
      sale: isSale(p.price),
      originalPrice: extractOriginalPrice(p.price),
      source: new URL(url).hostname.replace("www.", ""),
    }));

  } catch (err) {
    console.error(`❌ ${brandName} scrape failed:`, err.message);
    return [];
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

function cleanPrice(raw) {
  if (!raw) return null;
  // Get the first price-like string
  const match = raw.match(/\$[\d,]+\.?\d*/);
  return match ? match[0] : raw.split("\n")[0].trim();
}

function extractOriginalPrice(raw) {
  if (!raw) return null;
  const prices = raw.match(/\$[\d,]+\.?\d*/g);
  if (prices && prices.length > 1) return prices[0];
  return null;
}

function isSale(raw) {
  if (!raw) return false;
  const prices = raw.match(/\$[\d,]+\.?\d*/g);
  return prices && prices.length > 1;
}

function inferCategory(name) {
  if (!name) return "Fashion";
  const n = name.toLowerCase();
  if (n.includes("bag") || n.includes("tote") || n.includes("purse") || n.includes("handbag") || n.includes("clutch") || n.includes("wallet")) return "Bags";
  if (n.includes("shoe") || n.includes("sneaker") || n.includes("boot") || n.includes("sandal") || n.includes("loafer") || n.includes("heel")) return "Shoes";
  if (n.includes("jacket") || n.includes("coat") || n.includes("puffer") || n.includes("hoodie") || n.includes("sweatshirt")) return "Jackets";
  if (n.includes("shirt") || n.includes("tee") || n.includes("polo") || n.includes("top") || n.includes("blouse") || n.includes("dress") || n.includes("jeans") || n.includes("pant") || n.includes("short")) return "Clothing";
  if (n.includes("watch") || n.includes("belt") || n.includes("hat") || n.includes("cap") || n.includes("scarf") || n.includes("sunglass")) return "Accessories";
  return "Fashion";
}

async function scrapeAllBrands(brands, query, maxPerBrand = 3) {
  // Scrape brands in parallel (max 3 at a time to avoid overload)
  const results = [];
  const chunks = [];
  for (let i = 0; i < brands.length; i += 3) {
    chunks.push(brands.slice(i, i + 3));
  }
  for (const chunk of chunks) {
    const settled = await Promise.allSettled(
      chunk.map((brand) => scrapeBrand(brand, query, maxPerBrand))
    );
    settled.forEach((r) => {
      if (r.status === "fulfilled") results.push(...r.value);
    });
  }
  return results;
}

module.exports = { scrapeAllBrands, scrapeBrand };
