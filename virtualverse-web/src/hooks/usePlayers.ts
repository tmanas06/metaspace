"use client";

import { useEffect, useState } from "react";
import { colyseusManager } from "@/lib/colyseus";

export interface PlayerEntry {
  sessionId: string;
  username: string;
  /** Optional sub-status label, e.g. "You", "Online", "Away" */
  statusLabel?: string;
  isLocal?: boolean;
}

/**
 * usePlayers — Subscribes to Colyseus state and returns a live
 * list of PlayerEntry objects for all connected players in the room.
 */
export function usePlayers(localUsername: string): PlayerEntry[] {
  const [players, setPlayers] = useState<PlayerEntry[]>([]);

  useEffect(() => {
    // Subscribe to live room player list updates from Colyseus
    const unsubPlayers = colyseusManager.onPlayersChange((livePlayers) => {
      if (livePlayers && livePlayers.length > 0) {
        setPlayers(livePlayers);
      } else {
        setPlayers(
          localUsername
            ? [{ sessionId: "local", username: localUsername, isLocal: true }]
            : []
        );
      }
    });

    const unsubStatus = colyseusManager.onStatusChange((state) => {
      if (state.status !== "connected") {
        setPlayers(
          localUsername
            ? [{ sessionId: "local", username: localUsername, isLocal: true }]
            : []
        );
      }
    });

    return () => {
      unsubPlayers();
      unsubStatus();
    };
  }, [localUsername]);

  return players;
}
