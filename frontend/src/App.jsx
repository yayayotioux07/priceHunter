import { useState } from "react";

const BRANDS = [
  { id: "guess", name: "Guess", emoji: "👜" },
  { id: "michael_kors", name: "Michael Kors", emoji: "💼" },
  { id: "calvin_klein", name: "Calvin Klein", emoji: "🖤" },
  { id: "tommy_hilfiger", name: "Tommy Hilfiger", emoji: "⚓" },
  { id: "adidas", name: "Adidas", emoji: "🦶" },
  { id: "nike", name: "Nike", emoji: "✔️" },
];

const CATEGORIES = ["All", "Bags", "Shoes", "Clothing", "Accessories", "Sneakers", "Jackets"];
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

  const savings = (product) => {
    if (!product.bestPrice || !product.officialPrice) return null;
    const best = parseFloat(product.bestPrice.replace(/[^0-9.]/g, ""));
    const official = parseFloat(product.officialPrice.replace(/[^0-9.]/g, ""));
    if (isNaN(best) || isNaN(official) || best >= official) return null;
    return Math.round(((official - best) / official) * 100);
  };

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
            Find the best deal + official price for products across top fashion brands
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
            {loading ? (<><span style={{ width: 14, height: 14, border: "2px solid #444", borderTopColor: "#888", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />Searching...</>) : "Search →"}
          </button>
        </div>

        {/* Error */}
        {error && <div style={{ padding: "16px 20px", background: "#1a0a0a", border: "1px solid #3a1a1a", borderRadius: 8, color: "#ff6b6b", fontSize: 13, marginBottom: 24 }}>⚠️ {error}</div>}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ width: 40, height: 40, border: "3px solid #1e1e1e", borderTopColor: "#c8f04c", borderRadius: "50%", margin: "0 auto 20px", animation: "spin 0.8s linear infinite" }} />
            <div style={{ color: "#555", fontSize: 14 }}>Hunting for best prices across all retailers...</div>
            <div style={{ color: "#333", fontSize: 12, marginTop: 6 }}>This may take 15–25 seconds</div>
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid #1a1a1a" }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#666", textTransform: "uppercase" }}>{results.length} Products Found</span>
              <div style={{ flex: 1, height: 1, background: "#1a1a1a" }} />
              <span style={{ fontSize: 11, color: "#3a6e00", background: "#1a2200", padding: "3px 8px", borderRadius: 4, fontWeight: 600 }}>🏷️ Best deal + official price</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
              {results.map((product, i) => {
                const meta = getBrandMeta(product.brand);
                const savingsPct = savings(product);
                return (
                  <div key={i}
                    style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "20px", display: "flex", flexDirection: "column", gap: 10, transition: "border-color 0.15s" }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = "#2e2e2e"}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = "#1e1e1e"}
                  >
                    {/* Brand + savings badge */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", display: "flex", alignItems: "center", gap: 5 }}>
                        {meta.emoji} {product.brand}
                      </span>
                      {savingsPct && (
                        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", background: "#c8f04c", color: "#0a0a0a", padding: "3px 8px", borderRadius: 4 }}>
                          SAVE {savingsPct}%
                        </span>
                      )}
                    </div>

                    {/* Product name */}
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#f0ede8", lineHeight: 1.35, letterSpacing: "-0.01em" }}>
                      {product.name}
                    </div>

                    {/* Category */}
                    <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
                      {product.category}
                    </div>

                    {/* Description */}
                    <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>
                      {product.description}
                    </div>

                    {/* Divider */}
                    <div style={{ height: 1, background: "#1a1a1a", margin: "4px 0" }} />

                    {/* Best price row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c8f04c", marginBottom: 2 }}>
                          🏷️ Best Price
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                          <span style={{ fontSize: 22, fontWeight: 800, color: "#c8f04c", letterSpacing: "-0.02em" }}>
                            {product.bestPrice || "—"}
                          </span>
                          {product.originalPrice && (
                            <span style={{ fontSize: 13, color: "#444", textDecoration: "line-through" }}>{product.originalPrice}</span>
                          )}
                        </div>
                        {product.bestRetailer && (
                          <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{product.bestRetailer}</div>
                        )}
                      </div>
                      {product.bestUrl && (
                        <a href={product.bestUrl} target="_blank" rel="noopener noreferrer" style={{
                          padding: "8px 14px", background: "#c8f04c", border: "none", borderRadius: 6,
                          color: "#0a0a0a", fontSize: 12, fontWeight: 800, textDecoration: "none",
                          letterSpacing: "0.02em", whiteSpace: "nowrap", transition: "opacity 0.15s",
                        }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                        >
                          Buy Deal ↗
                        </a>
                      )}
                    </div>

                    {/* Official price row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0e0e0e", borderRadius: 8, padding: "10px 12px" }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#555", marginBottom: 2 }}>
                          🏬 Official Site
                        </div>
                        <span style={{ fontSize: 18, fontWeight: 700, color: "#888", letterSpacing: "-0.01em" }}>
                          {product.officialPrice || "—"}
                        </span>
                      </div>
                      {product.officialUrl && (
                        <a href={product.officialUrl} target="_blank" rel="noopener noreferrer" style={{
                          padding: "7px 12px", background: "transparent", border: "1px solid #2a2a2a",
                          borderRadius: 6, color: "#666", fontSize: 12, fontWeight: 600,
                          textDecoration: "none", whiteSpace: "nowrap", transition: "all 0.15s",
                        }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = "#f0ede8"; e.currentTarget.style.borderColor = "#444"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "#666"; e.currentTarget.style.borderColor = "#2a2a2a"; }}
                        >
                          Official ↗
                        </a>
                      )}
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
            <div style={{ fontSize: 13, marginTop: 6, color: "#333" }}>Try a different search term or brand</div>
          </div>
        )}

        {/* Idle */}
        {!loading && !searched && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🏷️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#444", letterSpacing: "-0.01em" }}>Find the best deal across all retailers</div>
            <div style={{ fontSize: 13, color: "#333", marginTop: 8, maxWidth: 420, margin: "8px auto 0" }}>
              Each result shows the lowest price online + the official brand price — so you always know how much you're saving.
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
