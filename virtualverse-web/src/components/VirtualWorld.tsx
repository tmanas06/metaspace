"use client";

/**
 * VirtualWorld — the full interactive game world.
 * This component and everything it imports (Phaser, Colyseus, LiveKit)
 * is only ever executed in the browser (loaded via dynamic() with ssr:false).
 */

import { useState, useEffect } from "react";
import { GameCanvas } from "@/components/GameCanvas";
import { StatusBar } from "@/components/ui/StatusBar";
import { ChatPanel } from "@/components/ui/ChatPanel";
import { VideoOverlay } from "@/components/ui/VideoOverlay";
import { useColyseus } from "@/hooks/useColyseus";
import { useLiveKit } from "@/hooks/useLiveKit";

export function VirtualWorld() {
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [inputUsername, setInputUsername] = useState("");

  const colyseus = useColyseus();
  const livekit = useLiveKit();

  // Auto-connect Colyseus when user joins
  useEffect(() => {
    if (joined && username) {
      colyseus.connect(username);
    }
    return () => {
      if (joined) colyseus.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined, username]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUsername.trim()) return;
    setUsername(inputUsername.trim());
    setJoined(true);
  };

  if (!joined) {
    return (
      <JoinScreen
        onJoin={handleJoin}
        value={inputUsername}
        onChange={setInputUsername}
      />
    );
  }

  return (
    <div className="relative w-screen h-screen bg-[#0d0d1a] overflow-hidden">
      {/* Phaser canvas fills the entire background */}
      <GameCanvas className="absolute inset-0 w-full h-full" />

      {/* ── UI Overlay ────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none flex flex-col">
        {/* Top bar */}
        <div className="flex justify-between items-start p-4 pointer-events-auto">
          <StatusBar
            colyseusStatus={colyseus.status}
            livekitStatus={livekit.status}
            sessionId={colyseus.sessionId}
            username={username}
          />

          <div className="flex flex-col items-end gap-1 text-xs text-zinc-500 font-mono">
            <span>WASD / ↑↓←→ to move</span>
            <span>Walk near others for video</span>
          </div>
        </div>

        {/* Bottom row: chat + video overlay */}
        <div className="mt-auto flex items-end justify-between p-4 gap-4 pointer-events-auto">
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
          className="absolute top-20 left-1/2 -translate-x-1/2
                     bg-red-900/80 border border-red-500/50 text-red-200
                     text-xs font-mono px-4 py-2 rounded-lg backdrop-blur-sm
                     pointer-events-none"
        >
          {colyseus.error ?? livekit.error}
        </div>
      )}
    </div>
  );
}

// ─── Join Screen ─────────────────────────────────────────────────────────────

function JoinScreen({
  onJoin,
  value,
  onChange,
}: {
  onJoin: (e: React.FormEvent) => void;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center px-4">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"
                />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">
              VirtualVerse
            </span>
          </div>
          <p className="text-zinc-400 text-sm">Enter a name to join the world</p>
        </div>

        {/* Join form */}
        <form onSubmit={onJoin} className="space-y-4">
          <div>
            <label htmlFor="username-input" className="sr-only">
              Username
            </label>
            <input
              id="username-input"
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Your username…"
              maxLength={24}
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-xl
                         text-white placeholder:text-zinc-600 text-sm px-4 py-3
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                         transition-all"
            />
          </div>

          <button
            id="join-btn"
            type="submit"
            disabled={!value.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40
                       disabled:cursor-not-allowed text-white font-semibold py-3 px-4
                       rounded-xl transition-colors text-sm"
          >
            Enter World
          </button>
        </form>

        <p className="text-center text-zinc-600 text-xs mt-6">
          Connecting to{" "}
          <span className="text-zinc-400 font-mono">
            {process.env.NEXT_PUBLIC_WS_URL
              ? new URL(process.env.NEXT_PUBLIC_WS_URL).hostname
              : "server"}
          </span>
        </p>
      </div>
    </div>
  );
}
