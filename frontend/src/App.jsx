import { useState, useCallback } from "react";

const BRANDS = [
  {
    id: "guess", name: "Guess", emoji: "👜", site: "guess.com",
    sales: {
      "All":         "https://www.guess.com/en-us/guess/women/sale/",
      "Bags":        "https://www.guess.com/en-us/guess/women/sale/handbags/",
      "Shoes":       "https://www.guess.com/en-us/guess/women/sale/shoes/",
      "Clothing":    "https://www.guess.com/en-us/guess/women/sale/clothing/",
      "Accessories": "https://www.guess.com/en-us/guess/women/sale/accessories/",
      "Jackets":     "https://www.guess.com/en-us/guess/women/sale/clothing/jackets-coats/",
      "Sneakers":    "https://www.guess.com/en-us/guess/women/sale/shoes/sneakers/",
    },
  },
  {
    id: "michael_kors", name: "Michael Kors", emoji: "💼", site: "michaelkors.com",
    sales: {
      "All":         "https://www.michaelkors.com/sale/",
      "Bags":        "https://www.michaelkors.com/sale/handbags/",
      "Shoes":       "https://www.michaelkors.com/sale/shoes/",
      "Clothing":    "https://www.michaelkors.com/sale/clothing/",
      "Accessories": "https://www.michaelkors.com/sale/accessories/",
      "Jackets":     "https://www.michaelkors.com/sale/clothing/coats-jackets/",
      "Sneakers":    "https://www.michaelkors.com/sale/shoes/sneakers/",
    },
  },
  {
    id: "calvin_klein", name: "Calvin Klein", emoji: "🖤", site: "calvinklein.us",
    sales: {
      "All":         "https://www.calvinklein.us/sale/",
      "Bags":        "https://www.calvinklein.us/sale/bags-and-accessories/bags/",
      "Shoes":       "https://www.calvinklein.us/sale/shoes/",
      "Clothing":    "https://www.calvinklein.us/sale/womens-clothing/",
      "Accessories": "https://www.calvinklein.us/sale/bags-and-accessories/",
      "Jackets":     "https://www.calvinklein.us/sale/womens-clothing/jackets-and-coats/",
      "Sneakers":    "https://www.calvinklein.us/sale/shoes/sneakers/",
    },
  },
  {
    id: "tommy_hilfiger", name: "Tommy Hilfiger", emoji: "⚓", site: "tommy.com",
    sales: {
      "All":         "https://usa.tommy.com/en/sale/",
      "Bags":        "https://usa.tommy.com/en/sale/bags/",
      "Shoes":       "https://usa.tommy.com/en/sale/shoes/",
      "Clothing":    "https://usa.tommy.com/en/sale/womens-clothing/",
      "Accessories": "https://usa.tommy.com/en/sale/accessories/",
      "Jackets":     "https://usa.tommy.com/en/sale/womens-clothing/jackets-coats/",
      "Sneakers":    "https://usa.tommy.com/en/sale/shoes/sneakers/",
    },
  },
  {
    id: "adidas", name: "Adidas", emoji: "🦶", site: "adidas.com",
    sales: {
      "All":         "https://www.adidas.com/us/sale",
      "Bags":        "https://www.adidas.com/us/bags-and-backpacks-sale",
      "Shoes":       "https://www.adidas.com/us/shoes-sale",
      "Clothing":    "https://www.adidas.com/us/clothing-sale",
      "Accessories": "https://www.adidas.com/us/accessories-sale",
      "Jackets":     "https://www.adidas.com/us/jackets-sale",
      "Sneakers":    "https://www.adidas.com/us/shoes-sale",
    },
  },
  {
    id: "nike", name: "Nike", emoji: "✔️", site: "nike.com",
    sales: {
      "All":         "https://www.nike.com/w/sale-3yaep",
      "Bags":        "https://www.nike.com/w/sale-bags-accessories-3yaepzy11j",
      "Shoes":       "https://www.nike.com/w/sale-shoes-3yaepznik1",
      "Clothing":    "https://www.nike.com/w/sale-clothing-3yaepz6ymx6",
      "Accessories": "https://www.nike.com/w/sale-bags-accessories-3yaepzy11j",
      "Jackets":     "https://www.nike.com/w/sale-jackets-vests-3yaepz9om13",
      "Sneakers":    "https://www.nike.com/w/sale-shoes-3yaepznik1",
    },
  },
];

const CATEGORIES = ["All", "Bags", "Shoes", "Clothing", "Accessories", "Sneakers", "Jackets"];

// Parse HTML from brand sale pages to extract products
function parseProducts(html, brand) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const results = [];
  const seen = new Set();

  const domain = "https://www." + brand.site;
  const altDomain = brand.site === "tommy.com" ? "https://usa.tommy.com" : domain;

  const links = Array.from(doc.querySelectorAll("a[href]"));

  for (const link of links) {
    const href = link.getAttribute("href") || "";
    if (!href || href === "#" || href.includes("javascript:")) continue;
    if (["/help","/about","/account","/cart","/login","/wishlist","/stores","/sitemap","/sale/","/en/sale/","/en-us/sale/"].some(s => href === s || href === s + "/")) continue;

    const fullUrl = href.startsWith("http") ? href : altDomain + href;
    if (!fullUrl.includes(brand.site)) continue;
    if (seen.has(fullUrl)) continue;

    const card = link.closest("li,article,[class*='product'],[class*='Product'],[class*='tile'],[class*='Tile'],[class*='card'],[class*='Card'],[class*='item'],[class*='Item']") || link;
    const text = card.innerText || card.textContent || "";

    const priceMatches = text.match(/\$[\d,]+\.?\d*/g);
    if (!priceMatches) continue;

    const nameEl = card.querySelector("h1,h2,h3,h4,[class*='name'],[class*='Name'],[class*='title'],[class*='Title']");
    const rawName = nameEl?.textContent?.trim() || link.textContent?.trim() || "";
    const name = rawName.split("\n")[0].trim();
    if (!name || name.length < 3 || name.length > 120) continue;
    if (["view all","see all","shop","sale","new arrivals"].some(s => name.toLowerCase() === s)) continue;

    const img = card.querySelector("img");
    const image = img?.src || img?.dataset?.src || img?.getAttribute("data-lazy-src") || null;

    const salePrice = priceMatches[priceMatches.length - 1];
    const originalPrice = priceMatches.length > 1 ? priceMatches[0] : null;

    seen.add(fullUrl);
    results.push({ name, price: salePrice, originalPrice, sale: true, url: fullUrl, image: image?.startsWith("http") ? image : null });

    if (results.length >= 12) break;
  }

  return results;
}

async function fetchBrandProducts(brand, category) {
  const saleUrl = brand.sales[category] || brand.sales["All"];
  // Use allorigins as CORS proxy
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(saleUrl)}`;

  const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.contents) throw new Error("Empty response");

  const products = parseProducts(data.contents, brand);
  return { products, saleUrl };
}

function ProductCard({ product, brand }) {
  if (!product?.name) return null;
  return (
    <a href={product.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
      <div style={{
        background: "#0e0e0e", border: "1px solid #1e1e1e", borderRadius: 10,
        overflow: "hidden", display: "flex", flexDirection: "column",
        transition: "border-color 0.15s", cursor: "pointer", height: "100%",
      }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = "#c8f04c"}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = "#1e1e1e"}
      >
        {product.image && (
          <div style={{ width: "100%", height: 180, background: "#161616", overflow: "hidden" }}>
            <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => { e.target.parentElement.style.display = "none"; }} />
          </div>
        )}
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#f0ede8", lineHeight: 1.3 }}>{product.name}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: "auto", paddingTop: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#c8f04c" }}>{product.price}</span>
            {product.originalPrice && (
              <span style={{ fontSize: 12, color: "#444", textDecoration: "line-through" }}>{product.originalPrice}</span>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}

function BrandSection({ brand, category, active }) {
  const [state, setState] = useState("idle"); // idle | loading | done | error | blocked
  const [products, setProducts] = useState([]);
  const [saleUrl, setSaleUrl] = useState(brand.sales[category] || brand.sales["All"]);

  const load = useCallback(async (cat) => {
    setState("loading");
    setProducts([]);
    try {
      const { products: p, saleUrl: u } = await fetchBrandProducts(brand, cat);
      setSaleUrl(u);
      if (p.length === 0) {
        setState("blocked");
      } else {
        setProducts(p);
        setState("done");
      }
    } catch (e) {
      console.error(brand.name, e.message);
      setState("error");
    }
  }, [brand]);

  // Load when brand becomes active
  useState(() => {
    if (active) load(category);
  });

  // Reload when category changes and brand is active
  const [lastCat, setLastCat] = useState(category);
  if (active && category !== lastCat) {
    setLastCat(category);
    load(category);
  }

  if (!active) return null;

  const url = brand.sales[category] || brand.sales["All"];

  return (
    <div style={{ marginBottom: 48 }}>
      {/* Brand header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #1a1a1a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>{brand.emoji}</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#f0ede8", letterSpacing: "-0.02em" }}>{brand.name}</div>
            <div style={{ fontSize: 11, color: "#444" }}>{brand.site} · {category} Sale</div>
          </div>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{
          padding: "8px 16px", background: "#c8f04c", borderRadius: 6,
          color: "#0a0a0a", fontSize: 12, fontWeight: 800, textDecoration: "none",
        }}>
          View All ↗
        </a>
      </div>

      {/* States */}
      {state === "loading" && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "24px 0", color: "#555" }}>
          <div style={{ width: 18, height: 18, border: "2px solid #222", borderTopColor: "#c8f04c", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
          <span style={{ fontSize: 13 }}>Loading {brand.name} sale items...</span>
        </div>
      )}

      {(state === "error" || state === "blocked") && (
        <div style={{ padding: "20px 24px", background: "#111", border: "1px solid #1e1e1e", borderRadius: 10 }}>
          <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
            {state === "blocked"
              ? `${brand.name}'s website blocks direct access — click below to browse their sale page.`
              : `Couldn't load ${brand.name} items — click below to browse directly.`}
          </div>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "10px 18px", background: "#c8f04c", borderRadius: 6,
            color: "#0a0a0a", fontSize: 13, fontWeight: 800, textDecoration: "none",
          }}>
            Shop {brand.name} {category !== "All" ? category : ""} Sale ↗
          </a>
        </div>
      )}

      {state === "done" && products.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {products.map((p, i) => <ProductCard key={i} product={p} brand={brand} />)}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const toggleBrand = (id) => {
    setSelectedBrands((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const activeBrands = selectedBrands.length > 0
    ? BRANDS.filter(b => selectedBrands.includes(b.id))
    : [];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: "'DM Sans','Helvetica Neue',Helvetica,sans-serif", color: "#f0ede8" }}>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1e1e1e", padding: "28px 40px", background: "linear-gradient(180deg,#0d0d0d 0%,#0a0a0a 100%)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>
              PRICE<span style={{ color: "#c8f04c" }}>HUNT</span>
            </h1>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", color: "#555", textTransform: "uppercase" }}>Fashion Sales</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#555" }}>Select brands to browse their sale items by category</p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 40px 0" }}>

        {/* Brand Buttons */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#555", textTransform: "uppercase", marginBottom: 10 }}>Select Brands</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {BRANDS.map((brand) => {
              const active = selectedBrands.includes(brand.id);
              return (
                <button key={brand.id} onClick={() => toggleBrand(brand.id)} style={{
                  padding: "10px 20px", borderRadius: 6, cursor: "pointer",
                  border: active ? "1.5px solid #c8f04c" : "1.5px solid #222",
                  background: active ? "#1a2200" : "#111",
                  color: active ? "#f0ede8" : "#666",
                  fontSize: 13, fontWeight: 700, transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ fontSize: 16 }}>{brand.emoji}</span>{brand.name}
                  {active && <span style={{ fontSize: 10, background: "#c8f04c", color: "#0a0a0a", padding: "1px 6px", borderRadius: 10, fontWeight: 800 }}>ON</span>}
                </button>
              );
            })}
            {selectedBrands.length > 0 && (
              <button onClick={() => setSelectedBrands([])} style={{ padding: "10px 14px", borderRadius: 6, border: "1.5px dashed #333", background: "transparent", color: "#555", fontSize: 12, cursor: "pointer" }}>
                Clear all ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Filter */}
        {selectedBrands.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 36 }}>
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} style={{
                padding: "7px 16px", borderRadius: 20, cursor: "pointer", transition: "all 0.15s",
                border: selectedCategory === cat ? "1.5px solid #c8f04c" : "1.5px solid #1e1e1e",
                background: selectedCategory === cat ? "#c8f04c" : "transparent",
                color: selectedCategory === cat ? "#0a0a0a" : "#555",
                fontSize: 12, fontWeight: selectedCategory === cat ? 700 : 500,
              }}>{cat}</button>
            ))}
          </div>
        )}
      </div>

      {/* Product Sections */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px 60px" }}>
        {selectedBrands.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👆</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#333" }}>Select a brand above to browse their sale items</div>
            <div style={{ fontSize: 13, color: "#2a2a2a", marginTop: 8 }}>Pick one or more brands to see their current sale products</div>
          </div>
        ) : (
          BRANDS.map(brand => (
            <BrandSection
              key={brand.id}
              brand={brand}
              category={selectedCategory}
              active={selectedBrands.includes(brand.id)}
            />
          ))
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>
    </div>
  );
}
