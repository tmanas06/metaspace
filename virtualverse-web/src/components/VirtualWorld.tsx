"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { usePrivy } from "@privy-io/react-auth";
import { GameCanvas } from "@/components/GameCanvas";
import { PlayerSidebar } from "@/components/ui/PlayerSidebar";
import { VideoOverlay } from "@/components/ui/VideoOverlay";
import { ChatPanel } from "@/components/ui/ChatPanel";
import { MobileJoystick } from "@/components/ui/MobileJoystick";
import { MapSelectorModal } from "@/components/ui/MapSelectorModal";
import { PermissionsModal } from "@/components/ui/PermissionsModal";
import { ControlsModal } from "@/components/ui/ControlsModal";
import { AvatarCustomizerModal } from "@/components/ui/AvatarCustomizerModal";
import { MenuBar } from "@/components/ui/MenuBar";
import { useColyseus } from "@/hooks/useColyseus";
import { useLiveKit } from "@/hooks/useLiveKit";
import { usePlayers } from "@/hooks/usePlayers";
import {
  fetchRoomPresets,
  FALLBACK_MAP_PRESETS,
  MapPresetData,
  joinRoomAsGuest,
  joinRoomAuthenticated,
  CosmeticItem,
} from "@/lib/api";
import { gameBridge } from "@/game/GameBridge";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

export function VirtualWorld({ onBack }: { onBack?: () => void }) {
  const { login, authenticated, getAccessToken, user: privyUser } = usePrivy();

  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [isGuest, setIsGuest] = useState(true);
  const [avatarConfig, setAvatarConfig] = useState<any>({ skin: 1, color: "#FFFFFF", hat: null, accessory: null, clothing: null });
  const [ownedCosmetics, setOwnedCosmetics] = useState<CosmeticItem[]>([]);
  const [privyToken, setPrivyToken] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  // Map presets state
  const [presets, setPresets] = useState<MapPresetData[]>(FALLBACK_MAP_PRESETS);
  const [selectedMapData, setSelectedMapData] = useState<MapPresetData>(FALLBACK_MAP_PRESETS[0]);

  // Modals state
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);

  const isMobile = useIsMobile();
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  useEffect(() => {
    if (isMobile) setSidebarWidth(0);
    else setSidebarWidth(220);
  }, [isMobile]);

  const colyseus = useColyseus();
  const livekit = useLiveKit();
  const players = usePlayers(username);

  // Auto-dismiss error toasts after 6 seconds
  const activeError = colyseus.error ?? livekit.error;
  useEffect(() => {
    if (activeError) {
      const timer = setTimeout(() => {
        colyseus.clearError();
        livekit.clearError();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [activeError, colyseus, livekit]);

  // Load presets from server REST API on mount
  useEffect(() => {
    fetchRoomPresets().then((list) => {
      setPresets(list);
      if (list.length > 0) {
        const urlMapId =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("map")
            : null;
        const preSelected = urlMapId
          ? list.find((p) => p.id === urlMapId || p.name === urlMapId)
          : null;
        setSelectedMapData(preSelected ?? list[0]);
      }
    });
  }, []);

  // Handle Privy login completion if user logged in via Privy modal
  useEffect(() => {
    if (authenticated && !joined && joining) {
      handleAuthenticatedJoin();
    }
  }, [authenticated, joined, joining]);

  const handleGuestJoin = async () => {
    setJoining(true);
    try {
      const res = await joinRoomAsGuest(selectedMapData.id);
      setIsGuest(true);
      setUsername(res.displayName);
      setAvatarConfig(res.avatarConfig);
      gameBridge.setLocalUsername(res.displayName);
      setJoined(true);

      colyseus.connect(res.displayName, selectedMapData.id, {
        displayName: res.displayName,
        avatarConfig: res.avatarConfig,
        isGuest: true,
      });
      gameBridge.setMapTheme(selectedMapData);
    } catch (e) {
      console.error("[GuestJoin] Error joining as guest:", e);
    } finally {
      setJoining(false);
    }
  };

  const handleAuthenticatedJoin = async () => {
    setJoining(true);
    try {
      if (!authenticated) {
        login();
        return;
      }
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Privy access token unavailable");
      }

      const res = await joinRoomAuthenticated(selectedMapData.id, token);
      setIsGuest(false);
      setUsername(res.displayName);
      setAvatarConfig(res.avatarConfig);
      setOwnedCosmetics(res.ownedCosmetics || []);
      setPrivyToken(token);
      gameBridge.setLocalUsername(res.displayName);
      setJoined(true);

      colyseus.connect(res.displayName, selectedMapData.id, {
        displayName: res.displayName,
        avatarConfig: res.avatarConfig,
        isGuest: false,
        walletAddress: privyUser?.wallet?.address,
      });
      gameBridge.setMapTheme(selectedMapData);
    } catch (e) {
      console.error("[AuthJoin] Error joining authenticated:", e);
    } finally {
      setJoining(false);
    }
  };

  const handleSaveAvatarConfig = async (newConfig: any) => {
    setAvatarConfig(newConfig);
    if (joined && username) {
      colyseus.connect(username, selectedMapData.id, {
        displayName: username,
        avatarConfig: newConfig,
        isGuest,
        walletAddress: privyUser?.wallet?.address,
      });
    }
  };

  const handleSelectMap = (presetData: MapPresetData) => {
    setSelectedMapData(presetData);
    gameBridge.setMapTheme(presetData);
    if (joined && username) {
      colyseus.connect(username, presetData.id, {
        displayName: username,
        avatarConfig,
        isGuest,
        walletAddress: privyUser?.wallet?.address,
      });
    }
  };

  const handleLeave = () => {
    colyseus.disconnect();
    import("@/lib/livekit").then(({ liveKitManager }) => {
      liveKitManager.disconnectProximityRoom();
    });
    setJoined(false);
  };

  if (!joined) {
    return (
      <EntryChoiceScreen
        onGuestJoin={handleGuestJoin}
        onAuthJoin={handleAuthenticatedJoin}
        joining={joining}
        presets={presets}
        selectedMapData={selectedMapData}
        onSelectMap={setSelectedMapData}
        authenticated={authenticated}
      />
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0d0d1a",
        overflow: "hidden",
      }}
    >
      {/* Left Sidebar (Desktop Only) */}
      {!isMobile && (
        <div
          id="sidebar-wrapper"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: sidebarWidth,
            zIndex: 20,
          }}
        >
          <PlayerSidebar
            appName="VirtualVerse"
            players={players}
            localUsername={username}
            onOpenMapSelector={() => setIsMapModalOpen(true)}
            onOpenControls={() => setIsControlsOpen(true)}
            onOpenPermissions={() => setIsPermissionsOpen(true)}
            onLeave={handleLeave}
          />
        </div>
      )}

      {/* Main Viewport (Canvas + Header + Overlays) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: sidebarWidth,
          display: "flex",
          flexDirection: "column",
          transition: "left 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Top Header Bar */}
        <MenuBar
          colyseusStatus={colyseus.status}
          livekitStatus={livekit.status}
          username={username}
          activeMap={selectedMapData.name}
          onOpenMapSelector={() => setIsMapModalOpen(true)}
          onOpenControls={() => setIsControlsOpen(true)}
          onOpenPermissions={() => setIsPermissionsOpen(true)}
          onOpenAvatarCustomizer={() => setIsAvatarModalOpen(true)}
          onLeave={handleLeave}
        />

        {/* Game Canvas Container */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <GameCanvas />

          {/* Floating Proximity Video Tiles (top-right of canvas) */}
          <VideoOverlay
            remoteVideoElements={new Map()}
            username={username}
            onOpenMapSelector={() => setIsMapModalOpen(true)}
            onOpenControls={() => setIsControlsOpen(true)}
            onOpenPermissions={() => setIsPermissionsOpen(true)}
            onToggleChat={() => setIsChatOpen((v) => !v)}
            isChatOpen={isChatOpen}
          />

          {/* Mobile Touch Joystick (bottom-left, visible on phones/tablets) */}
          <MobileJoystick />

          {/* Collapsible Chat Panel (floating over canvas) */}
          <ChatPanel
            username={username}
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
          />
        </div>
      </div>

      {/* Modals */}
      <MapSelectorModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        presets={presets}
        activeMapData={selectedMapData}
        onSelectMap={handleSelectMap}
      />
      <PermissionsModal
        isOpen={isPermissionsOpen}
        onClose={() => setIsPermissionsOpen(false)}
      />
      <ControlsModal
        isOpen={isControlsOpen}
        onClose={() => setIsControlsOpen(false)}
      />
      <AvatarCustomizerModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        isGuest={isGuest}
        avatarConfig={avatarConfig}
        ownedCosmetics={ownedCosmetics}
        privyToken={privyToken}
        onSaveAvatarConfig={handleSaveAvatarConfig}
      />
    </div>
  );
}

interface EntryChoiceScreenProps {
  onGuestJoin: () => void;
  onAuthJoin: () => void;
  joining: boolean;
  presets: MapPresetData[];
  selectedMapData: MapPresetData;
  onSelectMap: (map: MapPresetData) => void;
  authenticated: boolean;
}

const MAP_ACCENTS = ["#6366f1", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#3b82f6", "#14b8a6"];

function EntryChoiceScreen({
  onGuestJoin,
  onAuthJoin,
  joining,
  presets,
  selectedMapData,
  onSelectMap,
  authenticated,
}: EntryChoiceScreenProps) {
  return (
    <div className="fixed inset-0 bg-[#060612] text-white flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-[#0e0e1e] border border-[#242445] rounded-3xl p-8 shadow-2xl relative">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 text-3xl">
            🌌
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-100 to-indigo-200 bg-clip-text text-transparent">
            Welcome to VirtualVerse
          </h1>
          <p className="text-xs text-gray-400 mt-2">
            Choose how you would like to enter the world
          </p>
        </div>

        {/* Map Selection */}
        <div className="mb-8">
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">
            Select World Map
          </label>
          <div className="grid grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
            {presets.map((preset, i) => {
              const accent = MAP_ACCENTS[i % MAP_ACCENTS.length];
              const isSelected = (preset.id || preset.name) === (selectedMapData.id || selectedMapData.name);
              return (
                <button
                  key={preset.id || preset.name}
                  type="button"
                  onClick={() => onSelectMap(preset)}
                  className={`p-3 rounded-2xl border text-left transition-all relative ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-500/15 text-white shadow-md shadow-indigo-500/20"
                      : "border-[#202040] bg-[#14142b] text-gray-400 hover:border-gray-600 hover:text-white"
                  }`}
                >
                  <div className="font-semibold text-xs text-white truncate">{preset.name}</div>
                  <div className="text-[11px] text-gray-400 truncate">{preset.theme || "Spatial Map"}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Identity Choice Actions */}
        <div className="space-y-4">
          <button
            onClick={onGuestJoin}
            disabled={joining}
            className="w-full py-3.5 px-6 rounded-2xl font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-550 shadow-lg shadow-emerald-500/25 transition-all transform active:scale-98 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
          >
            <span className="text-lg">⚡</span>
            <div className="text-left">
              <div className="text-sm">Continue as Guest</div>
              <div className="text-[11px] text-emerald-100/80 font-normal">
                Instant entry · Zero auth · Ephemeral guest-xxxx session
              </div>
            </div>
          </button>

          <button
            onClick={onAuthJoin}
            disabled={joining}
            className="w-full py-3.5 px-6 rounded-2xl font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 shadow-lg shadow-indigo-500/25 transition-all transform active:scale-98 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
          >
            <span className="text-lg">🔑</span>
            <div className="text-left">
              <div className="text-sm">
                {authenticated ? "Enter as Privy User" : "Log in with Privy"}
              </div>
              <div className="text-[11px] text-indigo-100/80 font-normal">
                Owned ERC-1155 avatar cosmetics · Custom display name
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}