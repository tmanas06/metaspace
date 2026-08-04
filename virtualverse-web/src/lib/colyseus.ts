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
// PhaserGame is imported dynamically at runtime to prevent Phaser (which
// references window at module evaluation) from being bundled in SSR.

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
  private room: Colyseus.Room | null = null;
  private statusCallbacks: StatusCallback[] = [];
  private unsubscribeInput: (() => void) | null = null;

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
    // Immediately emit current state to new subscriber
    fn(this.state);
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter((cb) => cb !== fn);
    };
  }

  getState() {
    return this.state;
  }

  async connect(username: string) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsUrl) {
      console.error("[Colyseus] NEXT_PUBLIC_WS_URL is not set");
      this.setState({ status: "error", error: "NEXT_PUBLIC_WS_URL not configured" });
      return;
    }

    this.setState({ status: "connecting", error: null });

    try {
      this.client = new Colyseus.Client(wsUrl);
      this.room = await this.client.joinOrCreate("MapRoom", { username });

      this.setState({
        status: "connected",
        sessionId: this.room.sessionId,
        error: null,
      });

      // Tell Phaser which session ID belongs to the local player (dynamic import avoids SSR issue)
      import("@/game/PhaserGame").then(({ getMainScene }) => {
        getMainScene()?.setLocalSessionId(this.room!.sessionId);
      });

      // Forward keyboard input → server
      this.unsubscribeInput = gameBridge.onInput((input: BooleanInput) => {
        if (this.room && this.state.status === "connected") {
          this.room.send("input", input);
        }
      });

      // Receive authoritative state from server
      this.room.onStateChange((serverState) => {
        this.handleStateChange(serverState);
      });

      // Proximity events from server (if server emits them directly)
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
        console.error(`[Colyseus] Room error ${code}: ${message}`);
        this.setState({ status: "error", error: message ?? `Error code ${code}` });
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Colyseus] Connection failed:", msg);
      this.setState({ status: "error", error: msg });
    }
  }

  private handleStateChange(serverState: Record<string, unknown>) {
    const playersMap = serverState?.players as
      | Map<string, Record<string, unknown>>
      | undefined;

    if (!playersMap) return;

    const players: PlayerState[] = [];
    playersMap.forEach((p: any, sessionId: string) => {
      // Log raw player object from server to inspect schema
      console.log(`[Colyseus] Player raw state for ${sessionId}:`, p);

      // Extract x and y safely — check p.x, p.y or nested p.position
      const posX = p?.x ?? p?.position?.x ?? p?.posX;
      const posY = p?.y ?? p?.position?.y ?? p?.posY;

      // Only push if x and y are valid numbers
      if (typeof posX === "number" && !isNaN(posX) && typeof posY === "number" && !isNaN(posY)) {
        players.push({
          sessionId,
          x: posX,
          y: posY,
          username: String(p?.username ?? p?.name ?? ""),
        });
      } else {
        console.warn(`[Colyseus] Invalid position for player ${sessionId}: x=${posX}, y=${posY}`);
      }
    });

    // Push to Phaser via bridge (reconciliation happens in MainScene)
    if (players.length > 0) {
      gameBridge.applyServerState(players);
    }
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
  }
}

// Singleton
export const colyseusManager = new ColyseusManager();
