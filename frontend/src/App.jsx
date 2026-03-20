import { useState } from "react";

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

// Local proxy runs on your Windows machine
const PROXY = "http://localhost:3333";

function ProductCard({ p }) {
  if (!p?.name) return null;
  const pct = p.originalPrice && p.price
    ? Math.round((1 - parseFloat(p.price.replace(/[^0-9.]/g, "")) /
        parseFloat(p.originalPrice.replace(/[^0-9.]/g, ""))) * 100)
    : null;

  return (
    <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
      <div style={{
        background: "#0e0e0e", border: "1px solid #1e1e1e", borderRadius: 12,
        overflow: "hidden", display: "flex", flexDirection: "column",
        transition: "all 0.15s", height: "100%",
      }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#e8261b"; e.currentTarget.style.transform = "translateY(-2px)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1e1e1e"; e.currentTarget.style.transform = "translateY(0)"; }}
      >
        {pct > 0 && (
          <div style={{ background: "#e8261b", padding: "5px 12px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: "0.06em" }}>SAVE {pct}%</span>
            {p.savings && <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{p.savings} off</span>}
          </div>
        )}
        {p.image && (
          <div style={{ width: "100%", height: 160, background: "#fff", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }}
              onError={(e) => e.target.parentElement.style.display = "none"} />
          </div>
        )}
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          {p.itemNumber && <div style={{ fontSize: 10, color: "#444", fontWeight: 600 }}>ITEM #{p.itemNumber}</div>}
          <div style={{ fontSize: 13, fontWeight: 700, color: "#f0ede8", lineHeight: 1.4, flex: 1 }}>{p.name}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#e8261b" }}>{p.price}</span>
            {p.originalPrice && <span style={{ fontSize: 13, color: "#444", textDecoration: "line-through" }}>{p.originalPrice}</span>}
          </div>
          <div style={{ fontSize: 11, color: "#555", fontWeight: 600, marginTop: 2 }}>View on Costco.com ↗</div>
        </div>
      </div>
    </a>
  );
}

export default function App() {
  const [category, setCategory] = useState("All");
  const [inputVal, setInputVal] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const [proxyOk, setProxyOk] = useState(null); // null=unchecked, true=ok, false=down

  const checkProxy = async () => {
    try {
      const res = await fetch(`${PROXY}/health`, { signal: AbortSignal.timeout(3000) });
      const ok = res.ok;
      setProxyOk(ok);
      return ok;
    } catch {
      setProxyOk(false);
      return false;
    }
  };

  const fetchProducts = async (cat, q) => {
    setLoading(true);
    setError(null);
    setProducts([]);
    setSearched(true);

    const ok = await checkProxy();
    if (!ok) {
      setLoading(false);
      setError("LOCAL_PROXY_DOWN");
      return;
    }

    try {
      const params = new URLSearchParams({ category: cat, q: q || "" });
      const res = await fetch(`${PROXY}/products?${params}`, { signal: AbortSignal.timeout(25000) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fetch failed");
      setProducts(data.products || []);
      if ((data.products || []).length === 0) setError("No products found. Try a different search.");
    } catch (err) {
      setError(err.message.includes("fetch") ? "LOCAL_PROXY_DOWN" : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCategory = (cat) => { setCategory(cat); fetchProducts(cat, inputVal); };
  const handleSearch = () => fetchProducts(category, inputVal);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: "'DM Sans','Helvetica Neue',sans-serif", color: "#f0ede8" }}>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1e1e1e", padding: "20px 40px", background: "#0d0d0d" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em", margin: 0, color: "#fff" }}>
                COSTCO<span style={{ color: "#e8261b" }}>HUNT</span>
              </h1>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: "#444", textTransform: "uppercase" }}>Deal Finder</span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#555" }}>Browse and search Costco deals in real time</p>
          </div>
          <a href="https://www.costco.com" target="_blank" rel="noopener noreferrer" style={{
            padding: "9px 18px", background: "#003087", borderRadius: 8,
            color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none",
          }}>🏪 Costco.com ↗</a>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 40px 0" }}>

        {/* Proxy status banner */}
        {proxyOk === false && (
          <div style={{ padding: "16px 20px", background: "#1a0800", border: "1px solid #5a1a00", borderRadius: 10, marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#ff6b35", marginBottom: 8 }}>⚠️ Local Proxy Not Running</div>
            <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6 }}>
              To use CostcoHunt, you need to run the local proxy on your Windows machine. It fetches Costco data using your home IP (not blocked).
            </div>
            <div style={{ marginTop: 12, background: "#111", borderRadius: 8, padding: "12px 16px", fontFamily: "monospace", fontSize: 12, color: "#c8f04c" }}>
              <div style={{ color: "#666", marginBottom: 4 }}># In a new PowerShell window, run:</div>
              <div>cd "C:\Users\Me_\Desktop\Programming Projects\pricehunt\proxy"</div>
              <div>npm install</div>
              <div>node proxy.js</div>
            </div>
            <div style={{ fontSize: 12, color: "#555", marginTop: 8 }}>Keep that window open while using the app. Then refresh this page.</div>
          </div>
        )}

        {/* Search */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <input
            type="text"
            placeholder='Search Costco... e.g. "65 inch TV", "protein powder", "sectional sofa"'
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleSearch()}
            style={{ flex: 1, padding: "13px 18px", background: "#111", border: "1.5px solid #222", borderRadius: 8, color: "#f0ede8", fontSize: 14, outline: "none", fontFamily: "inherit" }}
          />
          <button onClick={handleSearch} disabled={loading} style={{
            padding: "13px 28px", borderRadius: 8, border: "none",
            background: loading ? "#1e1e1e" : "#e8261b",
            color: loading ? "#555" : "#fff",
            fontSize: 14, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
          }}>
            {loading
              ? <><span style={{ width: 14, height: 14, border: "2px solid #444", borderTopColor: "#888", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />Searching...</>
              : "Search →"
            }
          </button>
        </div>

        {/* Categories */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
          {CATEGORIES.map((cat) => (
            <button key={cat.id} onClick={() => handleCategory(cat.id)} disabled={loading} style={{
              padding: "7px 14px", borderRadius: 20, cursor: "pointer",
              border: category === cat.id ? "1.5px solid #e8261b" : "1.5px solid #1e1e1e",
              background: category === cat.id ? "#e8261b" : "#111",
              color: category === cat.id ? "#fff" : "#666",
              fontSize: 12, fontWeight: category === cat.id ? 700 : 500,
              transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5,
            }}>
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px 60px" }}>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ width: 44, height: 44, border: "3px solid #1e1e1e", borderTopColor: "#e8261b", borderRadius: "50%", margin: "0 auto 20px", animation: "spin 0.8s linear infinite" }} />
            <div style={{ color: "#555", fontSize: 14 }}>Fetching Costco products via local proxy...</div>
          </div>
        )}

        {/* Error */}
        {!loading && error && error !== "LOCAL_PROXY_DOWN" && (
          <div style={{ padding: "14px 20px", background: "#1a0800", border: "1px solid #3a1a00", borderRadius: 8, color: "#ff6b35", fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Results */}
        {!loading && products.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: "1px solid #1a1a1a" }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#555", textTransform: "uppercase" }}>{products.length} Products</span>
              <div style={{ flex: 1, height: 1, background: "#1a1a1a" }} />
              <span style={{ fontSize: 11, color: "#3a6e00", background: "#1a2200", padding: "3px 8px", borderRadius: 4, fontWeight: 600 }}>✓ Live from Costco</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
              {products.map((p, i) => <ProductCard key={i} p={p} />)}
            </div>
          </>
        )}

        {/* Idle */}
        {!loading && !searched && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🛒</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#333" }}>Search Costco deals in real time</div>
            <div style={{ fontSize: 13, color: "#2a2a2a", marginTop: 8 }}>Pick a category or type a product to get started</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
              {["65 inch TV", "protein powder", "air fryer", "diamond ring", "laptop"].map(q => (
                <button key={q} onClick={() => { setInputVal(q); fetchProducts(category, q); }} style={{
                  padding: "7px 14px", borderRadius: 20, border: "1px solid #222", background: "#111",
                  color: "#555", fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#e8261b"; e.currentTarget.style.color = "#f0ede8"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#222"; e.currentTarget.style.color = "#555"; }}
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
      `}</style>
    </div>
  );
}
