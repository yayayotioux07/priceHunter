const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const COSTCO_CATEGORIES = {
  "All":            "https://www.costco.com/deals.html",
  "Electronics":    "https://www.costco.com/electronics.html",
  "Clothing":       "https://www.costco.com/clothing.html",
  "Food & Grocery": "https://www.costco.com/grocery.html",
  "Home & Garden":  "https://www.costco.com/home-garden.html",
  "Appliances":     "https://www.costco.com/appliances.html",
  "Jewelry":        "https://www.costco.com/jewelry.html",
  "Toys":           "https://www.costco.com/toys-games.html",
  "Health & Beauty":"https://www.costco.com/health-beauty.html",
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function scrapeCostco(category, searchQuery) {
  const pageUrl = COSTCO_CATEGORIES[category] || COSTCO_CATEGORIES["All"];
  const topic = searchQuery || (category !== "All" ? category : "deals");

  console.log(`🤖 Costco search: "${topic}"`);

  // Very short prompt to stay under token limits
  const systemPrompt = `Find Costco products. Use web_search. Return ONLY a JSON array, no markdown.
Each item: {"name":"...","price":"$X","originalPrice":"$X or null","savings":"$X or null","url":"https://www.costco.com/...","sale":true,"itemNumber":"# or null"}
Only real costco.com product URLs. Max 8 items.`;

  const userMsg = `Search: "costco ${topic} price site:costco.com"
Return JSON array of products found with names, prices, and costco.com URLs.`;

  // Retry up to 3 times with increasing delays on rate limit
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (attempt > 1) {
        const delay = attempt * 10000;
        console.log(`⏳ Retry ${attempt} after ${delay/1000}s...`);
        await sleep(delay);
      }

      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001", // Haiku is cheaper + faster = less rate limit pressure
        max_tokens: 1000,
        system: systemPrompt,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: userMsg }],
      });

      const text = response.content
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("");

      console.log(`📝 Response: ${text.substring(0, 200)}`);

      const match = text.match(/\[[\s\S]*\]/);
      if (!match) return { products: [], pageUrl };

      let products = JSON.parse(match[0]);
      products = products.filter(p =>
        p?.name && p?.price &&
        p?.url?.includes("costco.com") &&
        p.url.length > "https://www.costco.com/".length
      );

      console.log(`✅ Costco: ${products.length} products`);
      return { products: products.slice(0, 8), pageUrl };

    } catch (err) {
      if (err.status === 429 && attempt < 3) {
        console.warn(`⚠️ Rate limited, will retry...`);
        continue;
      }
      console.error(`❌ Costco error:`, err.message);
      return { products: [], pageUrl };
    }
  }

  return { products: [], pageUrl };
}

module.exports = { scrapeCostco, COSTCO_CATEGORIES };
