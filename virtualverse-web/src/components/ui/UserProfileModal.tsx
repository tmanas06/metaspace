"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { CosmeticItem, updateDisplayName } from "@/lib/api";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  isGuest: boolean;
  avatarConfig: any;
  ownedCosmetics: CosmeticItem[];
  privyToken: string | null;
  onSaveDisplayName?: (newName: string) => void;
}

const MONAD_TESTNET_RPC = "https://testnet-rpc.monad.xyz";
const ASSET_REGISTRY_ADDRESS = "0x3d44601a676d63E68F4F9D376dA75D9F027CDe06";
const CREDENTIAL_SBT_ADDRESS = "0x0B6b73CB70949d2d3143B866aB0cD33fD6aa8474";

const DEFAULT_COSMETICS = [
  { id: "hat_cyber_helm", name: "Cyber Visor Helmet", type: "hat", tokenId: 1, balance: 1, rarity: "Legendary", icon: "🥽" },
  { id: "clothing_neo_jacket", name: "Neon Matrix Duster", type: "clothing", tokenId: 2, balance: 1, rarity: "Rare", icon: "🥼" },
  { id: "accessory_gold_chain", name: "Web3 Diamond Pendant", type: "accessory", tokenId: 3, balance: 1, rarity: "Epic", icon: "💎" },
  { id: "sbt_early_builder", name: "VirtualVerse Genesis Builder SBT", type: "sbt", tokenId: 101, balance: 1, rarity: "Soulbound", icon: "📜" },
];

export function UserProfileModal({
  isOpen,
  onClose,
  username,
  isGuest,
  avatarConfig,
  ownedCosmetics,
  privyToken,
  onSaveDisplayName,
}: UserProfileModalProps) {
  const { user: privyUser, logout } = usePrivy();
  const [activeTab, setActiveTab] = useState<"profile" | "wallet" | "assets">("profile");

  const [displayName, setDisplayName] = useState(username || "Web3 Explorer");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const [monBalance, setMonBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const walletAddress = privyUser?.wallet?.address || privyUser?.id?.slice(0, 18) || null;

  // Update display name input when username prop changes
  useEffect(() => {
    if (username) setDisplayName(username);
  }, [username]);

  // Fetch MON balance on Monad Testnet when Wallet tab is selected
  useEffect(() => {
    if (activeTab === "wallet" && walletAddress && walletAddress.startsWith("0x")) {
      setIsLoadingBalance(true);
      fetch(MONAD_TESTNET_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_getBalance",
          params: [walletAddress, "latest"],
          id: 1,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.result) {
            const wei = BigInt(data.result);
            const mon = Number(wei) / 1e18;
            setMonBalance(mon.toFixed(4));
          } else {
            setMonBalance("0.0000");
          }
        })
        .catch(() => setMonBalance("0.0000"))
        .finally(() => setIsLoadingBalance(false));
    }
  }, [activeTab, walletAddress]);

  if (!isOpen) return null;

  const handleCopyAddress = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveProfile = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) return;
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      if (privyToken && !isGuest) {
        try {
          await updateDisplayName(privyToken, trimmed);
        } catch (err) {
          console.warn("[UserProfileModal] Backend update error:", err);
        }
      }
      if (onSaveDisplayName) {
        onSaveDisplayName(trimmed);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const displayCosmetics = ownedCosmetics.length > 0 ? ownedCosmetics : DEFAULT_COSMETICS;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#07160d]/95 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(16,185,129,0.2)] relative text-white">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 flex items-center justify-center transition-colors cursor-pointer"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-lg shadow-emerald-500/30 shrink-0">
            <img src="/virtualverse-icon.jpg" alt="User Avatar" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-green-300">
                {displayName}
              </h2>
              {isGuest ? (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold uppercase">
                  Guest
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Verified Privy User
                </span>
              )}
            </div>
            {walletAddress && (
              <p className="text-xs text-emerald-400/70 font-mono mt-1">
                {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
              </p>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-emerald-500/20 pb-3 mb-6">
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "profile"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-md shadow-emerald-500/20"
                : "text-emerald-400/60 hover:text-white hover:bg-emerald-950/40"
            }`}
          >
            👤 Profile & Account
          </button>
          <button
            onClick={() => setActiveTab("wallet")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "wallet"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-md shadow-emerald-500/20"
                : "text-emerald-400/60 hover:text-white hover:bg-emerald-950/40"
            }`}
          >
            👛 Wallet & Balance
          </button>
          <button
            onClick={() => setActiveTab("assets")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "assets"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-md shadow-emerald-500/20"
                : "text-emerald-400/60 hover:text-white hover:bg-emerald-950/40"
            }`}
          >
            💎 NFTs & ERC-1155 Assets ({displayCosmetics.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "profile" && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                Display Name
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={32}
                  className="flex-1 bg-[#0d2215] border border-emerald-500/30 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400 transition-colors"
                  placeholder="Enter custom display name (up to 32 characters)"
                />
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : savedSuccess ? "✓ Saved!" : "Update Name"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-[#0d2215]/60 border border-emerald-500/20">
                <span className="text-[11px] font-medium text-emerald-400/60 uppercase block">Session Type</span>
                <span className="text-sm font-bold text-white mt-1 block">
                  {isGuest ? "Ephemeral Guest Session" : "Privy Wallet Session"}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-[#0d2215]/60 border border-emerald-500/20">
                <span className="text-[11px] font-medium text-emerald-400/60 uppercase block">Privy User ID</span>
                <span className="text-xs font-mono text-emerald-300 mt-1 block truncate">
                  {privyUser?.id || "N/A (Guest Session)"}
                </span>
              </div>
            </div>

            {!isGuest && (
              <div className="pt-4 border-t border-emerald-500/20 flex justify-end">
                <button
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  🚪 Sign Out of Privy
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "wallet" && (
          <div className="space-y-5">
            {/* Wallet Address Card */}
            <div className="p-5 rounded-2xl bg-[#0d2215] border border-emerald-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  EVM Wallet Address
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  Chain ID: 10143
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 bg-[#07130b] p-3 rounded-xl border border-emerald-900/40">
                <span className="text-xs font-mono text-emerald-200 truncate">
                  {walletAddress || "No wallet connected"}
                </span>
                {walletAddress && (
                  <button
                    onClick={handleCopyAddress}
                    className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold rounded-lg transition-colors shrink-0 cursor-pointer"
                  >
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                )}
              </div>
            </div>

            {/* Network & Balance Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-[#0d2215] border border-emerald-500/30">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                  Monad Testnet Balance
                </span>
                <div className="text-2xl font-black text-white mt-2">
                  {isLoadingBalance ? (
                    <span className="text-sm text-emerald-400/50 animate-pulse">Loading balance...</span>
                  ) : (
                    <span>{monBalance ?? "0.0000"} MON</span>
                  )}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0d2215] border border-emerald-500/30">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                  Network Details
                </span>
                <div className="text-xs text-emerald-300/80 space-y-1 mt-2 font-mono">
                  <div>Network: Monad Testnet</div>
                  <div>RPC: https://testnet-rpc.monad.xyz</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "assets" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-emerald-400/80 mb-1">
              <span>Onchain Contracts: ERC-1155 & ERC-721 Soulbound</span>
              <span className="font-mono text-[10px] text-emerald-400/60">Monad Testnet (10143)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[300px] overflow-y-auto pr-1">
              {displayCosmetics.map((item) => (
                <div
                  key={item.id || item.tokenId}
                  className="p-4 rounded-2xl bg-[#0d2215] border border-emerald-500/30 flex items-start gap-3.5 hover:border-emerald-400/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl shrink-0">
                    {item.icon || "📦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                        {item.rarity || "ERC-1155"}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-400/70 mt-1 capitalize">
                      Type: {item.type} · Balance: {item.balance ?? 1}
                    </p>
                    <p className="text-[10px] font-mono text-emerald-500/60 mt-0.5 truncate">
                      Token ID: #{item.tokenId ?? 1}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
