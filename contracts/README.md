# VirtualVerse Smart Contracts

Solidity smart contracts for **VirtualVerse** deployed on **Monad Testnet**.

## Deployed Contracts (Monad Testnet — Chain ID: 10143)

- **Network**: Monad Testnet (`Chain ID: 10143`)
- **RPC URL**: `https://testnet-rpc.monad.xyz`
- **Deployer Wallet**: `0x556CbecaC2592A70454538f7A0bEff62E271e8cD`

| Contract Name | Standard | Deployed Onchain Address |
|---|---|---|
| **AssetRegistry** | ERC-1155 Multi-Token (Avatars & Cosmetics) | `0x3d44601a676d63E68F4F9D376dA75D9F027CDe06` |
| **CredentialSBT** | ERC-721 Soulbound Token (Credentials & Badges) | `0x0B6b73CB70949d2d3143B866aB0cD33fD6aa8474` |

---

## Environment Setup

Create a `.env` file in the `contracts/` directory:

```env
# Monad Testnet RPC
MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz

# Deployer private key (without 0x prefix)
DEPLOYER_PRIVATE_KEY=<your_private_key>
```

---

## Foundry Development Commands

### Build
```shell
forge build
```

### Test
```shell
forge test
```

### Format
```shell
forge fmt
```

### Deploy to Monad Testnet
```shell
DEPLOYER_PRIVATE_KEY=<your_private_key> forge script script/DeployContracts.s.sol:DeployContracts --rpc-url https://testnet-rpc.monad.xyz --private-key <your_private_key> --broadcast
```
