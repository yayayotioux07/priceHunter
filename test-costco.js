// Run this locally with: node test-costco.js
// Tests Costco endpoints before deploying to Railway

const fetch = require("node-fetch");

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://www.costco.com/",
};

async function test(label, url) {
  console.log(`\n🔍 Testing: ${label}`);
  console.log(`   URL: ${url}`);
  try {
    const res = await fetch(url, { headers: HEADERS, timeout: 15000 });
    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();
    console.log(`   Status: ${res.status}`);
    console.log(`   Content-Type: ${contentType}`);
    console.log(`   Size: ${text.length} bytes`);
    console.log(`   Preview: ${text.substring(0, 200)}`);

    // Check for product data signals
    const hasProducts = text.includes("catalogEntryView") || text.includes("product.") || text.includes("__INITIAL_STATE__") || text.includes('"price"');
    const hasBlocked = text.includes("Access Denied") || text.includes("captcha") || text.includes("blocked") || text.includes("403");
    console.log(`   Has product data: ${hasProducts ? "✅ YES" : "❌ NO"}`);
    console.log(`   Blocked: ${hasBlocked ? "❌ YES" : "✅ NO"}`);

    return { status: res.status, hasProducts, hasBlocked, size: text.length };
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    return { error: e.message };
  }
}

async function main() {
  console.log("🛒 Costco Endpoint Tester\n" + "=".repeat(40));

  const results = await Promise.all([
    test("Search Page (TV)", "https://www.costco.com/CatalogSearch?keyword=tv&pageSize=24"),
    test("Search Page (laptop)", "https://www.costco.com/CatalogSearch?keyword=laptop&pageSize=24"),
    test("Electronics Category", "https://www.costco.com/electronics.html"),
    test("Deals/Savings Page", "https://www.costco.com/savings-event.html"),
    test("Old API endpoint", "https://www.costco.com/AjaxCatalogRouter?catalogId=10701&langId=-1&storeId=10301&pageSize=24&keyword=tv"),
  ]);

  console.log("\n\n📊 SUMMARY\n" + "=".repeat(40));
  const labels = ["Search (TV)", "Search (laptop)", "Electronics", "Deals", "Old API"];
  results.forEach((r, i) => {
    const status = r.error ? `❌ ERROR: ${r.error}` :
      r.hasBlocked ? `❌ BLOCKED` :
      r.hasProducts ? `✅ HAS PRODUCT DATA` :
      `⚠️ NO PRODUCTS (${r.status})`;
    console.log(`${labels[i]}: ${status}`);
  });

  console.log("\n✅ Done. Share these results and I'll fix the server accordingly.");
}

main();
