"use client";

import { useEffect, useRef } from "react";
import { createGame, destroyGame } from "@/game/PhaserGame";

interface GameCanvasProps {
  className?: string;
}

const CANVAS_ID = "virtualverse-canvas";

export function GameCanvas({ className }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    // Clean up previous instance synchronously before creating new one
    destroyGame();

    createGame({
      parentElementId: CANVAS_ID,
      width,
      height,
    });

    return () => {
      destroyGame();
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
