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
