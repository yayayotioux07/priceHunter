# CostcoHunt Local Proxy

This runs on YOUR Windows machine and fetches Costco pages using your home IP.
Costco blocks datacenter IPs (like Railway) but not regular home IPs.

## Setup (one time only)

1. Open PowerShell
2. Navigate to this folder:
   cd "C:\Users\Me_\Desktop\Programming Projects\pricehunt\proxy"
3. Install dependencies:
   npm install
4. Start the proxy:
   node proxy.js

## Usage

Keep the proxy running in a PowerShell window whenever you use the app.
The app at your Railway URL will automatically use it.

## How it works

Browser (Railway URL) → Local Proxy (localhost:3333) → Costco.com
Your home IP is not blocked by Costco, so it works!
