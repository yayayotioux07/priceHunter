import { useState } from "react";

const BRANDS = [
  {
    id: "guess",
    name: "Guess",
    emoji: "👜",
    site: "guess.com",
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
    id: "michael_kors",
    name: "Michael Kors",
    emoji: "💼",
    site: "michaelkors.com",
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
    id: "calvin_klein",
    name: "Calvin Klein",
    emoji: "🖤",
    site: "calvinklein.us",
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
    id: "tommy_hilfiger",
    name: "Tommy Hilfiger",
    emoji: "⚓",
    site: "tommy.com",
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
    id: "adidas",
    name: "Adidas",
    emoji: "🦶",
    site: "adidas.com",
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
    id: "nike",
    name: "Nike",
    emoji: "✔️",
    site: "nike.com",
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

export default function App() {
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const toggleBrand = (id) => {
    setSelectedBrands((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const visibleBrands = selectedBrands.length > 0
    ? BRANDS.filter(b => selectedBrands.includes(b.id))
    : BRANDS;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: "'DM Sans','Helvetica Neue',Helvetica,sans-serif", color: "#f0ede8" }}>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1e1e1e", padding: "32px 40px 28px", background: "linear-gradient(180deg,#0d0d0d 0%,#0a0a0a 100%)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>
              PRICE<span style={{ color: "#c8f04c" }}>HUNT</span>
            </h1>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", color: "#555", textTransform: "uppercase" }}>Fashion Sales</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#666" }}>
            Browse sale sections across top fashion brands — pick a category and go straight to the deals
          </p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 40px 0" }}>

        {/* Brand Selector */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#666", textTransform: "uppercase", marginBottom: 12 }}>
            Filter Brands
          </div>
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
        </div>

        {/* Category Tabs */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 36 }}>
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} style={{
              padding: "8px 16px", borderRadius: 20, cursor: "pointer", transition: "all 0.15s",
              border: selectedCategory === cat ? "1.5px solid #c8f04c" : "1.5px solid #1e1e1e",
              background: selectedCategory === cat ? "#c8f04c" : "transparent",
              color: selectedCategory === cat ? "#0a0a0a" : "#555",
              fontSize: 12, fontWeight: selectedCategory === cat ? 700 : 500,
            }}>{cat}</button>
          ))}
        </div>
      </div>

      {/* Brand Cards Grid */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 40px 60px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#444", textTransform: "uppercase", marginBottom: 20 }}>
          {visibleBrands.length} Brand{visibleBrands.length !== 1 ? "s" : ""} · {selectedCategory} Sale
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {visibleBrands.map((brand) => {
            const saleUrl = brand.sales[selectedCategory] || brand.sales["All"];
            return (
              <div key={brand.id} style={{
                background: "#111", border: "1px solid #1e1e1e", borderRadius: 12,
                overflow: "hidden", transition: "border-color 0.2s",
              }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "#2e2e2e"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "#1e1e1e"}
              >
                {/* Brand header */}
                <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #1a1a1a" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 28 }}>{brand.emoji}</span>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#f0ede8", letterSpacing: "-0.02em" }}>{brand.name}</div>
                        <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{brand.site}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", background: "#c8f04c", color: "#0a0a0a", padding: "4px 10px", borderRadius: 20 }}>
                      SALE
                    </span>
                  </div>
                </div>

                {/* Category links */}
                <div style={{ padding: "16px 24px" }}>
                  <div style={{ fontSize: 11, color: "#444", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
                    Browse by category
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
                    {CATEGORIES.filter(c => c !== "All").map((cat) => {
                      const url = brand.sales[cat] || brand.sales["All"];
                      const isSelected = cat === selectedCategory;
                      return (
                        <a key={cat} href={url} target="_blank" rel="noopener noreferrer" style={{
                          padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                          textDecoration: "none", transition: "all 0.15s",
                          border: isSelected ? "1px solid #c8f04c" : "1px solid #252525",
                          background: isSelected ? "#1a2200" : "transparent",
                          color: isSelected ? "#c8f04c" : "#555",
                        }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = "#f0ede8"; e.currentTarget.style.borderColor = "#444"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = isSelected ? "#c8f04c" : "#555"; e.currentTarget.style.borderColor = isSelected ? "#c8f04c" : "#252525"; }}
                        >
                          {cat}
                        </a>
                      );
                    })}
                  </div>

                  {/* Main CTA */}
                  <a
                    href={saleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      padding: "12px 20px", background: "#c8f04c", borderRadius: 8,
                      color: "#0a0a0a", fontSize: 13, fontWeight: 800,
                      textDecoration: "none", letterSpacing: "0.03em", transition: "opacity 0.15s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                  >
                    Shop {brand.name} {selectedCategory !== "All" ? selectedCategory : ""} Sale ↗
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>
    </div>
  );
}
