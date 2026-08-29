"use client";

/**
 * VirtualWorld — the full interactive game world.
 * Executed browser-only via next/dynamic ssr:false.
 *
 * Layout (GatherOffice-style):
 *   ┌──────────┬──────────────────────────────────────┐
 *   │ Sidebar  │         Game Canvas                  │
 *   │ (220px)  │  (fills remaining space)             │
 *   │          │                                      │
 *   │          │  [video tiles: top-right]            │
 *   │          │                                      │
 *   │          │  [bottom bar: centered]              │
 *   └──────────┴──────────────────────────────────────┘
 *
 * Mobile: sidebar starts collapsed (44px), canvas fills the screen.
 */

import { useState, useEffect } from "react";
import { GameCanvas } from "@/components/GameCanvas";
import { PlayerSidebar } from "@/components/ui/PlayerSidebar";
import { VideoOverlay } from "@/components/ui/VideoOverlay";
import { ChatPanel } from "@/components/ui/ChatPanel";
import { MobileJoystick } from "@/components/ui/MobileJoystick";
import { MapSelectorModal } from "@/components/ui/MapSelectorModal";
import { PermissionsModal } from "@/components/ui/PermissionsModal";
import { ControlsModal } from "@/components/ui/ControlsModal";
import { useColyseus } from "@/hooks/useColyseus";
import { useLiveKit } from "@/hooks/useLiveKit";
import { usePlayers } from "@/hooks/usePlayers";
import { fetchRoomPresets, FALLBACK_MAP_PRESETS, MapPresetData } from "@/lib/api";
import { gameBridge } from "@/game/GameBridge";

/** Returns true when the viewport is a phone/tablet (≤ 768 px wide). */
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
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [inputUsername, setInputUsername] = useState("");

  // Map presets state
  const [presets, setPresets] = useState<MapPresetData[]>(FALLBACK_MAP_PRESETS);
  const [selectedMapData, setSelectedMapData] = useState<MapPresetData>(FALLBACK_MAP_PRESETS[0]);

  // Modals & Chat state
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);

  // Responsive: track sidebar width so the canvas wrapper shifts correctly.
  // On mobile screen width is 0 so the canvas fills 100% of the viewport.
  const isMobile = useIsMobile();
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // When mobile status becomes known, set sidebarWidth to 0 for mobile or 220 for desktop.
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
        // Pre-select map from ?map= URL param (from an invite link)
        const urlMapId = typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("map")
          : null;
        const preSelected = urlMapId
          ? list.find((p) => p.id === urlMapId || p.name === urlMapId)
          : null;
        setSelectedMapData(preSelected ?? list[0]);
      }
    });
  }, []);

  // Auto-connect Colyseus when user joins or switches maps
  useEffect(() => {
    if (joined && username) {
      colyseus.connect(username, selectedMapData.id);
      gameBridge.setMapTheme(selectedMapData);
    }
    return () => {
      if (joined) colyseus.disconnect();
    };
  }, [joined, username, selectedMapData.id]);

  // Disconnect cleanly if user closes browser tab, reloads, or swipes browser away on mobile
  useEffect(() => {
    const handleUnload = () => {
      colyseus.disconnect();
      import("@/lib/livekit").then(({ liveKitManager }) => {
        liveKitManager.disconnectProximityRoom();
      });
    };

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, [colyseus]);

  // Update map theme in Phaser when active map changes
  const handleSelectMap = (presetData: MapPresetData) => {
    setSelectedMapData(presetData);
    gameBridge.setMapTheme(presetData);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUsername.trim()) return;
    const trimmed = inputUsername.trim();
    gameBridge.setLocalUsername(trimmed);  // tell Phaser scene the player's name before it starts
    setUsername(trimmed);
    setJoined(true);
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
      <JoinScreen
        onJoin={handleJoin}
        onBack={onBack}
        usernameValue={inputUsername}
        onUsernameChange={setInputUsername}
        presets={presets}
        selectedMapData={selectedMapData}
        onSelectMap={handleSelectMap}
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
      {/* ── Left Sidebar (Desktop Only) ── */}
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
            defaultCollapsed={false}
            onCollapsedChange={(collapsed) => setSidebarWidth(collapsed ? 44 : 220)}
            onInvite={() => {
              const base = window.location.origin + window.location.pathname;
              const mapId = selectedMapData.id || selectedMapData.name;
              return `${base}?map=${encodeURIComponent(mapId)}`;
            }}
          />
        </div>
      )}

      {/* ── Mobile Top-Left Menu / Drawer Toggle Button ── */}
      {isMobile && (
        <button
          id="mobile-drawer-toggle"
          onClick={() => setIsMobileDrawerOpen(true)}
          style={{
            position: "absolute",
            top: "max(12px, env(safe-area-inset-top, 0px))",
            left: 12,
            zIndex: 35,
            background: "rgba(15, 23, 42, 0.88)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(12px)",
            borderRadius: 14,
            padding: "6px 12px 6px 8px",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          }}
          title="Open Players & Menu"
        >
          {/* Hamburger / User Icon */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {(username || "U").slice(0, 2).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.2 }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>Menu</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{players.length} active</span>
          </div>
        </button>
      )}

      {/* ── Mobile Sliding Drawer & Backdrop ── */}
      {isMobile && isMobileDrawerOpen && (
        <>
          {/* Backdrop Blur */}
          <div
            onClick={() => setIsMobileDrawerOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.65)",
              backdropFilter: "blur(4px)",
              zIndex: 45,
            }}
          />
          {/* Sliding Panel */}
          <div
            style={{
              position: "fixed",
              top: 0,
              bottom: 0,
              left: 0,
              width: "min(280px, 85vw)",
              zIndex: 50,
              boxShadow: "8px 0 32px rgba(0,0,0,0.6)",
            }}
          >
            <PlayerSidebar
              appName="VirtualVerse"
              players={players}
              localUsername={username}
              onOpenMapSelector={() => {
                setIsMapModalOpen(true);
                setIsMobileDrawerOpen(false);
              }}
              onOpenControls={() => {
                setIsControlsOpen(true);
                setIsMobileDrawerOpen(false);
              }}
              onOpenPermissions={() => {
                setIsPermissionsOpen(true);
                setIsMobileDrawerOpen(false);
              }}
              onLeave={handleLeave}
              onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
              onInvite={() => {
                const base = window.location.origin + window.location.pathname;
                const mapId = selectedMapData.id || selectedMapData.name;
                return `${base}?map=${encodeURIComponent(mapId)}`;
              }}
            />
          </div>
        </>
      )}

      {/* ── Main Canvas Area — absolute, fills everything right of sidebar ── */}
      <div
        id="canvas-wrapper"
        style={{
          position: "absolute",
          top: 0,
          left: sidebarWidth,
          right: 0,
          bottom: 0,
          overflow: "hidden",
          transition: "left 0.2s ease",
        }}
      >
        {/* Phaser canvas fills this container */}
        <GameCanvas className="absolute inset-0 w-full h-full" />

        {/* UI Overlay — video tiles (top-right) + bottom control bar */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
          }}
        >
          <div style={{ pointerEvents: "auto", width: "100%", height: "100%", position: "relative" }}>
            <VideoOverlay
              livekitState={livekit}
              remoteVideoElements={livekit.remoteVideoElements}
              username={username}
              onOpenMapSelector={() => setIsMapModalOpen(true)}
              onOpenControls={() => setIsControlsOpen(true)}
              onOpenPermissions={() => setIsPermissionsOpen(true)}
              onToggleChat={() => setIsChatOpen((prev) => !prev)}
              isChatOpen={isChatOpen}
            />

            {/* Floating Chat Panel (Bottom Left) */}
            <div
              style={{
                position: "absolute",
                bottom: "max(76px, calc(62px + env(safe-area-inset-bottom, 0px) + 8px))",
                left: 12,
                maxWidth: "calc(100% - 24px)",
                zIndex: 25,
                pointerEvents: "auto",
              }}
            >
              <ChatPanel
                username={username}
                disabled={false}
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
              />
            </div>
          </div>
        </div>

        {/* Mobile virtual joystick — rendered on touch devices */}
        {isMobile && <MobileJoystick right={14} bottom={84} />}

        {/* Error toast */}
        {activeError && (
          <div
            id="error-toast"
            style={{
              position: "absolute",
              top: 16,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(127,29,29,0.92)",
              border: "1px solid rgba(239,68,68,0.5)",
              color: "#fca5a5",
              fontSize: 11,
              fontFamily: "inherit",
              padding: "8px 14px",
              borderRadius: 10,
              backdropFilter: "blur(12px)",
              pointerEvents: "auto",
              zIndex: 50,
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              maxWidth: "calc(100vw - 32px)",
            }}
          >
            <span>{activeError}</span>
            <button
              onClick={() => {
                colyseus.clearError();
                livekit.clearError();
              }}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.7)",
                cursor: "pointer",
                padding: "2px 4px",
                borderRadius: 4,
                fontSize: 13,
                lineHeight: 1,
              }}
              title="Dismiss notice"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
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
    </div>
  );
}

// ─── Join Screen ─────────────────────────────────────────────────────────────

/** Map theme → icon emoji mapping for the card grid */
const MAP_ICONS: Record<string, string> = {
  office: "🏢",
  conference: "🎤",
  auditorium: "🎭",
  social: "🌐",
  plaza: "🏙️",
  studio: "🎨",
  lounge: "☕",
  default: "🗺️",
};
function getMapIcon(preset: MapPresetData): string {
  const key = Object.keys(MAP_ICONS).find((k) =>
    (preset.theme || preset.name || "").toLowerCase().includes(k)
  );
  return MAP_ICONS[key ?? "default"];
}

/** Colour accent per map index */
const MAP_ACCENTS = ["#4ade80", "#22d3ee", "#a3e635", "#34d399", "#67e8f9", "#86efac"];

const FEATURE_HINTS = [
  { icon: "🎮", text: "WASD / Arrow keys to move" },
  { icon: "📹", text: "Auto video when near others" },
  { icon: "💬", text: "Spatial chat panel" },
  { icon: "🗺️", text: "Switch maps any time" },
];

function JoinScreen({
  onJoin,
  onBack,
  usernameValue,
  onUsernameChange,
  presets,
  selectedMapData,
  onSelectMap,
}: {
  onJoin: (e: React.FormEvent) => void;
  onBack?: () => void;
  usernameValue: string;
  onUsernameChange: (v: string) => void;
  presets: MapPresetData[];
  selectedMapData: MapPresetData;
  onSelectMap: (v: MapPresetData) => void;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  const fi = (d: number) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(18px)",
    transition: `opacity 0.6s ease ${d}s, transform 0.6s ease ${d}s`,
  });

  const serverHost = process.env.NEXT_PUBLIC_WS_URL
    ? (() => { try { return new URL(process.env.NEXT_PUBLIC_WS_URL).hostname; } catch { return "online"; } })()
    : "online";

  return (
    <>
      <style>{`
        /* ═══ Join Screen v2 — Neon Green / Cyberpunk ═══ */
        .js-root {
          position: fixed; inset: 0;
          background: #080c09;
          display: flex; overflow: hidden;
          font-family: 'Space Grotesk', var(--font-geist-sans, 'Inter', system-ui, sans-serif);
          color: #e8f5e9;
        }
        /* BG dot grid */
        .js-bg-grid {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background-image: radial-gradient(circle, rgba(74,222,128,0.18) 1px, transparent 1px);
          background-size: 28px 28px;
          -webkit-mask-image: radial-gradient(ellipse 85% 85% at 50% 50%, black 30%, transparent 100%);
          mask-image: radial-gradient(ellipse 85% 85% at 50% 50%, black 30%, transparent 100%);
        }
        .js-bg-orb {
          position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; z-index: 0;
        }
        .js-scanlines {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background: repeating-linear-gradient(
            0deg, transparent, transparent 2px,
            rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px
          );
        }
        /* Back button */
        .js-back-btn {
          position: absolute; top: 20px; left: 20px; z-index: 50;
          display: flex; align-items: center; gap: 7px;
          background: rgba(74,222,128,0.06); border: 1px solid rgba(74,222,128,0.22);
          border-radius: 9px; padding: 7px 14px 7px 10px;
          font-family: inherit; font-size: 13px; font-weight: 600;
          color: rgba(74,222,128,0.8); cursor: pointer;
          transition: all 0.2s ease;
        }
        .js-back-btn:hover { background: rgba(74,222,128,0.12); border-color: rgba(74,222,128,0.4); color: #4ade80; transform: translateX(-2px); }
        /* Left panel */
        .js-left {
          position: relative; z-index: 10;
          width: 46%; max-width: 500px;
          display: flex; flex-direction: column; justify-content: center;
          padding: 60px 56px;
          border-right: 1px solid rgba(74,222,128,0.08);
          background: rgba(74,222,128,0.015);
        }
        .js-logo-row {
          display: flex; align-items: center; gap: 12px; margin-bottom: 52px;
        }
        .js-logo-icon {
          width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
          background: linear-gradient(135deg, #16a34a, #4ade80);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 1px rgba(74,222,128,0.4), 0 6px 20px rgba(74,222,128,0.25);
          position: relative; overflow: hidden;
        }
        .js-logo-icon::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%);
        }
        .js-logo-text {
          font-size: 19px; font-weight: 700; letter-spacing: -0.4px; color: #fff;
        }
        .js-logo-badge {
          font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
          padding: 2px 7px; border-radius: 20px; color: #4ade80;
          background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.28);
        }
        .js-tagline {
          font-size: clamp(26px, 3vw, 38px); font-weight: 800; letter-spacing: -1.5px;
          line-height: 1.08; margin: 0 0 18px; color: #fff;
        }
        .js-tagline span { color: #4ade80; }
        .js-sub {
          font-size: 14px; color: rgba(255,255,255,0.38); line-height: 1.8;
          margin: 0 0 52px; max-width: 340px;
        }
        .js-hints { display: flex; flex-direction: column; gap: 13px; }
        .js-hint {
          display: flex; align-items: center; gap: 12px;
          font-size: 13px; color: rgba(255,255,255,0.45);
        }
        .js-hint-icon {
          width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
          background: rgba(74,222,128,0.08); border: 1px solid rgba(74,222,128,0.18);
          display: flex; align-items: center; justify-content: center; font-size: 15px;
        }
        .js-status-bar {
          margin-top: auto; padding-top: 40px;
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: rgba(255,255,255,0.28); font-family: monospace;
        }
        .js-status-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #4ade80;
          box-shadow: 0 0 8px rgba(74,222,128,0.6);
          animation: js-ping 2s ease-in-out infinite;
        }
        @keyframes js-ping {
          0%,100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.5); }
          50% { box-shadow: 0 0 0 6px rgba(74,222,128,0); }
        }
        /* Right panel */
        .js-right {
          flex: 1; position: relative; z-index: 10;
          display: flex; flex-direction: column; justify-content: center;
          padding: 60px 52px; overflow-y: auto;
        }
        .js-form-title {
          font-size: 11px; font-weight: 700; color: #4ade80;
          text-transform: uppercase; letter-spacing: 0.18em;
          margin-bottom: 28px; font-family: monospace;
          display: flex; align-items: center; gap: 8px;
        }
        .js-form-title::before {
          content: ''; display: inline-block; width: 20px; height: 1px;
          background: rgba(74,222,128,0.5);
        }
        /* Username field */
        .js-field { margin-bottom: 28px; }
        .js-label {
          display: block; font-size: 11px; font-weight: 700;
          color: rgba(255,255,255,0.4); text-transform: uppercase;
          letter-spacing: 0.12em; margin-bottom: 10px; font-family: monospace;
        }
        .js-input-wrap { position: relative; }
        .js-input-icon {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          color: rgba(74,222,128,0.35); pointer-events: none;
        }
        .js-input {
          width: 100%; box-sizing: border-box;
          background: rgba(74,222,128,0.04);
          border: 1px solid rgba(74,222,128,0.15);
          border-radius: 11px; padding: 14px 14px 14px 44px;
          font-size: 15px; color: #e8f5e9; font-family: inherit;
          outline: none; transition: all 0.2s ease;
        }
        .js-input::placeholder { color: rgba(255,255,255,0.2); }
        .js-input:focus {
          border-color: rgba(74,222,128,0.5);
          background: rgba(74,222,128,0.07);
          box-shadow: 0 0 0 3px rgba(74,222,128,0.1);
        }
        .js-char-count {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          font-size: 11px; color: rgba(74,222,128,0.35); font-family: monospace; pointer-events: none;
        }
        /* Map cards grid */
        .js-map-label {
          display: block; font-size: 11px; font-weight: 700;
          color: rgba(255,255,255,0.4); text-transform: uppercase;
          letter-spacing: 0.12em; margin-bottom: 12px; font-family: monospace;
        }
        .js-map-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
          gap: 10px; margin-bottom: 28px;
        }
        .js-map-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(74,222,128,0.1);
          border-radius: 12px; padding: 14px 14px 13px;
          cursor: pointer; transition: all 0.2s ease;
          display: flex; flex-direction: column; gap: 8px;
          position: relative; overflow: hidden; outline: none;
        }
        .js-map-card:hover {
          background: rgba(74,222,128,0.05); border-color: rgba(74,222,128,0.28);
          transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.5), 0 0 16px rgba(74,222,128,0.06);
        }
        .js-map-card.selected { transform: translateY(-2px); }
        .js-map-icon { font-size: 22px; line-height: 1; }
        .js-map-name { font-size: 12.5px; font-weight: 700; color: white; letter-spacing: -0.2px; line-height: 1.3; }
        .js-map-theme { font-size: 10.5px; color: rgba(255,255,255,0.32); font-family: monospace; }
        .js-map-check {
          position: absolute; top: 9px; right: 9px;
          width: 17px; height: 17px; border-radius: 5px;
          display: flex; align-items: center; justify-content: center;
          font-size: 9px; font-weight: 800; color: #030a04;
        }
        /* Submit button */
        .js-submit {
          width: 100%; padding: 16px 24px;
          background: #4ade80;
          border: none; border-radius: 12px;
          color: #030a04; font-size: 15.5px; font-weight: 800;
          cursor: pointer; font-family: 'Space Grotesk', inherit; letter-spacing: -0.1px;
          box-shadow: 0 8px 32px rgba(74,222,128,0.38), 0 0 0 1px rgba(74,222,128,0.25);
          transition: all 0.22s ease; position: relative; overflow: hidden;
          display: flex; align-items: center; justify-content: center; gap: 10px;
        }
        .js-submit::after {
          content: ''; position: absolute; top: -50%; left: -100%;
          width: 60%; height: 200%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          transform: skewX(-20deg); transition: left 0.5s ease;
        }
        .js-submit:hover:not(:disabled) { transform: translateY(-2px); background: #86efac; box-shadow: 0 14px 44px rgba(74,222,128,0.55); }
        .js-submit:hover:not(:disabled)::after { left: 140%; }
        .js-submit:active:not(:disabled) { transform: translateY(0); }
        .js-submit:disabled { opacity: 0.35; cursor: not-allowed; }
        /* Mobile */
        @media (max-width: 768px) {
          .js-root { flex-direction: column; overflow-y: auto; -webkit-overflow-scrolling: touch; min-height: 100dvh; }
          .js-left {
            width: 100%; max-width: 100%;
            padding: 16px 20px 12px;
            border-right: none; border-bottom: 1px solid rgba(74,222,128,0.08);
            background: rgba(74,222,128,0.015); backdrop-filter: blur(12px);
          }
          .js-logo-row { margin-bottom: 0; gap: 10px; }
          .js-logo-icon { width: 34px; height: 34px; border-radius: 9px; }
          .js-logo-text { font-size: 17px; }
          .js-tagline, .js-sub, .js-hints { display: none; }
          .js-status-bar { padding-top: 0; margin-top: 6px; font-size: 11px; }
          .js-right { padding: 20px 20px 32px; overflow-y: visible; justify-content: flex-start; }
          .js-form-title { font-size: 11px; margin-bottom: 16px; }
          .js-field { margin-bottom: 20px; }
          .js-input { padding: 12px 12px 12px 40px; font-size: 14px; border-radius: 10px; }
          .js-map-grid {
            display: flex; overflow-x: auto; scroll-snap-type: x mandatory;
            gap: 10px; margin-bottom: 24px; padding: 4px 2px 12px 2px;
            -webkit-overflow-scrolling: touch;
          }
          .js-map-card { flex: 0 0 148px; scroll-snap-align: start; padding: 12px; gap: 6px; }
          .js-map-icon { font-size: 20px; }
          .js-map-name { font-size: 12px; }
          .js-submit { padding: 14px 20px; font-size: 14.5px; border-radius: 11px; }
          .js-back-btn { top: 14px; left: 14px; font-size: 12px; padding: 6px 12px 6px 9px; }
        }
      `}</style>

      <div className="js-root">
        {/* Background */}
        <div className="js-bg-grid" aria-hidden />
        <div className="js-scanlines" aria-hidden />
        <div className="js-bg-orb" style={{ width: 700, height: 700, top: -250, left: -250, background: "radial-gradient(circle, rgba(74,222,128,0.1) 0%, transparent 65%)" }} aria-hidden />
        <div className="js-bg-orb" style={{ width: 500, height: 500, bottom: -180, right: -150, background: "radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 65%)" }} aria-hidden />
        {/* Back button */}
        {onBack && (
          <button className="js-back-btn" onClick={onBack} aria-label="Back to homepage">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back
          </button>
        )}

        {/* ── Left panel ── */}
        <aside className="js-left" aria-label="VirtualVerse introduction">
          <div className="js-logo-row" style={fi(0)}>
            <div className="js-logo-icon" aria-hidden>
                <img src="/virtualverse-icon.jpg" alt="VirtualVerse logo" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }} />
              </div>
            <span className="js-logo-text">VirtualVerse</span>
            <span className="js-logo-badge">Beta</span>
          </div>

          <h2 className="js-tagline" style={fi(0.08)}>
            Your Space.<br /><span>Your People.</span>
          </h2>
          <p className="js-sub" style={fi(0.16)}>
            Walk freely in a 2D world, video-call the moment you approach someone,
            and collaborate as if you&apos;re in the same room.
          </p>

          <div className="js-hints" role="list" aria-label="Game controls and features">
            {FEATURE_HINTS.map((h, i) => (
              <div key={h.text} className="js-hint" role="listitem" style={fi(0.22 + i * 0.07)}>
                <div className="js-hint-icon" aria-hidden>{h.icon}</div>
                <span>{h.text}</span>
              </div>
            ))}
          </div>

          <div className="js-status-bar" style={fi(0.55)} aria-label={`Server status: ${serverHost}`}>
            <span className="js-status-dot" aria-hidden />
            <span>Connected to <strong style={{ color: "rgba(255,255,255,0.5)", fontFamily: "monospace", fontSize: 11 }}>{serverHost}</strong></span>
          </div>
        </aside>

        {/* ── Right panel ── */}
        <main className="js-right" aria-label="Enter VirtualVerse">
          <p className="js-form-title" style={fi(0)}>Configure your entry</p>

          <form onSubmit={onJoin} noValidate>
            {/* Username */}
            <div className="js-field" style={fi(0.08)}>
              <label htmlFor="username-input" className="js-label">Avatar Username</label>
              <div className="js-input-wrap">
                <span className="js-input-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  id="username-input"
                  className="js-input"
                  type="text"
                  value={usernameValue}
                  onChange={(e) => onUsernameChange(e.target.value)}
                  placeholder="Enter your display name…"
                  maxLength={24}
                  autoFocus
                  autoComplete="nickname"
                  aria-describedby="username-hint"
                  aria-label="Avatar display name"
                />
                <span className="js-char-count" aria-hidden>
                  {usernameValue.length}/24
                </span>
              </div>
              <span id="username-hint" style={{ display: "none" }}>Your name appears above your avatar in the world</span>
            </div>

            {/* Map selector */}
            <div style={fi(0.16)}>
              <label className="js-map-label">Choose Your World</label>
              <div
                className="js-map-grid"
                role="radiogroup"
                aria-label="Select map environment"
              >
                {presets.map((preset, i) => {
                  const accent = MAP_ACCENTS[i % MAP_ACCENTS.length];
                  const isSelected = (preset.id || preset.name) === (selectedMapData.id || selectedMapData.name);
                  return (
                    <button
                      key={preset.id || preset.name}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`js-map-card${isSelected ? " selected" : ""}`}
                      onClick={() => onSelectMap(preset)}
                      style={{
                        borderColor: isSelected ? accent + "60" : undefined,
                        background: isSelected ? accent + "10" : undefined,
                        boxShadow: isSelected ? `0 0 0 1px ${accent}30, 0 8px 24px rgba(0,0,0,0.3)` : undefined,
                      }}
                      aria-label={`${preset.name} – ${preset.theme || "Spatial Map"}`}
                    >
                      <style>{`.js-map-card.selected .js-map-card-before-${i},.js-map-card:hover .js-map-card-before-${i}{opacity:1}`}</style>
                      {/* Top accent bar via inline style trick */}
                      <div style={{
                        position: "absolute", top: 0, left: 0, right: 0, height: 2,
                        borderRadius: "13px 13px 0 0",
                        background: `linear-gradient(90deg, ${accent}, ${accent}80)`,
                        opacity: isSelected ? 1 : 0,
                        transition: "opacity 0.2s",
                      }} aria-hidden />

                      <span className="js-map-icon" aria-hidden>{getMapIcon(preset)}</span>
                      <span className="js-map-name">{preset.name}</span>
                      <span className="js-map-theme">{preset.theme || "Spatial Map"}</span>

                      {isSelected && (
                        <div
                          className="js-map-check"
                          style={{ background: accent, color: "white" }}
                          aria-hidden
                        >
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit */}
            <div style={fi(0.25)}>
              <button
                id="join-btn"
                type="submit"
                className="js-submit"
                disabled={!usernameValue.trim()}
                aria-label={usernameValue.trim() ? `Enter VirtualVerse as ${usernameValue}` : "Enter a username to continue"}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Enter {selectedMapData.name}
              </button>
              <p style={{ textAlign: "center", marginTop: 14, fontSize: 11.5, color: "rgba(255,255,255,0.22)" }}>
                No sign-up required · Works in any modern browser
              </p>
            </div>
          </form>
        </main>
      </div>
    </>
  );
}
