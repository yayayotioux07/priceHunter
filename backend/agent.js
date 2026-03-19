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

async function scrapeCostco(category, searchQuery) {
  const pageUrl = COSTCO_CATEGORIES[category] || COSTCO_CATEGORIES["All"];
  const catLabel = category !== "All" ? category : "deals";
  const queryHint = searchQuery ? `matching "${searchQuery}"` : "";

  console.log(`🤖 Agent scraping Costco / ${category} ${queryHint}`);

  const systemPrompt = `You are a Costco product search assistant. Use web_search to find specific products currently on sale or available at Costco.com.
Search multiple times with different queries to find real products with specific names, prices, and direct Costco.com URLs.
Return ONLY a raw JSON array. No markdown, no explanation, no backticks.
Each item must have:
- name: specific product name (e.g. "Samsung 65\" 4K QLED TV")
- price: current Costco price (e.g. "$799.99")
- originalPrice: original price if on sale (e.g. "$1299.99") or null
- savings: dollar amount saved if on sale (e.g. "$500.00") or null
- url: direct product URL on costco.com
- sale: true if discounted
- itemNumber: Costco item number if found (e.g. "123456") or null
Only include products with specific names and real costco.com URLs — not category pages.`;

  const userMsg = `Find 8-10 specific ${catLabel} products ${queryHint} currently available on costco.com.

Search using these queries in order:
1. "costco ${catLabel} ${searchQuery || ""} site:costco.com price"
2. "costco.com ${catLabel} ${searchQuery || ""} $ member price"
3. "costco ${searchQuery || catLabel} deal savings"

Extract specific product names, prices, savings amounts, and direct costco.com product URLs.
Return as JSON array: [{"name":"...","price":"$X","originalPrice":"$X or null","savings":"$X or null","url":"https://www.costco.com/...","sale":true,"itemNumber":"..."}]`;

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

    console.log(`📝 Costco response: ${text.substring(0, 300)}`);

    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return { products: [], pageUrl };

    let products = JSON.parse(match[0]);

    // Only keep real costco.com product URLs
    products = products.filter(p =>
      p && p.name && p.price &&
      p.url && p.url.includes("costco.com") &&
      !p.url.endsWith("costco.com/") &&
      p.url.includes("/")
    );

    console.log(`✅ Costco ${category}: ${products.length} products`);
    return { products: products.slice(0, 12), pageUrl };

  } catch (err) {
    console.error(`❌ Costco agent error:`, err.message);
    return { products: [], pageUrl };
  }
}

module.exports = { scrapeCostco, COSTCO_CATEGORIES };
