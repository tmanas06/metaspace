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
import { UserProfileModal } from "@/components/ui/UserProfileModal";
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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
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
      console.log("[GuestJoin] Guest join response:", res);
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
      
      // Get fresh access token - this will auto-refresh if needed
      const token = await getAccessToken();
      console.log("[AuthJoin] Got access token:", token ? "present" : "MISSING");
      if (!token) {
        throw new Error("Privy access token unavailable - try logging in again");
      }

      const res = await joinRoomAuthenticated(selectedMapData.id, token);
      console.log("[AuthJoin] Authenticated join response:", res);
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
      // Reset joining state on error so user can retry
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

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleLeave = () => {
    colyseus.disconnect();
    import("@/lib/livekit").then(({ liveKitManager }) => {
      liveKitManager.disconnectProximityRoom();
    });
    setJoined(false);
  };

  const handleSidebarCollapse = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    const newWidth = collapsed ? 48 : 220;
    setSidebarWidth(newWidth);
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 260);
  };

  const handleToggleSidebar = () => {
    handleSidebarCollapse(!isSidebarCollapsed);
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
        onBack={onBack}
      />
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#050b07",
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
            transition: "width 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            overflow: "hidden",
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
            onCollapsedChange={handleSidebarCollapse}
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
          left: isMobile ? 0 : sidebarWidth,
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
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onLeave={handleLeave}
          onToggleSidebar={handleToggleSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        {/* Game Canvas Container */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <GameCanvas />

          {/* Floating Proximity Video Tiles (top-right of canvas) */}
          <VideoOverlay
            livekitState={livekit}
            remoteVideoElements={livekit.remoteVideoElements}
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
        onSaveAvatarConfig={handleSaveAvatarConfig}
      />
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        username={username}
        isGuest={isGuest}
        avatarConfig={avatarConfig}
        ownedCosmetics={ownedCosmetics}
        privyToken={privyToken}
        onSaveDisplayName={(newName) => setUsername(newName)}
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
  onBack?: () => void;
}

const MAP_ICONS: Record<string, string> = {
  startup_office: "🏢",
  classroom: "🎓",
  coastal_resort: "🌴",
  event_hall: "🏛️",
  cyberpunk_lounge: "🍸",
  scifi_station: "🚀",
  playground: "🏀",
};

function EntryChoiceScreen({
  onGuestJoin,
  onAuthJoin,
  joining,
  presets,
  selectedMapData,
  onSelectMap,
  authenticated,
  onBack,
}: EntryChoiceScreenProps) {
  return (
    <div className="fixed inset-0 bg-[#040c07] text-white flex items-center justify-center p-4 sm:p-6 overflow-y-auto relative">
      {/* Dynamic ambient radial glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/12 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-4xl bg-[#08170e]/90 border border-emerald-500/25 backdrop-blur-2xl rounded-3xl p-6 sm:p-10 shadow-[0_0_80px_rgba(16,185,129,0.2)] relative z-10 my-auto">
        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-6 left-6 text-xs sm:text-sm text-emerald-400/70 hover:text-emerald-300 flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
          >
            ← Back to Home
          </button>
        )}

        <div className="text-center mb-8 mt-2 sm:mt-0">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-2xl overflow-hidden border border-emerald-500/30 shadow-xl shadow-emerald-500/30">
            <img src="/virtualverse-icon.jpg" alt="VirtualVerse" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-emerald-100 to-green-300 bg-clip-text text-transparent">
            Welcome to VirtualVerse
          </h1>
          <p className="text-xs sm:text-sm text-emerald-300/70 mt-2 max-w-md mx-auto">
            Choose a world map and your identity to enter the real-time spatial metaverse
          </p>
        </div>

        {/* Map Selection Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              1. Select World Map
            </label>
            <span className="text-[11px] text-emerald-400/60 font-medium">
              {presets.length} spaces available
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 max-h-[340px] overflow-y-auto pr-1">
            {presets.map((preset) => {
              const isSelected = (preset.id || preset.name) === (selectedMapData.id || selectedMapData.name);
              const mapIcon = MAP_ICONS[preset.id] || preset.icon || "🗺️";

              return (
                <button
                  key={preset.id || preset.name}
                  type="button"
                  onClick={() => onSelectMap(preset)}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200 relative group cursor-pointer ${
                    isSelected
                      ? "border-emerald-400 bg-emerald-500/20 text-white shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-400/40"
                      : "border-emerald-900/40 bg-[#0c1e13] text-emerald-300/70 hover:border-emerald-500/40 hover:bg-[#0e2417] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{mapIcon}</span>
                    <div className="font-bold text-xs sm:text-sm text-white truncate leading-tight">
                      {preset.name}
                    </div>
                  </div>
                  <div className="text-[11px] text-emerald-400/70 truncate mb-1">
                    {preset.theme || "Spatial Map"}
                  </div>
                  {preset.description && (
                    <div className="text-[10px] text-emerald-300/40 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Identity Choice Actions Grid */}
        <div>
          <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">
            2. Choose Identity & Launch
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={onGuestJoin}
              disabled={joining}
              className="p-5 rounded-2xl font-bold text-white bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 hover:from-emerald-400 hover:to-teal-500 border border-emerald-400/30 shadow-xl shadow-emerald-500/25 transition-all transform active:scale-98 flex items-start gap-4 cursor-pointer disabled:opacity-50 text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl shrink-0">
                ⚡
              </div>
              <div>
                <div className="text-base font-extrabold text-white">Continue as Guest</div>
                <div className="text-xs text-emerald-100/80 font-normal mt-0.5 leading-snug">
                  Instant zero-auth entry with ephemeral <code className="bg-emerald-950/60 px-1 py-0.5 rounded text-emerald-200">guest-xxxx</code> display name
                </div>
              </div>
            </button>

            <button
              onClick={onAuthJoin}
              disabled={joining}
              className="p-5 rounded-2xl font-bold text-white bg-gradient-to-br from-teal-600 via-emerald-600 to-green-700 hover:from-teal-500 hover:to-green-600 border border-teal-400/30 shadow-xl shadow-teal-500/25 transition-all transform active:scale-98 flex items-start gap-4 cursor-pointer disabled:opacity-50 text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl shrink-0">
                🔑
              </div>
              <div>
                <div className="text-base font-extrabold text-white">
                  {authenticated ? "Enter as Privy User" : "Log in with Privy"}
                </div>
                <div className="text-xs text-teal-100/80 font-normal mt-0.5 leading-snug">
                  Full profile with customizable ERC-1155 cosmetics & wallet identity
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}