# VirtualVerse — Full Stack Monorepo

> A self-hosted 2D virtual office/social space with proximity voice/video — like Gather.town but fully open source and onchain.

**Monad Testnet** | **Next.js + Phaser + Colyseus + LiveKit + Privy + Wagmi**

---

## 🏗️ Monorepo Structure

```
virtualverse/
├── metaspace/                    # ← THIS FOLDER
│   ├── contracts/                # Smart contracts (Foundry + OpenZeppelin)
│   │   ├── src/
│   │   │   ├── AssetRegistry.sol      # ERC-1155: avatars, cosmetics, decorations
│   │   │   └── CredentialSBT.sol      # ERC-721 Soulbound: badges, credentials
│   │   ├── script/DeployContracts.s.sol
│   │   ├── out/                       # Compiled artifacts + ABIs
│   │   ├── lib/openzeppelin-contracts/
│   │   ├── foundry.toml
│   │   └── remappings.txt
│   │
│   ├── virtualverse-web/          # Next.js 14 frontend
│   │   ├── src/
│   │   │   ├── app/                 # App Router pages
│   │   │   ├── components/          # React + Phaser components
│   │   │   ├── game/                # Phaser scenes + GameBridge
│   │   │   ├── hooks/               # React hooks (Colyseus, LiveKit, Players)
│   │   │   ├── lib/                 # Singletons (ColyseusManager, LiveKitManager)
│   │   │   ├── abis/                # Contract ABIs (auto-copied from contracts/)
│   │   │   └── config/              # Contract addresses
│   │   ├── public/                  # Static assets
│   │   ├── .env.local               # Environment variables
│   │   └── package.json
│   │
│   └── virtualverse-server/       # NestJS + Colyseus backend
│       ├── src/
│       │   ├── colyseus/            # MapRoom (authoritative game logic)
│       │   ├── livekit/             # Token endpoints
│       │   ├── rooms/               # Map presets, room CRUD
│       │   ├── auth/                # Privy JWT verification
│       │   ├── users/               # User profiles, cosmetics
│       │   ├── sessions/            # Session lifecycle
│       │   └── health/              # Health checks
│       ├── prisma/schema.prisma     # Database schema
│       ├── docker-compose.yml       # Postgres, Redis, LiveKit, MinIO, Nginx
│       └── package.json
│
├── AGENT_HANDOFF.md               # Session-to-session handoff guide
├── ARCHITECTURE.md                # Technical architecture reference
├── PROJECT_STRUCTURE.md           # Project structure overview
└── .monskills                     # Monskills metadata
```

---

## 🚀 Quick Start (All Services)

### 1. Backend (`virtualverse-server`)

```bash
cd metaspace/virtualverse-server

# With Docker (recommended — runs Postgres, Redis, LiveKit, MinIO)
docker compose up -d

# Or bare-metal (needs Postgres + Redis locally)
npm install
npx prisma generate
npm run start:dev
```
Server runs at `http://localhost:3001`
- Swagger: `http://localhost:3001/api`
- Colyseus Monitor: `http://localhost:3001/colyseus`
- Health: `http://localhost:3001/health`

### 2. Smart Contracts (`contracts`)

```bash
cd metaspace/contracts

# Build
forge build

# Deploy to Monad Testnet (requires DEPLOYER_PRIVATE_KEY in .env)
forge script script/DeployContracts.s.sol --rpc-url https://testnet-rpc.monad.xyz --broadcast -vvv

# Verify on MonadVision/Socialscan/Monadscan
# Use verification API: https://agents.devnads.com/v1/verify
```

### 3. Frontend (`virtualverse-web`)

```bash
cd metaspace/virtualverse-web

npm install
cp .env.example .env.local
# Edit .env.local with your values

npm run dev
```
App runs at `http://localhost:3000`

---

## 🔑 Required Environment Variables

### Frontend (`.env.local`)

```env
# Privy (https://dashboard.privy.io)
NEXT_PUBLIC_PRIVY_APP_ID=cmte0s73s04wk0cjon946ewcj
NEXT_PUBLIC_PRIVY_CLIENT_ID=

# Backend
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# LiveKit
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-host

# Contracts (after deployment)
NEXT_PUBLIC_ASSET_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_CREDENTIAL_SBT_ADDRESS=0x...
```

### Backend (`.env`)

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_URL=...
JWT_SECRET=...
PRIVY_APP_ID=...
PRIVY_APP_SECRET=...
PORT=3001
```

### Contracts (`.env`)

```env
MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz
DEPLOYER_PRIVATE_KEY=...
```

---

## 🎮 Features

| Feature | Implementation |
|---------|----------------|
| **Multiplayer Movement** | Boolean input → 20Hz server tick → spatial grid proximity |
| **Proximity Voice/Video** | LiveKit shared room `virtualverse_space_main` |
| **Authentication** | Privy (email/social/wallet + embedded wallets) |
| **Onchain Identity** | ERC-1155 cosmetics + ERC-721 Soulbound credentials |
| **Signature-gated Minting** | Backend signs EIP-712 per (wallet, tokenId) |
| **Real-time Chat** | Colyseus broadcast |
| **Map System** | 7 presets (office, classroom, zen garden, etc.) |
| **Avatar Customization** | Procedural pixel-art + ERC-1155 cosmetics |

---

## 📦 Smart Contracts

| Contract | Standard | Purpose | Key Functions |
|----------|----------|---------|---------------|
| **AssetRegistry** | ERC-1155 | Avatars, decorations, cosmetics | `mintWithSignature`, `mintBatchWithSignature`, `setTokenURI` |
| **CredentialSBT** | ERC-721 Soulbound | Badges, attendance, reputation | `mintWithSignature`, `hasCredential` (non-transferable) |

Both use:
- `AccessControl` with `MINTER_ROLE` / `PAUSER_ROLE`
- `Pausable` for emergency stops
- EIP-712 signature verification
- Deadline-based replay protection

---

## 🔧 Development Commands

### Contracts
```bash
cd metaspace/contracts
forge build              # Compile
forge test               # Run tests
forge fmt                # Format
forge clean              # Clean artifacts
```

### Frontend
```bash
cd metaspace/virtualverse-web
npm run dev              # Dev server
npm run build            # Production build
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit
npm run format           # Prettier
```

### Backend
```bash
cd metaspace/virtualverse-server
npm run start:dev        # Dev with hot reload
npm run build            # Build
npm run start:prod       # Production
npm run test             # Jest
npm run test:e2e         # E2E tests
```

---

## 🌐 Network Configuration

| Network | Chain ID | RPC | Explorer |
|---------|----------|-----|----------|
| Monad Testnet | 10143 | `https://testnet-rpc.monad.xyz` | `https://testnet.monadscan.com` |
| Monad Mainnet | 143 | `https://rpc.monad.xyz` | `https://monadscan.com` |

**LiveKit**: Runs on port 7880 (internal) / 443 (public)

---

## 📚 Documentation

| File | Description |
|------|-------------|
| `AGENT_HANDOFF.md` | Session handoff guide (bug fixes, gotchas, quick start) |
| `ARCHITECTURE.md` | Technical architecture (message flows, internals, inconsistencies) |
| `PROJECT_STRUCTURE.md` | Directory structure + key files |
| `CONNECTION.md` | Tunnel/connection setup |
| `DOCS.md` | Additional backend docs |
| `metaspace/contracts/README.md` | Contract deployment guide |
| `metaspace/virtualverse-web/README.md` | Frontend detailed guide |

---

## 🐛 Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "Token Fetch Failed (401)" | Use `/livekit/proximity-token` (public), not `/livekit/token` (JWT) |
| Players don't move | Client sends `input` (booleans), server handles `onMessage('input')` |
| Privy auth glitches | Call `getAccessToken()` fresh per API call, don't cache |
| Video tiles empty | Pass `livekit.remoteVideoElements` to `VideoOverlay`, not empty Map |
| `NEXT_PUBLIC_WS_URL` fails | Must use `ws://` or `wss://`, not `http://` |
| BigInt TS error | `tsconfig.json` target must be `ES2020` |

---

## 🔗 Related Repos

- **LiveKit**: https://github.com/livekit/livekit
- **Colyseus**: https://github.com/colyseus/colyseus
- **Privy**: https://github.com/privy-io/privy-react-auth
- **Wagmi/Viem**: https://github.com/wagmi-dev/wagmi
- **Phaser**: https://github.com/photonstorm/phaser
- **OpenZeppelin**: https://github.com/OpenZeppelin/openzeppelin-contracts

---
# VirtualVerse Smart Contracts

Solidity smart contracts for **VirtualVerse** deployed on **Monad Testnet**.

## Deployed Contracts (Monad Testnet — Chain ID: 10143)

- **Network**: Monad Testnet (`Chain ID: 10143`)
- **RPC URL**: `https://testnet-rpc.monad.xyz`
- **Deployer Wallet**: `0x556CbecaC2592A70454538f7A0bEff62E271e8cD`

| Contract Name | Standard / Description | Deployed Onchain Address |
|---|---|---|
| **AssetRegistry** | ERC-1155 Multi-Token (Avatars & Cosmetics) | `0x87a8d36762714F21dB72F7d76f49Ce724ebBa95a` |
| **CredentialSBT** | ERC-721 Soulbound Token (Credentials & Badges) | `0xC87276b3e407f20e52743E1B6a4cF70E759BCe30` |
| **AttendanceRegistry** | Event Check-In & Proof of Attendance Tracker | `0xe9927909b0067D2d82F36145f1F348236FFf1355` |

---

## Environment Setup

Create a `.env` file in the `contracts/` directory:

```env
# Monad Testnet RPC
MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz

# Deployer private key (with 0x prefix)
DEPLOYER_PRIVATE_KEY=0x...
```

---

## Foundry Development Commands

### Build
```shell
$HOME/.foundry/bin/forge build
```

### Test
```shell
$HOME/.foundry/bin/forge test
```

### Format
```shell
$HOME/.foundry/bin/forge fmt
```

### Deploy to Monad Testnet
```shell
DEPLOYER_PRIVATE_KEY=0x... $HOME/.foundry/bin/forge script script/DeployContracts.s.sol:DeployContracts --rpc-url https://testnet-rpc.monad.xyz --broadcast --legacy
```

---

## 📄 License

MIT — see individual package.json files for details.

---

## 🤝 Contributing

1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

Built with ❤️ on **Monad** — 10,000 TPS, 400ms blocks, EVM-compatible.
