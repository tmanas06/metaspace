# VirtualVerse Web — Next.js Frontend

Real-time multiplayer virtual world frontend built with **Next.js 14**, **Phaser 3**, **Colyseus.js**, **LiveKit Client**, **Privy**, **Wagmi/Viem**, and **Tailwind CSS**.

Deployed on Monad Testnet (Chain ID: 10143).

---

## Quick Start

```bash
cd virtualverse-web

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your values

# Start dev server
npm run dev
```

Opens at `http://localhost:3000`

---

## Environment Variables (`.env.local`)

```env
# Privy Authentication (get from https://dashboard.privy.io)
NEXT_PUBLIC_PRIVY_APP_ID=cmte0s73s04wk0cjon946ewcj
NEXT_PUBLIC_PRIVY_CLIENT_ID=

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# LiveKit (for proximity video)
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-host

# Contract addresses (after deployment)
NEXT_PUBLIC_ASSET_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_CREDENTIAL_SBT_ADDRESS=0x...
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Next.js)                        │
│                                                             │
│  LandingPage ──► VirtualWorld (dynamic, ssr:false)        │
│                     │                                       │
│        ┌────────────┼────────────┐                         │
│        ▼            ▼            ▼                         │
│   ┌─────────┐  ┌──────────┐  ┌─────────┐                  │
│   │  Phaser │  │  Colyseus│  │ LiveKit │                  │
│   │  Game   │  │  Manager │  │ Manager │                  │
│   └────┬────┘  └────┬─────┘  └────┬────┘                  │
│        │            │             │                        │
│        └────────────┼─────────────┘                        │
│                     ▼                                     │
│            GameBridge (event bus)                        │
└─────────────────────┼─────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
   ws:// Colyseus           wss:// LiveKit
          │                       │
   ┌──────┴──────┐         ┌──────┴──────┐
   │  NestJS     │         │  LiveKit    │
   │  + Colyseus │         │  Server     │
   └─────────────┘         └─────────────┘
```

---

## Key Features

| Feature | Implementation |
|---------|----------------|
| **Authentication** | Privy (email, wallet, social login + embedded wallets) |
| **Real-time Multiplayer** | Colyseus.js (WebSocket) |
| **Proximity Voice/Video** | LiveKit Client (auto-connects on proximity) |
| **Game Engine** | Phaser 3 (canvas rendering, arcade physics) |
| **Smart Contract Interaction** | Wagmi v2 + Viem (ERC-1155 & ERC-721) |
| **State Management** | React hooks + GameBridge singleton |
| **Styling** | Tailwind CSS |

---

## Project Structure

```
virtualverse-web/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Root: LandingPage → VirtualWorld
│   │   ├── layout.tsx        # Root layout + PrivyProvider
│   │   ├── providers.tsx     # ParaProvider + QueryClientProvider
│   │   └── globals.css       # Tailwind + custom styles
│   ├── components/
│   │   ├── VirtualWorld.tsx  # Main game component (entry screen, game, modals)
│   │   ├── GameCanvas.tsx    # Phaser canvas mount
│   │   ├── LandingPage.tsx   # Marketing/entry page
│   │   ├── PrivyWrapper.tsx  # PrivyProvider wrapper
│   │   └── ui/
│   │       ├── VideoOverlay.tsx      # Proximity video tiles + bottom bar
│   │       ├── PlayerSidebar.tsx     # Left sidebar player roster
│   │       ├── ChatPanel.tsx         # Spatial chat
│   │       ├── MapSelectorModal.tsx  # Map picker
│   │       ├── AvatarCustomizerModal.tsx # ERC-1155 cosmetic picker
│   │       ├── UserProfileModal.tsx  # Profile/wallet/assets tabs
│   │       ├── PermissionsModal.tsx  # Cam/mic permissions
│   │       ├── ControlsModal.tsx     # Keybindings help
│   │       ├── MobileJoystick.tsx    # Touch controls
│   │       ├── MenuBar.tsx           # Top header
│   │       └── StatusBar.tsx         # Connection status
│   ├── game/
│   │   ├── GameBridge.ts     # Singleton event bus (Phaser ↔ React)
│   │   ├── PhaserGame.ts     # Phaser.Game lifecycle
│   │   └── scenes/
│   │       └── MainScene.ts  # Phaser scene (input, render, interpolation)
│   ├── hooks/
│   │   ├── useColyseus.ts    # Colyseus connection + state
│   │   ├── useLiveKit.ts     # LiveKit proximity video
│   │   └── usePlayers.ts     # Player roster for sidebar
│   ├── lib/
│   │   ├── colyseus.ts       # ColyseusManager singleton
│   │   ├── livekit.ts        # LiveKitManager singleton
│   │   ├── api.ts            # REST API + types (MapPresetData, CosmeticItem)
│   │   └── colyseus-types.ts # TypeScript augmentations
│   ├── config/
│   │   └── contracts.ts      # Contract addresses from env
│   ├── abis/
│   │   ├── AssetRegistry.json    # ERC-1155 ABI
│   │   └── CredentialSBT.json    # ERC-721 Soulbound ABI
│   └── types/
│       └── global.d.ts
├── public/                    # Static assets
├── .env.local                 # Environment variables (gitignored)
├── package.json
├── tsconfig.json              # Target: ES2020 (BigInt support)
└── next.config.ts
```

---

## Smart Contract Integration

Two contracts on Monad Testnet:

| Contract | Standard | Purpose |
|----------|----------|---------|
| **AssetRegistry** | ERC-1155 | Avatar skins, room decorations, cosmetics (transferable, batch mint) |
| **CredentialSBT** | ERC-721 Soulbound | Debate badges, attendance proofs (non-transferable, unique per user) |

**Minting flow**: Backend holds `MINTER_ROLE` → signs EIP-712 per (wallet, tokenId) → frontend submits signature to contract.

```typescript
// Hook usage
const { mintWithSignature, balanceOf } = useAssetRegistry();
const { mintWithSignature: mintSBT, hasCredential } = useCredentialSBT();
```

ABIs in `src/abis/` — auto-copied from `contracts/out/` after build.

---

## LiveKit Proximity Video

- Server detects proximity via spatial grid (200px cells)
- Client receives `proximity-start` / `proximity-end` via Colyseus
- `LiveKitManager` connects to shared room `virtualverse_space_main`
- Publishes local cam/mic, subscribes to remote tracks
- Video tiles rendered in `VideoOverlay` (top-right)

---

## Available Scripts

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run format       # Prettier write
npm run format:check # Prettier check
```

---

## Tech Stack Details

- **Next.js 14** (App Router, SSR disabled for game components)
- **React 18** with hooks
- **TypeScript** (strict, ES2020 target for BigInt)
- **Phaser 3.87** (2D game engine)
- **Colyseus.js 0.15** (WebSocket multiplayer)
- **LiveKit Client 2.21** (WebRTC video)
- **Privy React Auth 3.38** (embedded wallets + auth)
- **Wagmi 2.12 + Viem 2.21** (EVM interaction)
- **TanStack Query 5** (server state)
- **Tailwind CSS 4** (utility-first styling)
- **Zustand** (lightweight state)

---

## Deployment (Vercel)

1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

```bash
# Vercel auto-detects Next.js
# Ensure NEXT_PUBLIC_* vars are set in Vercel dashboard
```

---

## Common Issues

| Issue | Fix |
|-------|-----|
| "BigInt literals not available" | Ensure `tsconfig.json` has `"target": "ES2020"` |
| Privy auth 401/glitched | Call `getAccessToken()` fresh per API call (don't cache) |
| Video tiles not showing | Verify `livekitState.remoteVideoElements` passed to `VideoOverlay` |
| Colyseus connection fails | Check `NEXT_PUBLIC_WS_URL` uses `ws://` not `http://` |
| Contract read fails | Verify ABI matches deployed contract; check `NEXT_PUBLIC_*_ADDRESS` |

---

## Related

- **Smart Contracts**: `../contracts/` (Foundry + OpenZeppelin)
- **Backend**: `../../virtualverse-server/` (NestJS + Colyseus + LiveKit)
- **Architecture Docs**: `../../AGENT_HANDOFF.md`, `../../ARCHITECTURE.md`