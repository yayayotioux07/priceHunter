const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

const BRAND_NAMES = {
  "guess": "Guess",
  "michael_kors": "Michael Kors",
  "calvin_klein": "Calvin Klein",
  "tommy_hilfiger": "Tommy Hilfiger",
  "adidas": "Adidas",
  "nike": "Nike",
};

const BRAND_DOMAINS = {
  "guess": "guess.com",
  "michael_kors": "michaelkors.com",
  "calvin_klein": "calvinklein.us",
  "tommy_hilfiger": "tommy.com",
  "adidas": "adidas.com",
  "nike": "nike.com",
};

async function scrapeWithAgent(brandId, category) {
  const urls = SALE_URLS[brandId];
  if (!urls) return { products: [], saleUrl: "#" };

  const saleUrl = urls[category] || urls["All"];
  const brandName = BRAND_NAMES[brandId];
  const domain = BRAND_DOMAINS[brandId];
  const catLabel = category !== "All" ? category : "";

  console.log(`🤖 Agent scraping ${brandId} / ${category}`);

  const systemPrompt = `You are a product data extraction assistant. Use web_search to find specific products currently on sale.
You must search multiple times to find individual products with specific names, prices, and direct URLs.
Return ONLY a raw JSON array with no markdown or explanation.
Each product must have: name (specific product name), price (sale price like "$49.99"), originalPrice (original price like "$89.00" or null), url (direct product URL on ${domain}), sale (true).
Only include products with specific names and prices — not category pages.`;

  // Search for specific products multiple times with different queries
  const userMsg = `Search for specific ${catLabel} products currently on sale at ${brandName} (${domain}).

Do these searches one by one:
1. Search: "${brandName} ${catLabel} sale price site:${domain}"
2. Search: "${brandName} ${catLabel} % off sale 2024 site:${domain}"  
3. Search: "${brandName} sale ${catLabel} $"

For each search result, extract specific product names, their sale prices, original prices, and direct URLs from ${domain}.
Return a JSON array of 6-10 specific products like:
[{"name":"Hamilton Satchel","price":"$149.00","originalPrice":"$298.00","url":"https://www.${domain}/hamilton-satchel/...","sale":true}]`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: userMsg }],
    });

    const text = response.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");

    console.log(`📝 ${brandId}: ${text.substring(0, 300)}`);

    // Try to find JSON array in response
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      console.log(`⚠️ ${brandId}: no JSON found`);
      return { products: [], saleUrl };
    }

    let products = JSON.parse(match[0]);

    // Filter to only include products with real domain URLs
    products = products.filter(p =>
      p && p.name && p.price &&
      p.url && p.url.includes(domain) &&
      !p.url.endsWith(domain + "/") &&
      !p.url.endsWith(domain)
    );

    console.log(`✅ ${brandId}: ${products.length} products after filtering`);
    return { products: products.slice(0, 12), saleUrl };

  } catch (err) {
    console.error(`❌ Agent error for ${brandId}:`, err.message);
    return { products: [], saleUrl };
  }
}

module.exports = { scrapeWithAgent, SALE_URLS };
