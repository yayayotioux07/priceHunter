import { useState, useEffect, useRef } from "react";

const BRANDS = [
  { id: "guess",          name: "Guess",           emoji: "👜", site: "guess.com" },
  { id: "michael_kors",   name: "Michael Kors",    emoji: "💼", site: "michaelkors.com" },
  { id: "calvin_klein",   name: "Calvin Klein",    emoji: "🖤", site: "calvinklein.us" },
  { id: "tommy_hilfiger", name: "Tommy Hilfiger",  emoji: "⚓", site: "tommy.com" },
  { id: "adidas",         name: "Adidas",          emoji: "🦶", site: "adidas.com" },
  { id: "nike",           name: "Nike",            emoji: "✔️", site: "nike.com" },
];

const CATEGORIES = ["All", "Bags", "Shoes", "Clothing", "Accessories", "Sneakers", "Jackets"];

function ProductCard({ product }) {
  if (!product?.name) return null;
  return (
    <a href={product.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
      <div
        style={{ background: "#0e0e0e", border: "1px solid #1e1e1e", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column", transition: "border-color 0.15s", height: "100%" }}
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

function BrandSection({ brand, category }) {
  const [state, setState] = useState("loading");
  const [products, setProducts] = useState([]);
  const [saleUrl, setSaleUrl] = useState("#");
  const loadedKey = useRef(null);

  useEffect(() => {
    const key = `${brand.id}-${category}`;
    if (loadedKey.current === key) return;
    loadedKey.current = key;

    setState("loading");
    setProducts([]);

    fetch(`/api/products/${brand.id}?category=${encodeURIComponent(category)}`)
      .then(r => r.json())
      .then(data => {
        setSaleUrl(data.saleUrl || "#");
        if (data.products?.length > 0) {
          setProducts(data.products);
          setState("done");
        } else {
          setState("blocked");
        }
      })
      .catch(() => setState("error"));
  }, [brand.id, category]);

  return (
    <div style={{ marginBottom: 48 }}>
      {/* Brand header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid #1a1a1a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>{brand.emoji}</span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#f0ede8", letterSpacing: "-0.02em" }}>{brand.name}</div>
            <div style={{ fontSize: 11, color: "#444" }}>{brand.site} · {category} Sale</div>
          </div>
        </div>
        <a href={saleUrl} target="_blank" rel="noopener noreferrer" style={{
          padding: "8px 16px", background: "transparent", border: "1px solid #2a2a2a",
          borderRadius: 6, color: "#888", fontSize: 12, fontWeight: 700, textDecoration: "none",
          transition: "all 0.15s",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#f0ede8"; e.currentTarget.style.borderColor = "#444"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#888"; e.currentTarget.style.borderColor = "#2a2a2a"; }}
        >
          View All ↗
        </a>
      </div>

      {state === "loading" && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "24px 0", color: "#555" }}>
          <div style={{ width: 18, height: 18, border: "2px solid #222", borderTopColor: "#c8f04c", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
          <span style={{ fontSize: 13 }}>Loading {brand.name} sale items...</span>
        </div>
      )}

      {(state === "error" || state === "blocked") && (
        <div style={{ padding: "20px 24px", background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ fontSize: 13, color: "#555" }}>
            {brand.name} blocks automated access — browse their sale page directly.
          </div>
          <a href={saleUrl} target="_blank" rel="noopener noreferrer" style={{
            padding: "9px 18px", background: "#c8f04c", borderRadius: 6,
            color: "#0a0a0a", fontSize: 12, fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap",
          }}>
            Shop Sale ↗
          </a>
        </div>
      )}

      {state === "done" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {products.map((p, i) => <ProductCard key={i} product={p} />)}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const toggleBrand = (id) => {
    setSelectedBrands(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const activeBrands = BRANDS.filter(b => selectedBrands.includes(b.id));

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
          <p style={{ margin: 0, fontSize: 13, color: "#555" }}>Select brands to browse their current sale items</p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 40px 0" }}>
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
                  <span style={{ fontSize: 16 }}>{brand.emoji}</span>
                  {brand.name}
                  {active && <span style={{ fontSize: 10, background: "#c8f04c", color: "#0a0a0a", padding: "1px 6px", borderRadius: 10, fontWeight: 800 }}>ON</span>}
                </button>
              );
            })}
            {selectedBrands.length > 0 && (
              <button onClick={() => setSelectedBrands([])} style={{ padding: "10px 14px", borderRadius: 6, border: "1.5px dashed #333", background: "transparent", color: "#555", fontSize: 12, cursor: "pointer" }}>
                Clear ✕
              </button>
            )}
          </div>
        </div>

        {activeBrands.length > 0 && (
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

      {/* Sections */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px 60px" }}>
        {activeBrands.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👆</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#333" }}>Select a brand above to see sale items</div>
            <div style={{ fontSize: 13, color: "#2a2a2a", marginTop: 8 }}>Pick one or more brands to browse their current deals</div>
          </div>
        ) : (
          activeBrands.map(brand => (
            <BrandSection key={`${brand.id}-${selectedCategory}`} brand={brand} category={selectedCategory} />
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
