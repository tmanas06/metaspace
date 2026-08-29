"use client";
/**
 * Root page — client component wrapper.
 *
 * Flow:
 *   1. LandingPage (homepage, SSR-safe, static) — shown on first load
 *   2. VirtualWorld (Phaser, Colyseus, LiveKit, browser-only) — shown after "Enter"
 *
 * VirtualWorld is dynamically imported with ssr:false so browser-only code
 * is never evaluated during build / on the server.
 */
import { useState } from "react";
import dynamic from "next/dynamic";
import { LandingPage } from "@/components/LandingPage";

const VirtualWorld = dynamic(
  () => import("@/components/VirtualWorld").then((m) => m.VirtualWorld),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#080c09] flex items-center justify-center">
        <div className="text-center">
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "linear-gradient(135deg, #16a34a, #4ade80)",
              margin: "0 auto 16px",
              animation: "pulse 1.4s ease-in-out infinite",
              boxShadow: "0 0 30px rgba(74,222,128,0.45)",
            }}
            aria-hidden="true"
          />
          <p style={{ color: "rgba(74,222,128,0.45)", fontSize: 13, fontFamily: "monospace" }}>
            Loading VirtualVerse…
          </p>
        </div>
      </div>
    ),
  }
);

export default function RootPage() {
  const [showWorld, setShowWorld] = useState(false);

  if (showWorld) {
    return <VirtualWorld onBack={() => setShowWorld(false)} />;
  }

  return <LandingPage onEnter={() => setShowWorld(true)} />;
}
