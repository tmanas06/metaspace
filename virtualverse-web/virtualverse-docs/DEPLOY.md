# DEPLOY.md — VirtualVerse End-to-End Deployment

This document covers both machines end-to-end.

---

## 1. Ubuntu Server (Backend)

> **For detailed server setup, see the `virtualverse-server` repository's own README.**  
> This section summarizes what's running and how to verify it.

### What's running (Docker Compose)

| Service | Port | Description |
|---------|------|-------------|
| `nest` | 3001 | NestJS + Colyseus (REST + WebSocket) |
| `livekit` | 7881 (TCP), 3478/50100-50200 (UDP) | LiveKit media server |
| `postgres` | 5432 | Database |
| `redis` | 6379 | Pub/sub and session cache |
| `minio` | 9000 | Object storage |
| `cloudflared` | — | Cloudflare Tunnel daemon (outbound) |
| `nginx` | 80 | Reverse proxy for nest + livekit |
| `uptime-kuma` | 3002 | Health monitoring |

### Start the server
```bash
cd ~/Desktop/virtualverse-server
docker compose up -d
docker compose ps   # verify all healthy
```

### Get the current tunnel URL
```bash
docker compose logs cloudflared | grep "trycloudflare.com"
```
Copy the URL — it looks like `https://word-word-word-name.trycloudflare.com`.  
This URL **changes on every restart** (see [Stale Tunnel URLs](#stale-tunnel-urls) below).

### Verify server health
- Swagger: `http://localhost:3001/api`
- Colyseus monitor: `http://localhost:3001/colyseus`
- Uptime Kuma: `http://localhost:3002`

---

## 2. Windows Frontend (virtualverse-web)

### Prerequisites
- Node 20+ (`node --version`)
- npm 10+ (`npm --version`)
- Git

### First-time setup
```powershell
# Clone the repo
git clone https://github.com/YOUR_ORG/virtualverse-web.git
cd virtualverse-web

# Install dependencies
npm install

# Set up environment variables
Copy-Item .env.local.example .env.local
# Then edit .env.local and fill in the tunnel URLs from Ubuntu
```

### `.env.local` values to fill in
```
NEXT_PUBLIC_API_URL=https://your-tunnel.trycloudflare.com
NEXT_PUBLIC_WS_URL=wss://your-tunnel.trycloudflare.com
NEXT_PUBLIC_LIVEKIT_URL=wss://your-tunnel.trycloudflare.com
```

> All three currently point to the same Cloudflare Tunnel URL.

### Run locally
```powershell
npm run dev
# Open http://localhost:3000
```

### Verify connection
1. Open `http://localhost:3000`
2. Enter a username → click **Enter World**
3. Status bar should show **Connected** (green dot) within 2–3 seconds
4. Open a second tab with a different username
5. Walk both avatars close together → video overlay should appear

---

## 3. Vercel Deployment

### Connect repo
1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import `virtualverse-web` from GitHub
3. Framework: **Next.js** (auto-detected)

### Set environment variables in Vercel dashboard
Go to **Project → Settings → Environment Variables** and add:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_API_URL` | `https://your-tunnel.trycloudflare.com` |
| `NEXT_PUBLIC_WS_URL` | `wss://your-tunnel.trycloudflare.com` |
| `NEXT_PUBLIC_LIVEKIT_URL` | `wss://your-tunnel.trycloudflare.com` |

> Set these for **Production**, **Preview**, and **Development** environments.  
> Update them every time the tunnel URL changes (see [Stale Tunnel URLs](#stale-tunnel-urls)).

### CI/CD flow
- **Push to any branch** → GitHub Actions runs lint + build
- **Push to `main`** → Vercel auto-deploys (via GitHub integration)
- No manual deploy step needed

---

## 4. Troubleshooting Cross-Machine Issues

### CORS mismatches

**Symptom:** Browser console shows `Access-Control-Allow-Origin` errors on REST requests.

**Fix on Ubuntu:** In `virtualverse-server`, ensure the NestJS CORS config allows the Vercel deploy URL and `localhost:3000`:
```typescript
// main.ts (server side)
app.enableCors({
  origin: [
    'http://localhost:3000',
    'https://your-vercel-app.vercel.app',
    // Add the current tunnel URL if testing through tunnel from frontend
  ],
  credentials: true,
});
```

**If you can't touch the server right now:** Use the browser's `--disable-web-security` flag for local testing only. Never do this in production.

---

### WSS vs WS scheme errors

**Symptom:** Colyseus or LiveKit throws `"WebSocket connection to 'ws://...' failed"` or a mixed-content error.

**Rules:**
- `https://` frontend → must use `wss://` for WebSocket URLs
- `http://` frontend (local dev) → can use `ws://` or `wss://`
- Cloudflare Tunnel always serves `https://` → always use `wss://`

**Check your `.env.local`:** Make sure `NEXT_PUBLIC_WS_URL` starts with `wss://`, not `ws://`.

**In Vercel:** Same — set `wss://`, not `ws://`.

---

### Stale Tunnel URLs after Ubuntu restart

**Symptom:** App shows "Connecting…" forever; browser console shows WebSocket connection refused or HTTPS 502.

**Cause:** The free-tier Cloudflare Tunnel generates a new random subdomain on every `cloudflared` restart.

**Fix:**
1. On Ubuntu, run:
   ```bash
   docker compose logs cloudflared | grep "trycloudflare.com"
   ```
2. Copy the new URL
3. Update **both**:
   - `.env.local` on Windows (for local dev)
   - Environment variables in Vercel dashboard (for production)

**Long-term fix:** Use a [named Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/) with a real domain in `cloudflare-tunnel.yml`. This gives a stable URL that never changes.

---

### Colyseus room not found

**Symptom:** Colyseus throws `"room 'MapRoom' not found"`.

**Fix:** Verify `MapRoom` is registered in the NestJS server:
```bash
# On Ubuntu
docker compose logs nest | grep -i "MapRoom\|colyseus"
```
Also check the Colyseus monitor at `http://localhost:3001/colyseus`.

---

### LiveKit video not appearing

**Symptom:** Status bar shows "In Call" but no video tiles appear.

**Checklist:**
1. Browser has camera/microphone permission (check browser URL bar)
2. `/livekit/token` endpoint returns 200 (check Network tab)
3. `NEXT_PUBLIC_LIVEKIT_URL` is `wss://` not `ws://`
4. The LiveKit server's UDP ports (50100–50200) are reachable — Cloudflare Tunnel only proxies TCP; **UDP WebRTC media goes direct**. This means LiveKit video requires the Ubuntu machine's UDP ports to be open to the internet OR a TURN server to be configured.

**If UDP is blocked:** Configure TURN in LiveKit's `livekit.yml` on Ubuntu, pointing to a TURN server that works over TCP/443.
