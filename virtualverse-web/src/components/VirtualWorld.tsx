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

export function VirtualWorld() {
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
  // On mobile the sidebar starts collapsed (44 px) so the canvas fills the screen.
  const isMobile = useIsMobile();
  const [sidebarWidth, setSidebarWidth] = useState(220);

  // When mobile status becomes known, collapse the sidebar immediately.
  useEffect(() => {
    if (isMobile) setSidebarWidth(44);
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

  // Auto-connect Colyseus when user joins
  useEffect(() => {
    if (joined && username) {
      colyseus.connect(username, selectedMapData.name);
      gameBridge.setMapTheme(selectedMapData);
    }
    return () => {
      if (joined) colyseus.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined, username]);

  // Update map theme in Phaser when active map changes
  const handleSelectMap = (presetData: MapPresetData) => {
    setSelectedMapData(presetData);
    gameBridge.setMapTheme(presetData);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUsername.trim()) return;
    setUsername(inputUsername.trim());
    setJoined(true);
  };

  const handleLeave = () => {
    colyseus.disconnect();
    setJoined(false);
  };

  if (!joined) {
    return (
      <JoinScreen
        onJoin={handleJoin}
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
      {/* ── Left Sidebar — absolute, sits on the left edge ── */}
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
          defaultCollapsed={isMobile}
          onCollapsedChange={(collapsed) => setSidebarWidth(collapsed ? 44 : 220)}
          onInvite={() => {
            // Build invite URL with current map encoded as a ?map= query param
            // so the invited user lands on the same map automatically.
            const base = window.location.origin + window.location.pathname;
            const mapId = selectedMapData.id || selectedMapData.name;
            return `${base}?map=${encodeURIComponent(mapId)}`;
          }}
        />
      </div>

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
                // Sit above the bottom control bar (≈68px tall) plus a small gap
                bottom: "max(80px, calc(68px + env(safe-area-inset-bottom, 0px) + 12px))",
                left: 16,
                // On narrow phones don't let the chat panel run wider than the canvas
                maxWidth: "calc(100% - 32px)",
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

        {/* Mobile virtual joystick — only shown on touch devices */}
        {isMobile && <MobileJoystick right={16} bottom={96} />}

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
const MAP_ACCENTS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899"];

const FEATURE_HINTS = [
  { icon: "🎮", text: "WASD / Arrow keys to move" },
  { icon: "📹", text: "Auto video when near others" },
  { icon: "💬", text: "Spatial chat panel" },
  { icon: "🗺️", text: "Switch maps any time" },
];

function JoinScreen({
  onJoin,
  usernameValue,
  onUsernameChange,
  presets,
  selectedMapData,
  onSelectMap,
}: {
  onJoin: (e: React.FormEvent) => void;
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
        /* ═══ Join Screen — VirtualVerse ═══ */
        .js-root {
          position: fixed; inset: 0;
          background: #07071a;
          display: flex; overflow: hidden;
          font-family: var(--font-geist-sans, 'Inter', system-ui, sans-serif);
          color: #fff;
        }
        /* BG decorations */
        .js-bg-grid {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background-image:
            linear-gradient(rgba(99,102,241,0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.055) 1px, transparent 1px);
          background-size: 60px 60px;
        }
        .js-bg-orb {
          position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; z-index: 0;
        }
        /* Left panel */
        .js-left {
          position: relative; z-index: 10;
          width: 46%; max-width: 500px;
          display: flex; flex-direction: column; justify-content: center;
          padding: 60px 56px;
          border-right: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.012);
        }
        .js-logo-row {
          display: flex; align-items: center; gap: 12px; margin-bottom: 52px;
        }
        .js-logo-icon {
          width: 44px; height: 44px; border-radius: 13px; flex-shrink: 0;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 1px rgba(99,102,241,0.4), 0 8px 24px rgba(99,102,241,0.35);
          position: relative; overflow: hidden;
        }
        .js-logo-icon::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.22) 0%, transparent 60%);
        }
        .js-logo-text {
          font-size: 20px; font-weight: 800; letter-spacing: -0.5px;
          background: linear-gradient(135deg, #fff 55%, #c7d2fe);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .js-logo-badge {
          font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em;
          padding: 2px 7px; border-radius: 20px; color: #a5b4fc;
          background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3);
        }
        .js-tagline {
          font-size: clamp(26px, 3vw, 38px); font-weight: 800; letter-spacing: -1.5px;
          line-height: 1.1; margin: 0 0 18px;
          background: linear-gradient(135deg, #fff 50%, #c7d2fe);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .js-sub {
          font-size: 14.5px; color: rgba(255,255,255,0.42); line-height: 1.75;
          margin: 0 0 52px; max-width: 340px;
        }
        .js-hints { display: flex; flex-direction: column; gap: 14px; }
        .js-hint {
          display: flex; align-items: center; gap: 12px;
          font-size: 13.5px; color: rgba(255,255,255,0.5);
        }
        .js-hint-icon {
          width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
          background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.18);
          display: flex; align-items: center; justify-content: center; font-size: 16px;
        }
        .js-status-bar {
          margin-top: auto; padding-top: 40px;
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: rgba(255,255,255,0.28);
        }
        .js-status-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #22c55e;
          animation: js-ping 1.8s ease-in-out infinite;
        }
        @keyframes js-ping {
          0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
          50% { box-shadow: 0 0 0 5px rgba(34,197,94,0); }
        }

        /* Right panel */
        .js-right {
          flex: 1; position: relative; z-index: 10;
          display: flex; flex-direction: column; justify-content: center;
          padding: 60px 52px; overflow-y: auto;
        }
        .js-form-title {
          font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.6);
          text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 28px;
        }
        /* Username field */
        .js-field { margin-bottom: 28px; }
        .js-label {
          display: block; font-size: 12px; font-weight: 600;
          color: rgba(255,255,255,0.5); text-transform: uppercase;
          letter-spacing: 0.08em; margin-bottom: 10px;
        }
        .js-input-wrap { position: relative; }
        .js-input-icon {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          color: rgba(255,255,255,0.25); pointer-events: none;
        }
        .js-input {
          width: 100%; box-sizing: border-box;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 14px 14px 14px 44px;
          font-size: 15px; color: white; font-family: inherit;
          outline: none; transition: all 0.2s ease;
        }
        .js-input::placeholder { color: rgba(255,255,255,0.22); }
        .js-input:focus {
          border-color: rgba(99,102,241,0.5);
          background: rgba(99,102,241,0.05);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }
        .js-char-count {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          font-size: 11px; color: rgba(255,255,255,0.22); font-family: monospace; pointer-events: none;
        }

        /* Map cards grid */
        .js-map-label {
          display: block; font-size: 12px; font-weight: 600;
          color: rgba(255,255,255,0.5); text-transform: uppercase;
          letter-spacing: 0.08em; margin-bottom: 12px;
        }
        .js-map-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 10px; margin-bottom: 28px;
        }
        .js-map-card {
          background: rgba(255,255,255,0.03);
          border: 1.5px solid rgba(255,255,255,0.07);
          border-radius: 13px; padding: 14px 14px 13px;
          cursor: pointer; transition: all 0.2s ease;
          display: flex; flex-direction: column; gap: 8px;
          position: relative; overflow: hidden;
          outline: none;
        }
        .js-map-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          border-radius: 13px 13px 0 0; opacity: 0; transition: opacity 0.2s;
        }
        .js-map-card:hover {
          background: rgba(255,255,255,0.055); border-color: rgba(255,255,255,0.15);
          transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .js-map-card:hover::before { opacity: 1; }
        .js-map-card.selected { transform: translateY(-2px); }
        .js-map-card.selected::before { opacity: 1; }
        .js-map-icon { font-size: 22px; line-height: 1; }
        .js-map-name { font-size: 12.5px; font-weight: 700; color: white; letter-spacing: -0.2px; line-height: 1.3; }
        .js-map-theme { font-size: 11px; color: rgba(255,255,255,0.35); }
        .js-map-check {
          position: absolute; top: 9px; right: 9px;
          width: 18px; height: 18px; border-radius: 5px;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700;
        }

        /* Submit button */
        .js-submit {
          width: 100%; padding: 16px 24px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none; border-radius: 14px;
          color: white; font-size: 15.5px; font-weight: 700;
          cursor: pointer; font-family: inherit; letter-spacing: -0.2px;
          box-shadow: 0 8px 32px rgba(99,102,241,0.38), inset 0 1px 0 rgba(255,255,255,0.18);
          transition: all 0.22s ease; position: relative; overflow: hidden;
          display: flex; align-items: center; justify-content: center; gap: 10px;
        }
        .js-submit::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 55%);
        }
        .js-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 14px 44px rgba(99,102,241,0.5); }
        .js-submit:active:not(:disabled) { transform: translateY(0); }
        .js-submit:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Mobile: stack panels */
        @media (max-width: 768px) {
          .js-root { flex-direction: column; }
          .js-left {
            width: 100%; max-width: 100%; padding: 32px 24px 24px;
            border-right: none; border-bottom: 1px solid rgba(255,255,255,0.06);
          }
          .js-logo-row { margin-bottom: 0; }
          .js-tagline, .js-sub, .js-hints { display: none; }
          .js-status-bar { padding-top: 0; margin-top: 12px; }
          .js-right { padding: 28px 24px 48px; }
          .js-map-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      <div className="js-root">
        {/* Background */}
        <div className="js-bg-grid" aria-hidden />
        <div className="js-bg-orb" style={{ width: 600, height: 600, top: -200, left: -200, background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 65%)" }} aria-hidden />
        <div className="js-bg-orb" style={{ width: 500, height: 500, bottom: -200, right: -100, background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 65%)" }} aria-hidden />

        {/* ── Left panel ── */}
        <aside className="js-left" aria-label="VirtualVerse introduction">
          <div className="js-logo-row" style={fi(0)}>
            <div className="js-logo-icon" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                <path d="M2 12h20"/>
              </svg>
            </div>
            <span className="js-logo-text">VirtualVerse</span>
            <span className="js-logo-badge">Beta</span>
          </div>

          <h2 className="js-tagline" style={fi(0.08)}>
            Your Space.<br />Your People.
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
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
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
                  <polygon points="5 3 19 12 5 21 5 3"/>
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
