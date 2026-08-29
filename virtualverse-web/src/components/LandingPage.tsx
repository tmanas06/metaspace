"use client";

/**
 * LandingPage — VirtualVerse Homepage
 * v4: Neon-green / cyberpunk aesthetic — near-black bg, dot grid, lime + cyan accents
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
        ([entry]) => { if (entry.isIntersecting) setActive(id); },
        { root: container, threshold: 0.4 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [ids]);
  return active;
}

function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible } as { ref: React.RefObject<HTMLElement>; visible: boolean };
}

// ─── Particles ───────────────────────────────────────────────────────────────
const PARTICLE_DATA = Array.from({ length: 28 }, (_, i) => ({
  left: `${((i * 41 + 11) % 96)}%`,
  top: `${((i * 57 + 9) % 92)}%`,
  delay: `${(i * 0.6) % 9}s`,
  duration: `${9 + (i % 5) * 2.5}s`,
  size: `${1 + (i % 3) * 0.7}px`,
  opacity: 0.06 + (i % 6) * 0.045,
  color: i % 3 === 0 ? "#4ade80" : i % 3 === 1 ? "#22d3ee" : "#a3e635",
}));

function Particles() {
  return (
    <div className="vv-particles" aria-hidden>
      {PARTICLE_DATA.map((p, i) => (
        <div key={i} className="vv-particle" style={{
          left: p.left, top: p.top,
          animationDelay: p.delay, animationDuration: p.duration,
          width: p.size, height: p.size, opacity: p.opacity, background: p.color,
          boxShadow: `0 0 6px ${p.color}`,
        }} />
      ))}
    </div>
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
interface Feature { icon: React.ReactNode; title: string; description: string; accent: string; tag: string; }

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const [visible, setVisible] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setTimeout(() => setVisible(true), index * 85); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [index]);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientY - rect.top) / rect.height - 0.5) * 8;
    const y = -((e.clientX - rect.left) / rect.width - 0.5) * 8;
    setTilt({ x, y });
  };

  return (
    <div
      ref={ref}
      className="vv-feature-card"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible
          ? `translateY(0) scale(1) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
          : "translateY(28px) scale(0.97)",
        transition: "opacity 0.6s ease, transform 0.55s ease",
      }}
      onMouseMove={onMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
    >
      <div className="vv-feature-top-border" style={{ background: `linear-gradient(90deg, ${feature.accent}80, ${feature.accent}20, transparent)` }} />
      <div className="vv-feature-icon" style={{ background: feature.accent + "12", border: `1px solid ${feature.accent}30` }}>
        <div style={{ color: feature.accent }}>{feature.icon}</div>
      </div>
      <div className="vv-feature-tag" style={{ color: feature.accent, background: feature.accent + "10", border: `1px solid ${feature.accent}28` }}>
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
        const dur = 1800; const t0 = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - t0) / dur, 1);
          const ease = 1 - Math.pow(1 - p, 4);
          setCount(Math.floor(ease * value));
          if (p < 1) requestAnimationFrame(tick); else setCount(value);
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

// ─── Step ────────────────────────────────────────────────────────────────────
function Step({ num, title, desc, visible }: { num: number; title: string; desc: string; visible: boolean }) {
  return (
    <div className="vv-step" style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0) scale(1)" : "translateY(24px) scale(0.98)",
      transition: `opacity 0.55s ease ${num * 0.13}s, transform 0.55s ease ${num * 0.13}s`,
    }}>
      <div className="vv-step-num">{String(num).padStart(2, "0")}</div>
      <div>
        <h3 className="vv-step-title">{title}</h3>
        <p className="vv-step-desc">{desc}</p>
      </div>
    </div>
  );
}

// ─── Testimonial Marquee ──────────────────────────────────────────────────────
const TESTIMONIALS = [
  { avatar: "🧑‍💻", name: "@alex_dev", text: "VirtualVerse changed how our remote team collaborates. It's like being in the same room." },
  { avatar: "👩‍🎨", name: "@maya_design", text: "The proximity video is pure magic. No more forgetting to end calls!" },
  { avatar: "👨‍🚀", name: "@dan_builds", text: "Phaser + Colyseus combo is buttery smooth. Impressive engineering." },
  { avatar: "🧑‍🔬", name: "@sam_sci", text: "We onboard new team members in VirtualVerse now. They love the spatial feel." },
  { avatar: "👩‍💼", name: "@priya_pm", text: "My team went from Zoom fatigue to actually looking forward to standups." },
  { avatar: "🧑‍🎤", name: "@leo_creates", text: "The virtual office actually makes you feel present. Mind-blowing." },
  { avatar: "👩‍🔧", name: "@nina_eng", text: "Zero friction. Pick a name, walk in. That's it. Brilliant UX." },
];

function TestimonialMarquee() {
  const doubled = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <div className="vv-marquee-wrap" aria-label="User testimonials">
      <div className="vv-marquee-track">
        {doubled.map((t, i) => (
          <div key={i} className="vv-testimonial-card">
            <div className="vv-test-header">
              <span className="vv-test-avatar">{t.avatar}</span>
              <span className="vv-test-name">{t.name}</span>
              <div className="vv-test-stars" aria-hidden>★★★★★</div>
            </div>
            <p className="vv-test-text">"{t.text}"</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section Heading ──────────────────────────────────────────────────────────
function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  const { ref, visible } = useReveal(0.15);
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className="vv-section-head">
      <p className="vv-section-eyebrow" style={{
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.5s ease 0s, transform 0.5s ease 0s",
      }}>{eyebrow}</p>
      <h2 className="vv-section-h2" style={{
        clipPath: visible ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)",
        transition: "clip-path 0.75s cubic-bezier(0.16,1,0.3,1) 0.12s",
      }}>{title}</h2>
      {subtitle && (
        <p className="vv-section-p" style={{
          opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(10px)",
          transition: "opacity 0.5s ease 0.38s, transform 0.5s ease 0.38s",
        }}>{subtitle}</p>
      )}
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

  useEffect(() => { const t = setTimeout(() => setHeroIn(true), 100); return () => clearTimeout(t); }, []);

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

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const navLinks = [
    { id: "features-section", label: "Features" },
    { id: "how-section", label: "How It Works" },
    { id: "tech-section", label: "Tech Stack" },
  ];

  const features: Feature[] = [
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>,
      title: "Open World Exploration", tag: "World",
      description: "Navigate handcrafted 2D environments — conference halls, social plazas, and secret rooms. Walk freely with arrow keys or WASD.",
      accent: "#4ade80",
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
      title: "Live Multiplayer Presence", tag: "Realtime",
      description: "See every player's avatar move in real-time. Powered by Colyseus game servers with authoritative state sync.",
      accent: "#22d3ee",
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
      title: "Proximity Video Chat", tag: "Video",
      description: "Walk close to someone and your cameras connect automatically. Step away and the call ends — friction-free, just like real life.",
      accent: "#a3e635",
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
      title: "Spatial Chat Panel", tag: "Chat",
      description: "A floating chat panel with full message history. Messages are contextual to the world you're in.",
      accent: "#34d399",
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><rect x="7" y="7" width="3" height="9"/><rect x="14" y="7" width="3" height="5"/></svg>,
      title: "Multiple Map Environments", tag: "Maps",
      description: "Switch between themed maps instantly — invite friends with a link that auto-loads your chosen world.",
      accent: "#67e8f9",
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>,
      title: "Mobile & Touch Ready", tag: "Mobile",
      description: "Virtual joystick + responsive layout. VirtualVerse works beautifully on phones and tablets.",
      accent: "#86efac",
    },
  ];

  const fi = (d: number) => ({
    opacity: heroIn ? 1 : 0,
    transform: heroIn ? "translateY(0)" : "translateY(32px)",
    transition: `opacity 0.85s cubic-bezier(0.16,1,0.3,1) ${d}s, transform 0.85s cubic-bezier(0.16,1,0.3,1) ${d}s`,
  });

  return (
    <>
      <style>{`
        /* ═══════════════════════════════════════════════════════
           VIRTUALVERSE LANDING v4 — NEON GREEN / CYBERPUNK
           ═══════════════════════════════════════════════════════ */

        .vv-landing {
          min-height: 100dvh; height: 100dvh;
          background: #080c09;
          color: #e8f5e9;
          font-family: var(--font-geist-sans, 'Inter', system-ui, sans-serif);
          overflow-x: hidden; overflow-y: auto;
          scroll-behavior: smooth; position: relative;
        }

        /* ── Dot Grid Background ── */
        .vv-dot-grid {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: radial-gradient(circle, rgba(74,222,128,0.18) 1px, transparent 1px);
          background-size: 28px 28px;
          -webkit-mask-image: radial-gradient(ellipse 85% 85% at 50% 50%, black 30%, transparent 100%);
          mask-image: radial-gradient(ellipse 85% 85% at 50% 50%, black 30%, transparent 100%);
        }

        /* ── Green orbs ── */
        .vv-orb {
          position: fixed; border-radius: 50%; filter: blur(110px);
          pointer-events: none; z-index: 0;
          transition: transform 1.6s cubic-bezier(0.25,0.46,0.45,0.94);
          will-change: transform;
        }
        .vv-orb-1 {
          width: 700px; height: 700px; top: -250px; left: -250px;
          background: radial-gradient(circle, rgba(74,222,128,0.1) 0%, transparent 65%);
        }
        .vv-orb-2 {
          width: 600px; height: 600px; bottom: -200px; right: -200px;
          background: radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 65%);
        }
        .vv-orb-3 {
          width: 500px; height: 500px; top: 45%; left: 55%;
          background: radial-gradient(circle, rgba(163,230,53,0.06) 0%, transparent 65%);
        }

        /* ── Particles ── */
        .vv-particles { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .vv-particle {
          position: absolute; border-radius: 50%;
          animation: vv-float linear infinite;
        }
        @keyframes vv-float {
          0%   { transform: translateY(0) scale(1); opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { transform: translateY(-115vh) scale(0.3); opacity: 0; }
        }

        /* ── Scanline overlay ── */
        .vv-scanlines {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.04) 2px,
            rgba(0,0,0,0.04) 4px
          );
        }

        /* ── Navbar ── */
        .vv-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 200;
          padding: 0 44px; height: 64px;
          display: flex; align-items: center; justify-content: space-between;
          transition: all 0.35s ease;
        }
        .vv-nav.scrolled {
          background: rgba(8,12,9,0.9);
          backdrop-filter: blur(28px) saturate(180%);
          -webkit-backdrop-filter: blur(28px) saturate(180%);
          border-bottom: 1px solid rgba(74,222,128,0.1);
          box-shadow: 0 1px 0 rgba(74,222,128,0.08), 0 12px 40px rgba(0,0,0,0.6);
        }

        .vv-nav-left { display: flex; align-items: center; gap: 12px; }
        .vv-logo-wrap {
          display: flex; align-items: center; gap: 10px;
          cursor: pointer; user-select: none; background: none; border: none;
        }
        .vv-logo-icon {
          width: 36px; height: 36px; border-radius: 9px;
          background: linear-gradient(135deg, #16a34a 0%, #4ade80 100%);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 1px rgba(74,222,128,0.4), 0 4px 20px rgba(74,222,128,0.25), inset 0 1px 0 rgba(255,255,255,0.2);
          flex-shrink: 0; position: relative; overflow: hidden;
        }
        .vv-logo-icon::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%);
        }
        .vv-logo-name {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 16px; font-weight: 700; letter-spacing: -0.3px; color: #fff;
        }
        .vv-nav-badge {
          font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; padding: 2px 7px;
          background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.3);
          border-radius: 20px; color: #4ade80;
        }

        .vv-nav-links {
          display: flex; align-items: center; gap: 4px;
          position: absolute; left: 50%; transform: translateX(-50%);
        }
        .vv-nav-link {
          background: none; border: none; font-family: inherit;
          font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.4);
          padding: 6px 14px; border-radius: 7px;
          cursor: pointer; transition: all 0.18s ease; position: relative;
        }
        .vv-nav-link:hover { color: rgba(255,255,255,0.85); background: rgba(255,255,255,0.04); }
        .vv-nav-link.active { color: #4ade80; }
        .vv-nav-link.active::after {
          content: ''; position: absolute; bottom: 3px; left: 50%; transform: translateX(-50%);
          width: 16px; height: 2px; border-radius: 2px; background: #4ade80;
          box-shadow: 0 0 8px rgba(74,222,128,0.7);
        }

        .vv-nav-right { display: flex; align-items: center; gap: 10px; }
        .vv-nav-btn-ghost {
          background: none; border: 1px solid rgba(255,255,255,0.1);
          font-family: inherit; font-size: 13px; font-weight: 500;
          color: rgba(255,255,255,0.5); padding: 7px 16px; border-radius: 8px;
          cursor: pointer; transition: all 0.2s ease;
        }
        .vv-nav-btn-ghost:hover { color: white; border-color: rgba(74,222,128,0.3); background: rgba(74,222,128,0.05); }
        .vv-nav-btn-primary {
          background: #4ade80;
          border: none; font-family: 'Space Grotesk', inherit; font-size: 13px; font-weight: 700;
          color: #030a04; padding: 8px 20px; border-radius: 8px;
          cursor: pointer; transition: all 0.22s ease;
          box-shadow: 0 4px 16px rgba(74,222,128,0.3), inset 0 1px 0 rgba(255,255,255,0.3);
          position: relative; overflow: hidden;
        }
        .vv-nav-btn-primary::after {
          content: ''; position: absolute; top: -50%; left: -100%;
          width: 60%; height: 200%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          transform: skewX(-20deg); transition: left 0.5s ease;
        }
        .vv-nav-btn-primary:hover { background: #86efac; box-shadow: 0 6px 24px rgba(74,222,128,0.5); transform: translateY(-1px); }
        .vv-nav-btn-primary:hover::after { left: 125%; }

        /* ── Content ── */
        .vv-content { position: relative; z-index: 10; padding-top: 64px; }

        /* ── Hero ── */
        .vv-hero {
          min-height: calc(100dvh - 64px);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center; padding: 60px 24px 100px; position: relative;
        }

        /* Status chip */
        .vv-hero-chip {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 5px 14px 5px 10px;
          background: rgba(74,222,128,0.07); border: 1px solid rgba(74,222,128,0.25);
          border-radius: 100px; font-size: 12px; font-weight: 600;
          color: #86efac; letter-spacing: 0.02em; margin-bottom: 32px;
          cursor: default; position: relative; overflow: hidden;
        }
        .vv-hero-chip::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(74,222,128,0.1), transparent);
          animation: vv-chip-shimmer 3s ease-in-out infinite;
        }
        @keyframes vv-chip-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }

        .vv-live-dot {
          width: 7px; height: 7px; border-radius: 50%; background: #4ade80;
          flex-shrink: 0; position: relative;
        }
        .vv-live-dot::before {
          content: ''; position: absolute; inset: -3px; border-radius: 50%;
          border: 1.5px solid rgba(74,222,128,0.4);
          animation: vv-live-ring 2.2s ease-out infinite;
        }
        @keyframes vv-live-ring { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }

        /* Hero headline */
        .vv-hero-h1 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: clamp(46px, 8vw, 100px);
          font-weight: 800; line-height: 0.96; letter-spacing: -4px;
          margin: 0 0 28px; max-width: 960px; color: #fff;
        }
        .vv-hero-grad {
          background: linear-gradient(125deg, #4ade80 0%, #22d3ee 35%, #a3e635 60%, #4ade80 100%);
          background-size: 300% auto;
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          display: block; animation: vv-text-shimmer 5s linear infinite;
        }
        @keyframes vv-text-shimmer { 0% { background-position: 0% center; } 100% { background-position: 300% center; } }
        .vv-hero-white { color: rgba(255,255,255,0.75); display: block; margin-top: 6px; }

        .vv-hero-sub {
          font-size: clamp(15px, 2vw, 17.5px); color: rgba(255,255,255,0.38);
          max-width: 520px; line-height: 1.85; margin: 0 auto 48px; font-weight: 400;
        }
        .vv-hero-sub strong { color: #86efac; font-weight: 600; }

        /* Buttons */
        .vv-btn-row { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; margin-bottom: 80px; }

        .vv-btn-primary {
          position: relative; overflow: hidden;
          padding: 16px 42px; border-radius: 12px; border: none;
          background: #4ade80;
          color: #030a04; font-size: 15px; font-weight: 800;
          cursor: pointer; font-family: 'Space Grotesk', inherit; letter-spacing: -0.1px;
          box-shadow: 0 8px 32px rgba(74,222,128,0.4), 0 0 0 1px rgba(74,222,128,0.3);
          transition: transform 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
          display: flex; align-items: center; gap: 8px;
        }
        .vv-btn-primary::after {
          content: ''; position: absolute; top: -50%; left: -100%;
          width: 60%; height: 200%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          transform: skewX(-20deg); transition: left 0.55s ease;
        }
        .vv-btn-primary:hover { transform: translateY(-3px) scale(1.02); background: #86efac; box-shadow: 0 20px 55px rgba(74,222,128,0.55); }
        .vv-btn-primary:hover::after { left: 140%; }
        .vv-btn-primary:active { transform: translateY(-1px) scale(1); }

        .vv-btn-secondary {
          padding: 15px 32px; border-radius: 12px;
          border: 1px solid rgba(74,222,128,0.2);
          background: rgba(74,222,128,0.04); backdrop-filter: blur(12px);
          color: rgba(255,255,255,0.6); font-size: 14px; font-weight: 600;
          cursor: pointer; font-family: inherit;
          transition: all 0.22s ease; display: flex; align-items: center; gap: 8px;
        }
        .vv-btn-secondary:hover { background: rgba(74,222,128,0.08); border-color: rgba(74,222,128,0.4); color: #86efac; transform: translateY(-2px); }

        /* Hero 3D preview */
        .vv-preview-wrap {
          position: relative; width: 100%; max-width: 900px; margin: 0 auto;
          perspective: 1800px;
        }
        .vv-preview {
          transform-style: preserve-3d;
          transform: rotateX(14deg) scale(0.97);
          transition: transform 0.65s cubic-bezier(0.16,1,0.3,1);
          border-radius: 18px;
          box-shadow: 0 0 0 1px rgba(74,222,128,0.15), 0 60px 140px rgba(0,0,0,0.85), 0 0 60px rgba(74,222,128,0.06);
        }
        .vv-preview-wrap:hover .vv-preview { transform: rotateX(4deg) scale(1); }
        .vv-preview-frame {
          border-radius: 16px; overflow: hidden;
          border: 1px solid rgba(74,222,128,0.12); background: #0a100a;
        }
        .vv-preview-bar {
          height: 38px; background: rgba(255,255,255,0.025);
          border-bottom: 1px solid rgba(74,222,128,0.08);
          display: flex; align-items: center; padding: 0 14px; gap: 7px;
        }
        .vv-preview-dot { width: 10px; height: 10px; border-radius: 50%; }
        .vv-preview-url {
          flex: 1; margin: 0 14px;
          background: rgba(74,222,128,0.04); border: 1px solid rgba(74,222,128,0.1);
          border-radius: 6px; height: 22px;
          display: flex; align-items: center; padding: 0 10px;
          font-size: 10px; color: rgba(74,222,128,0.4); font-family: monospace;
        }
        .vv-preview-world { aspect-ratio: 16/8.5; background: #070c07; position: relative; overflow: hidden; }
        .vv-world-grid-bg {
          position: absolute; inset: 0;
          background-image: radial-gradient(circle, rgba(74,222,128,0.15) 1px, transparent 1px);
          background-size: 32px 32px;
        }
        .vv-map-room {
          position: absolute; border-radius: 6px;
          border: 1px solid rgba(74,222,128,0.2);
          background: rgba(74,222,128,0.03);
        }
        .vv-avatar { position: absolute; display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .vv-avatar-body {
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; font-size: 18px;
        }
        .vv-avatar-tag {
          font-size: 9px; font-family: monospace;
          background: rgba(0,0,0,0.7); padding: 1px 5px; border-radius: 3px;
          color: #4ade80; white-space: nowrap;
        }
        @keyframes vv-walk-a { 0%,100% { left: 28%; } 50% { left: 46%; } }
        @keyframes vv-walk-b { 0%,100% { left: 52%; } 50% { left: 37%; } }
        @keyframes vv-walk-c { 0%,100% { top: 30%; } 50% { top: 56%; } }
        .vv-prox-rings { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); }
        .vv-prox-ring {
          position: absolute; border-radius: 50%;
          border: 1px solid rgba(74,222,128,0.2);
          animation: vv-breathe 3.2s ease-in-out infinite;
          transform: translate(-50%, -50%);
        }
        @keyframes vv-breathe {
          0%,100% { transform: translate(-50%,-50%) scale(1); opacity: 0.5; }
          50% { transform: translate(-50%,-50%) scale(1.07); opacity: 1; }
        }
        .vv-preview-hud {
          position: absolute; top: 12px; right: 12px;
          display: flex; flex-direction: column; gap: 8px; align-items: flex-end;
        }
        .vv-hud-pill {
          background: rgba(7,12,7,0.8); backdrop-filter: blur(12px);
          border: 1px solid rgba(74,222,128,0.15); border-radius: 7px;
          padding: 5px 10px; display: flex; align-items: center; gap: 6px;
          font-size: 10px; color: rgba(74,222,128,0.7); font-family: monospace;
        }
        .vv-hud-green { width: 5px; height: 5px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 6px #4ade80; }
        .vv-video-pair { display: flex; gap: 5px; }
        .vv-vid-tile {
          width: 64px; height: 48px; border-radius: 6px;
          background: #0f1a0f; border: 1px solid rgba(74,222,128,0.2);
          display: flex; align-items: center; justify-content: center; font-size: 18px;
        }
        .vv-preview-glow-wrap {
          position: absolute; bottom: -40px; left: 50%; transform: translateX(-50%);
          width: 55%; height: 80px; pointer-events: none;
          background: rgba(74,222,128,0.15); filter: blur(48px); border-radius: 50%;
        }

        /* Scroll hint */
        .vv-scroll-hint {
          position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
          display: flex; flex-direction: column; align-items: center; gap: 5px;
          color: rgba(74,222,128,0.25); font-size: 9px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.14em;
          animation: vv-bob 2.4s ease-in-out infinite;
        }
        @keyframes vv-bob { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(8px)} }

        /* ── Counters ── */
        .vv-counters {
          display: flex; flex-wrap: wrap; justify-content: center;
          background: rgba(74,222,128,0.02);
          border-top: 1px solid rgba(74,222,128,0.08);
          border-bottom: 1px solid rgba(74,222,128,0.08);
          padding: 52px 24px; position: relative; overflow: hidden;
        }
        .vv-counters::before {
          content: ''; position: absolute; top: 0; left: 15%; right: 15%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(74,222,128,0.5), rgba(34,211,238,0.5), transparent);
        }
        .vv-counter {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          padding: 20px 56px; border-right: 1px solid rgba(74,222,128,0.07);
        }
        .vv-counter:last-child { border-right: none; }
        .vv-counter-value {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 44px; font-weight: 800; letter-spacing: -2.5px; line-height: 1;
          color: #4ade80; text-shadow: 0 0 30px rgba(74,222,128,0.4);
        }
        .vv-counter-label { font-size: 12px; color: rgba(255,255,255,0.3); font-weight: 500; letter-spacing: 0.04em; font-family: monospace; }

        /* ── Section header ── */
        .vv-section-head { text-align: center; margin-bottom: 64px; }
        .vv-section-eyebrow {
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.18em; color: #4ade80;
          margin-bottom: 14px; font-family: monospace;
          display: flex; align-items: center; justify-content: center; gap: 10px;
        }
        .vv-section-eyebrow::before, .vv-section-eyebrow::after {
          content: ''; display: inline-block; width: 32px; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(74,222,128,0.5));
        }
        .vv-section-eyebrow::after { background: linear-gradient(90deg, rgba(74,222,128,0.5), transparent); }
        .vv-section-h2 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: clamp(30px, 4.5vw, 50px); font-weight: 800;
          letter-spacing: -2px; color: white; margin: 0 0 14px; line-height: 1.08; display: block;
        }
        .vv-section-p { color: rgba(255,255,255,0.35); font-size: 15px; max-width: 490px; margin: 0 auto; line-height: 1.8; }

        /* ── Features ── */
        .vv-features { padding: 110px 24px; max-width: 1220px; margin: 0 auto; }
        .vv-features-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 18px; }
        .vv-feature-card {
          background: rgba(255,255,255,0.02); border: 1px solid rgba(74,222,128,0.08);
          border-radius: 16px; padding: 28px 28px 30px; position: relative; overflow: hidden;
          cursor: default; transform-style: preserve-3d;
          transition: transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease, background 0.35s ease;
        }
        .vv-feature-top-border { position: absolute; top: 0; left: 0; right: 0; height: 1px; }
        .vv-feature-card:hover {
          background: rgba(74,222,128,0.03);
          border-color: rgba(74,222,128,0.2);
          box-shadow: 0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(74,222,128,0.08), 0 0 30px rgba(74,222,128,0.04);
        }
        .vv-feature-icon { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .vv-feature-tag {
          display: inline-block; font-size: 9.5px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.1em;
          padding: 2px 8px; border-radius: 5px; margin-bottom: 11px; font-family: monospace;
        }
        .vv-feature-title { font-family: 'Space Grotesk', sans-serif; font-size: 16px; font-weight: 700; color: white; margin: 0 0 9px; letter-spacing: -0.3px; }
        .vv-feature-desc { font-size: 13.5px; color: rgba(255,255,255,0.38); line-height: 1.7; margin: 0; }

        /* ── How It Works ── */
        .vv-how-section {
          padding: 110px 24px;
          background: rgba(74,222,128,0.015);
          border-top: 1px solid rgba(74,222,128,0.07);
        }
        .vv-how-inner { max-width: 1120px; margin: 0 auto; }
        .vv-steps-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(245px, 1fr)); gap: 20px; }
        .vv-step {
          display: flex; flex-direction: column; gap: 16px;
          background: rgba(255,255,255,0.02); border: 1px solid rgba(74,222,128,0.08);
          border-radius: 16px; padding: 28px;
          transition: background 0.25s, border-color 0.25s, transform 0.25s;
        }
        .vv-step:hover { background: rgba(74,222,128,0.04); border-color: rgba(74,222,128,0.22); transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,0.4), 0 0 20px rgba(74,222,128,0.05); }
        .vv-step-num {
          width: 44px; height: 44px; border-radius: 10px;
          background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.3);
          display: flex; align-items: center; justify-content: center;
          font-family: monospace; font-size: 13px; font-weight: 700; color: #4ade80; flex-shrink: 0;
          letter-spacing: 0.05em;
        }
        .vv-step-title { font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 700; color: white; margin: 0 0 7px; letter-spacing: -0.3px; }
        .vv-step-desc { font-size: 13.5px; color: rgba(255,255,255,0.38); line-height: 1.68; margin: 0; }

        /* ── Testimonials ── */
        .vv-testimonials-section { padding: 80px 0; border-top: 1px solid rgba(74,222,128,0.07); overflow: hidden; }
        .vv-test-eyebrow {
          text-align: center; font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.18em; color: #4ade80;
          margin-bottom: 44px; font-family: monospace;
          display: flex; align-items: center; justify-content: center; gap: 10px;
        }
        .vv-test-eyebrow::before, .vv-test-eyebrow::after {
          content: ''; display: inline-block; width: 32px; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(74,222,128,0.5));
        }
        .vv-test-eyebrow::after { background: linear-gradient(90deg, rgba(74,222,128,0.5), transparent); }
        .vv-marquee-wrap {
          -webkit-mask-image: linear-gradient(90deg, transparent, black 12%, black 88%, transparent);
          mask-image: linear-gradient(90deg, transparent, black 12%, black 88%, transparent);
        }
        .vv-marquee-track { display: flex; gap: 16px; width: max-content; animation: vv-marquee 42s linear infinite; }
        .vv-marquee-wrap:hover .vv-marquee-track { animation-play-state: paused; }
        @keyframes vv-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .vv-testimonial-card {
          flex-shrink: 0; width: 300px;
          background: rgba(255,255,255,0.02); border: 1px solid rgba(74,222,128,0.08);
          border-radius: 14px; padding: 20px 22px;
          transition: border-color 0.22s, background 0.22s;
        }
        .vv-testimonial-card:hover { border-color: rgba(74,222,128,0.22); background: rgba(74,222,128,0.04); }
        .vv-test-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .vv-test-avatar {
          width: 32px; height: 32px; border-radius: 50%; font-size: 17px;
          background: rgba(74,222,128,0.08); border: 1px solid rgba(74,222,128,0.2);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .vv-test-name { font-size: 12px; font-weight: 700; color: #4ade80; flex: 1; font-family: monospace; }
        .vv-test-stars { font-size: 10px; color: #a3e635; letter-spacing: 1.5px; }
        .vv-test-text { font-size: 13px; color: rgba(255,255,255,0.42); line-height: 1.65; margin: 0; font-style: italic; }

        /* ── Tech Stack ── */
        .vv-tech-section { padding: 90px 24px; border-top: 1px solid rgba(74,222,128,0.07); }
        .vv-tech-inner { max-width: 920px; margin: 0 auto; text-align: center; }
        .vv-tech-grid { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 48px; }
        .vv-tech-chip {
          display: flex; align-items: center; gap: 9px;
          padding: 9px 18px; border-radius: 8px;
          background: rgba(255,255,255,0.025); border: 1px solid rgba(74,222,128,0.1);
          font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.5);
          cursor: default; transition: all 0.2s ease; font-family: monospace;
        }
        .vv-tech-chip:hover { background: rgba(74,222,128,0.07); border-color: rgba(74,222,128,0.3); color: #86efac; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(74,222,128,0.1); }
        .vv-tech-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

        /* ── CTA ── */
        .vv-cta-section { padding: 120px 24px; text-align: center; position: relative; }
        .vv-cta-card {
          max-width: 740px; margin: 0 auto;
          background: rgba(74,222,128,0.04);
          border: 1px solid rgba(74,222,128,0.18); border-radius: 24px;
          padding: 72px 56px; position: relative; overflow: hidden;
        }
        .vv-cta-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent 5%, rgba(74,222,128,0.7) 40%, rgba(34,211,238,0.7) 60%, transparent 95%);
        }
        .vv-cta-card::after {
          content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent 20%, rgba(74,222,128,0.3) 50%, transparent 80%);
        }
        .vv-cta-glow {
          position: absolute; top: -80%; left: 50%; transform: translateX(-50%);
          width: 600px; height: 600px; pointer-events: none; border-radius: 50%;
          background: radial-gradient(circle, rgba(74,222,128,0.08) 0%, transparent 70%);
        }
        .vv-cta-h2 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: clamp(32px, 4.5vw, 50px); font-weight: 800; letter-spacing: -2px;
          line-height: 1.08; margin: 0 0 20px; position: relative; color: white;
        }
        .vv-cta-h2 span { color: #4ade80; }
        .vv-cta-p { font-size: 16px; color: rgba(255,255,255,0.38); line-height: 1.82; margin: 0 0 48px; position: relative; }
        .vv-cta-btn {
          display: inline-flex; align-items: center; gap: 11px;
          padding: 18px 52px; border-radius: 14px; border: none;
          background: #4ade80;
          color: #030a04; font-size: 16.5px; font-weight: 800;
          cursor: pointer; font-family: 'Space Grotesk', inherit; letter-spacing: -0.2px;
          box-shadow: 0 10px 48px rgba(74,222,128,0.45), 0 0 0 1px rgba(74,222,128,0.3);
          transition: all 0.25s ease; position: relative; overflow: hidden;
        }
        .vv-cta-btn::after {
          content: ''; position: absolute; top: -50%; left: -100%;
          width: 60%; height: 200%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          transform: skewX(-20deg); transition: left 0.55s ease;
        }
        .vv-cta-btn:hover { transform: translateY(-4px) scale(1.03); background: #86efac; box-shadow: 0 24px 72px rgba(74,222,128,0.6); }
        .vv-cta-btn:hover::after { left: 140%; }
        .vv-cta-note { margin-top: 22px; font-size: 12px; color: rgba(255,255,255,0.2); position: relative; font-family: monospace; }

        /* ── Footer ── */
        .vv-footer {
          border-top: 1px solid rgba(74,222,128,0.08);
          padding: 32px 44px;
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;
          background: rgba(74,222,128,0.01);
        }
        .vv-footer-left { display: flex; align-items: center; gap: 12px; }
        .vv-footer-logo { display: flex; align-items: center; gap: 8px; }
        .vv-footer-logo-icon {
          width: 24px; height: 24px; border-radius: 6px;
          background: linear-gradient(135deg, #16a34a, #4ade80);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 10px rgba(74,222,128,0.25);
        }
        .vv-footer-copy { font-size: 12px; color: rgba(255,255,255,0.2); font-family: monospace; }
        .vv-footer-sep { color: rgba(74,222,128,0.2); font-size: 12px; }
        .vv-footer-links { display: flex; gap: 4px; }
        .vv-footer-link {
          background: none; border: none; font-family: inherit;
          font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.28);
          cursor: pointer; padding: 5px 10px; border-radius: 6px;
          transition: all 0.18s ease;
        }
        .vv-footer-link:hover { color: #4ade80; background: rgba(74,222,128,0.06); }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .vv-nav { padding: 0 20px; }
          .vv-nav-links { display: none; }
          .vv-nav-btn-ghost { display: none; }
          .vv-counter { padding: 16px 28px; }
          .vv-counter-value { font-size: 34px; }
          .vv-cta-card { padding: 48px 28px; }
          .vv-footer { flex-direction: column; align-items: flex-start; padding: 26px 20px; }
          .vv-preview { transform: rotateX(7deg) scale(0.98) !important; }
        }
        @media (max-width: 480px) {
          .vv-hero-h1 { letter-spacing: -2px; }
          .vv-btn-row { flex-direction: column; align-items: center; }
          .vv-btn-primary, .vv-btn-secondary { width: 100%; max-width: 310px; justify-content: center; }
          .vv-preview-hud { display: none; }
          .vv-video-pair { display: none; }
          .vv-features-grid { grid-template-columns: 1fr; }
        }
        @media (prefers-reduced-motion: reduce) {
          .vv-particle, .vv-marquee-track,
          .vv-text-shimmer, .vv-chip-shimmer, .vv-live-ring { animation: none !important; }
          .vv-preview { transform: none !important; }
        }
      `}</style>

      <div className="vv-landing" id="vv-root">
        {/* ── Background ── */}
        <div className="vv-dot-grid" aria-hidden />
        <div className="vv-scanlines" aria-hidden />
        <div className="vv-orb vv-orb-1" aria-hidden style={{ transform: `translate(${mousePos.x * 35}px, ${mousePos.y * 25}px)` }} />
        <div className="vv-orb vv-orb-2" aria-hidden style={{ transform: `translate(${-mousePos.x * 25}px, ${-mousePos.y * 18}px)` }} />
        <div className="vv-orb vv-orb-3" aria-hidden />
        <Particles />

        {/* ═══ NAVBAR ═══ */}
        <nav className={`vv-nav${scrolled ? " scrolled" : ""}`} role="navigation" aria-label="Main navigation">
          <div className="vv-nav-left">
            <button className="vv-logo-wrap" onClick={() => document.getElementById("hero-section")?.scrollIntoView({ behavior: "smooth" })} aria-label="VirtualVerse home">
              <div className="vv-logo-icon" aria-hidden>
                <img src="/virtualverse-icon.jpg" alt="VirtualVerse logo" width={36} height={36} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 9 }} />
              </div>
              <span className="vv-logo-name">VirtualVerse</span>
            </button>
            <span className="vv-nav-badge" aria-label="Beta version">Beta</span>
          </div>

          <div className="vv-nav-links" role="list">
            {navLinks.map(({ id, label }) => (
              <button key={id} role="listitem" className={`vv-nav-link${activeSection === id ? " active" : ""}`}
                onClick={() => scrollTo(id)} aria-current={activeSection === id ? "true" : undefined}>
                {label}
              </button>
            ))}
          </div>

          <div className="vv-nav-right">
            <button className="vv-nav-btn-ghost" onClick={() => scrollTo("how-section")}>How it works</button>
            <button id="nav-launch-btn" className="vv-nav-btn-primary" onClick={onEnter} aria-label="Launch VirtualVerse world">
              Launch World →
            </button>
          </div>
        </nav>

        <div className="vv-content">
          {/* ═══ HERO ═══ */}
          <section id="hero-section" className="vv-hero" aria-labelledby="hero-h1">
            <div className="vv-hero-chip" style={fi(0)} aria-label="Live multiplayer available">
              <span className="vv-live-dot" aria-hidden />
              Live now
              <span style={{ color: "rgba(74,222,128,0.3)" }}>·</span>
              Proximity Video &nbsp;·&nbsp; Spatial Chat
            </div>

            <h1 id="hero-h1" className="vv-hero-h1" style={fi(0.1)}>
              <span className="vv-hero-grad">Meet People</span>
              <span className="vv-hero-white">in a Living World</span>
            </h1>

            <p className="vv-hero-sub" style={fi(0.22)}>
              A <strong>spatial 2D metaverse</strong> where your avatar walks freely, video calls start
              the moment you get close to someone, and collaboration feels like sharing the same room.
            </p>

            <div className="vv-btn-row" style={fi(0.32)}>
              <button id="hero-enter-btn" className="vv-btn-primary" onClick={onEnter} aria-label="Enter the virtual world">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Enter the World
              </button>
              <button id="hero-explore-btn" className="vv-btn-secondary" onClick={() => scrollTo("features-section")} aria-label="Explore features">
                Explore Features
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 5v14M5 12l7 7 7-7"/>
                </svg>
              </button>
            </div>

            {/* 3D Preview */}
            <div className="vv-preview-wrap" style={fi(0.45)} aria-hidden>
              <div className="vv-preview">
                <div className="vv-preview-frame">
                  <div className="vv-preview-bar">
                    <div className="vv-preview-dot" style={{ background: "#ff5f57" }} />
                    <div className="vv-preview-dot" style={{ background: "#febc2e" }} />
                    <div className="vv-preview-dot" style={{ background: "#28c840" }} />
                    <div className="vv-preview-url"><span>🔒&nbsp; virtualverse.app/world/office</span></div>
                  </div>
                  <div className="vv-preview-world">
                    <div className="vv-world-grid-bg" />
                    <div className="vv-map-room" style={{ left: "10%", top: "15%", width: "28%", height: "40%" }} />
                    <div className="vv-map-room" style={{ left: "45%", top: "10%", width: "22%", height: "30%" }} />
                    <div className="vv-map-room" style={{ left: "72%", top: "18%", width: "18%", height: "35%" }} />
                    <div className="vv-map-room" style={{ left: "20%", top: "62%", width: "35%", height: "28%" }} />
                    <div className="vv-prox-rings">
                      <div className="vv-prox-ring" style={{ width: 170, height: 170, animationDelay: "0s" }} />
                      <div className="vv-prox-ring" style={{ width: 250, height: 250, animationDelay: "1.1s", borderColor: "rgba(74,222,128,0.12)" }} />
                      <div className="vv-prox-ring" style={{ width: 340, height: 340, animationDelay: "2.2s", borderColor: "rgba(74,222,128,0.06)" }} />
                    </div>
                    <div className="vv-avatar" style={{ top: "44%", animation: "vv-walk-a 8s ease-in-out infinite" }}>
                      <div className="vv-avatar-body" style={{ background: "rgba(74,222,128,0.15)", border: "1.5px solid rgba(74,222,128,0.5)" }}>🧑‍💻</div>
                      <span className="vv-avatar-tag">@alex</span>
                    </div>
                    <div className="vv-avatar" style={{ top: "50%", animation: "vv-walk-b 10s ease-in-out infinite", animationDelay: "1s" }}>
                      <div className="vv-avatar-body" style={{ background: "rgba(34,211,238,0.15)", border: "1.5px solid rgba(34,211,238,0.5)" }}>👩‍🎨</div>
                      <span className="vv-avatar-tag">@maya</span>
                    </div>
                    <div className="vv-avatar" style={{ left: "68%", animation: "vv-walk-c 12s ease-in-out infinite", animationDelay: "2s" }}>
                      <div className="vv-avatar-body" style={{ background: "rgba(163,230,53,0.15)", border: "1.5px solid rgba(163,230,53,0.5)" }}>👨‍🚀</div>
                      <span className="vv-avatar-tag">@dan</span>
                    </div>
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
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth={2.5}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                        <span>proximity on</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="vv-preview-glow-wrap" />
            </div>

            <div className="vv-scroll-hint" aria-hidden>
              <span>Scroll</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M12 5v14M5 12l7 7 7-7"/></svg>
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
            <SectionHeading eyebrow="Everything included" title="Built for Real Presence" subtitle="Every feature designed around one principle — make remote collaboration feel as natural as being in the same room." />
            <div className="vv-features-grid" role="list">
              {features.map((f, i) => (
                <div key={f.title} role="listitem"><FeatureCard feature={f} index={i} /></div>
              ))}
            </div>
          </section>

          {/* ═══ HOW IT WORKS ═══ */}
          <section id="how-section" className="vv-how-section" aria-labelledby="how-h2">
            <div className="vv-how-inner">
              <SectionHeading eyebrow="Zero friction" title="In the World in Seconds" subtitle="No downloads. No sign-up. Your browser is all you need." />
              <div ref={stepsRef} className="vv-steps-grid">
                <Step num={1} visible={stepsVisible} title="Pick your username" desc="Choose a display name for your avatar. No account or email required — just a name to show above your head." />
                <Step num={2} visible={stepsVisible} title="Choose a world" desc="Select from curated map environments — conference halls, creative studios, or open social spaces." />
                <Step num={3} visible={stepsVisible} title="Walk in & meet people" desc="Your avatar appears instantly. Move around freely and video calls start automatically when you approach others." />
                <Step num={4} visible={stepsVisible} title="Invite your team" desc="Copy the invite URL with your map pre-selected. Everyone lands on the same world, immediately." />
              </div>
            </div>
          </section>

          {/* ═══ TESTIMONIALS ═══ */}
          <section className="vv-testimonials-section" aria-labelledby="testimonials-h2">
            <p id="testimonials-h2" className="vv-test-eyebrow">What people are saying</p>
            <TestimonialMarquee />
          </section>

          {/* ═══ TECH STACK ═══ */}
          <section id="tech-section" className="vv-tech-section" aria-labelledby="tech-h2">
            <div className="vv-tech-inner">
              <SectionHeading eyebrow="Open stack" title="Built on Rock-Solid Tech" subtitle="Every layer is open-source, battle-tested, and optimised for real-time performance." />
              <div className="vv-tech-grid">
                {[
                  { name: "Phaser 3", color: "#4ade80" },
                  { name: "Colyseus", color: "#22d3ee" },
                  { name: "LiveKit", color: "#a3e635" },
                  { name: "Next.js 16", color: "#86efac" },
                  { name: "TypeScript", color: "#34d399" },
                  { name: "WebRTC", color: "#67e8f9" },
                  { name: "WebSockets", color: "#4ade80" },
                  { name: "Tailwind CSS", color: "#22d3ee" },
                ].map((t) => (
                  <div key={t.name} className="vv-tech-chip">
                    <span className="vv-tech-dot" style={{ background: t.color, boxShadow: `0 0 6px ${t.color}` }} />
                    {t.name}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ CTA ═══ */}
          <section className="vv-cta-section" aria-labelledby="cta-h2">
            <div className="vv-cta-card">
              <div className="vv-cta-glow" aria-hidden />
              <h2 id="cta-h2" className="vv-cta-h2">Ready to <span>Step Inside?</span></h2>
              <p className="vv-cta-p">
                Choose a world, pick a name, and walk in. No sign-up.<br />
                No downloads. Just open your browser and you&apos;re there.
              </p>
              <button id="cta-enter-btn" className="vv-cta-btn" onClick={onEnter} aria-label="Enter VirtualVerse">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Enter VirtualVerse
              </button>
              <p className="vv-cta-note">free · no account · works in any modern browser</p>
            </div>
          </section>

          {/* ═══ FOOTER ═══ */}
          <footer className="vv-footer" role="contentinfo">
            <div className="vv-footer-left">
              <div className="vv-footer-logo" aria-label="VirtualVerse">
                <div className="vv-footer-logo-icon" aria-hidden>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#030a04" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/>
                  </svg>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.45)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.2px" }}>VirtualVerse</span>
              </div>
              <span className="vv-footer-sep">·</span>
              <span className="vv-footer-copy">© 2026 · Built with Phaser, Colyseus &amp; LiveKit</span>
            </div>
            <nav className="vv-footer-links" aria-label="Footer navigation">
              {navLinks.map(({ id, label }) => (
                <button key={id} className="vv-footer-link" onClick={() => scrollTo(id)}>{label}</button>
              ))}
              <button className="vv-footer-link" onClick={onEnter}>Launch World</button>
              <button className="vv-footer-link" onClick={() => window.open("https://github.com", "_blank", "noopener noreferrer")}>GitHub ↗</button>
            </nav>
          </footer>
        </div>
      </div>
    </>
  );
}
