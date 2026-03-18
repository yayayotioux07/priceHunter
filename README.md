# PriceHunt 🏷️

Live fashion product & price lookup across Guess, Michael Kors, Calvin Klein, Tommy Hilfiger, Adidas, and Nike — powered by AI web search.

## Project Structure

```
pricehunt/
├── backend/          # Express API server (proxies Anthropic API)
│   ├── server.js
│   ├── package.json
│   ├── railway.toml
│   └── .env.example
├── frontend/         # Vite + React app
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── railway.toml
│   └── .env.example
└── package.json      # Root (dev runner)
```

## Local Development

```bash
# 1. Install all dependencies
npm run install:all

# 2. Set up backend env
cp backend/.env.example backend/.env
# Edit backend/.env — add your ANTHROPIC_API_KEY

# 3. Run both services
npm run dev
# Backend: http://localhost:3001
# Frontend: http://localhost:5173
```

## Deploy to Railway

Deploy as **two separate Railway services** from the same GitHub repo.

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/pricehunt.git
git push -u origin main
```

### Step 2 — Deploy Backend Service
1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Select your repo → **Set Root Directory to `backend`**
3. Add environment variables:
   - `ANTHROPIC_API_KEY` = your Anthropic API key (from console.anthropic.com)
   - `FRONTEND_URL` = your frontend Railway URL (add after frontend is deployed)
   - `PORT` = `3001` (Railway sets this automatically, but good to have)
4. Deploy — copy the generated backend URL (e.g. `https://pricehunt-backend.railway.app`)

### Step 3 — Deploy Frontend Service
1. New Service → same GitHub repo → **Set Root Directory to `frontend`**
2. Add environment variables:
   - `VITE_API_URL` = your backend Railway URL from Step 2
3. Deploy

### Step 4 — Connect them
- Go back to your **backend service** → Variables
- Set `FRONTEND_URL` = your frontend Railway URL
- Redeploy backend

✅ Done! Your app is live.

## Environment Variables Reference

### Backend (`backend/.env`)
| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `FRONTEND_URL` | Frontend URL for CORS (e.g. `https://pricehunt.railway.app`) |
| `PORT` | Server port (Railway sets automatically) |

### Frontend (`frontend/.env`)
| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL (e.g. `https://pricehunt-backend.railway.app`) |
