/**
 * LiveKit integration — connects to video/audio rooms triggered by proximity.
 *
 * Flow:
 *   1. Colyseus detects proximity (via server or Phaser detection)
 *   2. gameBridge emits "proximityStart" with targetSessionId
 *   3. This module debounces the event (800ms) to avoid spam
 *   4. On confirmed start: POST to ${NEXT_PUBLIC_API_URL}/livekit/token
 *   5. Connect to LiveKit room at NEXT_PUBLIC_LIVEKIT_URL
 *   6. Publish local cam/mic, subscribe to remote tracks
 *   7. On proximity-end: disconnect and clean up all tracks
 *
 * URL always comes from NEXT_PUBLIC_API_URL and NEXT_PUBLIC_LIVEKIT_URL — never hardcoded.
 */

import {
  Room,
  RoomEvent,
  Track,
  RemoteParticipant,
  RemoteTrackPublication,
  createLocalTracks,
} from "livekit-client";

import { gameBridge } from "@/game/GameBridge";

export type LiveKitStatus = "idle" | "connecting" | "connected" | "error";

export interface LiveKitState {
  status: LiveKitStatus;
  activeTargetId: string | null;
  error: string | null;
  remoteVideoElements: Map<string, HTMLVideoElement>;
}

type StatusCallback = (state: LiveKitState) => void;

// ─── LiveKit Manager ─────────────────────────────────────────────────────────

class LiveKitManager {
  private room: Room | null = null;
  private localTracks: Awaited<ReturnType<typeof createLocalTracks>> = [];
  private statusCallbacks: StatusCallback[] = [];

  private state: LiveKitState = {
    status: "idle",
    activeTargetId: null,
    error: null,
    remoteVideoElements: new Map(),
  };

  // Debounce timers
  private proximityStartTimer: ReturnType<typeof setTimeout> | null = null;
  private proximityEndTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_MS = 800;

  // Unsubscribe functions from gameBridge
  private unsubStart: (() => void) | null = null;
  private unsubEnd: (() => void) | null = null;

  private setState(patch: Partial<LiveKitState>) {
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

  getState() {
    return this.state;
  }

  /** Call once to start listening for proximity events from the bridge */
  startListening() {
    this.unsubStart = gameBridge.onProximityStart((targetId) => {
      // Cancel any pending disconnect
      if (this.proximityEndTimer) {
        clearTimeout(this.proximityEndTimer);
        this.proximityEndTimer = null;
      }

      // Debounce connect — don't spam if player hovers at boundary
      if (this.proximityStartTimer) clearTimeout(this.proximityStartTimer);
      this.proximityStartTimer = setTimeout(() => {
        this.connectToProximityRoom(targetId);
      }, this.DEBOUNCE_MS);
    });

    this.unsubEnd = gameBridge.onProximityEnd((_targetId) => {
      // Cancel any pending connect
      if (this.proximityStartTimer) {
        clearTimeout(this.proximityStartTimer);
        this.proximityStartTimer = null;
      }

      // Debounce disconnect
      if (this.proximityEndTimer) clearTimeout(this.proximityEndTimer);
      this.proximityEndTimer = setTimeout(() => {
        this.disconnectProximityRoom();
      }, this.DEBOUNCE_MS);
    });
  }

  stopListening() {
    this.unsubStart?.();
    this.unsubEnd?.();
    this.unsubStart = null;
    this.unsubEnd = null;
  }

  private async connectToProximityRoom(targetId: string) {
    // If already connected to this target, skip
    if (
      this.state.status === "connected" &&
      this.state.activeTargetId === targetId
    ) {
      return;
    }

    // Disconnect from any existing room first
    if (this.room) {
      await this.disconnectProximityRoom();
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiUrl || !livekitUrl) {
      console.error("[LiveKit] NEXT_PUBLIC_API_URL or NEXT_PUBLIC_LIVEKIT_URL not set");
      this.setState({ status: "error", error: "LiveKit env vars not configured" });
      return;
    }

    this.setState({ status: "connecting", activeTargetId: targetId, error: null });

    try {
      // Fetch token from NestJS backend
      const res = await fetch(`${apiUrl}/livekit/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetSessionId: targetId }),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`Token fetch failed: ${res.status} ${res.statusText}`);
      }

      const { token } = (await res.json()) as { token: string };

      // Connect to LiveKit room
      this.room = new Room();

      this.room.on(RoomEvent.TrackSubscribed, this.handleTrackSubscribed.bind(this));
      this.room.on(RoomEvent.TrackUnsubscribed, this.handleTrackUnsubscribed.bind(this));
      this.room.on(RoomEvent.Disconnected, () => {
        this.setState({ status: "idle", activeTargetId: null });
        this.cleanup();
      });

      await this.room.connect(livekitUrl, token);

      // Publish local camera and microphone
      this.localTracks = await createLocalTracks({ audio: true, video: true });
      await Promise.all(
        this.localTracks.map((t) => this.room!.localParticipant.publishTrack(t))
      );

      this.setState({ status: "connected" });
      console.log(`[LiveKit] Connected to proximity room with ${targetId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[LiveKit] Connection error:", msg);
      this.setState({ status: "error", error: msg, activeTargetId: null });
      await this.cleanup();
    }
  }

  async disconnectProximityRoom() {
    if (this.room) {
      await this.room.disconnect();
    }
    await this.cleanup();
    this.setState({
      status: "idle",
      activeTargetId: null,
      remoteVideoElements: new Map(),
    });
  }

  private handleTrackSubscribed(
    track: RemoteTrackPublication["track"],
    _pub: RemoteTrackPublication,
    participant: RemoteParticipant
  ) {
    if (!track) return;
    if (track.kind === Track.Kind.Video) {
      const videoEl = track.attach() as HTMLVideoElement;
      const newMap = new Map(this.state.remoteVideoElements);
      newMap.set(participant.identity, videoEl);
      this.setState({ remoteVideoElements: newMap });
    } else if (track.kind === Track.Kind.Audio) {
      // Audio just needs to be attached to trigger playback
      track.attach();
    }
  }

  private handleTrackUnsubscribed(
    _track: RemoteTrackPublication["track"],
    _pub: RemoteTrackPublication,
    participant: RemoteParticipant
  ) {
    const newMap = new Map(this.state.remoteVideoElements);
    newMap.delete(participant.identity);
    this.setState({ remoteVideoElements: newMap });
  }

  private async cleanup() {
    for (const track of this.localTracks) {
      track.stop();
    }
    this.localTracks = [];
    this.room = null;
  }
}

// Singleton
export const liveKitManager = new LiveKitManager();
