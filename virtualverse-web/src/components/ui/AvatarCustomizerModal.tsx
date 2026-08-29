"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { CosmeticItem, updateAvatarConfig } from "@/lib/api";

interface AvatarCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isGuest: boolean;
  avatarConfig: any;
  ownedCosmetics: CosmeticItem[];
  onSaveAvatarConfig: (newConfig: any) => Promise<void>;
}

export function AvatarCustomizerModal({
  isOpen,
  onClose,
  isGuest,
  avatarConfig,
  ownedCosmetics,
  onSaveAvatarConfig,
}: AvatarCustomizerModalProps) {
  const { login, getAccessToken } = usePrivy();
  const [selectedConfig, setSelectedConfig] = useState<any>(avatarConfig || { skin: 1, hat: null, accessory: null, clothing: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Guest conversion view
  if (isGuest) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
        <div className="relative w-full max-w-md bg-[#121226] border border-[#2e2e54] rounded-2xl p-6 shadow-2xl text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>

          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 text-3xl">
            👑
          </div>

          <h2 className="text-xl font-bold text-white mb-2">Log in to customize your avatar</h2>
          <p className="text-sm text-gray-300 mb-6 leading-relaxed">
            Guests are on ephemeral sessions. Log in with Privy to unlock your unique identity, equip your owned ERC-1155 cosmetics, and keep your avatar across sessions!
          </p>

          <div className="space-y-3 mb-6 text-left text-xs text-gray-400 bg-[#1a1a36] p-4 rounded-xl border border-[#2a2a4e]">
            <div className="flex items-center gap-2 text-gray-200">
              <span className="text-indigo-400 font-bold">✓</span> Claim your permanent display name
            </div>
            <div className="flex items-center gap-2 text-gray-200">
              <span className="text-indigo-400 font-bold">✓</span> Access full cosmetic wardrobe (skins, hats, accessories)
            </div>
            <div className="flex items-center gap-2 text-gray-200">
              <span className="text-indigo-400 font-bold">✓</span> Cross-session items & inventory persistence
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              login();
            }}
            className="w-full py-3 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 shadow-lg shadow-indigo-500/25 transition-all transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Log In / Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  // Group cosmetics by slot
  const slots: Array<"skin" | "hat" | "accessory" | "clothing"> = ["skin", "hat", "accessory", "clothing"];
  const groupedCosmetics = slots.reduce((acc, slot) => {
    acc[slot] = ownedCosmetics.filter((c) => c.slot === slot);
    return acc;
  }, {} as Record<string, CosmeticItem[]>);

  const handleSelectCosmetic = (slot: string, tokenId: number | null) => {
    setSelectedConfig((prev: any) => ({
      ...prev,
      [slot]: tokenId,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (token) {
        await updateAvatarConfig(token, selectedConfig);
      }
      await onSaveAvatarConfig(selectedConfig);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save avatar configuration");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-[#121226] border border-[#2e2e54] rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#2a2a4e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-xl">
              🎨
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Avatar Customizer</h2>
              <p className="text-xs text-gray-400">Equip your owned ERC-1155 cosmetics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 text-xs bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl">
            {error}
          </div>
        )}

        {/* Live Preview Box */}
        <div className="mb-6 p-4 rounded-xl bg-[#1a1a36] border border-[#2a2a4e] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-white/10 relative"
              style={{
                backgroundColor:
                  ownedCosmetics.find((c) => c.tokenId === selectedConfig.skin)?.color || "#FFFFFF",
              }}
            >
              {ownedCosmetics.find((c) => c.tokenId === selectedConfig.hat)?.icon || ""}
              {ownedCosmetics.find((c) => c.tokenId === selectedConfig.accessory)?.icon || ""}
            </div>
            <div>
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Preview Avatar</span>
              <p className="text-sm font-medium text-white">
                Skin: #{selectedConfig.skin || 1} · Hat: #{selectedConfig.hat || "None"}
              </p>
            </div>
          </div>
        </div>

        {/* Slot Pickers */}
        <div className="space-y-5">
          {slots.map((slot) => {
            const items = groupedCosmetics[slot] || [];
            return (
              <div key={slot} className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                  <span>{slot}</span>
                  <span className="text-gray-500 text-[11px] lowercase">({items.length} owned)</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectCosmetic(slot, null)}
                    className={`py-2 px-3 text-xs rounded-xl border text-center transition-all ${
                      selectedConfig[slot] === null
                        ? "border-indigo-500 bg-indigo-500/20 text-white font-medium shadow-md shadow-indigo-500/10"
                        : "border-[#2a2a4e] bg-[#16162e] text-gray-400 hover:border-gray-500 hover:text-white"
                    }`}
                  >
                    None
                  </button>
                  {items.map((item) => {
                    const isSelected = selectedConfig[slot] === item.tokenId;
                    return (
                      <button
                        key={item.tokenId}
                        type="button"
                        onClick={() => handleSelectCosmetic(slot, item.tokenId)}
                        className={`py-2 px-3 text-xs rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-500/20 text-white font-medium shadow-md shadow-indigo-500/10"
                            : "border-[#2a2a4e] bg-[#16162e] text-gray-300 hover:border-gray-500 hover:text-white"
                        }`}
                      >
                        {item.icon && <span>{item.icon}</span>}
                        <span className="truncate">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-[#2a2a4e]">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl text-xs font-medium text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="py-2.5 px-6 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
          >
            {saving ? "Saving..." : "Save Avatar"}
          </button>
        </div>
      </div>
    </div>
  );
}
