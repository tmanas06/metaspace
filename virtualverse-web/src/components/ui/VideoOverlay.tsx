"use client";

import { useEffect, useRef, useState } from "react";
import { LiveKitState } from "@/lib/livekit";

interface VideoOverlayProps {
  livekitState?: LiveKitState;
  remoteVideoElements: Map<string, HTMLVideoElement>;
  username: string;
  onOpenMapSelector: () => void;
  onOpenControls: () => void;
  onOpenPermissions: () => void;
  onToggleChat?: () => void;
  isChatOpen?: boolean;
}

/**
 * VideoOverlay — GatherOffice-style UI overlay.
 *
 * • Proximity status & Video tiles float in TOP-RIGHT corner.
 * • Bottom centre bar: [Avatar | Name | Online] | [Map] [Screen] [Permissions] [Chat] | [Mic] [Cam]
 */
export function VideoOverlay({
  livekitState,
  remoteVideoElements,
  username,
  onOpenMapSelector,
  onOpenControls,
  onOpenPermissions,
  onToggleChat,
  isChatOpen,
}: VideoOverlayProps) {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleToggleMic = () => {
    const next = !isMicOn;
    setIsMicOn(next);
    import("@/lib/livekit").then(({ liveKitManager }) => {
      liveKitManager.setMicrophoneEnabled(next);
    });
  };

  const handleToggleCam = () => {
    const next = !isCamOn;
    setIsCamOn(next);
    import("@/lib/livekit").then(({ liveKitManager }) => {
      liveKitManager.setCameraEnabled(next);
    });
  };

  // Local camera self-preview stream
  useEffect(() => {
    if (isCamOn) {
      navigator.mediaDevices
        ?.getUserMedia({ video: true, audio: false })
        .then((stream) => {
          streamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.warn("[Media] Camera permission or device error:", err);
          setIsCamOn(false);
        });
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isCamOn]);

  const isProximityActive =
    livekitState?.status === "connected" || livekitState?.status === "connecting";
  const hasRemoteVideo = remoteVideoElements.size > 0;
  const targetPeerId = livekitState?.activeTargetId;

  return (
    <>
      {/* ── Top-right Proximity status & video tiles ── */}
      {(isProximityActive || isCamOn || hasRemoteVideo) && (
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 10,
            zIndex: 35,
            pointerEvents: "auto",
          }}
        >
          {/* Connection Status Badge */}
          {isProximityActive && (
            <div
              style={{
                background: "rgba(15, 23, 42, 0.92)",
                border: "1px solid rgba(99, 102, 241, 0.4)",
                backdropFilter: "blur(12px)",
                borderRadius: 20,
                padding: "6px 14px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: livekitState?.status === "connected" ? "#10b981" : "#f59e0b",
                  boxShadow: livekitState?.status === "connected" ? "0 0 8px #10b981" : "none",
                }}
              />
              <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>
                {livekitState?.status === "connected"
                  ? "Proximity Voice & Video"
                  : "Connecting Proximity Call..."}
              </span>
            </div>
          )}

          {/* Local Camera Preview Tile */}
          {isCamOn && (
            <div
              style={{
                position: "relative",
                width: 176,
                height: 128,
                borderRadius: 14,
                overflow: "hidden",
                border: "1.5px solid rgba(99,102,241,0.6)",
                boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
                background: "#0f172a",
              }}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: "scaleX(-1)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 6,
                  left: 6,
                  right: 6,
                  background: "rgba(15,23,42,0.85)",
                  backdropFilter: "blur(6px)",
                  borderRadius: 6,
                  padding: "3px 8px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#10b981",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {username} (You)
                </span>
              </div>
            </div>
          )}

          {/* Remote Proximity Video Tiles */}
          {Array.from(remoteVideoElements.entries()).map(([identity, videoEl]) => (
            <RemoteVideoTile key={identity} identity={identity} videoEl={videoEl} />
          ))}

          {/* Fallback Audio Tile if connected to peer but peer camera is OFF */}
          {livekitState?.status === "connected" && !hasRemoteVideo && targetPeerId && (
            <div
              style={{
                position: "relative",
                width: 176,
                height: 110,
                borderRadius: 14,
                background: "linear-gradient(135deg, #1e1b4b, #312e81)",
                border: "1.5px solid rgba(129, 140, 248, 0.4)",
                boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {/* Avatar circle */}
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #6366f1, #a855f7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 16,
                  boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
                }}
              >
                {(targetPeerId || "P").slice(0, 2).toUpperCase()}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(0,0,0,0.4)",
                  padding: "2px 10px",
                  borderRadius: 12,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#10b981",
                  }}
                />
                <span style={{ color: "#e0e7ff", fontSize: 11, fontWeight: 600 }}>
                  Audio Active
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Bottom-centre Gather-style control bar ── */}
      <div
        id="gather-bottom-bar"
        style={{
          position: "fixed",
          bottom: "max(16px, env(safe-area-inset-bottom, 0px))",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 30,
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          flexWrap: "nowrap",
          gap: 0,
          background: "rgba(15,23,42,0.96)",
          border: "1px solid rgba(255,255,255,0.09)",
          backdropFilter: "blur(20px)",
          borderRadius: 18,
          padding: "6px 10px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
          maxWidth: "calc(100vw - 32px)",
          overflow: "hidden",
        }}
      >
        {/* User info section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            paddingRight: 12,
            borderRight: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
              letterSpacing: "-0.5px",
            }}
          >
            {(username || "U").slice(0, 2).toUpperCase()}
          </div>
          {/* Hide name text on very narrow screens to save space */}
          <div
            className="username-label"
            style={{ display: "flex", flexDirection: "column" }}
          >
            <span
              style={{
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 80,
              }}
            >
              {username || "User"}
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                color: "#34d399",
                fontSize: 10,
                fontWeight: 500,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "#34d399",
                }}
              />
              Online
            </span>
          </div>
        </div>

        {/* Action icons: Map, Screen, Emoji */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            padding: "0 8px",
            borderRight: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <BarIconBtn
            label="Map Gallery"
            onClick={onOpenMapSelector}
            icon={
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            }
          />
          <BarIconBtn
            label="Screen / Controls"
            onClick={onOpenControls}
            icon={
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
          />
          <BarIconBtn
            label="Permissions"
            onClick={onOpenPermissions}
            icon={
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          {onToggleChat && (
            <BarIconBtn
              label="Room Chat"
              onClick={onToggleChat}
              icon={
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke={isChatOpen ? "#818cf8" : "currentColor"} strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              }
            />
          )}
        </div>

        {/* Mic / Cam controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 8 }}>
          <MediaBtn
            active={isMicOn}
            onClick={handleToggleMic}
            title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
            activeColor="rgba(255,255,255,0.07)"
            inactiveColor="rgba(239,68,68,0.18)"
            inactiveBorder="rgba(239,68,68,0.45)"
            icon={
              isMicOn ? (
                <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z" />
                </svg>
              ) : (
                <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              )
            }
          />

          <MediaBtn
            active={isCamOn}
            onClick={handleToggleCam}
            title={isCamOn ? "Turn Off Camera" : "Turn On Camera"}
            activeColor="rgba(99,102,241,0.25)"
            activeBorder="rgba(99,102,241,0.6)"
            inactiveColor="rgba(255,255,255,0.07)"
            icon={
              isCamOn ? (
                <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              )
            }
          />
        </div>
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RemoteVideoTile({
  identity,
  videoEl,
}: {
  identity: string;
  videoEl: HTMLVideoElement;
}) {
  useEffect(() => {
    const container = document.getElementById(`remote-tile-${identity}`);
    if (container && videoEl) {
      videoEl.style.width = "100%";
      videoEl.style.height = "100%";
      videoEl.style.objectFit = "cover";
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      videoEl.muted = false;
      container.appendChild(videoEl);
    }
    return () => {
      try {
        container?.removeChild(videoEl);
      } catch { }
    };
  }, [identity, videoEl]);

  return (
    <div
      style={{
        position: "relative",
        width: 176,
        height: 128,
        borderRadius: 14,
        overflow: "hidden",
        border: "1.5px solid rgba(255,255,255,0.2)",
        boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
        background: "#0f172a",
      }}
    >
      <div id={`remote-tile-${identity}`} style={{ width: "100%", height: "100%" }} />
      <div
        style={{
          position: "absolute",
          bottom: 6,
          left: 6,
          right: 6,
          background: "rgba(15,23,42,0.85)",
          backdropFilter: "blur(6px)",
          borderRadius: 6,
          padding: "3px 8px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#10b981",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {identity}
        </span>
      </div>
    </div>
  );
}

function BarIconBtn({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={label}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? "rgba(255,255,255,0.09)" : "transparent",
        border: "none",
        borderRadius: 10,
        color: hov ? "#fff" : "rgba(255,255,255,0.55)",
        padding: "6px 8px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.12s, color 0.12s",
      }}
    >
      {icon}
    </button>
  );
}

function MediaBtn({
  active,
  onClick,
  title,
  icon,
  activeColor,
  activeBorder,
  inactiveColor,
  inactiveBorder,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
  activeColor: string;
  activeBorder?: string;
  inactiveColor: string;
  inactiveBorder?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        background: active ? activeColor : inactiveColor,
        border: `1px solid ${active ? (activeBorder ?? "rgba(255,255,255,0.12)") : (inactiveBorder ?? "rgba(255,255,255,0.08)")}`,
        borderRadius: 11,
        color: active ? "#fff" : "#fca5a5",
        padding: "7px 8px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.15s",
      }}
    >
      {icon}
    </button>
  );
}
