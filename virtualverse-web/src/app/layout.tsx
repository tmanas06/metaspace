import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VirtualVerse — Multiplayer World",
  description:
    "A real-time multiplayer virtual world powered by Colyseus, Phaser 3, and LiveKit. Walk around, meet others, and video-call when you get close.",
  keywords: ["virtualverse", "multiplayer", "metaverse", "livekit", "colyseus"],
  openGraph: {
    title: "VirtualVerse",
    description: "Real-time multiplayer world with proximity video chat",
    type: "website",
  },
};

/**
 * Viewport export tells Next.js to emit the correct <meta name="viewport"> tag.
 * - width=device-width: use the real device width, not the 980px virtual width.
 * - initial-scale=1: don't zoom in/out on load.
 * - maximum-scale=1: prevent double-tap zoom that breaks the Phaser canvas.
 * - interactive-widget=resizes-content: on Android, keep layout stable when
 *   the virtual keyboard appears.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full bg-[#080c09] text-[#e8f5e9]">
        {children}
      </body>
    </html>
  );
}
