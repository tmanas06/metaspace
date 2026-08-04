"use client";

import { useEffect } from "react";

interface VideoOverlayProps {
  remoteVideoElements: Map<string, HTMLVideoElement>;
}

/**
 * VideoOverlay — renders floating video tiles when a LiveKit proximity
 * room is active. Each tile is positioned in the bottom-right corner
 * and stacked horizontally.
 *
 * The HTMLVideoElement objects come directly from livekit-client track.attach(),
 * so we mount them into the DOM via a ref callback.
 */
export function VideoOverlay({ remoteVideoElements }: VideoOverlayProps) {
  if (remoteVideoElements.size === 0) return null;

  return (
    <div
      id="video-overlay"
      className="flex gap-2 flex-wrap"
      role="region"
      aria-label="Active video calls"
    >
      {Array.from(remoteVideoElements.entries()).map(([identity, videoEl]) => (
        <VideoTile key={identity} identity={identity} videoEl={videoEl} />
      ))}
    </div>
  );
}

function VideoTile({
  identity,
  videoEl,
}: {
  identity: string;
  videoEl: HTMLVideoElement;
}) {
  useEffect(() => {
    const container = document.getElementById(`video-tile-${identity}`);
    if (container && videoEl) {
      videoEl.className = "w-full h-full object-cover rounded-lg";
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      videoEl.muted = false;
      container.appendChild(videoEl);
    }
    return () => {
      // Don't destroy videoEl on unmount — livekit manages its lifecycle
      container?.removeChild(videoEl);
    };
  }, [identity, videoEl]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-white/20 shadow-xl"
         style={{ width: 160, height: 120 }}>
      <div id={`video-tile-${identity}`} className="w-full h-full bg-zinc-900" />
      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded
                      bg-black/60 text-white text-[10px] font-mono">
        {identity.slice(0, 8)}
      </div>
    </div>
  );
}
