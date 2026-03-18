import { useState } from "react";

const BRANDS = [
  { id: "guess", name: "Guess", emoji: "👜" },
  { id: "michael_kors", name: "Michael Kors", emoji: "💼" },
  { id: "calvin_klein", name: "Calvin Klein", emoji: "🖤" },
  { id: "tommy_hilfiger", name: "Tommy Hilfiger", emoji: "⚓" },
  { id: "adidas", name: "Adidas", emoji: "🦶" },
  { id: "nike", name: "Nike", emoji: "✔️" },
];

const CATEGORIES = ["All", "Bags", "Shoes", "Clothing", "Accessories", "Jackets"];
const API_BASE = "";

export default function App() {
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const toggleBrand = (id) => {
    setSelectedBrands((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const handleSearch = async () => {
    const brands =
      selectedBrands.length > 0
        ? BRANDS.filter((b) => selectedBrands.includes(b.id)).map((b) => b.name)
        : BRANDS.map((b) => b.name);

    setLoading(true);
    setError(null);
    setResults([]);
    setSearched(true);

    try {
      const res = await fetch(`${API_BASE}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brands, category: selectedCategory, query: query.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed.");
      setResults(data.products || []);
    } catch (err) {
      setError(err.message || "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getBrandMeta = (brandName) =>
    BRANDS.find((b) => b.name.toLowerCase() === brandName?.toLowerCase()) || {};

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: "'DM Sans','Helvetica Neue',Helvetica,sans-serif", color: "#f0ede8" }}>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1e1e1e", padding: "32px 40px 28px", background: "linear-gradient(180deg,#0d0d0d 0%,#0a0a0a 100%)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>
              PRICE<span style={{ color: "#c8f04c" }}>HUNT</span>
            </h1>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", color: "#555", textTransform: "uppercase" }}>Fashion Intelligence</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#666" }}>
            Real products & prices scraped live from official brand websites
          </p>
        </div>
      </div>

      {/* Main */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 40px" }}>

        {/* Brand Selector */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#666", textTransform: "uppercase", marginBottom: 12 }}>Select Brands</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {BRANDS.map((brand) => {
              const active = selectedBrands.includes(brand.id);
              return (
                <button key={brand.id} onClick={() => toggleBrand(brand.id)} style={{
                  padding: "9px 18px", borderRadius: 6, cursor: "pointer",
                  border: active ? "1.5px solid #c8f04c" : "1.5px solid #222",
                  background: active ? "#1a2200" : "#111",
                  color: active ? "#f0ede8" : "#666",
                  fontSize: 13, fontWeight: 600, transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{ fontSize: 15 }}>{brand.emoji}</span>{brand.name}
                </button>
              );
            })}
            {selectedBrands.length > 0 && (
              <button onClick={() => setSelectedBrands([])} style={{ padding: "9px 14px", borderRadius: 6, border: "1.5px dashed #333", background: "transparent", color: "#555", fontSize: 12, cursor: "pointer" }}>
                Clear ✕
              </button>
            )}
          </div>
          {selectedBrands.length === 0 && <div style={{ fontSize: 11, color: "#444", marginTop: 8 }}>No brands selected = search all brands</div>}
        </div>

        {/* Categories */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 28 }}>
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} style={{
              padding: "7px 14px", borderRadius: 20, cursor: "pointer", transition: "all 0.15s",
              border: selectedCategory === cat ? "1.5px solid #c8f04c" : "1.5px solid #1e1e1e",
              background: selectedCategory === cat ? "#c8f04c" : "transparent",
              color: selectedCategory === cat ? "#0a0a0a" : "#555",
              fontSize: 12, fontWeight: selectedCategory === cat ? 700 : 500,
            }}>{cat}</button>
          ))}
        </div>

        {/* Search */}
        <div style={{ display: "flex", gap: 10, marginBottom: 36 }}>
          <input
            type="text"
            placeholder='e.g. "leather handbag", "white sneakers", "puffer jacket"...'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleSearch()}
            style={{ flex: 1, padding: "14px 18px", background: "#111", border: "1.5px solid #222", borderRadius: 8, color: "#f0ede8", fontSize: 14, outline: "none", fontFamily: "inherit" }}
          />
          <button onClick={handleSearch} disabled={loading} style={{
            padding: "14px 28px", borderRadius: 8, border: "none", cursor: loading ? "not-allowed" : "pointer",
            background: loading ? "#1e1e1e" : "#c8f04c", color: loading ? "#555" : "#0a0a0a",
            fontSize: 14, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase",
            transition: "all 0.15s", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 8,
          }}>
            {loading ? (<><span style={{ width: 14, height: 14, border: "2px solid #444", borderTopColor: "#888", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />Scraping sites...</>) : "Search →"}
          </button>
        </div>

        {/* Error */}
        {error && <div style={{ padding: "16px 20px", background: "#1a0a0a", border: "1px solid #3a1a1a", borderRadius: 8, color: "#ff6b6b", fontSize: 13, marginBottom: 24 }}>⚠️ {error}</div>}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ width: 40, height: 40, border: "3px solid #1e1e1e", borderTopColor: "#c8f04c", borderRadius: "50%", margin: "0 auto 20px", animation: "spin 0.8s linear infinite" }} />
            <div style={{ color: "#555", fontSize: 14 }}>Searching official brand websites one by one...</div>
            <div style={{ color: "#333", fontSize: 12, marginTop: 6 }}>Each brand takes ~5s — searching ${brands?.length || 6} brands takes ~${(brands?.length || 6) * 5}s</div>
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid #1a1a1a" }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#666", textTransform: "uppercase" }}>{results.length} Real Products Found</span>
              <div style={{ flex: 1, height: 1, background: "#1a1a1a" }} />
              <span style={{ fontSize: 11, color: "#3a6e00", background: "#1a2200", padding: "3px 8px", borderRadius: 4, fontWeight: 600 }}>✓ Scraped from official sites</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {results.map((product, i) => {
                const meta = getBrandMeta(product.brand);
                return (
                  <div key={i}
                    style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", transition: "border-color 0.15s" }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = "#2e2e2e"}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = "#1e1e1e"}
                  >
                    {/* Product image */}
                    {product.image && (
                      <div style={{ width: "100%", height: 200, background: "#161616", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img
                          src={product.image}
                          alt={product.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => { e.target.parentElement.style.display = "none"; }}
                        />
                      </div>
                    )}

                    <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                      {/* Brand + sale badge */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", display: "flex", alignItems: "center", gap: 5 }}>
                          {meta.emoji} {product.brand}
                        </span>
                        {product.sale && (
                          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", background: "#c8f04c", color: "#0a0a0a", padding: "3px 8px", borderRadius: 4 }}>
                            SALE
                          </span>
                        )}
                      </div>

                      {/* Name */}
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#f0ede8", lineHeight: 1.35, letterSpacing: "-0.01em" }}>
                        {product.name}
                      </div>

                      {/* Category + source */}
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>{product.category}</span>
                        {product.source && (
                          <>
                            <span style={{ color: "#2a2a2a" }}>·</span>
                            <span style={{ fontSize: 10, color: "#3a6e00", fontWeight: 700, letterSpacing: "0.06em" }}>✓ {product.source}</span>
                          </>
                        )}
                      </div>

                      {/* Price */}
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                        <span style={{ fontSize: 22, fontWeight: 800, color: "#c8f04c", letterSpacing: "-0.02em" }}>
                          {product.price || "—"}
                        </span>
                        {product.sale && product.originalPrice && (
                          <span style={{ fontSize: 13, color: "#444", textDecoration: "line-through" }}>{product.originalPrice}</span>
                        )}
                      </div>

                      {/* CTA */}
                      <div style={{ marginTop: "auto", paddingTop: 10 }}>
                        <a href={product.url} target="_blank" rel="noopener noreferrer" style={{
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                          padding: "10px 16px", background: "#c8f04c", borderRadius: 8,
                          color: "#0a0a0a", fontSize: 13, fontWeight: 800, textDecoration: "none",
                          letterSpacing: "0.03em", transition: "opacity 0.15s",
                        }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                        >
                          View on {product.source || "Official Site"} ↗
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Empty */}
        {!loading && searched && results.length === 0 && !error && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#555" }}>No products found</div>
            <div style={{ fontSize: 13, marginTop: 6, color: "#333" }}>Try a broader search term or different brand</div>
          </div>
        )}

        {/* Idle */}
        {!loading && !searched && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🏷️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#444", letterSpacing: "-0.01em" }}>Real products, real prices, real links</div>
            <div style={{ fontSize: 13, color: "#333", marginTop: 8, maxWidth: 420, margin: "8px auto 0" }}>
              Searches are scraped live from official brand websites — every result links to the real product page.
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input::placeholder { color: #333; }
        input:focus { border-color: #333 !important; }
      `}</style>
    </div>
  );
}
