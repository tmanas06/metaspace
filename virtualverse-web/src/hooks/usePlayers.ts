"use client";

import { useEffect, useState } from "react";
import { colyseusManager } from "@/lib/colyseus";

export interface PlayerEntry {
  sessionId: string;
  username: string;
  /** Optional sub-status label, e.g. "Walkin", "Online", "Away" */
  statusLabel?: string;
  isLocal?: boolean;
}

/**
 * usePlayers — Subscribes to Colyseus state and returns a live
 * list of PlayerEntry objects suitable for rendering in the sidebar.
 *
 * Falls back to a single entry for the local user when the server
 * hasn't delivered a player list yet.
 */
export function usePlayers(localUsername: string): PlayerEntry[] {
  const [players, setPlayers] = useState<PlayerEntry[]>([]);

  useEffect(() => {
    // Re-derive sidebar list whenever Colyseus state changes
    const unsub = colyseusManager.onStatusChange((state) => {
      // colyseusManager doesn't expose the raw players map directly,
      // so we watch for state updates and merge with what GameBridge knows.
      // For now surface a single local entry; full roster is forwarded
      // via gameBridge.applyServerState → Phaser. If you later want to
      // display the roster here too, pipe it through a shared store.
      if (state.status !== "connected") {
        setPlayers(
          localUsername
            ? [{ sessionId: "local", username: localUsername, isLocal: true }]
            : []
        );
      }
    });

    // Seed immediately
    const cur = colyseusManager.getState();
    if (cur.status !== "connected") {
      setPlayers(
        localUsername
          ? [{ sessionId: "local", username: localUsername, isLocal: true }]
          : []
      );
    }

    return unsub;
  }, [localUsername]);

  return players;
}
