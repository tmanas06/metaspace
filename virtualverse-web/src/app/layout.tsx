import type { Metadata } from "next";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full bg-[#0d0d1a] text-white">
        {children}
      </body>
    </html>
  );
}
