"use client";

import { ConnectionStatus } from "@/lib/colyseus";
import { LiveKitStatus } from "@/lib/livekit";

interface StatusBarProps {
  colyseusStatus: ConnectionStatus;
  livekitStatus: LiveKitStatus;
  sessionId: string | null;
  username: string;
}

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; color: string; dot: string }
> = {
  disconnected: {
    label: "Disconnected",
    color: "text-red-400",
    dot: "bg-red-500",
  },
  connecting: {
    label: "Connecting…",
    color: "text-yellow-400",
    dot: "bg-yellow-400 animate-pulse",
  },
  connected: {
    label: "Connected",
    color: "text-emerald-400",
    dot: "bg-emerald-400",
  },
  error: {
    label: "Error",
    color: "text-red-500",
    dot: "bg-red-600 animate-ping",
  },
};

const LIVEKIT_CONFIG: Record<
  LiveKitStatus,
  { label: string; color: string }
> = {
  idle: { label: "–", color: "text-zinc-500" },
  connecting: { label: "Calling…", color: "text-yellow-400" },
  connected: { label: "In Call", color: "text-emerald-400" },
  error: { label: "Call Error", color: "text-red-500" },
};

/**
 * StatusBar — reflects REAL Colyseus and LiveKit state (no fake placeholders).
 * Displayed as a floating overlay above the canvas.
 */
export function StatusBar({
  colyseusStatus,
  livekitStatus,
  sessionId,
  username,
}: StatusBarProps) {
  const cs = STATUS_CONFIG[colyseusStatus];
  const lk = LIVEKIT_CONFIG[livekitStatus];

  return (
    <div
      id="status-bar"
      className="flex items-center gap-4 px-4 py-2 rounded-xl
                 bg-black/60 backdrop-blur-md border border-white/10
                 text-sm font-mono select-none"
    >
      {/* Username */}
      <span className="text-white font-semibold truncate max-w-[120px]">
        {username}
      </span>

      <div className="w-px h-4 bg-white/20" />

      {/* Colyseus status */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${cs.dot}`}
          aria-label={`Colyseus: ${cs.label}`}
        />
        <span className={cs.color}>{cs.label}</span>
      </div>

      {/* Session ID (trimmed) */}
      {sessionId && (
        <span className="text-zinc-500 text-xs hidden sm:inline">
          #{sessionId.slice(0, 8)}
        </span>
      )}

      <div className="w-px h-4 bg-white/20" />

      {/* LiveKit status */}
      <div className="flex items-center gap-1.5">
        <svg
          className="w-3.5 h-3.5 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 10l4.553-2.069A1 1 0 0121 8.876V15.124a1 1 0 01-1.447.893L15 14M3 8h12a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V9a1 1 0 011-1z"
          />
        </svg>
        <span className={lk.color}>{lk.label}</span>
      </div>
    </div>
  );
}
