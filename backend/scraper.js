const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const BRAND_URLS = {
  "guess":          (q) => `https://www.guess.com/en-us/guess/women/sale/${q ? "?q=" + encodeURIComponent(q) : ""}`,
  "michael_kors":   (q) => `https://www.michaelkors.com/sale/`,
  "calvin_klein":   (q) => `https://www.calvinklein.us/sale/`,
  "tommy_hilfiger": (q) => `https://usa.tommy.com/en/sale/`,
  "adidas":         (q) => `https://www.adidas.com/us/sale`,
  "nike":           (q) => `https://www.nike.com/w/sale-3yaep`,
};

const SALE_URLS = {
  "guess": {
    "All":         "https://www.guess.com/en-us/guess/women/sale/",
    "Bags":        "https://www.guess.com/en-us/guess/women/sale/handbags/",
    "Shoes":       "https://www.guess.com/en-us/guess/women/sale/shoes/",
    "Clothing":    "https://www.guess.com/en-us/guess/women/sale/clothing/",
    "Accessories": "https://www.guess.com/en-us/guess/women/sale/accessories/",
    "Jackets":     "https://www.guess.com/en-us/guess/women/sale/clothing/jackets-coats/",
    "Sneakers":    "https://www.guess.com/en-us/guess/women/sale/shoes/sneakers/",
  },
  "michael_kors": {
    "All":         "https://www.michaelkors.com/sale/",
    "Bags":        "https://www.michaelkors.com/sale/handbags/",
    "Shoes":       "https://www.michaelkors.com/sale/shoes/",
    "Clothing":    "https://www.michaelkors.com/sale/clothing/",
    "Accessories": "https://www.michaelkors.com/sale/accessories/",
    "Jackets":     "https://www.michaelkors.com/sale/clothing/coats-jackets/",
    "Sneakers":    "https://www.michaelkors.com/sale/shoes/sneakers/",
  },
  "calvin_klein": {
    "All":         "https://www.calvinklein.us/sale/",
    "Bags":        "https://www.calvinklein.us/sale/bags-and-accessories/bags/",
    "Shoes":       "https://www.calvinklein.us/sale/shoes/",
    "Clothing":    "https://www.calvinklein.us/sale/womens-clothing/",
    "Accessories": "https://www.calvinklein.us/sale/bags-and-accessories/",
    "Jackets":     "https://www.calvinklein.us/sale/womens-clothing/jackets-and-coats/",
    "Sneakers":    "https://www.calvinklein.us/sale/shoes/sneakers/",
  },
  "tommy_hilfiger": {
    "All":         "https://usa.tommy.com/en/sale/",
    "Bags":        "https://usa.tommy.com/en/sale/bags/",
    "Shoes":       "https://usa.tommy.com/en/sale/shoes/",
    "Clothing":    "https://usa.tommy.com/en/sale/womens-clothing/",
    "Accessories": "https://usa.tommy.com/en/sale/accessories/",
    "Jackets":     "https://usa.tommy.com/en/sale/womens-clothing/jackets-coats/",
    "Sneakers":    "https://usa.tommy.com/en/sale/shoes/sneakers/",
  },
  "adidas": {
    "All":         "https://www.adidas.com/us/sale",
    "Bags":        "https://www.adidas.com/us/bags-and-backpacks-sale",
    "Shoes":       "https://www.adidas.com/us/shoes-sale",
    "Clothing":    "https://www.adidas.com/us/clothing-sale",
    "Accessories": "https://www.adidas.com/us/accessories-sale",
    "Jackets":     "https://www.adidas.com/us/jackets-sale",
    "Sneakers":    "https://www.adidas.com/us/shoes-sale",
  },
  "nike": {
    "All":         "https://www.nike.com/w/sale-3yaep",
    "Bags":        "https://www.nike.com/w/sale-bags-accessories-3yaepzy11j",
    "Shoes":       "https://www.nike.com/w/sale-shoes-3yaepznik1",
    "Clothing":    "https://www.nike.com/w/sale-clothing-3yaepz6ymx6",
    "Accessories": "https://www.nike.com/w/sale-bags-accessories-3yaepzy11j",
    "Jackets":     "https://www.nike.com/w/sale-jackets-vests-3yaepz9om13",
    "Sneakers":    "https://www.nike.com/w/sale-shoes-3yaepznik1",
  },
};

function buildDriver() {
  const options = new chrome.Options();
  options.addArguments(
    "--headless=new",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--window-size=1280,800",
    "--disable-blink-features=AutomationControlled",
    "--disable-extensions",
    "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  const chromiumPath = process.env.CHROMIUM_PATH || "/usr/bin/chromium";
  options.setChromeBinaryPath(chromiumPath);

  return new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();
}

async function scrapeBrand(brandId, category) {
  const urls = SALE_URLS[brandId];
  if (!urls) return [];

  const url = urls[category] || urls["All"];
  console.log(`🔍 Selenium scraping ${brandId}: ${url}`);

  let driver = null;
  try {
    driver = await buildDriver();
    await driver.get(url);

    // Wait for page to load
    await driver.sleep(5000);

    // Try to dismiss cookie banners
    try {
      const cookieBtn = await driver.findElement(By.css('[id*="accept"], [class*="accept"], [class*="cookie"] button'));
      await cookieBtn.click();
      await driver.sleep(1000);
    } catch (e) {}

    // Scroll down to trigger lazy loading
    await driver.executeScript("window.scrollBy(0, 800)");
    await driver.sleep(2000);

    // Extract products using JS in the page
    const products = await driver.executeScript(() => {
      const results = [];
      const seen = new Set();

      const allLinks = Array.from(document.querySelectorAll("a[href]"));

      for (const link of allLinks) {
        const href = link.getAttribute("href") || "";
        if (!href || href === "#" || href.includes("javascript:")) continue;
        if (["/help","/about","/account","/cart","/login","/wishlist","/stores","/sitemap"]
          .some(s => href === s || href === s + "/")) continue;

        const card = link.closest("li,article,[class*='product'],[class*='Product'],[class*='tile'],[class*='Tile'],[class*='card'],[class*='Card'],[class*='item'],[class*='Item']") || link;
        const text = card.innerText || "";
        const prices = text.match(/\$[\d,]+\.?\d*/g);
        if (!prices) continue;

        const fullUrl = href.startsWith("http") ? href : window.location.origin + href;
        if (seen.has(fullUrl)) continue;
        if (!fullUrl.includes(window.location.hostname)) continue;

        const nameEl = card.querySelector("h1,h2,h3,h4,[class*='name'],[class*='Name'],[class*='title'],[class*='Title']");
        const name = (nameEl?.innerText?.trim() || link.innerText?.trim() || "").split("\n")[0].trim();
        if (!name || name.length < 3 || name.length > 120) continue;
        if (["view all","see all","shop now","shop all","sale"].some(s => name.toLowerCase() === s)) continue;

        const img = card.querySelector("img");
        const image = img?.src || img?.dataset?.src || null;

        seen.add(fullUrl);
        results.push({
          name,
          price: prices[prices.length - 1],
          originalPrice: prices.length > 1 ? prices[0] : null,
          sale: true,
          url: fullUrl,
          image: image?.startsWith("http") ? image : null,
        });

        if (results.length >= 12) break;
      }
      return results;
    });

    console.log(`✅ ${brandId}: ${products.length} products`);
    return products;

  } catch (err) {
    console.error(`❌ ${brandId} selenium error:`, err.message);
    return [];
  } finally {
    if (driver) await driver.quit().catch(() => {});
  }
}

module.exports = { scrapeBrand, SALE_URLS };
