require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

app.set("trust proxy", 1);
app.use(express.json());

const frontendDist = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendDist));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, () => console.log(`✅ PriceHunt running on port ${PORT}`));
