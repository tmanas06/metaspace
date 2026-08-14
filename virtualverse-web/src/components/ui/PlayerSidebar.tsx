"use client";

import { useState } from "react";
import { PlayerEntry } from "@/hooks/usePlayers";

interface PlayerSidebarProps {
  appName?: string;
  players: PlayerEntry[];
  localUsername: string;
  onOpenMapSelector: () => void;
  onOpenControls: () => void;
  onOpenPermissions: () => void;
  onLeave: () => void;
  /** Called when Invite is clicked; should return the URL to copy */
  onInvite?: () => string;
}

/** Deterministic hue from a string so each player gets a consistent colour. */
function stringToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function AvatarCircle({ name, size = 30 }: { name: string; size?: number }) {
  const hue = stringToHue(name);
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: "50%",
        background: `hsl(${hue}, 55%, 42%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.38,
        fontWeight: 700,
        color: "#fff",
        letterSpacing: "-0.5px",
        userSelect: "none",
      }}
    >
      {initials}
    </div>
  );
}

export function PlayerSidebar({
  appName = "VirtualVerse",
  players,
  localUsername,
  onOpenMapSelector,
  onOpenControls,
  onOpenPermissions,
  onLeave,
  onInvite,
}: PlayerSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);

  const handleInvite = () => {
    const url = onInvite ? onInvite() : window.location.href;
    // Try modern clipboard API first
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => fallbackCopy(url));
    } else {
      fallbackCopy(url);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // last resort: open prompt so user can copy manually
      window.prompt("Copy this invite link:", text);
    }
  };

  const filtered = players.filter((p) =>
    p.username.toLowerCase().includes(search.toLowerCase())
  );

  if (collapsed) {
    return (
      <aside
        style={{
          width: 44,
          minWidth: 44,
          height: "100%",
          background: "#1e1f2e",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 12,
          gap: 8,
          zIndex: 20,
          transition: "width 0.2s ease",
        }}
      >
        <button
          onClick={() => setCollapsed(false)}
          title="Expand sidebar"
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.5)",
            cursor: "pointer",
            padding: 6,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Chevron right */}
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {/* Stacked mini avatars */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", flex: 1, overflowY: "auto", paddingBottom: 8 }}>
          {players.slice(0, 10).map((p) => (
            <AvatarCircle key={p.sessionId} name={p.username} size={28} />
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside
      id="player-sidebar"
      style={{
        width: 220,
        minWidth: 220,
        height: "100%",
        background: "#1e1f2e",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        flexDirection: "column",
        zIndex: 20,
        transition: "width 0.2s ease",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 12px 10px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        {/* Logo + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {/* Globe icon */}
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
            </svg>
          </div>
          <span
            style={{
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "-0.3px",
              fontFamily: "inherit",
            }}
          >
            {appName}
          </span>
        </div>

        {/* Collapse chevron */}
        <button
          onClick={() => setCollapsed(true)}
          title="Collapse sidebar"
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.4)",
            cursor: "pointer",
            padding: 4,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.8)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.4)")}
        >
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* ── Search ── */}
      <div style={{ padding: "10px 10px 6px 10px", flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            padding: "6px 10px",
          }}
        >
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.35)" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="sidebar-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            style={{
              background: "none",
              border: "none",
              outline: "none",
              color: "#fff",
              fontSize: 12,
              flex: 1,
              fontFamily: "inherit",
            }}
          />
        </div>
      </div>

      {/* ── Player list ── */}
      <div
        id="player-list"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 6px",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {filtered.length === 0 && (
          <p
            style={{
              color: "rgba(255,255,255,0.2)",
              fontSize: 11,
              textAlign: "center",
              marginTop: 20,
              fontFamily: "inherit",
            }}
          >
            No players found
          </p>
        )}

        {filtered.map((player) => {
          const isLocal = player.isLocal || player.username === localUsername;
          return (
            <PlayerRow key={player.sessionId} player={player} isLocal={isLocal} />
          );
        })}
      </div>

      {/* ── Settings shortcuts ── */}
      <div
        style={{
          padding: "6px 10px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
          gap: 1,
          flexShrink: 0,
        }}
      >
        <SidebarIconBtn
          label="Map Gallery"
          onClick={onOpenMapSelector}
          icon={
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          }
        />
        <SidebarIconBtn
          label="Controls"
          onClick={onOpenControls}
          icon={
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          }
        />
        <SidebarIconBtn
          label="Permissions"
          onClick={onOpenPermissions}
          icon={
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          }
        />
      </div>

      {/* ── Invite button ── */}
      <div
        style={{
          padding: "8px 10px 12px 10px",
          flexShrink: 0,
        }}
      >
        <button
          id="invite-btn"
          style={{
            width: "100%",
            background: copied ? "rgba(16,185,129,0.2)" : "rgba(99,102,241,0.15)",
            border: `1px solid ${copied ? "rgba(16,185,129,0.5)" : "rgba(99,102,241,0.35)"}`,
            borderRadius: 9,
            color: copied ? "#6ee7b7" : "#a5b4fc",
            fontSize: 12,
            fontWeight: 600,
            padding: "8px 0",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            transition: "background 0.15s, border-color 0.15s, color 0.15s",
            fontFamily: "inherit",
          }}
          onMouseEnter={(e) => {
            if (!copied) {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.25)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(99,102,241,0.6)";
            }
          }}
          onMouseLeave={(e) => {
            if (!copied) {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.15)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(99,102,241,0.35)";
            }
          }}
          onClick={handleInvite}
          title={copied ? "Link copied!" : "Copy invite link"}
        >
          {copied ? (
            <>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Invite
            </>
          )}
        </button>

        {/* Leave world */}
        <button
          id="leave-world-btn"
          onClick={onLeave}
          style={{
            width: "100%",
            marginTop: 5,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 9,
            color: "rgba(252,165,165,0.7)",
            fontSize: 11,
            fontWeight: 500,
            padding: "6px 0",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            transition: "background 0.15s",
            fontFamily: "inherit",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.15)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)";
          }}
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Leave World
        </button>
      </div>
    </aside>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlayerRow({ player, isLocal }: { player: PlayerEntry; isLocal: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 8px",
        borderRadius: 7,
        cursor: "default",
        background: hovered ? "rgba(255,255,255,0.05)" : isLocal ? "rgba(99,102,241,0.08)" : "transparent",
        transition: "background 0.12s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <AvatarCircle name={player.username} size={30} />
        {/* Online dot */}
        <span
          style={{
            position: "absolute",
            bottom: 1,
            right: 1,
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#34d399",
            border: "1.5px solid #1e1f2e",
          }}
        />
      </div>

      {/* Info */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", flex: 1 }}>
        <span
          style={{
            color: isLocal ? "#c7d2fe" : "#e2e8f0",
            fontSize: 12,
            fontWeight: isLocal ? 600 : 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily: "inherit",
          }}
        >
          {player.username}
          {isLocal && (
            <span style={{ color: "rgba(167,139,250,0.6)", fontSize: 10, marginLeft: 4, fontWeight: 400 }}>
              (you)
            </span>
          )}
        </span>
        {player.statusLabel && (
          <span
            style={{
              color: "rgba(255,255,255,0.3)",
              fontSize: 10,
              fontFamily: "inherit",
            }}
          >
            {player.statusLabel}
          </span>
        )}
      </div>
    </div>
  );
}

function SidebarIconBtn({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        background: hovered ? "rgba(255,255,255,0.06)" : "transparent",
        border: "none",
        borderRadius: 7,
        color: hovered ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)",
        fontSize: 11.5,
        fontWeight: 500,
        padding: "5px 8px",
        cursor: "pointer",
        transition: "background 0.12s, color 0.12s",
        fontFamily: "inherit",
        textAlign: "left",
      }}
    >
      {icon}
      {label}
    </button>
  );
}
