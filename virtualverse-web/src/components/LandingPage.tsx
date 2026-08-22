"use client";

/**
 * LandingPage — The public-facing homepage for VirtualVerse.
 * v2: Improved navbar with scroll-spy links, richer hero, better sections.
 */

import { useState, useEffect, useRef, useCallback } from "react";

interface LandingPageProps {
  onEnter: () => void;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useScrolled(threshold = 20) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = document.querySelector(".vv-landing") as HTMLElement;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > threshold);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const container = document.querySelector(".vv-landing") as HTMLElement;
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        { root: container, threshold: 0.4 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [ids]);
  return active;
}

// ─── Floating Particle ────────────────────────────────────────────────────────
const PARTICLE_DATA = Array.from({ length: 20 }, (_, i) => ({
  left: `${((i * 37 + 13) % 97)}%`,
  top: `${((i * 53 + 7) % 93)}%`,
  delay: `${(i * 0.7) % 6}s`,
  duration: `${7 + (i % 4) * 2}s`,
  size: `${2 + (i % 3)}px`,
  opacity: 0.12 + (i % 5) * 0.07,
}));

function Particles() {
  return (
    <div className="vv-particles" aria-hidden>
      {PARTICLE_DATA.map((p, i) => (
        <div
          key={i}
          className="vv-particle"
          style={{
            left: p.left,
            top: p.top,
            animationDelay: p.delay,
            animationDuration: p.duration,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
  tag: string;
}

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setTimeout(() => setVisible(true), index * 80); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [index]);

  return (
    <div
      ref={ref}
      className="vv-feature-card"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(24px) scale(0.98)",
        transition: "opacity 0.55s ease, transform 0.55s ease",
      }}
    >
      <div className="vv-feature-icon" style={{ background: feature.accent + "18", border: `1px solid ${feature.accent}30` }}>
        <div style={{ color: feature.accent }}>{feature.icon}</div>
      </div>
      <div className="vv-feature-tag" style={{ color: feature.accent, background: feature.accent + "14", border: `1px solid ${feature.accent}25` }}>
        {feature.tag}
      </div>
      <h3 className="vv-feature-title">{feature.title}</h3>
      <p className="vv-feature-desc">{feature.description}</p>
    </div>
  );
}

// ─── Animated Counter ─────────────────────────────────────────────────────────
function Counter({ value, label, prefix = "", suffix = "" }: { value: number; label: string; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const dur = 1600;
        const t0 = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - t0) / dur, 1);
          const e2 = 1 - Math.pow(1 - p, 3);
          setCount(Math.floor(e2 * value));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="vv-counter">
      <span className="vv-counter-value">{prefix}{count.toLocaleString()}{suffix}</span>
      <span className="vv-counter-label">{label}</span>
    </div>
  );
}

// ─── How It Works step ────────────────────────────────────────────────────────
function Step({ num, title, desc, visible }: { num: number; title: string; desc: string; visible: boolean }) {
  return (
    <div
      className="vv-step"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.5s ease ${num * 0.12}s, transform 0.5s ease ${num * 0.12}s`,
      }}
    >
      <div className="vv-step-num">{num}</div>
      <div>
        <h3 className="vv-step-title">{title}</h3>
        <p className="vv-step-desc">{desc}</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function LandingPage({ onEnter }: LandingPageProps) {
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [heroIn, setHeroIn] = useState(false);
  const [stepsVisible, setStepsVisible] = useState(false);
  const stepsRef = useRef<HTMLDivElement>(null);
  const scrolled = useScrolled(30);
  const activeSection = useActiveSection(["hero-section", "features-section", "how-section"]);

  useEffect(() => {
    const t = setTimeout(() => setHeroIn(true), 80);
    return () => clearTimeout(t);
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
  }, []);
  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [onMouseMove]);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStepsVisible(true); }, { threshold: 0.2 });
    if (stepsRef.current) obs.observe(stepsRef.current);
    return () => obs.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const navLinks = [
    { id: "features-section", label: "Features" },
    { id: "how-section", label: "How It Works" },
    { id: "tech-section", label: "Tech Stack" },
  ];

  const features: Feature[] = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/>
        </svg>
      ),
      title: "Open World Exploration", tag: "World",
      description: "Navigate handcrafted 2D environments — conference halls, social plazas, and secret rooms. Walk freely with arrow keys or WASD.",
      accent: "#6366f1",
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      title: "Live Multiplayer Presence", tag: "Realtime",
      description: "See every player's avatar move in real-time. Powered by Colyseus game servers with authoritative state sync.",
      accent: "#8b5cf6",
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
        </svg>
      ),
      title: "Proximity Video Chat", tag: "Video",
      description: "Walk close to someone and your cameras connect automatically. Step away and the call ends — friction-free, just like real life.",
      accent: "#06b6d4",
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
      title: "Spatial Chat Panel", tag: "Chat",
      description: "A floating chat panel with full message history. Messages are contextual to the world you're in.",
      accent: "#10b981",
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><rect x="7" y="7" width="3" height="9"/><rect x="14" y="7" width="3" height="5"/>
        </svg>
      ),
      title: "Multiple Map Environments", tag: "Maps",
      description: "Switch between themed maps instantly — invite friends with a link that auto-loads your chosen world.",
      accent: "#f59e0b",
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
        </svg>
      ),
      title: "Mobile & Touch Ready", tag: "Mobile",
      description: "Virtual joystick + responsive layout. VirtualVerse works beautifully on phones and tablets.",
      accent: "#ec4899",
    },
  ];

  const fi = (d: number) => ({
    opacity: heroIn ? 1 : 0,
    transform: heroIn ? "translateY(0)" : "translateY(24px)",
    transition: `opacity 0.75s ease ${d}s, transform 0.75s ease ${d}s`,
  });

  return (
    <>
      <style>{`
        /* ═══════════════════════════════════════════════
           VIRTUALVERSE LANDING — v2
           ═══════════════════════════════════════════════ */

        .vv-landing {
          min-height: 100dvh;
          height: 100dvh;
          background: #07071a;
          color: #fff;
          font-family: var(--font-geist-sans, 'Inter', system-ui, sans-serif);
          overflow-x: hidden;
          overflow-y: auto;
          scroll-behavior: smooth;
          position: relative;
        }

        /* ── Background ── */
        .vv-bg-grid {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(99,102,241,0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.055) 1px, transparent 1px);
          background-size: 64px 64px;
        }
        .vv-bg-noise {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          opacity: 0.4;
        }
        .vv-orb {
          position: fixed; border-radius: 50%; filter: blur(90px);
          pointer-events: none; z-index: 0;
          transition: transform 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          will-change: transform;
        }
        .vv-orb-1 { width: 700px; height: 700px; top: -280px; left: -280px;
          background: radial-gradient(circle, rgba(99,102,241,0.16) 0%, transparent 65%); }
        .vv-orb-2 { width: 600px; height: 600px; bottom: -200px; right: -200px;
          background: radial-gradient(circle, rgba(139,92,246,0.13) 0%, transparent 65%); }
        .vv-orb-3 { width: 500px; height: 500px; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 65%); }

        .vv-particles { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .vv-particle {
          position: absolute; border-radius: 50%; background: #818cf8;
          animation: vv-float linear infinite;
        }
        @keyframes vv-float {
          0%   { transform: translateY(0) scale(1); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(-110vh) scale(0.4); opacity: 0; }
        }

        /* ── Navbar ── */
        .vv-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 200;
          padding: 0 40px;
          height: 64px;
          display: flex; align-items: center; justify-content: space-between;
          transition: background 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .vv-nav.scrolled {
          background: rgba(7,7,26,0.88);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }

        .vv-nav-left { display: flex; align-items: center; gap: 12px; }
        .vv-logo-wrap {
          display: flex; align-items: center; gap: 10px;
          cursor: pointer; user-select: none;
        }
        .vv-logo-icon {
          width: 38px; height: 38px; border-radius: 11px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 1px rgba(99,102,241,0.5), 0 4px 20px rgba(99,102,241,0.35);
          flex-shrink: 0;
          position: relative; overflow: hidden;
        }
        .vv-logo-icon::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.22) 0%, transparent 60%);
        }
        .vv-logo-name {
          font-size: 17px; font-weight: 700; letter-spacing: -0.4px;
          background: linear-gradient(135deg, #fff 50%, #c7d2fe);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .vv-nav-badge {
          font-size: 9.5px; font-weight: 700; letter-spacing: 0.07em;
          text-transform: uppercase; padding: 2px 7px;
          background: rgba(99,102,241,0.18); border: 1px solid rgba(99,102,241,0.35);
          border-radius: 20px; color: #a5b4fc;
        }

        /* Nav center links */
        .vv-nav-links {
          display: flex; align-items: center; gap: 4px;
          position: absolute; left: 50%; transform: translateX(-50%);
        }
        .vv-nav-link {
          background: none; border: none; font-family: inherit;
          font-size: 13.5px; font-weight: 500;
          color: rgba(255,255,255,0.5);
          padding: 6px 14px; border-radius: 8px;
          cursor: pointer; transition: all 0.18s ease;
          position: relative;
        }
        .vv-nav-link:hover { color: rgba(255,255,255,0.9); background: rgba(255,255,255,0.05); }
        .vv-nav-link.active { color: white; }
        .vv-nav-link.active::after {
          content: ''; position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%);
          width: 16px; height: 2px; border-radius: 2px;
          background: linear-gradient(90deg, #6366f1, #8b5cf6);
        }

        /* Nav right */
        .vv-nav-right { display: flex; align-items: center; gap: 10px; }
        .vv-nav-btn-ghost {
          background: none; border: 1px solid rgba(255,255,255,0.12);
          font-family: inherit; font-size: 13px; font-weight: 600;
          color: rgba(255,255,255,0.65); padding: 7px 16px; border-radius: 9px;
          cursor: pointer; transition: all 0.2s ease;
        }
        .vv-nav-btn-ghost:hover { color: white; border-color: rgba(255,255,255,0.25); background: rgba(255,255,255,0.05); }
        .vv-nav-btn-primary {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none; font-family: inherit; font-size: 13px; font-weight: 700;
          color: white; padding: 8px 20px; border-radius: 9px;
          cursor: pointer; transition: all 0.2s ease;
          box-shadow: 0 4px 16px rgba(99,102,241,0.35);
          position: relative; overflow: hidden;
        }
        .vv-nav-btn-primary::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 60%);
        }
        .vv-nav-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(99,102,241,0.5); }

        /* ── Main Content ── */
        .vv-content { position: relative; z-index: 10; padding-top: 64px; }

        /* ── Hero ── */
        .vv-hero {
          min-height: calc(100dvh - 64px);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center; padding: 60px 24px 100px;
          position: relative;
        }
        .vv-hero-chip {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 5px 14px 5px 8px;
          background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.28);
          border-radius: 100px; font-size: 12px; font-weight: 600;
          color: #a5b4fc; letter-spacing: 0.02em; margin-bottom: 28px;
          cursor: default;
        }
        .vv-hero-chip-dot {
          width: 7px; height: 7px; border-radius: 50%; background: #6366f1;
          animation: vv-ping 2s ease-in-out infinite;
          flex-shrink: 0;
        }
        @keyframes vv-ping {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99,102,241,0.6); }
          50% { transform: scale(1.15); box-shadow: 0 0 0 5px rgba(99,102,241,0); }
        }
        .vv-hero-h1 {
          font-size: clamp(44px, 7.5vw, 92px);
          font-weight: 800; line-height: 1.02; letter-spacing: -3px;
          margin: 0 0 24px; max-width: 920px;
        }
        .vv-hero-grad {
          background: linear-gradient(135deg, #fff 0%, #c7d2fe 35%, #a78bfa 65%, #67e8f9 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          display: block;
        }
        .vv-hero-white { color: rgba(255,255,255,0.82); display: block; }
        .vv-hero-sub {
          font-size: clamp(15px, 2vw, 18px); color: rgba(255,255,255,0.45);
          max-width: 560px; line-height: 1.75; margin: 0 auto 44px; font-weight: 400;
        }
        .vv-hero-sub strong { color: rgba(255,255,255,0.7); font-weight: 500; }

        /* Buttons */
        .vv-btn-row { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-bottom: 72px; }
        .vv-btn-primary {
          position: relative; overflow: hidden;
          padding: 16px 38px; border-radius: 14px; border: none;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white; font-size: 15.5px; font-weight: 700;
          cursor: pointer; font-family: inherit; letter-spacing: -0.2px;
          box-shadow: 0 8px 32px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.18);
          transition: transform 0.22s ease, box-shadow 0.22s ease;
          display: flex; align-items: center; gap: 8px;
        }
        .vv-btn-primary::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 55%);
          opacity: 0; transition: opacity 0.2s;
        }
        .vv-btn-primary:hover { transform: translateY(-3px); box-shadow: 0 16px 48px rgba(99,102,241,0.55); }
        .vv-btn-primary:hover::before { opacity: 1; }
        .vv-btn-primary:active { transform: translateY(-1px); }
        .vv-btn-secondary {
          padding: 15px 30px; border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.13);
          background: rgba(255,255,255,0.04); backdrop-filter: blur(12px);
          color: rgba(255,255,255,0.75); font-size: 14.5px; font-weight: 600;
          cursor: pointer; font-family: inherit;
          transition: all 0.22s ease; display: flex; align-items: center; gap: 8px;
        }
        .vv-btn-secondary:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.24); color: white; transform: translateY(-2px); }

        /* Hero preview */
        .vv-preview {
          position: relative; width: 100%; max-width: 900px; margin: 0 auto;
        }
        .vv-preview-frame {
          border-radius: 18px; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 40px 100px rgba(0,0,0,0.75), 0 0 0 1px rgba(99,102,241,0.08);
          background: #0d1020;
        }
        .vv-preview-bar {
          height: 38px; background: rgba(255,255,255,0.04);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex; align-items: center; padding: 0 14px; gap: 7px;
        }
        .vv-preview-dot {
          width: 10px; height: 10px; border-radius: 50%;
        }
        .vv-preview-url {
          flex: 1; margin: 0 14px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 6px; height: 22px;
          display: flex; align-items: center; padding: 0 10px;
          font-size: 10px; color: rgba(255,255,255,0.3); font-family: monospace;
        }
        .vv-preview-world {
          aspect-ratio: 16/8.5; background: #08091a; position: relative; overflow: hidden;
        }
        .vv-world-grid-bg {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(99,102,241,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.1) 1px, transparent 1px);
          background-size: 44px 44px;
        }
        .vv-map-room {
          position: absolute; border-radius: 8px;
          border: 1px solid rgba(99,102,241,0.2);
          background: rgba(99,102,241,0.04);
        }
        .vv-avatar {
          position: absolute; display: flex; flex-direction: column;
          align-items: center; gap: 3px;
        }
        .vv-avatar-body {
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
          box-shadow: 0 0 18px currentColor;
        }
        .vv-avatar-tag {
          font-size: 9px; font-family: monospace;
          background: rgba(0,0,0,0.6); padding: 1px 5px; border-radius: 3px;
          color: rgba(255,255,255,0.7); white-space: nowrap;
        }
        @keyframes vv-walk-a {
          0%,100% { left: 28%; } 50% { left: 45%; }
        }
        @keyframes vv-walk-b {
          0%,100% { left: 52%; } 50% { left: 38%; }
        }
        @keyframes vv-walk-c {
          0%,100% { top: 30%; } 50% { top: 55%; }
        }
        .vv-prox-rings {
          position: absolute; left: 50%; top: 50%;
          transform: translate(-50%, -50%);
        }
        .vv-prox-ring {
          position: absolute; border-radius: 50%;
          border: 1px solid rgba(99,102,241,0.2);
          animation: vv-breathe 3s ease-in-out infinite;
          transform: translate(-50%, -50%);
        }
        @keyframes vv-breathe {
          0%,100% { transform: translate(-50%,-50%) scale(1); opacity: 0.5; }
          50% { transform: translate(-50%,-50%) scale(1.06); opacity: 1; }
        }
        .vv-preview-hud {
          position: absolute; top: 12px; right: 12px;
          display: flex; flex-direction: column; gap: 8px; align-items: flex-end;
        }
        .vv-hud-pill {
          background: rgba(0,0,0,0.6); backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;
          padding: 6px 10px; display: flex; align-items: center; gap: 6px;
          font-size: 10px; color: rgba(255,255,255,0.6);
        }
        .vv-hud-green { width: 5px; height: 5px; border-radius: 50%; background: #22c55e; animation: vv-ping 1.8s ease infinite; }
        .vv-video-pair { display: flex; gap: 5px; }
        .vv-vid-tile {
          width: 64px; height: 48px; border-radius: 7px;
          background: #1e293b; border: 1px solid rgba(99,102,241,0.25);
          display: flex; align-items: center; justify-content: center; font-size: 18px;
        }
        .vv-preview-glow {
          position: absolute; bottom: -30px; left: 50%;
          transform: translateX(-50%);
          width: 55%; height: 70px;
          background: rgba(99,102,241,0.18); filter: blur(40px); border-radius: 50%;
        }

        /* Scroll hint */
        .vv-scroll-hint {
          position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%);
          display: flex; flex-direction: column; align-items: center; gap: 5px;
          color: rgba(255,255,255,0.18); font-size: 10px; font-weight: 500;
          text-transform: uppercase; letter-spacing: 0.1em;
          animation: vv-bob 2.2s ease-in-out infinite;
        }
        @keyframes vv-bob { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(7px)} }

        /* ── Counters ── */
        .vv-counters {
          display: flex; flex-wrap: wrap; justify-content: center;
          background: rgba(255,255,255,0.018);
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding: 48px 24px;
        }
        .vv-counter {
          display: flex; flex-direction: column; align-items: center; gap: 5px;
          padding: 18px 52px; border-right: 1px solid rgba(255,255,255,0.06);
        }
        .vv-counter:last-child { border-right: none; }
        .vv-counter-value {
          font-size: 38px; font-weight: 800; letter-spacing: -2px; line-height: 1;
          background: linear-gradient(135deg, #fff, #a5b4fc);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .vv-counter-label { font-size: 12.5px; color: rgba(255,255,255,0.38); font-weight: 500; }

        /* ── Features ── */
        .vv-features {
          padding: 100px 24px; max-width: 1200px; margin: 0 auto;
        }
        .vv-section-eyebrow {
          text-align: center; font-size: 11.5px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.14em; color: #6366f1; margin-bottom: 12px;
        }
        .vv-section-h2 {
          text-align: center; font-size: clamp(28px, 4vw, 46px); font-weight: 800;
          letter-spacing: -1.5px; color: white; margin: 0 0 12px; line-height: 1.1;
        }
        .vv-section-p {
          text-align: center; color: rgba(255,255,255,0.4); font-size: 15.5px;
          max-width: 500px; margin: 0 auto 60px; line-height: 1.75;
        }
        .vv-features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
          gap: 18px;
        }
        .vv-feature-card {
          background: rgba(255,255,255,0.022); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px; padding: 26px 26px 28px; position: relative; overflow: hidden;
          cursor: default; transition: all 0.28s ease;
        }
        .vv-feature-card::after {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(99,102,241,0.35), transparent);
          opacity: 0; transition: opacity 0.28s;
        }
        .vv-feature-card:hover {
          background: rgba(255,255,255,0.038); border-color: rgba(99,102,241,0.18);
          transform: translateY(-5px);
          box-shadow: 0 24px 64px rgba(0,0,0,0.45), 0 0 0 1px rgba(99,102,241,0.08);
        }
        .vv-feature-card:hover::after { opacity: 1; }
        .vv-feature-icon {
          width: 46px; height: 46px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center; margin-bottom: 14px;
        }
        .vv-feature-tag {
          display: inline-block; font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.07em;
          padding: 2px 8px; border-radius: 6px; margin-bottom: 10px;
        }
        .vv-feature-title {
          font-size: 16px; font-weight: 700; color: white; margin: 0 0 8px; letter-spacing: -0.3px;
        }
        .vv-feature-desc { font-size: 13.5px; color: rgba(255,255,255,0.42); line-height: 1.65; margin: 0; }

        /* ── How It Works ── */
        .vv-how-section {
          padding: 100px 24px;
          background: rgba(255,255,255,0.018);
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .vv-how-inner { max-width: 1100px; margin: 0 auto; }
        .vv-steps-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 24px; margin-top: 60px;
        }
        .vv-step {
          display: flex; flex-direction: column; gap: 16px;
          background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px; padding: 28px;
          transition: background 0.25s, border-color 0.25s;
        }
        .vv-step:hover { background: rgba(255,255,255,0.04); border-color: rgba(99,102,241,0.18); }
        .vv-step-num {
          width: 40px; height: 40px; border-radius: 12px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: 800; color: white; flex-shrink: 0;
          box-shadow: 0 4px 16px rgba(99,102,241,0.35);
        }
        .vv-step-title { font-size: 15.5px; font-weight: 700; color: white; margin: 0 0 6px; letter-spacing: -0.2px; }
        .vv-step-desc { font-size: 13.5px; color: rgba(255,255,255,0.42); line-height: 1.65; margin: 0; }

        /* ── Tech Stack ── */
        .vv-tech-section {
          padding: 80px 24px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .vv-tech-inner { max-width: 900px; margin: 0 auto; text-align: center; }
        .vv-tech-grid {
          display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 40px;
        }
        .vv-tech-chip {
          display: flex; align-items: center; gap: 8px;
          padding: 9px 18px; border-radius: 100px;
          background: rgba(255,255,255,0.038); border: 1px solid rgba(255,255,255,0.08);
          font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.62);
          cursor: default; transition: all 0.2s ease;
        }
        .vv-tech-chip:hover { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.28); color: white; }
        .vv-tech-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

        /* ── Final CTA ── */
        .vv-cta-section { padding: 120px 24px; text-align: center; position: relative; }
        .vv-cta-card {
          max-width: 740px; margin: 0 auto;
          background: linear-gradient(160deg, rgba(99,102,241,0.07) 0%, rgba(139,92,246,0.07) 50%, rgba(6,182,212,0.05) 100%);
          border: 1px solid rgba(99,102,241,0.18); border-radius: 28px;
          padding: 70px 52px; position: relative; overflow: hidden;
        }
        .vv-cta-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent 5%, rgba(99,102,241,0.55) 40%, rgba(139,92,246,0.55) 60%, transparent 95%);
        }
        .vv-cta-glow {
          position: absolute; top: -60%; left: 50%; transform: translateX(-50%);
          width: 500px; height: 500px; pointer-events: none;
          background: radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%);
        }
        .vv-cta-h2 {
          font-size: clamp(30px, 4vw, 46px); font-weight: 800; letter-spacing: -1.5px;
          line-height: 1.1; margin: 0 0 18px;
          background: linear-gradient(135deg, #fff 50%, #c7d2fe);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .vv-cta-p { font-size: 16px; color: rgba(255,255,255,0.43); line-height: 1.75; margin: 0 0 44px; }
        .vv-cta-btn {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 18px 48px; border-radius: 16px; border: none;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white; font-size: 16.5px; font-weight: 700;
          cursor: pointer; font-family: inherit; letter-spacing: -0.3px;
          box-shadow: 0 8px 40px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.18);
          transition: all 0.25s ease; position: relative; overflow: hidden;
        }
        .vv-cta-btn::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 55%);
        }
        .vv-cta-btn:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 16px 60px rgba(99,102,241,0.55); }
        .vv-cta-note { margin-top: 20px; font-size: 12px; color: rgba(255,255,255,0.22); }

        /* ── Footer ── */
        .vv-footer {
          border-top: 1px solid rgba(255,255,255,0.05);
          padding: 32px 40px;
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;
        }
        .vv-footer-left { display: flex; align-items: center; gap: 12px; }
        .vv-footer-logo { display: flex; align-items: center; gap: 8px; }
        .vv-footer-logo-icon {
          width: 26px; height: 26px; border-radius: 7px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex; align-items: center; justify-content: center;
        }
        .vv-footer-copy { font-size: 12.5px; color: rgba(255,255,255,0.22); }
        .vv-footer-sep { color: rgba(255,255,255,0.1); font-size: 12px; }
        .vv-footer-links { display: flex; gap: 4px; }
        .vv-footer-link {
          background: none; border: none; font-family: inherit;
          font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.32);
          cursor: pointer; padding: 5px 10px; border-radius: 6px;
          transition: all 0.18s ease;
        }
        .vv-footer-link:hover { color: rgba(255,255,255,0.75); background: rgba(255,255,255,0.05); }
        .vv-footer-right { display: flex; gap: 8px; }

        /* Responsive */
        @media (max-width: 768px) {
          .vv-nav { padding: 0 18px; }
          .vv-nav-links { display: none; }
          .vv-nav-btn-ghost { display: none; }
          .vv-counter { padding: 14px 28px; }
          .vv-counter-value { font-size: 30px; }
          .vv-cta-card { padding: 44px 28px; }
          .vv-footer { flex-direction: column; align-items: flex-start; padding: 24px 18px; }
        }
        @media (max-width: 480px) {
          .vv-hero-h1 { letter-spacing: -1.5px; }
          .vv-btn-row { flex-direction: column; align-items: center; }
          .vv-btn-primary, .vv-btn-secondary { width: 100%; max-width: 300px; justify-content: center; }
          .vv-preview-hud { display: none; }
          .vv-video-pair { display: none; }
        }
      `}</style>

      <div className="vv-landing" id="vv-root">
        {/* BG layers */}
        <div className="vv-bg-grid" />
        <div className="vv-bg-noise" />
        <div className="vv-orb vv-orb-1" style={{ transform: `translate(${mousePos.x * 35}px, ${mousePos.y * 25}px)` }} />
        <div className="vv-orb vv-orb-2" style={{ transform: `translate(${-mousePos.x * 25}px, ${-mousePos.y * 18}px)` }} />
        <div className="vv-orb vv-orb-3" />
        <Particles />

        {/* ═══ NAVBAR ═══ */}
        <nav className={`vv-nav${scrolled ? " scrolled" : ""}`} role="navigation" aria-label="Main navigation">
          <div className="vv-nav-left">
            <button
              className="vv-logo-wrap"
              onClick={() => document.getElementById("hero-section")?.scrollIntoView({ behavior: "smooth" })}
              aria-label="VirtualVerse home"
            >
              <div className="vv-logo-icon" aria-hidden>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  <path d="M2 12h20"/>
                </svg>
              </div>
              <span className="vv-logo-name">VirtualVerse</span>
            </button>
            <span className="vv-nav-badge" aria-label="Beta version">Beta</span>
          </div>

          {/* Center nav links */}
          <div className="vv-nav-links" role="list">
            {navLinks.map(({ id, label }) => (
              <button
                key={id}
                role="listitem"
                className={`vv-nav-link${activeSection === id ? " active" : ""}`}
                onClick={() => scrollTo(id)}
                aria-current={activeSection === id ? "true" : undefined}
                aria-label={`Navigate to ${label}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="vv-nav-right">
            <button
              className="vv-nav-btn-ghost"
              onClick={() => scrollTo("how-section")}
              aria-label="Learn how VirtualVerse works"
            >
              How it works
            </button>
            <button
              id="nav-launch-btn"
              className="vv-nav-btn-primary"
              onClick={onEnter}
              aria-label="Launch VirtualVerse world"
            >
              Launch World →
            </button>
          </div>
        </nav>

        <div className="vv-content">
          {/* ═══ HERO ═══ */}
          <section id="hero-section" className="vv-hero" aria-labelledby="hero-h1">
            <div className="vv-hero-chip" style={fi(0)} aria-label="Status: Live Multiplayer available">
              <span className="vv-hero-chip-dot" aria-hidden />
              Live Multiplayer &nbsp;·&nbsp; Proximity Video &nbsp;·&nbsp; Spatial Chat
            </div>

            <h1 id="hero-h1" className="vv-hero-h1" style={fi(0.1)}>
              <span className="vv-hero-grad">Meet People</span>
              <span className="vv-hero-white">in a Living World</span>
            </h1>

            <p className="vv-hero-sub" style={fi(0.2)}>
              A <strong>spatial 2D metaverse</strong> where your avatar walks freely, video calls start
              the moment you get close to someone, and collaboration feels like sharing the same room.
            </p>

            <div className="vv-btn-row" style={fi(0.3)}>
              <button id="hero-enter-btn" className="vv-btn-primary" onClick={onEnter} aria-label="Enter the virtual world now">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Enter the World
              </button>
              <button id="hero-explore-btn" className="vv-btn-secondary" onClick={() => scrollTo("features-section")} aria-label="Explore VirtualVerse features">
                Explore Features
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 5v14M5 12l7 7 7-7"/>
                </svg>
              </button>
            </div>

            {/* ── Preview frame ── */}
            <div className="vv-preview" style={fi(0.42)} aria-hidden>
              <div className="vv-preview-frame">
                {/* Browser bar */}
                <div className="vv-preview-bar">
                  <div className="vv-preview-dot" style={{ background: "#ff5f57" }} />
                  <div className="vv-preview-dot" style={{ background: "#febc2e" }} />
                  <div className="vv-preview-dot" style={{ background: "#28c840" }} />
                  <div className="vv-preview-url">
                    <span>🔒&nbsp; virtualverse.app</span>
                  </div>
                </div>

                {/* World canvas */}
                <div className="vv-preview-world">
                  <div className="vv-world-grid-bg" />

                  {/* Map rooms */}
                  <div className="vv-map-room" style={{ left: "10%", top: "15%", width: "28%", height: "40%" }} />
                  <div className="vv-map-room" style={{ left: "45%", top: "10%", width: "22%", height: "30%" }} />
                  <div className="vv-map-room" style={{ left: "72%", top: "18%", width: "18%", height: "35%" }} />
                  <div className="vv-map-room" style={{ left: "20%", top: "62%", width: "35%", height: "28%" }} />

                  {/* Proximity rings (centered) */}
                  <div className="vv-prox-rings">
                    <div className="vv-prox-ring" style={{ width: 170, height: 170, animationDelay: "0s" }} />
                    <div className="vv-prox-ring" style={{ width: 240, height: 240, animationDelay: "0.9s", borderColor: "rgba(99,102,241,0.12)" }} />
                    <div className="vv-prox-ring" style={{ width: 320, height: 320, animationDelay: "1.8s", borderColor: "rgba(99,102,241,0.07)" }} />
                  </div>

                  {/* Avatars */}
                  <div className="vv-avatar" style={{ top: "44%", animation: "vv-walk-a 8s ease-in-out infinite" }}>
                    <div className="vv-avatar-body" style={{ background: "rgba(99,102,241,0.22)", border: "1.5px solid rgba(99,102,241,0.6)", color: "rgba(99,102,241,0.5)" }}>🧑‍💻</div>
                    <span className="vv-avatar-tag">@alex</span>
                  </div>
                  <div className="vv-avatar" style={{ top: "50%", animation: "vv-walk-b 10s ease-in-out infinite", animationDelay: "1s" }}>
                    <div className="vv-avatar-body" style={{ background: "rgba(139,92,246,0.22)", border: "1.5px solid rgba(139,92,246,0.6)", color: "rgba(139,92,246,0.5)" }}>👩‍🎨</div>
                    <span className="vv-avatar-tag">@maya</span>
                  </div>
                  <div className="vv-avatar" style={{ left: "68%", animation: "vv-walk-c 12s ease-in-out infinite", animationDelay: "2s" }}>
                    <div className="vv-avatar-body" style={{ background: "rgba(6,182,212,0.18)", border: "1.5px solid rgba(6,182,212,0.5)", color: "rgba(6,182,212,0.4)" }}>👨‍🚀</div>
                    <span className="vv-avatar-tag">@dan</span>
                  </div>

                  {/* HUD */}
                  <div className="vv-preview-hud">
                    <div className="vv-hud-pill">
                      <span className="vv-hud-green" />
                      <span>3 online</span>
                    </div>
                    <div className="vv-video-pair">
                      <div className="vv-vid-tile">🧑‍💻</div>
                      <div className="vv-vid-tile">👩‍🎨</div>
                    </div>
                    <div className="vv-hud-pill">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth={2.5}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                      <span style={{ color: "#a5b4fc" }}>Proximity on</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="vv-preview-glow" />
            </div>

            <div className="vv-scroll-hint" aria-hidden>
              <span>Scroll</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12l7 7 7-7"/></svg>
            </div>
          </section>

          {/* ═══ COUNTERS ═══ */}
          <section className="vv-counters" aria-label="VirtualVerse at a glance">
            <Counter value={5} label="Map Environments" suffix="+" />
            <Counter value={50} label="ms Avg Latency" suffix=" ms" />
            <Counter value={100} label="WebRTC Powered" suffix="%" />
            <Counter value={3} label="Core Services" />
          </section>

          {/* ═══ FEATURES ═══ */}
          <section id="features-section" className="vv-features" aria-labelledby="features-h2">
            <p className="vv-section-eyebrow">Everything included</p>
            <h2 id="features-h2" className="vv-section-h2">Built for Real Presence</h2>
            <p className="vv-section-p">Every feature is designed around one principle — make remote collaboration feel as natural as being in the same room.</p>
            <div className="vv-features-grid" role="list">
              {features.map((f, i) => (
                <div key={f.title} role="listitem"><FeatureCard feature={f} index={i} /></div>
              ))}
            </div>
          </section>

          {/* ═══ HOW IT WORKS ═══ */}
          <section id="how-section" className="vv-how-section" aria-labelledby="how-h2">
            <div className="vv-how-inner">
              <p className="vv-section-eyebrow">Zero friction</p>
              <h2 id="how-h2" className="vv-section-h2">In the World in Seconds</h2>
              <p className="vv-section-p">No downloads. No sign-up. Your browser is all you need.</p>
              <div ref={stepsRef} className="vv-steps-grid">
                <Step num={1} visible={stepsVisible} title="Pick your username" desc="Choose a display name for your avatar. No account or email required — just a name to show above your head." />
                <Step num={2} visible={stepsVisible} title="Choose a world" desc="Select from curated map environments — conference halls, creative studios, or open social spaces." />
                <Step num={3} visible={stepsVisible} title="Walk in & meet people" desc="Your avatar appears instantly. Move around freely and video calls start automatically when you approach others." />
                <Step num={4} visible={stepsVisible} title="Invite your team" desc="Copy the invite URL with your map pre-selected. Everyone lands on the same world, immediately." />
              </div>
            </div>
          </section>

          {/* ═══ TECH STACK ═══ */}
          <section id="tech-section" className="vv-tech-section" aria-labelledby="tech-h2">
            <div className="vv-tech-inner">
              <p className="vv-section-eyebrow">Open stack</p>
              <h2 id="tech-h2" className="vv-section-h2">Built on Rock-Solid Tech</h2>
              <p className="vv-section-p">Every layer is open-source, battle-tested, and optimised for real-time performance.</p>
              <div className="vv-tech-grid">
                {[
                  { name: "Phaser 3", color: "#6366f1", desc: "Game engine" },
                  { name: "Colyseus", color: "#8b5cf6", desc: "Game server" },
                  { name: "LiveKit", color: "#06b6d4", desc: "WebRTC rooms" },
                  { name: "Next.js 16", color: "#e2e8f0", desc: "React framework" },
                  { name: "TypeScript", color: "#3b82f6", desc: "Type safety" },
                  { name: "WebRTC", color: "#10b981", desc: "Peer video" },
                  { name: "WebSockets", color: "#f59e0b", desc: "Realtime sync" },
                  { name: "Tailwind CSS", color: "#38bdf8", desc: "Styling" },
                ].map((t) => (
                  <div key={t.name} className="vv-tech-chip" title={t.desc}>
                    <span className="vv-tech-dot" style={{ background: t.color }} />
                    {t.name}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ FINAL CTA ═══ */}
          <section className="vv-cta-section" aria-labelledby="cta-h2">
            <div className="vv-cta-card">
              <div className="vv-cta-glow" aria-hidden />
              <h2 id="cta-h2" className="vv-cta-h2">Ready to Step Inside?</h2>
              <p className="vv-cta-p">
                Choose a world, pick a name, and walk in. No sign-up.
                No downloads. Just open your browser and you're there.
              </p>
              <button id="cta-enter-btn" className="vv-cta-btn" onClick={onEnter} aria-label="Enter VirtualVerse">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Enter VirtualVerse
              </button>
              <p className="vv-cta-note">Free · No account · Works in any modern browser</p>
            </div>
          </section>

          {/* ═══ FOOTER ═══ */}
          <footer className="vv-footer" role="contentinfo">
            <div className="vv-footer-left">
              <div className="vv-footer-logo" aria-label="VirtualVerse">
                <div className="vv-footer-logo-icon" aria-hidden>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/>
                  </svg>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "-0.2px" }}>VirtualVerse</span>
              </div>
              <span className="vv-footer-sep">·</span>
              <span className="vv-footer-copy">© 2026 · Built with Phaser, Colyseus &amp; LiveKit</span>
            </div>

            <nav className="vv-footer-links" aria-label="Footer navigation">
              {navLinks.map(({ id, label }) => (
                <button key={id} className="vv-footer-link" onClick={() => scrollTo(id)} aria-label={`Go to ${label}`}>{label}</button>
              ))}
              <button className="vv-footer-link" onClick={onEnter} aria-label="Launch the world from footer">Launch World</button>
              <button
                className="vv-footer-link"
                onClick={() => window.open("https://github.com", "_blank", "noopener noreferrer")}
                aria-label="View source on GitHub (opens in new tab)"
              >
                GitHub ↗
              </button>
            </nav>
          </footer>
        </div>
      </div>
    </>
  );
}
