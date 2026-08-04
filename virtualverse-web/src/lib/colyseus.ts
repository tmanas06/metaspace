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
      this.room.send("message", payload);
      this.room.send("chat-message", payload);
    }
  }

  async connect(username: string, mapPreset: string = "Event Hall & Main Stage") {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsUrl) {
      console.error("[Colyseus] NEXT_PUBLIC_WS_URL is not set");
      this.setState({ status: "error", error: "NEXT_PUBLIC_WS_URL not configured" });
      return;
    }

    this.setState({ status: "connecting", error: null });

    try {
      this.client = new Colyseus.Client(wsUrl);
      this.room = await this.client.joinOrCreate("MapRoom", { username, mapPreset });

      this.setState({
        status: "connected",
        sessionId: this.room.sessionId,
        error: null,
      });

      // Tell Phaser which session ID belongs to local player
      const scene = (await import("@/game/PhaserGame")).getMainScene();
      if (scene) {
        scene.setLocalSessionId(this.room.sessionId);
      }

      // Forward keyboard input → server
      this.unsubscribeInput = gameBridge.onInput((input: BooleanInput) => {
        if (this.room && this.state.status === "connected") {
          this.room.send("input", input);
        }
      });

      // Receive chat messages from server
      const handleChatMsg = (data: any) => {
        let senderName = "User";
        let textMsg = "";
        if (typeof data === "string") {
          textMsg = data;
        } else if (data && typeof data === "object") {
          senderName = data.username || data.name || data.sender || "User";
          textMsg = data.text || data.message || data.content || String(data);
        }
        const msg = {
          id: crypto.randomUUID(),
          username: senderName,
          text: textMsg,
          timestamp: new Date(),
        };
        this.chatCallbacks.forEach((fn) => fn(msg));
      };

      this.room.onMessage("chat", handleChatMsg);
      this.room.onMessage("message", handleChatMsg);
      this.room.onMessage("chat-message", handleChatMsg);

      // Listen for player changes via Colyseus Schema event listeners on room.state
      this.room.onStateChange((serverState) => {
        this.handleStateChange(serverState);
      });

      // Proximity events from server
      this.room.onMessage("proximity-start", (data: { targetId: string }) => {
        gameBridge.emitProximityStart(data.targetId);
      });

      this.room.onMessage("proximity-end", (data: { targetId: string }) => {
        gameBridge.emitProximityEnd(data.targetId);
      });

      this.room.onLeave((code) => {
        console.warn(`[Colyseus] Left room with code ${code}`);
        this.setState({ status: "disconnected", sessionId: null });
        this.cleanup();
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

    // Always push player list to Phaser so MainScene updates position and cleans up disconnected players
    gameBridge.applyServerState(playersForPhaser);

    // Notify React UI subscribers (sidebar roster)
    this.playersState = playerEntriesForSidebar;
    this.playersCallbacks.forEach((fn) => fn(playerEntriesForSidebar));
  }

  async disconnect() {
    await this.room?.leave();
    this.cleanup();
    this.setState({ status: "disconnected", sessionId: null, error: null });
  }

  private cleanup() {
    this.unsubscribeInput?.();
    this.unsubscribeInput = null;
    this.room = null;
    this.client = null;
    this.playersState = [];
    this.playersCallbacks.forEach((fn) => fn([]));
  }
}

// Singleton
export const colyseusManager = new ColyseusManager();
