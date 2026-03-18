const puppeteer = require("puppeteer");

const BRAND_URLS = {
  "Guess":           (q) => `https://www.guess.com/en-us/search?q=${encodeURIComponent(q)}`,
  "Michael Kors":    (q) => `https://www.michaelkors.com/search#q=${encodeURIComponent(q)}&start=0`,
  "Calvin Klein":    (q) => `https://www.calvinklein.us/search?q=${encodeURIComponent(q)}`,
  "Tommy Hilfiger":  (q) => `https://usa.tommy.com/en/search?q=${encodeURIComponent(q)}`,
  "Adidas":          (q) => `https://www.adidas.com/us/search?q=${encodeURIComponent(q)}`,
  "Nike":            (q) => `https://www.nike.com/w?q=${encodeURIComponent(q)}&vst=${encodeURIComponent(q)}`,
};

const BRAND_DOMAINS = {
  "Guess":           "https://www.guess.com",
  "Michael Kors":    "https://www.michaelkors.com",
  "Calvin Klein":    "https://www.calvinklein.us",
  "Tommy Hilfiger":  "https://usa.tommy.com",
  "Adidas":          "https://www.adidas.com",
  "Nike":            "https://www.nike.com",
};

let browser = null;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
    browser = await puppeteer.launch({
      headless: "new",
      executablePath,
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
  const urlFn = BRAND_URLS[brandName];
  const domain = BRAND_DOMAINS[brandName];
  if (!urlFn) return [];

  const url = urlFn(query);
  console.log(`🔍 Scraping ${brandName}: ${url}`);

  let page = null;
  try {
    const b = await getBrowser();
    page = await b.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Block heavy resources to speed up
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (["media", "font"].includes(req.resourceType())) req.abort();
      else req.continue();
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });

    // Wait for page to settle
    await new Promise((r) => setTimeout(r, 4000));

    // Generic smart extraction — finds any anchor with a price nearby
    const products = await page.evaluate((domain, brandName) => {
      const results = [];
      const seen = new Set();

      // Strategy 1: find all links that look like product pages
      const allLinks = Array.from(document.querySelectorAll("a[href]"));
      
      for (const link of allLinks) {
        const href = link.getAttribute("href") || "";
        
        // Skip navigation, social, external non-product links
        if (!href || href.startsWith("http") && !href.includes(domain.replace("https://", ""))) continue;
        if (href.includes("javascript:") || href === "#") continue;
        if (href.includes("/help") || href.includes("/about") || href.includes("/account") || 
            href.includes("/cart") || href.includes("/login") || href.includes("/wishlist") ||
            href.includes("/category") || href.includes("/en-us/c/") || href.includes("/collection")) continue;

        const card = link.closest("li, article, div[class*='product'], div[class*='Product'], div[class*='tile'], div[class*='Tile'], div[class*='card'], div[class*='Card'], div[class*='item'], div[class*='Item']") || link;

        const fullUrl = href.startsWith("http") ? href : domain + href;

        // Avoid duplicates
        if (seen.has(fullUrl)) continue;

        // Find price anywhere in/near the card
        const cardText = card.innerText || "";
        const priceMatch = cardText.match(/\$\s*[\d,]+\.?\d*/g);
        if (!priceMatch) continue;

        // Find product name
        const nameEl = card.querySelector("h1,h2,h3,h4,p[class*='name'],p[class*='Name'],p[class*='title'],span[class*='name'],span[class*='Name'],span[class*='title'],div[class*='name'],div[class*='Name'],div[class*='title']");
        const name = nameEl?.innerText?.trim() || link.innerText?.trim() || "";
        if (!name || name.length < 3 || name.length > 120) continue;
        if (name.toLowerCase().includes("view all") || name.toLowerCase().includes("see all") || name.toLowerCase().includes("shop")) continue;

        // Find image
        const img = card.querySelector("img");
        const image = img?.src || img?.dataset?.src || img?.dataset?.lazySrc || null;

        const price = priceMatch[0];
        const originalPrice = priceMatch.length > 1 ? priceMatch[0] : null;
        const salePrice = priceMatch.length > 1 ? priceMatch[priceMatch.length - 1] : priceMatch[0];

        seen.add(fullUrl);
        results.push({
          name: name.split("\n")[0].trim(),
          price: salePrice,
          originalPrice: priceMatch.length > 1 ? originalPrice : null,
          sale: priceMatch.length > 1,
          url: fullUrl,
          image: image && image.startsWith("http") ? image : null,
        });

        if (results.length >= 8) break;
      }

      return results;
    }, domain, brandName);

    console.log(`✅ ${brandName}: found ${products.length} products`);

    return products.slice(0, maxProducts).map((p) => ({
      brand: brandName,
      name: p.name,
      price: p.price,
      originalPrice: p.originalPrice,
      sale: p.sale,
      url: p.url,
      image: p.image,
      category: inferCategory(p.name),
      source: new URL(url).hostname.replace("www.", ""),
    }));

  } catch (err) {
    console.error(`❌ ${brandName} scrape failed:`, err.message);
    return [];
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

function inferCategory(name) {
  if (!name) return "Fashion";
  const n = name.toLowerCase();
  if (n.includes("bag") || n.includes("tote") || n.includes("purse") || n.includes("handbag") || n.includes("clutch") || n.includes("wallet") || n.includes("satchel") || n.includes("crossbody")) return "Bags";
  if (n.includes("shoe") || n.includes("sneaker") || n.includes("boot") || n.includes("sandal") || n.includes("loafer") || n.includes("heel") || n.includes("runner") || n.includes("trainer")) return "Shoes";
  if (n.includes("jacket") || n.includes("coat") || n.includes("puffer") || n.includes("hoodie") || n.includes("sweatshirt") || n.includes("blazer")) return "Jackets";
  if (n.includes("shirt") || n.includes("tee") || n.includes("polo") || n.includes("top") || n.includes("blouse") || n.includes("dress") || n.includes("jeans") || n.includes("pant") || n.includes("short") || n.includes("skirt")) return "Clothing";
  if (n.includes("watch") || n.includes("belt") || n.includes("hat") || n.includes("cap") || n.includes("scarf") || n.includes("sunglass") || n.includes("jewel") || n.includes("bracelet") || n.includes("necklace")) return "Accessories";
  return "Fashion";
}

async function scrapeAllBrands(brands, query, maxPerBrand = 3) {
  const results = [];
  // Scrape 2 brands at a time to avoid memory issues
  for (let i = 0; i < brands.length; i += 2) {
    const chunk = brands.slice(i, i + 2);
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
