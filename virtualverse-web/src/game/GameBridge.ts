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
}

type InputListener = (input: BooleanInput) => void;
type ProximityListener = (targetId: string) => void;
type StateApplier = (players: PlayerState[]) => void;
type MapThemeListener = (themeName: string) => void;

class GameBridge {
  private inputListeners: InputListener[] = [];
  private proximityStartListeners: ProximityListener[] = [];
  private proximityEndListeners: ProximityListener[] = [];
  private stateApplier: StateApplier | null = null;
  private mapThemeListener: MapThemeListener | null = null;

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
    if (this.stateApplier) this.stateApplier(players);
  }

  // Called by React when active map changes
  setMapTheme(themeName: string) {
    if (this.mapThemeListener) this.mapThemeListener(themeName);
  }

  registerMapThemeListener(fn: MapThemeListener) {
    this.mapThemeListener = fn;
    return () => {
      this.mapThemeListener = null;
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
    return () => {
      this.stateApplier = null;
    };
  }
}

// Singleton — shared across the whole app
export const gameBridge = new GameBridge();
