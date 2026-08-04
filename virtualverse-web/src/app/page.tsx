"use client";
/**
 * Root page — client component wrapper.
 * Dynamically imports VirtualWorld (Phaser, Colyseus, LiveKit) with ssr:false
 * so browser-only code is never evaluated during build.
 */
import dynamic from "next/dynamic";

const VirtualWorld = dynamic(
  () => import("@/components/VirtualWorld").then((m) => m.VirtualWorld),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-xl bg-indigo-600 mx-auto mb-4 animate-pulse"
            aria-hidden="true"
          />
          <p className="text-zinc-400 text-sm font-mono">Loading VirtualVerse…</p>
        </div>
      </div>
    ),
  }
);

export default function RootPage() {
  return <VirtualWorld />;
}
