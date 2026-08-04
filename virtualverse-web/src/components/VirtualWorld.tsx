"use client";

/**
 * VirtualWorld — the full interactive game world.
 * Executed browser-only via next/dynamic ssr:false.
 */

import { useState, useEffect } from "react";
import { GameCanvas } from "@/components/GameCanvas";
import { MenuBar } from "@/components/ui/MenuBar";
import { ChatPanel } from "@/components/ui/ChatPanel";
import { VideoOverlay } from "@/components/ui/VideoOverlay";
import { MapSelectorModal } from "@/components/ui/MapSelectorModal";
import { PermissionsModal } from "@/components/ui/PermissionsModal";
import { ControlsModal } from "@/components/ui/ControlsModal";
import { useColyseus } from "@/hooks/useColyseus";
import { useLiveKit } from "@/hooks/useLiveKit";
import { fetchRoomPresets, FALLBACK_MAP_PRESETS, MapPresetData } from "@/lib/api";
import { gameBridge } from "@/game/GameBridge";

export function VirtualWorld() {
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [inputUsername, setInputUsername] = useState("");

  // Map presets state
  const [presets, setPresets] = useState<MapPresetData[]>(FALLBACK_MAP_PRESETS);
  const [selectedMapData, setSelectedMapData] = useState<MapPresetData>(FALLBACK_MAP_PRESETS[0]);

  // Modals state
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [isControlsOpen, setIsControlsOpen] = useState(false);

  const colyseus = useColyseus();
  const livekit = useLiveKit();

  // Load presets from server REST API on mount
  useEffect(() => {
    fetchRoomPresets().then((list) => {
      setPresets(list);
      if (list.length > 0) {
        setSelectedMapData(list[0]);
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
    <div className="relative w-screen h-screen bg-[#0d0d1a] overflow-hidden flex flex-col">
      {/* Top Menu Bar */}
      <MenuBar
        colyseusStatus={colyseus.status}
        livekitStatus={livekit.status}
        username={username}
        activeMap={selectedMapData.name}
        onOpenMapSelector={() => setIsMapModalOpen(true)}
        onOpenControls={() => setIsControlsOpen(true)}
        onOpenPermissions={() => setIsPermissionsOpen(true)}
        onLeave={handleLeave}
      />

      {/* Main Game Area */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* Phaser canvas fills background */}
        <GameCanvas className="absolute inset-0 w-full h-full" />

        {/* ── UI Overlay ────────────────────────────────────────────────────── */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-4">
          <div className="flex items-end justify-between gap-4 pointer-events-auto">
            <ChatPanel
              username={username}
              disabled={colyseus.status !== "connected"}
            />

            <VideoOverlay remoteVideoElements={livekit.remoteVideoElements} />
          </div>
        </div>

        {/* Error toast */}
        {(colyseus.error || livekit.error) && (
          <div
            id="error-toast"
            className="absolute top-4 left-1/2 -translate-x-1/2
                       bg-red-900/90 border border-red-500/50 text-red-200
                       text-xs font-mono px-4 py-2 rounded-lg backdrop-blur-md
                       pointer-events-none z-40 shadow-xl"
          >
            {colyseus.error ?? livekit.error}
          </div>
        )}
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
    </div>
  );
}

// ─── Join Screen ─────────────────────────────────────────────────────────────

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
  return (
    <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-md bg-[#0f172a]/90 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">
        {/* Logo Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">
              VirtualVerse
            </span>
          </div>
          <p className="text-zinc-400 text-xs font-sans">
            Spatial 2D Multiplayer Metaverse & Real-Time Proximity Communication
          </p>
        </div>

        {/* Join form */}
        <form onSubmit={onJoin} className="space-y-4">
          <div>
            <label htmlFor="username-input" className="block text-xs font-medium text-zinc-300 mb-1.5">
              Avatar Username
            </label>
            <input
              id="username-input"
              type="text"
              value={usernameValue}
              onChange={(e) => onUsernameChange(e.target.value)}
              placeholder="Enter your display name..."
              maxLength={24}
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-xl
                         text-white placeholder:text-zinc-500 text-sm px-4 py-3
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                         transition-all"
            />
          </div>

          <div>
            <label htmlFor="map-select" className="block text-xs font-medium text-zinc-300 mb-1.5">
              Select Map Preset Environment
            </label>
            <div className="relative">
              <select
                id="map-select"
                value={selectedMapData.id || selectedMapData.name}
                onChange={(e) => {
                  const target = presets.find(
                    (p) => p.id === e.target.value || p.name === e.target.value
                  );
                  if (target) onSelectMap(target);
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl
                           text-white text-sm px-4 py-3 pr-10 appearance-none
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                           transition-all cursor-pointer font-sans"
              >
                {presets.map((preset) => (
                  <option
                    key={preset.id || preset.name}
                    value={preset.id || preset.name}
                    className="bg-[#0f172a] text-white"
                  >
                    {preset.name} ({preset.theme || "Spatial Map"})
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <button
            id="join-btn"
            type="submit"
            disabled={!usernameValue.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40
                       disabled:cursor-not-allowed text-white font-semibold py-3 px-4
                       rounded-xl transition-all text-sm shadow-lg shadow-indigo-600/20 mt-2"
          >
            Enter Virtual World
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500">
          <span>Server Status</span>
          <span className="font-mono text-zinc-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {process.env.NEXT_PUBLIC_WS_URL
              ? new URL(process.env.NEXT_PUBLIC_WS_URL).hostname
              : "Online"}
          </span>
        </div>
      </div>
    </div>
  );
}
