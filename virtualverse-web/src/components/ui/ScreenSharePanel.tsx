"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ScreenShareStatus =
  | "idle"
  | "sharing"
  | "recording"
  | "recording+sharing"
  | "error";

export interface ScreenShareState {
  status: ScreenShareStatus;
  error?: string;
  recordingDuration: number; // seconds
}

interface ScreenSharePanelProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

function formatDuration(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ScreenSharePanel({ isOpen, onClose, username }: ScreenSharePanelProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<{ url: string; name: string; duration: number; size: number }[]>([]);
  const [shareWithAudio, setShareWithAudio] = useState(true);
  const [shareTab, setShareTab] = useState<"screen" | "window" | "tab">("screen");
  const [previewMode, setPreviewMode] = useState(false);

  const shareStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewRef = useRef<HTMLVideoElement>(null);

  // Dragging
  const [pos, setPos] = useState({ x: 120, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button,input,select,video")) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      setPos({
        x: Math.max(0, dragRef.current.origX + e.clientX - dragRef.current.startX),
        y: Math.max(0, dragRef.current.origY + e.clientY - dragRef.current.startY),
      });
    };
    const onUp = () => { setIsDragging(false); dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [isDragging]);

  const stopSharing = useCallback(() => {
    if (shareStreamRef.current) {
      shareStreamRef.current.getTracks().forEach((t) => t.stop());
      shareStreamRef.current = null;
    }
    if (previewRef.current) {
      previewRef.current.srcObject = null;
    }
    setIsSharing(false);
    setPreviewMode(false);
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  }, []);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      stopSharing();
      stopRecording();
    }
  }, [isOpen, stopSharing, stopRecording]);

  const startScreenShare = async () => {
    setError(null);
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: {
          displaySurface: shareTab,
          cursor: "always",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: shareWithAudio,
        selfBrowserSurface: "exclude",
      });

      shareStreamRef.current = stream;
      setIsSharing(true);

      if (previewMode && previewRef.current) {
        previewRef.current.srcObject = stream;
        previewRef.current.play().catch(() => {});
      }

      // Auto-stop when user ends share from browser UI
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        setIsSharing(false);
        if (isRecording) stopRecording();
      });
    } catch (err: any) {
      if (err?.name !== "NotAllowedError") {
        setError("Could not capture display. Make sure you grant screen share permission.");
      }
    }
  };

  const startRecording = async () => {
    setError(null);
    chunksRef.current = [];

    // If not already sharing, start a share stream first
    let stream = shareStreamRef.current;
    if (!stream) {
      try {
        stream = await (navigator.mediaDevices as any).getDisplayMedia({
          video: { cursor: "always", frameRate: { ideal: 30 } },
          audio: shareWithAudio,
        });
        shareStreamRef.current = stream;
        setIsSharing(true);
        (stream as MediaStream).getVideoTracks()[0].addEventListener("ended", () => {
          setIsSharing(false);
          stopRecording();
        });
      } catch (err: any) {
        if (err?.name !== "NotAllowedError") {
          setError("Could not capture display for recording.");
        }
        return;
      }
    }

    const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
      .find((m) => MediaRecorder.isTypeSupported(m)) ?? "";

    const recorder = new MediaRecorder(stream as MediaStream, mimeType ? { mimeType } : {});
    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data?.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const name = `vv-recording-${username}-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`;
      setRecordings((prev) => [{ url, name, duration: recordingDuration, size: blob.size }, ...prev]);
      setRecordingDuration(0);
      chunksRef.current = [];
    };

    recorder.start(1000);
    setIsRecording(true);
    setRecordingDuration(0);
    timerRef.current = setInterval(() => setRecordingDuration((d) => d + 1), 1000);
  };

  const downloadRecording = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  };

  const deleteRecording = (url: string) => {
    URL.revokeObjectURL(url);
    setRecordings((prev) => prev.filter((r) => r.url !== url));
  };

  const formatBytes = (b: number) => {
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  const activeStatus: ScreenShareStatus = isRecording && isSharing ? "recording+sharing"
    : isRecording ? "recording"
    : isSharing ? "sharing"
    : error ? "error"
    : "idle";

  return (
    <div
      id="screen-share-panel"
      style={{
        position: "fixed",
        top: pos.y,
        left: pos.x,
        width: 400,
        maxWidth: "calc(100vw - 32px)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        background: "rgba(6, 13, 24, 0.97)",
        border: "1px solid rgba(236,72,153,0.3)",
        borderRadius: 16,
        boxShadow: "0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(236,72,153,0.08)",
        backdropFilter: "blur(24px)",
        overflow: "hidden",
        cursor: isDragging ? "grabbing" : "default",
      }}
    >
      {/* Header */}
      <div
        onMouseDown={onMouseDown}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px",
          background: "rgba(10,18,32,0.85)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none", flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          {/* Status dot */}
          <span style={{
            width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
            background: activeStatus === "recording+sharing" || activeStatus === "recording"
              ? "#ef4444"
              : activeStatus === "sharing" ? "#10b981"
              : "rgba(148,163,184,0.3)",
            boxShadow: activeStatus.includes("recording") ? "0 0 8px #ef4444" : undefined,
            animation: activeStatus.includes("recording") ? "pulse 1s infinite" : undefined,
          }} />
          <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 13 }}>
            Screen Share & Record
          </span>
          {isRecording && (
            <span style={{
              background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)",
              color: "#f87171", fontSize: 10, padding: "1px 8px", borderRadius: 8,
              fontFamily: "monospace", fontWeight: 700,
            }}>
              ⏺ REC {formatDuration(recordingDuration)}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
            color: "#f87171", borderRadius: 8, width: 26, height: 26,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: 14,
          }}
        >✕</button>
      </div>

      {/* Body */}
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Error banner */}
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 10, padding: "8px 12px", color: "#fca5a5", fontSize: 12,
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Settings row */}
        <div style={{
          display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
          padding: "10px 12px", background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10,
        }}>
          <div style={{ display: "flex", gap: 4 }}>
            {(["screen", "window", "tab"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setShareTab(t)}
                disabled={isSharing}
                style={{
                  background: shareTab === t ? "rgba(236,72,153,0.2)" : "transparent",
                  border: shareTab === t ? "1px solid rgba(236,72,153,0.5)" : "1px solid rgba(255,255,255,0.08)",
                  color: shareTab === t ? "#f9a8d4" : "rgba(148,163,184,0.7)",
                  fontSize: 10, padding: "3px 9px", borderRadius: 6, cursor: "pointer",
                  textTransform: "capitalize", opacity: isSharing ? 0.5 : 1,
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginLeft: "auto" }}>
            <div
              onClick={() => !isSharing && setShareWithAudio((v) => !v)}
              style={{
                width: 32, height: 18, borderRadius: 9,
                background: shareWithAudio ? "rgba(236,72,153,0.5)" : "rgba(100,116,139,0.3)",
                border: shareWithAudio ? "1px solid rgba(236,72,153,0.6)" : "1px solid rgba(100,116,139,0.3)",
                position: "relative", cursor: isSharing ? "default" : "pointer",
                transition: "all 0.2s", opacity: isSharing ? 0.5 : 1,
              }}
            >
              <div style={{
                position: "absolute", top: 2, left: shareWithAudio ? 14 : 2,
                width: 12, height: 12, borderRadius: "50%", background: "white",
                transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
              }} />
            </div>
            <span style={{ fontSize: 11, color: "rgba(148,163,184,0.8)" }}>Audio</span>
          </label>
        </div>

        {/* Preview */}
        {isSharing && (
          <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "16/9", background: "#000" }}>
            {previewMode ? (
              <video
                ref={previewRef}
                muted
                playsInline
                autoPlay
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : (
              <div style={{
                width: "100%", height: "100%", minHeight: 120,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 8, color: "rgba(148,163,184,0.5)", fontSize: 12,
              }}>
                <span style={{ fontSize: 28 }}>🖥</span>
                <span>Screen is sharing</span>
                <button
                  onClick={() => {
                    setPreviewMode(true);
                    setTimeout(() => {
                      if (previewRef.current && shareStreamRef.current) {
                        previewRef.current.srcObject = shareStreamRef.current;
                        previewRef.current.play().catch(() => {});
                      }
                    }, 100);
                  }}
                  style={{
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(148,163,184,0.8)", fontSize: 10, padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                  }}
                >
                  Show Preview
                </button>
              </div>
            )}
            {isRecording && (
              <div style={{
                position: "absolute", top: 8, right: 8,
                background: "rgba(239,68,68,0.9)", color: "white",
                fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "white" }} />
                REC {formatDuration(recordingDuration)}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {/* Share button */}
          <button
            onClick={isSharing ? stopSharing : startScreenShare}
            style={{
              background: isSharing ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.08)",
              border: isSharing ? "1px solid rgba(16,185,129,0.5)" : "1px solid rgba(16,185,129,0.25)",
              color: isSharing ? "#34d399" : "#6ee7b7",
              borderRadius: 10, padding: "10px 0",
              cursor: "pointer", fontSize: 12, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              transition: "all 0.15s",
            }}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {isSharing ? "Stop Sharing" : "Share Screen"}
          </button>

          {/* Record button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            style={{
              background: isRecording ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.08)",
              border: isRecording ? "1px solid rgba(239,68,68,0.6)" : "1px solid rgba(239,68,68,0.25)",
              color: isRecording ? "#f87171" : "#fca5a5",
              borderRadius: 10, padding: "10px 0",
              cursor: "pointer", fontSize: 12, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              transition: "all 0.15s",
            }}
          >
            {isRecording ? (
              <>
                <span style={{ width: 10, height: 10, background: "#f87171", borderRadius: 2 }} />
                Stop Recording
              </>
            ) : (
              <>
                <span style={{ width: 10, height: 10, background: "currentColor", borderRadius: "50%" }} />
                Record Screen
              </>
            )}
          </button>
        </div>

        {/* Recordings list */}
        {recordings.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ color: "rgba(148,163,184,0.5)", fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Recordings ({recordings.length})
            </div>
            {recordings.map((rec, i) => (
              <div
                key={rec.url}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 10, padding: "8px 12px",
                }}
              >
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ color: "#e2e8f0", fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    Recording #{recordings.length - i}
                  </div>
                  <div style={{ color: "rgba(148,163,184,0.5)", fontSize: 10 }}>
                    {formatDuration(rec.duration)} · {formatBytes(rec.size)}
                  </div>
                </div>
                <button
                  onClick={() => downloadRecording(rec.url, rec.name)}
                  title="Download"
                  style={{
                    background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
                    color: "#a5b4fc", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11,
                  }}
                >
                  ↓
                </button>
                <button
                  onClick={() => deleteRecording(rec.url)}
                  title="Delete"
                  style={{
                    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                    color: "#f87171", borderRadius: 6, width: 24, height: 24,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", fontSize: 12,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Hint */}
        <div style={{ color: "rgba(148,163,184,0.35)", fontSize: 10, lineHeight: 1.6, borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 8 }}>
          💡 Screen recordings are saved as <code style={{ background: "rgba(255,255,255,0.05)", padding: "0 4px", borderRadius: 4 }}>WebM</code> files.
          Recordings are only kept in-browser until downloaded.
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
