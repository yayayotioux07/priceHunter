import { useState, useEffect, useRef } from "react";

const CATEGORIES = [
  { id: "All",             label: "All Deals",       emoji: "🏷️" },
  { id: "Electronics",     label: "Electronics",     emoji: "📺" },
  { id: "Clothing",        label: "Clothing",        emoji: "👕" },
  { id: "Food & Grocery",  label: "Food & Grocery",  emoji: "🛒" },
  { id: "Home & Garden",   label: "Home & Garden",   emoji: "🏡" },
  { id: "Appliances",      label: "Appliances",      emoji: "🍳" },
  { id: "Jewelry",         label: "Jewelry",         emoji: "💎" },
  { id: "Toys",            label: "Toys",            emoji: "🧸" },
  { id: "Health & Beauty", label: "Health & Beauty", emoji: "💊" },
];

function ProductCard({ product }) {
  if (!product?.name) return null;
  const savingsPct = product.originalPrice && product.price
    ? Math.round((1 - parseFloat(product.price.replace(/[^0-9.]/g, "")) / parseFloat(product.originalPrice.replace(/[^0-9.]/g, ""))) * 100)
    : null;

  return (
    <a href={product.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
      <div
        style={{ background: "#0e0e0e", border: "1px solid #1e1e1e", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", transition: "border-color 0.15s, transform 0.15s", height: "100%", cursor: "pointer" }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#c8f04c"; e.currentTarget.style.transform = "translateY(-2px)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1e1e1e"; e.currentTarget.style.transform = "translateY(0)"; }}
      >
        {/* Savings badge */}
        {savingsPct > 0 && (
          <div style={{ background: "#c8f04c", padding: "6px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#0a0a0a", letterSpacing: "0.06em" }}>SAVE {savingsPct}%</span>
            {product.savings && <span style={{ fontSize: 11, fontWeight: 700, color: "#0a0a0a" }}>{product.savings} off</span>}
          </div>
        )}

        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          {/* Item number */}
          {product.itemNumber && (
            <div style={{ fontSize: 10, color: "#444", fontWeight: 600, letterSpacing: "0.08em" }}>
              ITEM #{product.itemNumber}
            </div>
          )}

          {/* Name */}
          <div style={{ fontSize: 13, fontWeight: 700, color: "#f0ede8", lineHeight: 1.4, flex: 1 }}>
            {product.name}
          </div>

          {/* Prices */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#c8f04c", letterSpacing: "-0.02em" }}>
              {product.price}
            </span>
            {product.originalPrice && (
              <span style={{ fontSize: 13, color: "#444", textDecoration: "line-through" }}>
                {product.originalPrice}
              </span>
            )}
          </div>

          {/* View link */}
          <div style={{ marginTop: 4, fontSize: 12, color: "#555", fontWeight: 600 }}>
            View on Costco.com ↗
          </div>
        </div>
      </div>
    </a>
  );
}

export default function App() {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [inputVal, setInputVal] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pageUrl, setPageUrl] = useState("https://www.costco.com/deals.html");
  const [searched, setSearched] = useState(false);
  const [cached, setCached] = useState(false);
  const abortRef = useRef(null);

  const fetchProducts = async (cat, q) => {
    setLoading(true);
    setError(null);
    setProducts([]);
    setSearched(true);
    setCached(false);

    try {
      const params = new URLSearchParams({ category: cat, q: q || "" });
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setProducts(data.products || []);
      setPageUrl(data.pageUrl || "https://www.costco.com/deals.html");
      setCached(data.cached || false);
      if (data.blocked || (data.products || []).length === 0) {
        setError("No products found. Try a different category or search term.");
      }
    } catch (err) {
      setError(err.message || "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (cat) => {
    setCategory(cat);
    fetchProducts(cat, query);
  };

  const handleSearch = () => {
    setQuery(inputVal);
    fetchProducts(category, inputVal);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: "'DM Sans','Helvetica Neue',Helvetica,sans-serif", color: "#f0ede8" }}>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1e1e1e", padding: "24px 40px", background: "linear-gradient(180deg,#0d0d0d 0%,#0a0a0a 100%)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>
                COSTCO<span style={{ color: "#c8f04c" }}>HUNT</span>
              </h1>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", color: "#555", textTransform: "uppercase" }}>Deal Finder</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#555" }}>Browse Costco deals by category or search for specific products</p>
          </div>
          <a href="https://www.costco.com/deals.html" target="_blank" rel="noopener noreferrer" style={{
            padding: "10px 20px", background: "#003087", borderRadius: 8,
            color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            🏪 Shop Costco.com ↗
          </a>
        </div>
      </div>

      {/* Search + Categories */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 40px 0" }}>

        {/* Search bar */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <input
            type="text"
            placeholder='Search Costco deals... e.g. "TV", "protein powder", "sectional sofa"'
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleSearch()}
            style={{ flex: 1, padding: "13px 18px", background: "#111", border: "1.5px solid #222", borderRadius: 8, color: "#f0ede8", fontSize: 14, outline: "none", fontFamily: "inherit" }}
          />
          <button onClick={handleSearch} disabled={loading} style={{
            padding: "13px 28px", borderRadius: 8, border: "none",
            background: loading ? "#1e1e1e" : "#c8f04c",
            color: loading ? "#555" : "#0a0a0a",
            fontSize: 14, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
            letterSpacing: "0.04em", textTransform: "uppercase",
            display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
          }}>
            {loading
              ? <><span style={{ width: 14, height: 14, border: "2px solid #444", borderTopColor: "#888", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />Searching...</>
              : "Search →"
            }
          </button>
        </div>

        {/* Category pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
          {CATEGORIES.map((cat) => (
            <button key={cat.id} onClick={() => handleCategoryClick(cat.id)} disabled={loading} style={{
              padding: "8px 16px", borderRadius: 20, cursor: loading ? "not-allowed" : "pointer",
              border: category === cat.id ? "1.5px solid #c8f04c" : "1.5px solid #1e1e1e",
              background: category === cat.id ? "#c8f04c" : "#111",
              color: category === cat.id ? "#0a0a0a" : "#666",
              fontSize: 12, fontWeight: category === cat.id ? 700 : 500,
              transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5,
            }}>
              <span>{cat.emoji}</span> {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px 60px" }}>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ width: 44, height: 44, border: "3px solid #1e1e1e", borderTopColor: "#c8f04c", borderRadius: "50%", margin: "0 auto 20px", animation: "spin 0.8s linear infinite" }} />
            <div style={{ color: "#555", fontSize: 14, fontWeight: 600 }}>Searching Costco deals...</div>
            <div style={{ color: "#333", fontSize: 12, marginTop: 6 }}>This takes 15–25 seconds</div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ padding: "16px 20px", background: "#1a0a0a", border: "1px solid #3a1a1a", borderRadius: 8, color: "#ff6b6b", fontSize: 13, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>⚠️ {error}</span>
            <a href={pageUrl} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 14px", background: "#003087", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
              Browse Costco ↗
            </a>
          </div>
        )}

        {/* Results header */}
        {!loading && products.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: "1px solid #1a1a1a" }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#666", textTransform: "uppercase" }}>
              {products.length} Products Found
            </span>
            <div style={{ flex: 1, height: 1, background: "#1a1a1a" }} />
            {cached && <span style={{ fontSize: 11, color: "#444", background: "#111", padding: "3px 8px", borderRadius: 4 }}>📦 Cached</span>}
            <a href={pageUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#555", textDecoration: "none", fontWeight: 600 }}>
              View on Costco.com ↗
            </a>
          </div>
        )}

        {/* Product grid */}
        {!loading && products.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {products.map((p, i) => <ProductCard key={i} product={p} />)}
          </div>
        )}

        {/* Idle state */}
        {!loading && !searched && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🛒</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#333", letterSpacing: "-0.02em" }}>Find the best Costco deals</div>
            <div style={{ fontSize: 13, color: "#2a2a2a", marginTop: 10, maxWidth: 400, margin: "10px auto 0" }}>
              Pick a category above or search for a specific product to see current Costco prices and deals.
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 28, flexWrap: "wrap" }}>
              {["65\" TV", "protein powder", "sofa sectional", "diamond ring", "air fryer"].map(q => (
                <button key={q} onClick={() => { setInputVal(q); setQuery(q); fetchProducts(category, q); }} style={{
                  padding: "8px 16px", borderRadius: 20, border: "1px solid #222", background: "#111",
                  color: "#666", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#c8f04c"; e.currentTarget.style.color = "#f0ede8"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#222"; e.currentTarget.style.color = "#666"; }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        body { margin: 0; }
        input::placeholder { color: #333; }
        input:focus { border-color: #333 !important; }
      `}</style>
    </div>
  );
}
