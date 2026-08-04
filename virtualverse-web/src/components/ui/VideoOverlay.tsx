"use client";

import { useEffect, useRef, useState } from "react";

interface VideoOverlayProps {
  remoteVideoElements: Map<string, HTMLVideoElement>;
  username: string;
}

/**
 * VideoOverlay — Gather.town style top floating video strip & local camera preview.
 * Displays video tiles along the top of the screen when players are in spatial proximity,
 * and allows toggling local camera/microphone.
 */
export function VideoOverlay({ remoteVideoElements, username }: VideoOverlayProps) {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Toggle local camera preview
  useEffect(() => {
    if (isCamOn) {
      navigator.mediaDevices
        ?.getUserMedia({ video: true, audio: isMicOn })
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
  }, [isCamOn, isMicOn]);

  const hasRemote = remoteVideoElements.size > 0;

  return (
    <div className="absolute inset-x-0 top-14 pointer-events-none flex flex-col items-center z-20 gap-3">
      {/* Top Floating Video Strip (Gather.town style) */}
      {(hasRemote || isCamOn) && (
        <div className="pointer-events-auto flex items-center justify-center gap-3 p-2 bg-[#0f172a]/95 border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl animate-fade-in">
          {/* Local Camera Self Preview Tile */}
          {isCamOn && (
            <div className="relative rounded-xl overflow-hidden border border-indigo-500/50 shadow-lg bg-zinc-900 w-44 h-32 flex flex-col justify-between">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
              <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-white text-[11px] font-medium flex items-center gap-1.5 border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="truncate max-w-[90px]">{username} (You)</span>
              </div>
            </div>
          )}

          {/* Remote Proximity Video Tiles */}
          {Array.from(remoteVideoElements.entries()).map(([identity, videoEl]) => (
            <RemoteVideoTile key={identity} identity={identity} videoEl={videoEl} />
          ))}
        </div>
      )}

      {/* Bottom Floating Control Bar (Gather.town style) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-3 bg-[#0f172a]/95 border border-white/10 backdrop-blur-xl px-4 py-2 rounded-2xl shadow-2xl z-30">
        {/* User Info */}
        <div className="flex items-center gap-2 pr-3 border-r border-white/10">
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white uppercase">
            {(username || "User").slice(0, 2)}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-white truncate max-w-[100px]">{username || "User"}</span>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Online
            </span>
          </div>
        </div>

        {/* Media Controls (Mic, Cam, Proximity Info) */}
        <div className="flex items-center gap-2">
          {/* Toggle Mic */}
          <button
            onClick={() => setIsMicOn(!isMicOn)}
            className={`p-2 rounded-xl border transition-all ${
              isMicOn
                ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                : "bg-rose-600/20 border-rose-500/50 text-rose-300 hover:bg-rose-600/30"
            }`}
            title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMicOn ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              )}
            </svg>
          </button>

          {/* Toggle Camera */}
          <button
            onClick={() => setIsCamOn(!isCamOn)}
            className={`p-2 rounded-xl border transition-all ${
              isCamOn
                ? "bg-indigo-600/30 border-indigo-500 text-indigo-200 hover:bg-indigo-600/40"
                : "bg-white/5 border-white/10 text-white hover:bg-white/10"
            }`}
            title={isCamOn ? "Turn Off Camera" : "Turn On Camera Preview"}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isCamOn ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              )}
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

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
      videoEl.className = "w-full h-full object-cover";
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      videoEl.muted = false;
      container.appendChild(videoEl);
    }
    return () => {
      container?.removeChild(videoEl);
    };
  }, [identity, videoEl]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-white/20 shadow-xl bg-zinc-900 w-44 h-32 flex flex-col justify-between">
      <div id={`remote-tile-${identity}`} className="w-full h-full bg-zinc-900" />
      <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-white text-[11px] font-medium flex items-center gap-1.5 border border-white/10">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span className="truncate max-w-[100px]">{identity}</span>
      </div>
    </div>
  );
}
