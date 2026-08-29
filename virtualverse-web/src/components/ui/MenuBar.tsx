"use client";

import { ConnectionStatus } from "@/lib/colyseus";
import { LiveKitStatus } from "@/lib/livekit";

interface MenuBarProps {
  colyseusStatus: ConnectionStatus;
  livekitStatus: LiveKitStatus;
  username: string;
  activeMap: string;
  onOpenMapSelector: () => void;
  onOpenControls: () => void;
  onOpenPermissions: () => void;
  onOpenAvatarCustomizer?: () => void;
  onLeave: () => void;
}

export function MenuBar({
  colyseusStatus,
  livekitStatus,
  username,
  activeMap,
  onOpenMapSelector,
  onOpenControls,
  onOpenPermissions,
  onOpenAvatarCustomizer,
  onLeave,
}: MenuBarProps) {
  const getStatusBadge = (status: ConnectionStatus) => {
    switch (status) {
      case "connected":
        return { color: "bg-emerald-500", text: "Connected", border: "border-emerald-500/30" };
      case "connecting":
        return { color: "bg-amber-500 animate-pulse", text: "Connecting...", border: "border-amber-500/30" };
      case "error":
        return { color: "bg-rose-500", text: "Error", border: "border-rose-500/30" };
      default:
        return { color: "bg-zinc-500", text: "Disconnected", border: "border-zinc-500/30" };
    }
  };

  const cBadge = getStatusBadge(colyseusStatus);

  return (
    <header className="w-full bg-[#0f172a]/90 backdrop-blur-md border-b border-white/10 px-4 py-2.5 flex items-center justify-between shadow-lg relative z-30">
      {/* Left: Brand + Map info */}
      <div className="flex items-center gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-inner">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
            </svg>
          </div>
          <span className="text-white font-bold tracking-tight text-sm">VirtualVerse</span>
        </div>

        <div className="h-4 w-px bg-white/10" />

        {/* Map Preset Button */}
        <button
          onClick={onOpenMapSelector}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-200 transition-colors"
          title="Switch Map Environment"
        >
          <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span className="max-w-[180px] truncate">{activeMap}</span>
          <svg className="w-3 h-3 text-zinc-400 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Center: Quick Navigation Action Items */}
      <nav className="hidden md:flex items-center gap-2">
        <button
          onClick={onOpenMapSelector}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span>Map Gallery</span>
        </button>

        {onOpenAvatarCustomizer && (
          <button
            onClick={onOpenAvatarCustomizer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            <span>🎨</span>
            <span>Avatar</span>
          </button>
        )}

        <button
          onClick={onOpenControls}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          <span>Controls</span>
        </button>

        <button
          onClick={onOpenPermissions}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Permissions</span>
        </button>
      </nav>

      {/* Right: User + Status + Leave */}
      <div className="flex items-center gap-3">
        {/* Status Indicator */}
        <div className={`flex items-center gap-2 bg-white/5 border ${cBadge.border} px-3 py-1 rounded-full text-xs font-mono text-zinc-300`}>
          <span className="font-semibold text-white truncate max-w-[100px]">{username}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${cBadge.color}`} />
            <span>{cBadge.text}</span>
          </div>
        </div>

        {/* Leave World Button */}
        <button
          onClick={onLeave}
          className="flex items-center gap-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 hover:text-rose-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          title="Exit World"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </header>
  );
}
