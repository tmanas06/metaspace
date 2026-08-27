/**
 * GameBridge — singleton event bus between Phaser and React/Colyseus.
 *
 * React never calls into Phaser directly per-frame.
 * Phaser emits events here; Colyseus/LiveKit hooks subscribe here.
 *
 * Events emitted BY Phaser (outgoing):
 *   "input"          — { left, right, up, down }: BooleanInput
 *   "proximityStart" — { targetId: string }
 *   "proximityEnd"   — { targetId: string }
 *
 * Events sent TO Phaser (incoming), called imperatively:
 *   bridge.applyServerState(players)
 */

export interface BooleanInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

export interface PlayerState {
  sessionId: string;
  x: number;
  y: number;
  username?: string;
  isSitting?: boolean;
  seatId?: string;
}

import { MapPresetData } from "@/lib/api";

type InputListener = (input: BooleanInput) => void;
type ProximityListener = (targetId: string) => void;
type StateApplier = (players: PlayerState[]) => void;
type MapDataListener = (mapData: MapPresetData | string) => void;

class GameBridge {
  private inputListeners: InputListener[] = [];
  private proximityStartListeners: ProximityListener[] = [];
  private proximityEndListeners: ProximityListener[] = [];
  private stateApplier: StateApplier | null = null;
  private mapDataListener: MapDataListener | null = null;
  // Buffered so a late-registering Phaser scene gets the latest state on mount
  private lastKnownState: PlayerState[] | null = null;

  // Touch/joystick input injected by the React MobileJoystick component.
  // Phaser's update() reads this every frame alongside keyboard input.
  private touchInput: BooleanInput = { left: false, right: false, up: false, down: false };

  // Local player username — set by React before Phaser scene starts
  private localUsername = "Player";

  /** Called by the React MobileJoystick to drive movement from touch. */
  setTouchInput(input: BooleanInput) {
    this.touchInput = input;
  }

  /** Called by Phaser's update() to merge touch + keyboard input. */
  getTouchInput(): BooleanInput {
    return this.touchInput;
  }

  /** Called by React (VirtualWorld) before the game starts so the avatar knows the player name. */
  setLocalUsername(name: string) {
    this.localUsername = name;
  }

  /** Called by MainScene to retrieve the local player name for avatar color / label. */
  getLocalUsername(): string {
    return this.localUsername;
  }

  // Called by Phaser when local player presses keys
  emitInput(input: BooleanInput) {
    this.inputListeners.forEach((fn) => fn(input));
  }

  // Called by Phaser when another player enters proximity
  emitProximityStart(targetId: string) {
    this.proximityStartListeners.forEach((fn) => fn(targetId));
  }

  // Called by Phaser when another player leaves proximity
  emitProximityEnd(targetId: string) {
    this.proximityEndListeners.forEach((fn) => fn(targetId));
  }

  // Called by Colyseus hook to push authoritative state into Phaser
  applyServerState(players: PlayerState[]) {
    this.lastKnownState = players; // always buffer latest
    if (this.stateApplier) this.stateApplier(players);
  }

  // Called by React when active map data changes
  setMapTheme(mapData: MapPresetData | string) {
    if (this.mapDataListener) this.mapDataListener(mapData);
  }

  registerMapThemeListener(fn: MapDataListener) {
    this.mapDataListener = fn;
    return () => {
      this.mapDataListener = null;
    };
  }

  // --- Subscribe methods ---

  onInput(fn: InputListener) {
    this.inputListeners.push(fn);
    return () => {
      this.inputListeners = this.inputListeners.filter((l) => l !== fn);
    };
  }

  onProximityStart(fn: ProximityListener) {
    this.proximityStartListeners.push(fn);
    return () => {
      this.proximityStartListeners = this.proximityStartListeners.filter(
        (l) => l !== fn
      );
    };
  }

  onProximityEnd(fn: ProximityListener) {
    this.proximityEndListeners.push(fn);
    return () => {
      this.proximityEndListeners = this.proximityEndListeners.filter(
        (l) => l !== fn
      );
    };
  }

  registerStateApplier(fn: StateApplier) {
    this.stateApplier = fn;
    // Replay the last known state immediately so the scene never misses
    // the initial server snapshot if it registered late (Phaser loads async).
    if (this.lastKnownState) {
      fn(this.lastKnownState);
    }
    return () => {
      this.stateApplier = null;
    };
  }
}

// Singleton — shared across the whole app
export const gameBridge = new GameBridge();
