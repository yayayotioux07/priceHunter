const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const COSTCO_CATEGORIES = {
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

// Category-specific search terms that match Costco's actual product naming
const CATEGORY_TERMS = {
  "All":            "savings",
  "Electronics":    "TV laptop tablet",
  "Clothing":       "jacket shirt pants",
  "Food & Grocery": "snacks coffee nuts",
  "Home & Garden":  "furniture patio bedding",
  "Appliances":     "refrigerator washer vacuum",
  "Jewelry":        "diamond ring bracelet",
  "Toys":           "lego toy game",
  "Health & Beauty":"vitamins protein skincare",
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function scrapeCostco(category, searchQuery) {
  const pageUrl = COSTCO_CATEGORIES[category] || COSTCO_CATEGORIES["All"];
  const catTerms = CATEGORY_TERMS[category] || "deals";
  const topic = searchQuery || catTerms;

  console.log(`🤖 Costco search: "${topic}" in ${category}`);

  const systemPrompt = `You search for Costco products and return a JSON array only. No text, no markdown.
Format: [{"name":"full product name","price":"$X.XX","originalPrice":"$X.XX or null","savings":"$X.XX or null","url":"https://www.costco.com/product-name.product.ITEMNUM.html","sale":true,"itemNumber":"ITEMNUM or null"}]
Rules: only costco.com URLs with item numbers in them. Max 8 items.`;

  const userMsg = `Search for: costco.com ${topic} "$" item
Find real Costco product pages with prices. Product URLs look like: costco.com/Samsung-TV.product.123456.html
Return JSON array only.`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`⏳ Retry ${attempt}...`);
        await sleep(attempt * 8000);
      }

      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        system: systemPrompt,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: userMsg }],
      });

      const text = response.content
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("");

      console.log(`📝 ${category}: ${text.substring(0, 250)}`);

      const match = text.match(/\[[\s\S]*?\]/);
      if (!match) {
        console.log(`⚠️ No JSON found, trying fallback search...`);
        return await fallbackSearch(topic, pageUrl);
      }

      let products = JSON.parse(match[0]);
      // Costco product URLs contain .product. in them
      products = products.filter(p =>
        p?.name && p?.price &&
        p?.url?.includes("costco.com") &&
        (p.url.includes(".product.") || p.url.includes("/p/"))
      );

      if (products.length === 0) {
        console.log(`⚠️ No valid URLs, trying fallback...`);
        return await fallbackSearch(topic, pageUrl);
      }

      console.log(`✅ ${products.length} products found`);
      return { products: products.slice(0, 8), pageUrl };

    } catch (err) {
      if (err.status === 429 && attempt < 3) {
        console.warn(`⚠️ Rate limited, retrying...`);
        continue;
      }
      console.error(`❌ Error:`, err.message);
      return { products: [], pageUrl };
    }
  }
  return { products: [], pageUrl };
}

// Fallback: search Google Shopping style for Costco products
async function fallbackSearch(topic, pageUrl) {
  console.log(`🔄 Fallback search for: ${topic}`);
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: `Return ONLY a JSON array of Costco products. No text.
Format: [{"name":"...","price":"$X","originalPrice":"$X or null","savings":"$X or null","url":"https://www.costco.com/...product...html","sale":true,"itemNumber":"# or null"}]`,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{
        role: "user",
        content: `Search: "${topic} costco price $" and find specific product listings on costco.com with prices. Return JSON array.`
      }],
    });

    const text = response.content.filter(b => b.type === "text").map(b => b.text).join("");
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return { products: [], pageUrl };

    let products = JSON.parse(match[0]);
    products = products.filter(p => p?.name && p?.price && p?.url?.includes("costco.com"));
    console.log(`✅ Fallback: ${products.length} products`);
    return { products: products.slice(0, 8), pageUrl };
  } catch (e) {
    console.error(`❌ Fallback failed:`, e.message);
    return { products: [], pageUrl };
  }
}

module.exports = { scrapeCostco, COSTCO_CATEGORIES };
