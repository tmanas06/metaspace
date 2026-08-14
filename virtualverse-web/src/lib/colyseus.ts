/**
 * Colyseus client factory and connection management.
 *
 * Connection URL always comes from NEXT_PUBLIC_WS_URL — never hardcoded.
 * Movement is sent as boolean input messages, NOT raw positions.
 * The server (MapRoom on Ubuntu) is authoritative; we only predict locally.
 *
 * Reconciliation strategy (applied in MainScene, triggered here):
 *   - drift > 50px → snap
 *   - drift > 5px  → smooth lerp 30% per tick
 *   - drift < 5px  → trust local prediction
 *
 * Performance (40+ players):
 *   - Sidebar player list updates are debounced 500ms — React re-renders stay rare.
 *   - Phaser state updates bypass React entirely (gameBridge.applyServerState).
 */

import * as Colyseus from "colyseus.js";
import { gameBridge, BooleanInput, PlayerState } from "@/game/GameBridge";
import { PlayerEntry } from "@/hooks/usePlayers";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface ColyseusState {
  status: ConnectionStatus;
  sessionId: string | null;
  error: string | null;
}

type StatusCallback = (state: ColyseusState) => void;

// ─── Colyseus Manager ────────────────────────────────────────────────────────

class ColyseusManager {
  private client: Colyseus.Client | null = null;
  private room: Colyseus.Room<any> | null = null;
  private statusCallbacks: StatusCallback[] = [];
  private playersCallbacks: ((players: PlayerEntry[]) => void)[] = [];
  private chatCallbacks: ((msg: { id: string; username: string; text: string; timestamp: Date; local?: boolean }) => void)[] = [];
  private unsubscribeInput: (() => void) | null = null;

  private playersState: PlayerEntry[] = [];

  // Debounce timer for sidebar updates
  private sidebarDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSidebarPlayers: PlayerEntry[] = [];
  private readonly SIDEBAR_DEBOUNCE_MS = 500;

  // Auto-reconnect state
  private lastConnectUsername: string | null = null;
  private lastConnectMapPreset: string = "Event Hall & Main Stage";
  private intentionalDisconnect = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_DELAY_MS = 30000;

  private state: ColyseusState = {
    status: "disconnected",
    sessionId: null,
    error: null,
  };

  private setState(patch: Partial<ColyseusState>) {
    this.state = { ...this.state, ...patch };
    this.statusCallbacks.forEach((fn) => fn(this.state));
  }

  onStatusChange(fn: StatusCallback) {
    this.statusCallbacks.push(fn);
    fn(this.state);
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter((cb) => cb !== fn);
    };
  }

  onPlayersChange(fn: (players: PlayerEntry[]) => void) {
    this.playersCallbacks.push(fn);
    fn(this.playersState);
    return () => {
      this.playersCallbacks = this.playersCallbacks.filter((cb) => cb !== fn);
    };
  }

  onChatMessage(fn: (msg: { id: string; username: string; text: string; timestamp: Date; local?: boolean }) => void) {
    this.chatCallbacks.push(fn);
    return () => {
      this.chatCallbacks = this.chatCallbacks.filter((cb) => cb !== fn);
    };
  }

  getState() {
    return this.state;
  }

  getPlayers() {
    return this.playersState;
  }

  sendChatMessage(text: string, username?: string) {
    if (this.room && this.state.status === "connected") {
      const payload = { text, username: username || "User" };
      this.room.send("chat", payload);
    }
  }

  async connect(username: string, mapPreset: string = "Event Hall & Main Stage") {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsUrl) {
      console.error("[Colyseus] NEXT_PUBLIC_WS_URL is not set");
      this.setState({ status: "error", error: "NEXT_PUBLIC_WS_URL not configured" });
      return;
    }

    // Remember params for auto-reconnect
    this.lastConnectUsername = username;
    this.lastConnectMapPreset = mapPreset;
    this.intentionalDisconnect = false;
    this.cancelReconnect();

    this.setState({ status: "connecting", error: null });

    try {
      this.client = new Colyseus.Client(wsUrl);
      this.room = await this.client.joinOrCreate("MapRoom", { username, mapPreset });

      this.setState({
        status: "connected",
        sessionId: this.room.sessionId,
        error: null,
      });

      // Tell Phaser which session ID belongs to the local player.
      // RACE CONDITION FIX: The Phaser MainScene loads asynchronously via ResizeObserver.
      // Colyseus can connect BEFORE the scene calls registerStateApplier.
      // We retry every 100ms for up to 3 seconds to guarantee the ID is set.
      const sessionIdToSet = this.room.sessionId;
      const trySetSessionId = async () => {
        const { getMainScene } = await import("@/game/PhaserGame");
        const scene = getMainScene();
        if (scene) {
          scene.setLocalSessionId(sessionIdToSet);
          console.log("[Colyseus] Local session ID set on Phaser scene:", sessionIdToSet);
        } else {
          // Scene not ready yet — retry after 100ms (max 30 retries = 3s)
          let retries = 0;
          const interval = setInterval(async () => {
            retries++;
            const { getMainScene: getScene } = await import("@/game/PhaserGame");
            const s = getScene();
            if (s) {
              s.setLocalSessionId(sessionIdToSet);
              console.log("[Colyseus] Local session ID set on Phaser scene (retry", retries, "):", sessionIdToSet);
              clearInterval(interval);
            } else if (retries >= 30) {
              console.warn("[Colyseus] Gave up waiting for Phaser scene after 3s");
              clearInterval(interval);
            }
          }, 100);
        }
      };
      trySetSessionId();

      // Forward keyboard input → server (boolean input messages)
      this.unsubscribeInput = gameBridge.onInput((input: BooleanInput) => {
        if (this.room && this.state.status === "connected") {
          this.room.send("input", input);
        }
      });

      // Receive chat messages from server
      const handleChatMsg = (data: any) => {
        let senderName = "User";
        let textMsg = "";
        let msgId = typeof data === "object" && data?.id ? data.id : crypto.randomUUID();
        let senderSessionId = typeof data === "object" ? data?.sessionId : undefined;

        if (typeof data === "string") {
          textMsg = data;
        } else if (data && typeof data === "object") {
          senderName = data.username || data.name || data.sender || "User";
          textMsg = data.text || data.message || data.content || String(data);
        }

        const msg = {
          id: msgId,
          username: senderName,
          text: textMsg,
          sessionId: senderSessionId,
          timestamp: data?.timestamp ? new Date(data.timestamp) : new Date(),
        };
        this.chatCallbacks.forEach((fn) => fn(msg));
      };

      this.room.onMessage("chat", handleChatMsg);

      // Listen for player changes via Colyseus Schema event listeners on room.state
      this.room.onStateChange((serverState) => {
        this.handleStateChange(serverState);
      });

      // BUG FIX: Proximity events — server sends { peerSessionId, sessionIdA, sessionIdB, distance }.
      // Old code was reading data.targetId which was always undefined.
      this.room.onMessage("proximity-start", (data: { peerSessionId?: string; targetId?: string }) => {
        // Support both new (peerSessionId) and legacy (targetId) field names
        const peerId = data.peerSessionId || data.targetId;
        if (peerId) gameBridge.emitProximityStart(peerId);
      });

      this.room.onMessage("proximity-end", (data: { peerSessionId?: string; targetId?: string }) => {
        const peerId = data.peerSessionId || data.targetId;
        if (peerId) gameBridge.emitProximityEnd(peerId);
      });

      this.room.onLeave((code) => {
        console.warn(`[Colyseus] Left room with code ${code}`);
        this.setState({ status: "disconnected", sessionId: null });
        this.cleanup();
        // Auto-reconnect unless the user explicitly left (code 4000 = client called leave())
        // or an intentional disconnect was triggered.
        if (!this.intentionalDisconnect && code !== 4000 && this.lastConnectUsername) {
          this.scheduleReconnect();
        }
      });

      this.room.onError((code, message) => {
        const errMsg = typeof message === "string" ? message : `Error code ${code}`;
        console.error(`[Colyseus] Room error ${code}: ${errMsg}`);
        this.setState({ status: "error", error: errMsg });
      });
    } catch (err: any) {
      let msg = "Failed to connect to server";
      if (err instanceof Error && err.message) {
        msg = err.message;
      } else if (typeof err === "string") {
        msg = err;
      } else if (err && typeof err === "object") {
        if (err.message) {
          msg = String(err.message);
        } else if (err.type === "error" || err.constructor?.name === "ProgressEvent" || (err as any).target) {
          msg = `Server unreachable (${wsUrl})`;
        } else {
          msg = JSON.stringify(err);
        }
      }
      console.warn("[Colyseus] Connection error:", msg);
      this.setState({ status: "error", error: msg });
    }
  }

  private handleStateChange(serverState: any) {
    if (!serverState) return;

    // Colyseus room state players collection (MapSchema or Object)
    const rawPlayers = serverState.players;
    if (!rawPlayers) return;

    const playersForPhaser: PlayerState[] = [];
    const playerEntriesForSidebar: PlayerEntry[] = [];

    const processPlayer = (p: any, sessionId: string) => {
      if (!p) return;
      const isLocal = sessionId === this.state.sessionId;
      const username = String(
        p.username ?? p.name ?? p.displayName ?? (isLocal ? "You" : `User ${sessionId.slice(0, 4)}`)
      );
      const posX = p.x ?? p.position?.x ?? p.posX;
      const posY = p.y ?? p.position?.y ?? p.posY;

      playerEntriesForSidebar.push({
        sessionId,
        username,
        statusLabel: isLocal ? "You" : "Online",
        isLocal,
      });

      if (typeof posX === "number" && !isNaN(posX) && typeof posY === "number" && !isNaN(posY)) {
        playersForPhaser.push({
          sessionId,
          x: posX,
          y: posY,
          username,
        });
      }
    };

    if (typeof rawPlayers.forEach === "function") {
      rawPlayers.forEach((p: any, key: string) => processPlayer(p, key));
    } else if (typeof rawPlayers === "object") {
      Object.entries(rawPlayers).forEach(([key, p]) => processPlayer(p, key));
    }

    // Always push player positions to Phaser immediately — bypasses React entirely
    gameBridge.applyServerState(playersForPhaser);

    // PERF FIX: Debounce sidebar React state updates — the player list doesn't need
    // to re-render at 20Hz. Only update every 500ms to keep the React tree quiet.
    this.pendingSidebarPlayers = playerEntriesForSidebar;
    if (!this.sidebarDebounceTimer) {
      this.sidebarDebounceTimer = setTimeout(() => {
        this.playersState = this.pendingSidebarPlayers;
        this.playersCallbacks.forEach((fn) => fn(this.pendingSidebarPlayers));
        this.sidebarDebounceTimer = null;
      }, this.SIDEBAR_DEBOUNCE_MS);
    }
  }

  async disconnect() {
    this.intentionalDisconnect = true;
    this.cancelReconnect();
    await this.room?.leave();
    this.cleanup();
    this.setState({ status: "disconnected", sessionId: null, error: null });
  }

  private scheduleReconnect() {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (capped)
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.MAX_RECONNECT_DELAY_MS);
    this.reconnectAttempts++;
    console.log(`[Colyseus] Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts})...`);
    this.setState({ status: "connecting", error: `Reconnecting... (attempt ${this.reconnectAttempts})` });
    this.reconnectTimer = setTimeout(async () => {
      if (!this.intentionalDisconnect && this.lastConnectUsername) {
        await this.connect(this.lastConnectUsername, this.lastConnectMapPreset);
      }
    }, delay);
  }

  private cancelReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
  }

  private cleanup() {
    this.unsubscribeInput?.();
    this.unsubscribeInput = null;
    this.room = null;
    this.client = null;
    this.playersState = [];
    if (this.sidebarDebounceTimer) {
      clearTimeout(this.sidebarDebounceTimer);
      this.sidebarDebounceTimer = null;
    }
    this.playersCallbacks.forEach((fn) => fn([]));
  }
}

// Singleton
export const colyseusManager = new ColyseusManager();
