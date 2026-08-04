# virtualverse-docs

Architecture diagrams, API reference, and deployment guide for the VirtualVerse platform.

## Contents

| Path | Description |
|------|-------------|
| [`diagrams/system-overview.mmd`](diagrams/system-overview.mmd) | Full system architecture: Windows client → Cloudflare → Ubuntu stack |
| [`diagrams/colyseus-proximity-flow.mmd`](diagrams/colyseus-proximity-flow.mmd) | Colyseus input, prediction, reconciliation, and proximity event flow |
| [`diagrams/livekit-token-flow.mmd`](diagrams/livekit-token-flow.mmd) | LiveKit token fetch, room join, video publish/subscribe, disconnect |
| [`api/README.md`](api/README.md) | API reference — points to server's `openapi.json` as source of truth |
| [`DEPLOY.md`](DEPLOY.md) | End-to-end deployment guide + cross-machine troubleshooting |

## Viewing Mermaid Diagrams

All diagrams are `.mmd` files (plain text, diffable). View them with:

- **VS Code:** Install the [Mermaid Preview](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) extension
- **GitHub:** Renders automatically in `.md` files with ` ```mermaid ` fences
- **Online:** Paste into [mermaid.live](https://mermaid.live)

## Stack Overview

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Game engine | Phaser 3 |
| Multiplayer | Colyseus (MapRoom on NestJS) |
| Voice/Video | LiveKit |
| Backend | NestJS + PostgreSQL + Redis + MinIO |
| Tunnel | Cloudflare Tunnel (free tier — ephemeral URL) |
| Hosting (frontend) | Vercel |
| CI | GitHub Actions (lint + build on PR) |

## Quick Links (current tunnel)

> ⚠️ These URLs change when Ubuntu restarts. See [DEPLOY.md § Stale Tunnel URLs](DEPLOY.md#stale-tunnel-urls).

- API: `https://nursery-directive-gray-jennifer.trycloudflare.com`
- Swagger: `https://nursery-directive-gray-jennifer.trycloudflare.com/api`
- Colyseus Monitor: `http://localhost:3001/colyseus` _(Ubuntu local only)_
