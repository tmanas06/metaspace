"use client";

import { useEffect, useRef } from "react";
import { createGame, destroyGame } from "@/game/PhaserGame";

interface GameCanvasProps {
  className?: string;
}

const CANVAS_ID = "virtualverse-canvas";

/**
 * GameCanvas — mounts the Phaser game into a div that fills its parent.
 *
 * Key fix: we wait for the container to have a non-zero layout size before
 * calling createGame, and we attach a ResizeObserver so Phaser receives size
 * changes whenever the sidebar collapses/expands.
 */
export function GameCanvas({ className }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Phaser.Scale.RESIZE handles resize automatically once the game is created,
    // but we must ensure the *initial* size is correct. Using ResizeObserver
    // lets us wait until the browser has actually painted the flex layout.
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return;

      if (!initializedRef.current) {
        initializedRef.current = true;
        // Destroy any stale instance first
        destroyGame();
        createGame({ parentElementId: CANVAS_ID, width, height });
      }
      // Phaser.Scale.RESIZE watches the parent and handles subsequent resizes
      // automatically — no manual resize call needed.
    });

    ro.observe(container);

    return () => {
      ro.disconnect();
      destroyGame();
      initializedRef.current = false;
    };
  }, []);

  return (
    <div
      id={CANVAS_ID}
      ref={containerRef}
      className={className}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    />
  );
}
