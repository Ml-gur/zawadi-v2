import React, { useEffect, useRef } from 'react';
import { useTransform, useMotionValue } from 'motion/react';
import type { MotionValue } from 'motion/react';

export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* Shared IntersectionObserver — one instance for the whole page. */
let sharedIO: IntersectionObserver | null = null;
function getIO(): IntersectionObserver | null {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return null;
  if (!sharedIO) {
    sharedIO = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          sharedIO?.unobserve(e.target);
        }
      }),
      { rootMargin: '0px 0px -8% 0px' }
    );
  }
  return sharedIO;
}

/** Visible by default; animates in only when JS+IO available. */
export const FadeUp: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const io = getIO();
    if (!el) return;
    if (!io) { el.classList.add('is-visible'); return; }
    io.observe(el);
    return () => io.unobserve(el);
  }, []);
  return (
    <div
      ref={ref}
      data-reveal=""
      style={{ ['--reveal-delay' as never]: `${delay * 1000}ms` }}
      className={className}
    >
      {children}
    </div>
  );
}

export function CountUp({ to, suffix = '', prefix = '', duration = 1.6 }: {
  to: number; suffix?: string; prefix?: string; duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0; let start: number | null = null;
    const run = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(2, -10 * p);
      el.textContent = `${prefix}${Math.round(to * eased).toLocaleString()}${suffix}`;
      if (p < 1) raf = requestAnimationFrame(run);
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [to, suffix, prefix, duration]);
  return <span ref={ref}>{`${prefix}${to.toLocaleString()}${suffix}`}</span>;
}

export function SpotlightCard({ children, className = '', style }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };
  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      style={style}
      className={`spotlight-card bg-off-black/80 border border-hairline/70 rounded-lg transition-[border-color,transform] duration-300 ease-out hover:border-muted hover:-translate-y-1 will-change-transform ${className}`}
    >
      {children}
    </div>
  );
}

export function Magnetic({ children, strength = 0.16 }: { children: React.ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useTransform(rawX, v => v); // springless keeps it light; motion values avoid re-render
  const y = useTransform(rawY, v => v);
  return (
    <motion.div
      ref={ref}
      data-magnetic=""
      style={{ x, y }}
      className="inline-block"
      onMouseMove={e => {
        if (!ref.current || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const r = ref.current.getBoundingClientRect();
        rawX.set((e.clientX - (r.left + r.width / 2)) * strength);
        rawY.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onMouseLeave={() => { rawX.set(0); rawY.set(0); }}
    >
      {children}
    </motion.div>
  );
}

// minimal local alias so Magnetic works without importing motion namespace at top
import { motion } from 'motion/react';

export function Orb({ className = '', parallax = 0, mx, my }: {
  className?: string; parallax?: number;
  mx?: MotionValue<number>; my?: MotionValue<number>;
}) {
  const px = useTransform(mx ?? useMotionValue(0), (v: number) => v * parallax);
  const py = useTransform(my ?? useMotionValue(0), (v: number) => v * parallax);
  return (
    <div aria-hidden className={`absolute rounded-full pointer-events-none ${className}`} style={{ x: px, y: py }} />
  );
}

export function Marquee({ items }: { items: string[] }) {
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden" aria-hidden>
      <div className="marquee-track gap-14 pr-14">
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center gap-14 whitespace-nowrap">
            <span className="text-sm md:text-base text-muted font-medium">{item}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green/50 shrink-0" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Doodles — pure SVG, drawn via CSS when ancestor .is-visible ── */

export function DoodleSquiggle({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 14" fill="none" aria-hidden className={`absolute left-0 -bottom-2 w-full h-3 ${className}`} preserveAspectRatio="none">
      <path
        data-draw=""
        pathLength={1}
        d="M3 10 C 30 3, 55 12, 82 7 S 140 2, 165 8 S 205 11, 217 5"
        stroke="#0ae448" strokeWidth="3" strokeLinecap="round"
      />
    </svg>
  );
}

export function DoodleCircleArrow({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 70" fill="none" aria-hidden className={`pointer-events-none overflow-visible ${className}`}>
      <path
        data-draw="" pathLength={1}
        d="M14 44 C 20 16, 78 6, 98 22 C 114 35, 104 56, 74 60 C 48 63, 24 58, 18 46"
        stroke="#abff84" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      />
      <path data-draw="" pathLength={1}
        d="M26 52 L 17 47 L 21 57"
        stroke="#abff84" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

export function DoodleSpark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={`${className} transition-transform duration-500 [html.js_&]:scale-100`} data-spark>
      <path d="M12 2 L13.8 9.2 L21 11 L13.8 12.8 L12 20 L10.2 12.8 L3 11 L10.2 9.2 Z" fill="#fec5fb" />
    </svg>
  );
}

/* Spark pops when revealed */
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `.js .is-visible [data-spark]{transform:scale(1) rotate(0)} .js [data-spark]{transform:scale(0) rotate(-40deg);transition:transform .5s cubic-bezier(.34,1.56,.64,1) .9s}`;
  document.head.appendChild(style);
}

/* ── Hero badge ── */
export function HeroBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2.5 rounded-full border border-hairline bg-off-black/60 pl-3 pr-4 py-1.5">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-50 motion-safe:animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-green" />
      </span>
      <span className="text-xs md:text-sm text-muted">{children}</span>
    </span>
  );
}

/* ── Match ring: CSS-driven draw on reveal ── */
export function ScoreRing({ value }: { value: number }) {
  const r = 26;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0">
      <circle cx="32" cy="32" r={r} fill="none" stroke="#42433d" strokeWidth="5" />
      <circle
        cx="32" cy="32" r={r} fill="none"
        stroke="url(#ringGrad)" strokeWidth="5" strokeLinecap="round"
        strokeDasharray={2 * Math.PI * r}
        pathLength={1}
        data-draw=""
        transform="rotate(-90 32 32)"
      />
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0ae448" />
          <stop offset="100%" stopColor="#abff84" />
        </linearGradient>
      </defs>
      <text x="32" y="37" textAnchor="middle" fill="#fffce1" fontSize="15" fontWeight="600">{value}</text>
    </svg>
  );
}
