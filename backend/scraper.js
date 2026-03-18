const { chromium } = require("playwright");

const BRAND_URLS = {
  "Guess":          (q) => `https://www.guess.com/en-us/search?q=${encodeURIComponent(q)}`,
  "Michael Kors":   (q) => `https://www.michaelkors.com/search#q=${encodeURIComponent(q)}&start=0`,
  "Calvin Klein":   (q) => `https://www.calvinklein.us/search?q=${encodeURIComponent(q)}`,
  "Tommy Hilfiger": (q) => `https://usa.tommy.com/en/search?q=${encodeURIComponent(q)}`,
  "Adidas":         (q) => `https://www.adidas.com/us/search?q=${encodeURIComponent(q)}`,
  "Nike":           (q) => `https://www.nike.com/w?q=${encodeURIComponent(q)}&vst=${encodeURIComponent(q)}`,
};

const BRAND_DOMAINS = {
  "Guess":          "https://www.guess.com",
  "Michael Kors":   "https://www.michaelkors.com",
  "Calvin Klein":   "https://www.calvinklein.us",
  "Tommy Hilfiger": "https://usa.tommy.com",
  "Adidas":         "https://www.adidas.com",
  "Nike":           "https://www.nike.com",
};

let browser = null;

async function getBrowser() {
  if (!browser) {
    console.log("Launching Playwright Chromium...");
    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    console.log("✅ Browser launched");
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
    const context = await b.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    page = await context.newPage();

    // Block heavy resources
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["font", "media"].includes(type)) route.abort();
      else route.continue();
    });

    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(4000);

    const products = await page.evaluate((domain) => {
      const results = [];
      const seen = new Set();
      const allLinks = Array.from(document.querySelectorAll("a[href]"));

      for (const link of allLinks) {
        const href = link.getAttribute("href") || "";
        if (!href || href === "#" || href.includes("javascript:")) continue;
        if (href.startsWith("http") && !href.includes(domain.replace("https://www.", "").replace("https://", ""))) continue;
        if (["/help","/about","/account","/cart","/login","/wishlist","/c/","/collection","/stores","/sitemap"].some(s => href.includes(s))) continue;

        const card = link.closest("li,article,[class*='product'],[class*='Product'],[class*='tile'],[class*='Tile'],[class*='card'],[class*='Card'],[class*='item'],[class*='Item']") || link;
        const fullUrl = href.startsWith("http") ? href : domain + href;
        if (seen.has(fullUrl)) continue;

        const cardText = card.innerText || "";
        const priceMatch = cardText.match(/\$\s*[\d,]+\.?\d*/g);
        if (!priceMatch) continue;

        const nameEl = card.querySelector("h1,h2,h3,h4,[class*='name'],[class*='Name'],[class*='title'],[class*='Title']");
        const name = (nameEl?.innerText?.trim() || link.innerText?.trim() || "").split("\n")[0].trim();
        if (!name || name.length < 3 || name.length > 120) continue;
        if (["view all","see all","shop now","shop all"].some(s => name.toLowerCase().includes(s))) continue;

        const img = card.querySelector("img");
        const image = img?.src || img?.dataset?.src || null;

        seen.add(fullUrl);
        results.push({
          name,
          price: priceMatch[priceMatch.length - 1],
          originalPrice: priceMatch.length > 1 ? priceMatch[0] : null,
          sale: priceMatch.length > 1,
          url: fullUrl,
          image: image?.startsWith("http") ? image : null,
        });

        if (results.length >= 8) break;
      }
      return results;
    }, domain);

    await context.close();
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
    if (page) await page.close().catch(() => {});
    return [];
  }
}

function inferCategory(name) {
  if (!name) return "Fashion";
  const n = name.toLowerCase();
  if (n.match(/bag|tote|purse|handbag|clutch|wallet|satchel|crossbody/)) return "Bags";
  if (n.match(/shoe|sneaker|boot|sandal|loafer|heel|runner|trainer/)) return "Shoes";
  if (n.match(/jacket|coat|puffer|hoodie|sweatshirt|blazer/)) return "Jackets";
  if (n.match(/shirt|tee|polo|top|blouse|dress|jeans|pant|short|skirt/)) return "Clothing";
  if (n.match(/watch|belt|hat|cap|scarf|sunglass|jewel|bracelet|necklace/)) return "Accessories";
  return "Fashion";
}

async function scrapeAllBrands(brands, query, maxPerBrand = 3) {
  const results = [];
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
