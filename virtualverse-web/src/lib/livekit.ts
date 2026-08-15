/**
 * LiveKit integration — connects to video/audio rooms triggered by proximity.
 *
 * Flow:
 *   1. Colyseus detects proximity (via server or Phaser detection)
 *   2. gameBridge emits "proximityStart" with targetSessionId
 *   3. This module debounces the event (800ms) to avoid spam
 *   4. On confirmed start: POST to ${NEXT_PUBLIC_API_URL}/livekit/proximity-token
 *   5. Connect to LiveKit room
 *   6. Publish local cam/mic, subscribe to remote tracks
 *   7. On proximity-end: disconnect and clean up all tracks
 */

import {
  Room,
  RoomEvent,
  Track,
  RemoteParticipant,
  RemoteTrackPublication,
  createLocalTracks,
  LocalTrack,
} from "livekit-client";

import { gameBridge } from "@/game/GameBridge";

export type LiveKitStatus = "idle" | "connecting" | "connected" | "error";

export interface LiveKitState {
  status: LiveKitStatus;
  activeTargetId: string | null;
  error: string | null;
  remoteVideoElements: Map<string, HTMLVideoElement>;
  micEnabled: boolean;
  camEnabled: boolean;
}

type StatusCallback = (state: LiveKitState) => void;

// ─── LiveKit Manager ─────────────────────────────────────────────────────────

class LiveKitManager {
  private room: Room | null = null;
  private localTracks: LocalTrack[] = [];
  private statusCallbacks: StatusCallback[] = [];

  private state: LiveKitState = {
    status: "idle",
    activeTargetId: null,
    error: null,
    remoteVideoElements: new Map(),
    micEnabled: true,
    camEnabled: true,
  };

  // Debounce timers & locks
  private proximityStartTimer: ReturnType<typeof setTimeout> | null = null;
  private proximityEndTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_MS = 600;
  private isConnecting = false;

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
    console.log("[LiveKit] Starting proximity event listener...");
    this.unsubStart = gameBridge.onProximityStart((targetId) => {
      console.log("[LiveKit] Proximity start received for target:", targetId);
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
      console.log("[LiveKit] Proximity end received");
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
    console.log("[LiveKit] Stopping proximity event listener...");
    this.unsubStart?.();
    this.unsubEnd?.();
    this.unsubStart = null;
    this.unsubEnd = null;
  }

  async setMicrophoneEnabled(enabled: boolean) {
    this.setState({ micEnabled: enabled });
    if (this.room && this.state.status === "connected") {
      try {
        await this.room.localParticipant.setMicrophoneEnabled(enabled);
      } catch (err) {
        console.warn("[LiveKit] Failed to toggle microphone:", err);
      }
    }
  }

  async setCameraEnabled(enabled: boolean) {
    this.setState({ camEnabled: enabled });
    if (this.room && this.state.status === "connected") {
      try {
        await this.room.localParticipant.setCameraEnabled(enabled);
      } catch (err) {
        console.warn("[LiveKit] Failed to toggle camera:", err);
      }
    }
  }

  private async connectToProximityRoom(targetId: string) {
    // If already connecting or connected to this target, skip
    if (
      this.isConnecting ||
      (this.state.status === "connected" && this.state.activeTargetId === targetId)
    ) {
      return;
    }

    this.isConnecting = true;

    // Disconnect from any existing room first
    if (this.room) {
      await this.disconnectProximityRoom();
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const defaultLivekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiUrl) {
      console.error("[LiveKit] NEXT_PUBLIC_API_URL not set");
      this.setState({ status: "error", error: "LiveKit API URL not configured" });
      return;
    }

    this.setState({ status: "connecting", activeTargetId: targetId, error: null });

    // Retrieve local Colyseus sessionId
    const { colyseusManager } = await import("@/lib/colyseus");
    const localSessionId = colyseusManager.getState().sessionId || "unknown";

    try {
      let token = "";
      let serverReturnedLivekitUrl = "";

      const tokenPayload = {
        sessionId: localSessionId,
        peerSessionId: targetId,
        targetSessionId: targetId,
      };

      try {
        const res = await fetch(`${apiUrl}/livekit/proximity-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tokenPayload),
        });
        if (res.ok) {
          const data = await res.json();
          token = data.token;
          serverReturnedLivekitUrl = data.livekitUrl;
        }
      } catch (err) {
        console.warn("[LiveKit] proximity-token fetch failed, trying legacy endpoint", err);
      }

      // Fallback: legacy endpoint
      if (!token) {
        try {
          const res2 = await fetch(`${apiUrl}/livekit/token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: localSessionId, peerSessionId: targetId }),
          });
          if (res2.ok) {
            const data2 = await res2.json();
            token = data2.token;
            serverReturnedLivekitUrl = data2.livekitUrl;
          }
        } catch (err) {
          console.warn("[LiveKit] Legacy token fetch also failed", err);
        }
      }

      if (!token) {
        throw new Error(
          `Token fetch failed. Ensure NEXT_PUBLIC_API_URL is set and backend is running.`
        );
      }

      // Resolve final LiveKit URL: prioritize server return if valid public URL, else defaultLivekitUrl
      let finalLivekitUrl = defaultLivekitUrl;
      if (serverReturnedLivekitUrl && !serverReturnedLivekitUrl.includes("livekit:7880")) {
        finalLivekitUrl = serverReturnedLivekitUrl;
      }

      if (!finalLivekitUrl) {
        console.warn("[LiveKit] No NEXT_PUBLIC_LIVEKIT_URL set, falling back to window location origin");
        const isSecure = window.location.protocol === "https:";
        finalLivekitUrl = `${isSecure ? "wss" : "ws"}://${window.location.host}`;
      }

      console.log(`[LiveKit] Connecting to room with URL: ${finalLivekitUrl}`);
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      this.room.on(RoomEvent.TrackSubscribed, this.handleTrackSubscribed.bind(this));
      this.room.on(RoomEvent.TrackUnsubscribed, this.handleTrackUnsubscribed.bind(this));
      this.room.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log("[LiveKit] Remote participant connected:", participant.identity);
        participant.trackPublications.forEach((pub) => {
          if (pub.isSubscribed && pub.track) {
            this.handleTrackSubscribed(pub.track, pub, participant);
          }
        });
      });
      this.room.on(RoomEvent.TrackPublished, (pub) => {
        pub.setSubscribed(true);
      });
      this.room.on(RoomEvent.Disconnected, () => {
        console.log("[LiveKit] Disconnected from room");
        this.setState({ status: "idle", activeTargetId: null });
        this.cleanup();
      });

      await this.room.connect(finalLivekitUrl, token, {
        autoSubscribe: true,
        rtcConfig: {
          iceServers: [
            { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
            {
              urls: [
                "turn:openrelay.metered.ca:80",
                "turn:openrelay.metered.ca:443",
                "turn:openrelay.metered.ca:443?transport=tcp",
              ],
              username: "openrelayproject",
              credential: "openrelayproject",
            },
          ],
        },
      });

      // Check tracks of participants ALREADY in the room
      this.room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((pub) => {
          if (pub.isSubscribed && pub.track) {
            this.handleTrackSubscribed(pub.track, pub, participant);
          }
        });
      });

      // Create and publish local media tracks (with graceful audio/video fallback)
      try {
        this.localTracks = await createLocalTracks({
          audio: this.state.micEnabled,
          video: this.state.camEnabled,
        });
      } catch (mediaErr) {
        console.warn("[LiveKit] Failed audio+video track creation, falling back to audio only:", mediaErr);
        try {
          this.localTracks = await createLocalTracks({ audio: true, video: false });
        } catch (audioErr) {
          console.warn("[LiveKit] Audio track creation also failed:", audioErr);
        }
      }

      if (this.localTracks.length > 0) {
        await Promise.all(
          this.localTracks.map((t) => this.room!.localParticipant.publishTrack(t))
        );
      }

      this.setState({ status: "connected" });
      console.log(`[LiveKit] Successfully connected to proximity room with ${targetId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[LiveKit] Proximity media call unavailable (LiveKit server not connected):", msg);
      // Graceful fallback: return to idle so UI stays clean if LiveKit server is not configured
      this.setState({ status: "idle", error: null, activeTargetId: null });
      await this.cleanup();
    } finally {
      this.isConnecting = false;
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
      error: null,
      remoteVideoElements: new Map(),
    });
  }

  clearError() {
    this.setState({ error: null });
  }

  getLocalVideoTrack(): LocalTrack | null {
    return (this.localTracks.find((t) => t.kind === Track.Kind.Video) as LocalTrack) ?? null;
  }

  private handleTrackSubscribed(
    track: RemoteTrackPublication["track"],
    _pub: RemoteTrackPublication,
    participant: RemoteParticipant
  ) {
    if (!track) return;
    if (track.kind === Track.Kind.Video) {
      const videoEl = track.attach() as HTMLVideoElement;
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      const newMap = new Map(this.state.remoteVideoElements);
      newMap.set(participant.identity, videoEl);
      this.setState({ remoteVideoElements: newMap });
    } else if (track.kind === Track.Kind.Audio) {
      // Clean up previous audio element for this participant if any
      const existing = document.getElementById(`remote-audio-${participant.identity}`);
      if (existing) existing.remove();

      const audioEl = track.attach() as HTMLAudioElement;
      audioEl.id = `remote-audio-${participant.identity}`;
      audioEl.autoplay = true;
      audioEl.volume = 1.0;
      document.body.appendChild(audioEl);

      const playAudio = () => {
        audioEl.play().catch((err) => {
          console.warn("[LiveKit] Audio play blocked, unlocking on user gesture:", err);
        });
      };
      playAudio();

      const unlock = () => {
        playAudio();
        window.removeEventListener("click", unlock);
        window.removeEventListener("touchstart", unlock);
      };
      window.addEventListener("click", unlock, { once: true });
      window.addEventListener("touchstart", unlock, { once: true });
    }
  }

  private handleTrackUnsubscribed(
    track: RemoteTrackPublication["track"],
    _pub: RemoteTrackPublication,
    participant: RemoteParticipant
  ) {
    if (track) {
      track.detach().forEach((el) => el.remove());
    }
    const existingAudio = document.getElementById(`remote-audio-${participant.identity}`);
    if (existingAudio) existingAudio.remove();

    const newMap = new Map(this.state.remoteVideoElements);
    newMap.delete(participant.identity);
    this.setState({ remoteVideoElements: newMap });
  }

  private async cleanup() {
    for (const track of this.localTracks) {
      track.stop();
    }
    this.localTracks = [];
    document.querySelectorAll("audio[id^='remote-audio-']").forEach((el) => el.remove());
    this.room = null;
  }
}

// Singleton
export const liveKitManager = new LiveKitManager();
