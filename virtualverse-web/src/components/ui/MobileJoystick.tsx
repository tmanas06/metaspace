"use client";

/**
 * MobileJoystick — floating virtual joystick for touch devices.
 *
 * • Renders a fixed-position joystick in the bottom-right of the canvas area.
 * • On touchstart the base locks to the initial finger position (dynamic base).
 * • Dragging the thumb drives 8-directional movement via gameBridge.setTouchInput().
 * • On touchend all directions reset to false.
 */

import { useEffect, useRef, useCallback } from "react";
import { gameBridge } from "@/game/GameBridge";

const DEAD_ZONE = 12;   // px — minimum drag before any direction activates
const MAX_DRAG  = 48;   // px — thumb clamps within this radius of the base

interface MobileJoystickProps {
  /** Right offset from the canvas right edge. Default 24. */
  right?: number;
  /** Bottom offset above the bottom bar. Default 96 (sits above the 68px bar). */
  bottom?: number;
}

export function MobileJoystick({ right = 24, bottom = 96 }: MobileJoystickProps) {
  const baseRef  = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  // Store the touch origin in a ref (no re-render needed)
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const activeIdRef = useRef<number | null>(null);

  const resetJoystick = useCallback(() => {
    originRef.current = null;
    activeIdRef.current = null;
    if (thumbRef.current) {
      thumbRef.current.style.transform = "translate(-50%, -50%) translate(0px, 0px)";
    }
    gameBridge.setTouchInput({ left: false, right: false, up: false, down: false });
  }, []);

  useEffect(() => {
    const base = baseRef.current;
    if (!base) return;

    const onTouchStart = (e: TouchEvent) => {
      // Only track the first finger on this element
      if (activeIdRef.current !== null) return;
      e.preventDefault();
      const t = e.changedTouches[0];
      activeIdRef.current = t.identifier;
      originRef.current = { x: t.clientX, y: t.clientY };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (activeIdRef.current === null || !originRef.current) return;
      // Find our tracked touch
      let touch: Touch | null = null;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeIdRef.current) {
          touch = e.changedTouches[i];
          break;
        }
      }
      if (!touch) return;
      e.preventDefault();

      const dx = touch.clientX - originRef.current.x;
      const dy = touch.clientY - originRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Clamp thumb movement to MAX_DRAG radius
      const clamp = Math.min(dist, MAX_DRAG);
      const angle = Math.atan2(dy, dx); // radians
      const thumbX = Math.cos(angle) * clamp;
      const thumbY = Math.sin(angle) * clamp;

      if (thumbRef.current) {
        thumbRef.current.style.transform =
          `translate(-50%, -50%) translate(${thumbX}px, ${thumbY}px)`;
      }

      // Compute directional booleans from angle + dead zone
      if (dist < DEAD_ZONE) {
        gameBridge.setTouchInput({ left: false, right: false, up: false, down: false });
        return;
      }

      // Convert angle to 8-direction flags
      // angle=0 → right, π/2 → down, -π/2 → up, ±π → left
      const deg = (angle * 180) / Math.PI; // -180..180
      const left  = deg > 135 || deg < -135;
      const right = deg > -45  && deg < 45;
      const up    = deg > -135 && deg < -45;
      const down  = deg > 45   && deg < 135;

      gameBridge.setTouchInput({ left, right, up, down });
    };

    const onTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeIdRef.current) {
          resetJoystick();
          return;
        }
      }
    };

    base.addEventListener("touchstart", onTouchStart, { passive: false });
    base.addEventListener("touchmove",  onTouchMove,  { passive: false });
    base.addEventListener("touchend",   onTouchEnd,   { passive: false });
    base.addEventListener("touchcancel",onTouchEnd,   { passive: false });

    return () => {
      base.removeEventListener("touchstart", onTouchStart);
      base.removeEventListener("touchmove",  onTouchMove);
      base.removeEventListener("touchend",   onTouchEnd);
      base.removeEventListener("touchcancel",onTouchEnd);
      // Safety: clear input when component unmounts mid-touch
      gameBridge.setTouchInput({ left: false, right: false, up: false, down: false });
    };
  }, [resetJoystick]);

  return (
    <div
      ref={baseRef}
      id="mobile-joystick-base"
      style={{
        position: "fixed",
        right,
        bottom: `max(${bottom}px, calc(${bottom}px + env(safe-area-inset-bottom, 0px)))`,
        width:  96,
        height: 96,
        borderRadius: "50%",
        // Outer ring — glass morphism style
        background: "rgba(15, 23, 42, 0.55)",
        border: "2px solid rgba(99, 102, 241, 0.45)",
        backdropFilter: "blur(12px)",
        boxShadow: `
          0 0 0 1px rgba(99,102,241,0.15),
          0 8px 32px rgba(0,0,0,0.5),
          inset 0 1px 0 rgba(255,255,255,0.08)
        `,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
        touchAction: "none",
        zIndex: 40,
        // Subtle pulse animation to hint it's interactive
        animation: "joystick-pulse 3s ease-in-out infinite",
      }}
    >
      {/* Direction hint marks */}
      <DirectionDots />

      {/* Thumb knob — positioned by JS via transform */}
      <div
        ref={thumbRef}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          border: "2px solid rgba(255,255,255,0.25)",
          boxShadow: "0 4px 16px rgba(99,102,241,0.5), 0 2px 6px rgba(0,0,0,0.4)",
          transform: "translate(-50%, -50%) translate(0px, 0px)",
          transition: "box-shadow 0.1s ease",
          pointerEvents: "none",
          willChange: "transform",
        }}
      />
    </div>
  );
}

/** Four tiny triangular direction indicators around the joystick ring. */
function DirectionDots() {
  const arrowStyle = (rotation: number): React.CSSProperties => ({
    position: "absolute",
    width: 0,
    height: 0,
    opacity: 0.35,
  });

  return (
    <>
      {/* Up */}
      <svg style={{ position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)", opacity: 0.4 }}
        width="10" height="8" viewBox="0 0 10 8" fill="rgba(99,102,241,1)">
        <polygon points="5,0 10,8 0,8" />
      </svg>
      {/* Down */}
      <svg style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)", opacity: 0.4 }}
        width="10" height="8" viewBox="0 0 10 8" fill="rgba(99,102,241,1)">
        <polygon points="5,8 10,0 0,0" />
      </svg>
      {/* Left */}
      <svg style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }}
        width="8" height="10" viewBox="0 0 8 10" fill="rgba(99,102,241,1)">
        <polygon points="0,5 8,0 8,10" />
      </svg>
      {/* Right */}
      <svg style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }}
        width="8" height="10" viewBox="0 0 8 10" fill="rgba(99,102,241,1)">
        <polygon points="8,5 0,0 0,10" />
      </svg>
      {/* Invisible div to satisfy arrowStyle reference */}
      <div style={arrowStyle(0)} />
    </>
  );
}
