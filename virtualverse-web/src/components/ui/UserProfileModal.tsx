"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { CosmeticItem, updateDisplayName } from "@/lib/api";
import { useAttendance } from "@/hooks/useAttendance";

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
const ASSET_REGISTRY_ADDRESS = "0x87a8d36762714F21dB72F7d76f49Ce724ebBa95a";
const CREDENTIAL_SBT_ADDRESS = "0xC87276b3e407f20e52743E1B6a4cF70E759BCe30";
const ATTENDANCE_REGISTRY_ADDRESS = "0xe9927909b0067D2d82F36145f1F348236FFf1355";

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
  const { 
    checkInCount, 
    checkIns, 
    latestCheckIn, 
    hasReachedThreshold, 
    attendanceThreshold 
  } = useAttendance();
  
  // Type-safe access to attendance data
  const checkInCountNum = (checkInCount.data as number) ?? 0;
  const attendanceThresholdNum = (attendanceThreshold.data as number) ?? 10;
  const hasReachedThresholdBool = (hasReachedThreshold.data as boolean) ?? false;
  const latestCheckInData = latestCheckIn.data as { timestamp: number; roomId: string; sessionId: number } | null;
  const checkInsData = checkIns.data as Array<{ timestamp: number; roomId: string; sessionId: number }> | null;
  const [activeTab, setActiveTab] = useState<"profile" | "wallet" | "assets" | "attendance">("profile");

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
          <button
            onClick={() => setActiveTab("attendance")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "attendance"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-md shadow-emerald-500/20"
                : "text-emerald-400/60 hover:text-white hover:bg-emerald-950/40"
            }`}
          >
            📅 Attendance ({checkInCountNum})
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

        {activeTab === "attendance" && (
          <div className="space-y-5">
            {/* Attendance Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-[#0d2215] border border-emerald-500/30 text-center">
                <div className="text-4xl font-black text-emerald-400 mb-1">
                  {checkInCountNum}
                </div>
                <div className="text-xs text-emerald-400/70 uppercase tracking-wider">
                  Total Check-ins
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-[#0d2215] border border-emerald-500/30 text-center">
                <div className="text-4xl font-black text-emerald-400 mb-1">
                  {attendanceThresholdNum}
                </div>
                <div className="text-xs text-emerald-400/70 uppercase tracking-wider">
                  Threshold for Proof of Attendance
                </div>
              </div>
            </div>

            {/* Progress to Proof of Attendance */}
            <div className="p-5 rounded-2xl bg-[#0d2215] border border-emerald-500/30">
              <div className="flex items-center justify-between text-xs text-emerald-400/80 mb-2">
                <span>Progress to Proof of Attendance SBT</span>
                <span className="font-bold text-emerald-300">
                  {checkInCountNum} / {attendanceThresholdNum}
                </span>
              </div>
              <div className="h-3 bg-[#07130b] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (checkInCountNum / attendanceThresholdNum) * 100)}%`,
                  }}
                />
              </div>
              {hasReachedThresholdBool && (
                <div className="mt-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-center text-sm">
                  ✅ Threshold reached! Proof of Attendance SBT available.
                </div>
              )}
            </div>

            {/* Latest Check-in */}
            {latestCheckInData && latestCheckInData.timestamp > 0 && (
              <div className="p-5 rounded-2xl bg-[#0d2215] border border-emerald-500/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Latest Check-in
                  </span>
                  <span className="text-[10px] font-mono text-emerald-500/60">
                    Session #{latestCheckInData.sessionId}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold text-white">
                      {new Date(Number(latestCheckInData.timestamp) * 1000).toLocaleDateString()}
                    </div>
                    <div className="text-[10px] text-emerald-400/70 uppercase">Date</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">
                      {new Date(Number(latestCheckInData.timestamp) * 1000).toLocaleTimeString()}
                    </div>
                    <div className="text-[10px] text-emerald-400/70 uppercase">Time</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white truncate">
                      {latestCheckInData.roomId}
                    </div>
                    <div className="text-[10px] text-emerald-400/70 uppercase">World</div>
                  </div>
                </div>
              </div>
            )}

            {/* Check-in History */}
            {checkInsData && checkInsData.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Check-in History ({checkInsData.length})
                  </span>
                </div>
                <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2">
                  {checkInsData.slice().reverse().map((checkIn, index: number) => (
                    <div
                      key={index}
                      className="p-4 rounded-2xl bg-[#0d2215] border border-emerald-500/20 flex items-center justify-between gap-3 hover:border-emerald-400/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xl shrink-0">
                          📍
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white truncate max-w-[150px]">
                            {checkIn.roomId}
                          </div>
                          <div className="text-[10px] font-mono text-emerald-400/60">
                            Session #{checkIn.sessionId}
                          </div>
                        </div>
                      </div>
                      <div className="text-right min-w-[120px]">
                        <div className="text-xs font-mono text-white">
                          {new Date(Number(checkIn.timestamp) * 1000).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] text-emerald-400/70">
                          {new Date(Number(checkIn.timestamp) * 1000).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!checkInsData || checkInsData.length === 0) && (
              <div className="p-8 rounded-2xl bg-[#0d2215] border border-emerald-500/20 text-center text-emerald-400/50">
                <div className="text-4xl mb-2">📅</div>
                <p className="text-sm">No check-ins yet</p>
                <p className="text-xs text-emerald-400/50 mt-1">
                  Join a world to start building your attendance record!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
