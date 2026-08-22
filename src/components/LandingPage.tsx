import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'motion/react';
import { ArrowForward } from './Icons';
import { SEO } from './SEO';
import { supabase } from '../lib/supabase';
import type { Scholarship } from '../types';
import {
  EASE, FadeUp, CountUp, SpotlightCard, Magnetic, Orb, Marquee, ScoreRing,
  DoodleSquiggle, DoodleCircleArrow, DoodleSpark, HeroBadge,
} from './landing/primitives';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  countries: string[];
  onViewAllFAQs?: () => void;
}

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Zawadi",
  "url": "https://techsari.online",
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Zawadi",
  "url": "https://techsari.online",
};

const PROGRAMS = [
  'Rhodes Scholarship', 'Chevening', 'DAAD EPOS', 'Fulbright', 'Mastercard Foundation',
  'Erasmus Mundus', 'Commonwealth', 'MEXT', 'Schwarzman Scholars', 'McCall MacBain',
];

const FAQS = [
  {
    q: 'Do I need IELTS to apply through Zawadi?',
    a: 'No. The No-IELTS filter surfaces scholarships that accept a Medium-of-Instruction certificate or the $60 Duolingo English Test.',
  },
  {
    q: 'Is Zawadi free for students?',
    a: 'Matching, filtering and application tracking are free on the Explorer plan. Your data is never sold — that is written into our terms, not just promised.',
  },
  {
    q: 'How does matching actually work?',
    a: 'A deterministic engine checks your nationality, degree level, field of study and GPA against every listing\'s exact criteria. No generative guessing — if it says you qualify, you qualify.',
  },
  {
    q: 'How fast do I see my first matches?',
    a: 'Under three minutes. Complete the profile wizard and your ranked matches appear immediately.',
  },
];

/* ── Section eyebrow ── */
function Eyebrow({ text }: { text: string }) {
  return (
    <p className="text-base md:text-lg text-cream">
      <span className="text-muted">{'{'}</span> {text} <span className="text-muted">{'}'}</span>
    </p>
  );
}

export default function LandingPage({ onGetStarted, onLogin, countries, onViewAllFAQs }: LandingPageProps) {
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [featured, setFeatured] = useState<Scholarship[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('scholarships')
      .select('id, name, provider, host_region, host_institution, funding_type, deadline, no_ielts, degree_levels, countries, fields_of_study, urgency, iso2, published, description, eligibility, amount, required_documents, apply_url, source_url, slug, created_at')
      .eq('published', true)
      .order('id', { ascending: false })
      .limit(6)
      .then(({ data, error }) => {
        if (!cancelled && !error && data) setFeatured(data as unknown as Scholarship[]);
        if (!cancelled) setFeaturedLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  /* Hero mouse-parallax (springs smooth the raw values) */
  const rawMx = useMotionValue(0);
  const rawMy = useMotionValue(0);
  const smx = useSpring(rawMx, { stiffness: 50, damping: 20 });
  const smy = useSpring(rawMy, { stiffness: 50, damping: 20 });

  /* Hero scroll parallax */
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroProg } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(heroProg, [0, 1], [0, 130]);
  const heroOpacity = useTransform(heroProg, [0, 0.8], [1, 0]);

  /* Journey scroll-linked rail */
  const journeyRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: journeyProg } = useScroll({ target: journeyRef, offset: ['start 85%', 'end 45%'] });
  const journeyX = useSpring(journeyProg, { stiffness: 90, damping: 26 });

  return (
    <div className="bg-canvas text-cream min-h-[100dvh] relative">
      <SEO
        title="Zawadi — Scholarship Matching for African Students"
        description="Find scholarships you are eligible to win across all 54 African countries. Strict eligibility filtering removes scholarships you do not qualify for. No IELTS required options included."
        keywords="scholarships for African students, Africa scholarship matching, no IELTS scholarships Africa, fully funded scholarships Africa, scholarship application Africa"
        path="/"
        image="https://techsari.online/og-home.png"
        ogTitle="Zawadi — Find Scholarships You Actually Qualify For"
        ogDescription="Strict eligibility matching for African students. See only scholarships where you meet every requirement. No spam. No data selling. No IELTS barrier."
        schema={[websiteSchema, organizationSchema]}
      />

      {/* ═══ HERO ═══ */}
      <section
        ref={heroRef}
        onMouseMove={e => {
          const r = e.currentTarget.getBoundingClientRect();
          rawMx.set((e.clientX - (r.left + r.width / 2)) / r.width);
          rawMy.set((e.clientY - (r.top + r.height / 2)) / r.height);
        }}
        className="relative min-h-[100dvh] flex flex-col justify-center overflow-hidden px-4 sm:px-6 pt-24 pb-16"
      >
        {/* Parallax orbs (static gradients, mouse-driven only) */}
        <Orb className="w-[560px] h-[560px] md:w-[840px] md:h-[840px] -top-[20%] -right-[18%] bg-[radial-gradient(circle_at_38%_38%,rgba(254,197,251,0.15)_0%,rgba(0,186,226,0.07)_48%,transparent_70%)]" parallax={38} mx={smx} my={smy} />
        <Orb className="w-[500px] h-[500px] md:w-[720px] md:h-[720px] bottom-[-26%] left-[-16%] bg-[radial-gradient(circle_at_60%_35%,rgba(10,228,72,0.14)_0%,rgba(171,255,132,0.05)_52%,transparent_72%)]" parallax={-28} mx={smx} my={smy} />

        {/* Floating match-card */}
        <motion.aside
          aria-hidden
          initial={{ opacity: 0, y: 56 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: EASE, delay: 1 }}
          data-reveal="" className="hidden lg:block absolute right-[5%] top-[22%] w-[300px] z-0 pointer-events-none"
          style={{ x: useTransform(smx, v => v * 42), y: useTransform(smy, v => v * 30) }}
        >
          <div className="spotlight-card bg-off-black/80 border border-hairline rounded-lg p-5">
            <p className="text-[10px] uppercase tracking-wider text-muted mb-3">Match found</p>
            <div className="flex items-center gap-4">
              <ScoreRing value={98} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-cream leading-snug line-clamp-2">MSc Renewable Energy — TU Munich</p>
                <p className="text-xs text-muted mt-1">Full funding · No IELTS</p>
              </div>
            </div>
            <div className="flex gap-1.5 mt-4">
              <span className="px-2 py-0.5 rounded-full border border-accent-green/40 text-accent-green text-[10px]">Eligible</span>
              <span className="px-2 py-0.5 rounded-full border border-hairline text-muted text-[10px]">Deadline Jun 12</span>
            </div>
          </div>
          <FadeUp delay={1.8}>
            <div className="relative mt-5 ml-[-12px] inline-flex bg-canvas border border-hairline rounded-full px-4 py-2">
              <DoodleCircleArrow className="absolute -top-7 left-2 w-[92px] h-[52px]" />
              <span className="text-xs font-mono text-accent-green tabular-nums">+128</span>
              <span className="text-xs text-muted ml-2">matches this week</span>
            </div>
          </FadeUp>
        </motion.aside>

        {/* Content */}
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="max-w-[1280px] mx-auto w-full relative z-10">
          <FadeUp delay={0.05}>
            <HeroBadge>Now matching across all {countries.length || 54} African countries</HeroBadge>
          </FadeUp>

          <h1 className="mt-7 md:mt-9 text-display font-semibold tracking-tight max-w-[10ch] relative">
            <FadeUp delay={0.14}>Your potential.</FadeUp>
            <FadeUp delay={0.26}>
              <span className="relative inline-block">
                <span className="text-brand-gradient">Funded.</span>
                <DoodleSpark className="absolute -right-9 -top-2 w-6 h-6" />
                <DoodleSquiggle />
              </span>
            </FadeUp>
          </h1>

          <FadeUp delay={0.45}>
            <p className="text-body-lg text-muted leading-relaxed max-w-[46ch] mt-7 md:mt-8">
              Zawadi matches African students to scholarships they are 100%
              eligible for — verified daily, no spam, no data selling.
            </p>
          </FadeUp>

          <FadeUp delay={0.58}>
            <div className="flex flex-col sm:flex-row gap-4 mt-9">
              <Magnetic>
                <button
                  onClick={onGetStarted}
                  className="btn-gradient-stroke btn-shine inline-flex items-center justify-center gap-2 rounded-full px-9 min-h-[54px] text-lg font-semibold text-cream transition-transform active:scale-[0.98] cursor-pointer group"
                >
                  Start free
                  <ArrowForward className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </Magnetic>
              <Link
                to="/scholarships/browse"
                className="inline-flex items-center justify-center rounded-full px-9 min-h-[54px] text-lg font-semibold text-cream border border-cream/60 hover:border-cream hover:bg-cream/[0.04] active:scale-[0.98] transition-all"
              >
                Browse scholarships
              </Link>
            </div>
          </FadeUp>

          {/* Trust bento strip */}
          <FadeUp delay={0.72}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-11 max-w-[720px]">
              {[
                ['100% eligibility', 'hard-gate checks, no guesses'],
                ['$0 forever plan', 'matching is always free'],
                ['No-IELTS paths', 'MOI & Duolingo accepted'],
              ].map(([t, d]) => (
                <div key={t} className="rounded-lg border border-hairline/70 bg-off-black/50 px-4 py-3">
                  <p className="text-sm font-semibold text-cream">{t}</p>
                  <p className="text-xs text-muted mt-0.5">{d}</p>
                </div>
              ))}
            </div>
          </FadeUp>

          <FadeUp delay={0.85}>
            <button onClick={onLogin} className="mt-8 text-sm text-muted underline underline-offset-4 decoration-hairline hover:text-cream hover:decoration-cream transition-colors cursor-pointer">
              Already have an account? Sign in
            </button>
          </FadeUp>
        </motion.div>
      </section>

      {/* ═══ PROGRAM TICKER ═══ */}
      <div id="stats" className="hairline py-5 scroll-mt-24">
        <Marquee items={PROGRAMS} />
      </div>

      {/* ═══ STATS BAND ═══ */}
      <section className="hairline">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-14 md:py-20 grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6">
          {[
            { v: 54, s: '', label: 'African countries covered', tone: 'text-cream' },
            { v: 2500, s: '+', label: 'Verified live listings', tone: 'text-accent-orange' },
            { v: 3, s: ' min', label: 'Profile to first matches', tone: 'text-accent-lilac' },
            { v: 100, s: '%', label: 'Deterministic eligibility', tone: 'text-accent-green' },
          ].map((st, i) => (
            <FadeUp key={st.label} delay={i * 0.08}>
              <div className={`font-mono text-4xl md:text-5xl font-medium tabular-nums ${st.tone}`}>
                <CountUp to={st.v} suffix={st.s} />
              </div>
              <p className="text-sm text-muted mt-2">{st.label}</p>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ═══ FEATURED SCHOLARSHIPS ═══ */}
      <section className="hairline">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-16 md:py-24">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-9 md:mb-12">
            <div>
              <FadeUp><Eyebrow text="Open now" /></FadeUp>
              <h2 className="text-subheading md:text-heading font-semibold text-cream tracking-tight max-w-[16ch] mt-3">
                Active opportunities, refreshed daily.
              </h2>
            </div>
            <FadeUp>
              <Link to="/scholarships" className="group inline-flex items-center gap-2 text-sm font-semibold text-accent-green underline-offset-4 hover:underline">
                View database
                <ArrowForward className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </FadeUp>
          </div>

          {featuredLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[0, 1, 2].map(i => (
                <div key={i} className="bg-off-black border border-hairline/60 rounded-lg p-6 animate-pulse">
                  <div className="h-4 w-3/4 bg-hairline/40 rounded mb-3" />
                  <div className="h-3 w-1/2 bg-hairline/30 rounded mb-6" />
                  <div className="flex gap-2">
                    <div className="h-5 w-16 bg-hairline/30 rounded-full" />
                    <div className="h-5 w-20 bg-hairline/30 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : featured.length === 0 ? (
            <SpotlightCard className="text-center py-14 px-6">
              <p className="text-cream font-medium mb-1">No featured listings right now</p>
              <p className="text-muted text-sm">New opportunities are added daily. Check back soon.</p>
            </SpotlightCard>
          ) : (
            <>
              <div className="flex md:hidden gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar -mx-4 px-4 pb-1">
                {featured.slice(0, 3).map(s => (
                  <Link key={s.id} to="/scholarships" className="snap-start shrink-0 w-[280px]">
                    <SpotlightCard className="p-5 h-full flex flex-col gap-3">
                      <MiniCard s={s} />
                    </SpotlightCard>
                  </Link>
                ))}
              </div>
              <div className="hidden md:grid grid-cols-3 gap-5">
                {featured.slice(0, 3).map((s, i) => (
                  <FadeUp key={s.id} delay={i * 0.09}>
                    <Link to="/scholarships" className="block h-full">
                      <SpotlightCard className="p-6 h-full flex flex-col gap-3 group">
                        <MiniCard s={s} />
                        <span className="inline-flex items-center gap-2 text-xs font-semibold text-cream opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 mt-auto pt-2">
                          View details <ArrowForward className="w-3 h-3" />
                        </span>
                      </SpotlightCard>
                    </Link>
                  </FadeUp>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ═══ WHY — asymmetric bento ═══ */}
      <section className="hairline">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-16 md:py-28">
          <FadeUp><Eyebrow text="Why Zawadi" /></FadeUp>
          <h2 className="text-subheading md:text-heading font-semibold text-cream tracking-tight max-w-[22ch] mt-3 mb-10 md:mb-14">
            Built for how applications actually happen.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5">
            <FadeUp className="md:col-span-7" delay={0}>
              <SpotlightCard className="p-6 md:p-8 h-full bg-[radial-gradient(circle_at_88%_12%,rgba(10,228,72,0.09)_0%,transparent_55%)]">
                <p className="text-xs uppercase tracking-wider text-muted mb-5">Matching engine</p>
                <div className="font-mono text-6xl md:text-7xl font-medium tabular-nums text-accent-green">100%</div>
                <h3 className="font-semibold text-cream text-xl md:text-2xl mt-4 mb-2">Deterministic eligibility</h3>
                <p className="text-sm md:text-base text-muted leading-relaxed max-w-md">
                  Nationality, degree level, field of study, GPA — cross-checked against each
                  scholarship's exact requirements. Zero hallucination, zero wasted applications.
                </p>
              </SpotlightCard>
            </FadeUp>

            <FadeUp className="md:col-span-5" delay={0.08}>
              <SpotlightCard className="p-6 md:p-8 h-full flex flex-col">
                <p className="text-xs uppercase tracking-wider text-muted mb-auto pb-8">Setup</p>
                <div className="font-mono text-5xl md:text-6xl font-medium tabular-nums text-accent-lilac"><CountUp to={3} suffix=" min" /></div>
                <h3 className="font-medium text-cream mt-4">From zero to matches</h3>
                <p className="text-sm text-muted mt-2 leading-relaxed">One profile. Every opportunity you can actually win, ranked.</p>
              </SpotlightCard>
            </FadeUp>

            <FadeUp className="md:col-span-5" delay={0.12}>
              <SpotlightCard className="p-6 md:p-8 h-full flex flex-col">
                <p className="text-xs uppercase tracking-wider text-muted mb-auto pb-8">Deadlines</p>
                <div className="font-mono text-5xl md:text-6xl font-medium tabular-nums text-accent-pink"><CountUp to={30} prefix="-" suffix="d" /></div>
                <h3 className="font-medium text-cream mt-4">Never miss one again</h3>
                <p className="text-sm text-muted mt-2 leading-relaxed">Timezone-aware reminders before each window closes.</p>
              </SpotlightCard>
            </FadeUp>

            <FadeUp className="md:col-span-7" delay={0.16}>
              <SpotlightCard className="p-6 md:p-8 h-full bg-[radial-gradient(circle_at_10%_90%,rgba(0,186,226,0.08)_0%,transparent_55%)]">
                <p className="text-xs uppercase tracking-wider text-muted mb-5">Data quality</p>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                  <span className="font-mono text-5xl md:text-6xl font-medium tabular-nums text-accent-blue"><CountUp to={2500} suffix="+" /></span>
                  <span className="text-sm text-muted max-w-[26ch]">verified listings — no dead links, no expired deadlines.</span>
                </div>
                <div className="mt-6 h-px w-full bg-hairline/60 relative overflow-hidden">
                  <motion.span
                    className="absolute inset-y-0 left-0 w-1/3 bg-accent-blue/60"
                    initial={{ x: '-120%' }}
                    whileInView={{ x: ['0%', '220%'] }}
                    viewport={{ once: false, margin: '-20%' }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.2 }}
                  />
                </div>
              </SpotlightCard>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ═══ JOURNEY — scroll-linked rail ═══ */}
      <section ref={journeyRef} className="hairline">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-16 md:py-28">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-10">
            <div>
              <FadeUp><Eyebrow text="The path" /></FadeUp>
              <FadeUp delay={0.08}><h2 className="text-subheading md:text-heading font-semibold text-cream tracking-tight max-w-[14ch] mt-3">
                Four steps. One system.
              </h2></FadeUp>
            </div>
            <div className="relative">
              <div className="absolute left-0 right-0 top-[13px] h-px bg-hairline" />
              <motion.div
                className="absolute left-0 right-0 top-[13px] h-px bg-accent-green origin-left"
                style={{ scaleX: journeyX }}
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10">
                {[
                  ['01', 'Profile', 'Three minutes of facts about you'],
                  ['02', 'Matches', 'Only what you fully qualify for'],
                  ['03', 'Essays', 'AI drafts, human mentors refine'],
                  ['04', 'Submit', 'Tracked to the deadline, reminded twice'],
                ].map(([n, t, d], i) => (
                  <FadeUp key={n} delay={i * 0.1} className="pt-0">
                    <span className={`block w-[27px] h-[27px] rounded-full border text-[10px] font-mono flex items-center justify-center ${i === 1 ? 'border-accent-green text-accent-green' : 'border-hairline text-muted bg-canvas'}`}>
                      {n}
                    </span>
                    <h3 className="font-medium text-cream mt-4">{t}</h3>
                    <p className="text-xs text-muted mt-1 leading-relaxed max-w-[20ch]">{d}</p>
                  </FadeUp>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="hairline">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-16 md:py-28">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            <FadeUp className="md:col-span-7">
              <figure className="relative bg-off-black border border-hairline rounded-lg p-7 md:p-10 h-full overflow-hidden">
                <span aria-hidden className="absolute -top-4 left-6 font-display text-[140px] leading-none text-hairline/40 select-none">&ldquo;</span>
                <blockquote className="relative text-xl md:text-3xl font-medium text-cream leading-snug max-w-[30ch] pt-8">
                  Twelve opportunities I was 100% eligible for, in minutes.
                  Fully-funded Master's in Germany by semester's end.
                </blockquote>
                <figcaption className="mt-8 flex items-center gap-4">
                  <span className="w-12 h-12 rounded-lg ring-1 ring-hairline flex items-center justify-center font-mono text-cream">AK</span>
                  <span>
                    <span className="block text-sm font-medium text-cream">Amina Kouyaté</span>
                    <span className="block text-xs text-muted mt-0.5">Mali → Germany · MSc Renewable Energy</span>
                  </span>
                </figcaption>
              </figure>
            </FadeUp>
            <div className="md:col-span-5 flex flex-col gap-5">
              <FadeUp delay={0.1}>
                <figure className="bg-off-black border border-hairline rounded-lg p-6">
                  <blockquote className="text-base text-cream leading-relaxed">
                    "The No-IELTS filter saved me $250 and months of prep."
                  </blockquote>
                  <figcaption className="mt-4 text-xs text-muted">Chidi Nnamdi · Nigeria → Canada</figcaption>
                </figure>
              </FadeUp>
              <FadeUp delay={0.18}>
                <figure className="bg-off-black border border-hairline rounded-lg p-6">
                  <blockquote className="text-base text-cream leading-relaxed">
                    "My mentor's feedback made the difference. Medicine at King's College London."
                  </blockquote>
                  <figcaption className="mt-4 text-xs text-muted">Faith Muthoni · Kenya → UK</figcaption>
                </figure>
              </FadeUp>
              <FadeUp delay={0.26} className="mt-auto">
                <div className="rounded-lg border border-accent-green/30 p-6 flex items-center justify-between gap-4 bg-[radial-gradient(circle_at_85%_50%,rgba(10,228,72,0.07)_0%,transparent_60%)]">
                  <p className="text-cream font-medium">Write your own story.</p>
                  <button
                    onClick={onGetStarted}
                    className="btn-gradient-stroke shrink-0 inline-flex items-center gap-2 rounded-full px-5 py-2.5 min-h-[44px] text-sm font-semibold text-cream hover:brightness-110 active:scale-[0.98] cursor-pointer transition-all"
                  >
                    Start free <ArrowForward className="w-3.5 h-3.5" />
                  </button>
                </div>
              </FadeUp>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="hairline">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-16 md:py-24">
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": FAQS.map(f => ({
                "@type": "Question", name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            })}
          </script>
          <FadeUp><Eyebrow text="Questions" /></FadeUp>
          <h2 className="text-subheading font-semibold text-cream tracking-tight mt-3 mb-8">Asked often.</h2>
          <div className="space-y-2">
            {FAQS.map((faq, idx) => {
              const faqId = `lf-${idx}`;
              const isOpen = openFaq === faqId;
              return (
                <FadeUp key={faqId} delay={idx * 0.06}>
                  <div className={`border rounded-lg transition-colors duration-200 ${isOpen ? 'border-hairline bg-off-black' : 'border-hairline/60 hover:border-hairline'}`}>
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : faqId)}
                      className="w-full flex justify-between items-center gap-4 p-4 md:p-5 text-left cursor-pointer"
                      aria-expanded={isOpen}
                    >
                      <span className={`text-sm md:text-base transition-colors ${isOpen ? 'text-accent-green' : 'text-cream'}`}>{faq.q}</span>
                      <svg
                        className={`w-4 h-4 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-accent-green' : 'text-muted'}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div className={`transition-all duration-300 ease-out ${isOpen ? 'max-h-[300px]' : 'max-h-0'} overflow-hidden`}>
                      <p className="px-4 md:px-5 pb-5 text-sm text-muted leading-relaxed">{faq.a}</p>
                    </div>
                  </div>
                </FadeUp>
              );
            })}
          </div>
          {onViewAllFAQs && (
            <FadeUp delay={0.2}>
              <button
                onClick={onViewAllFAQs}
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-accent-green underline underline-offset-4 decoration-accent-green/40 hover:decoration-accent-green cursor-pointer transition-all"
              >
                All FAQs <ArrowForward className="w-3.5 h-3.5" />
              </button>
            </FadeUp>
          )}
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="hairline relative overflow-hidden">
        <motion.div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ y: useTransform(heroProg, [1, 0], [0, 80]) }}
        >
          <div className="absolute bottom-[-60%] left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-[radial-gradient(circle,rgba(10,228,72,0.12)_0%,rgba(171,255,132,0.04)_45%,transparent_68%)]" />
        </motion.div>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-24 md:py-36 relative">
          <FadeUp><Eyebrow text="Begin" /></FadeUp>
          <h2 className="text-heading md:text-display font-semibold tracking-tight max-w-[14ch] mt-4">
            Your scholarship<br />is out there<span className="text-accent-green">.</span>
          </h2>
          <FadeUp delay={0.2}>
            <Magnetic>
              <button
                onClick={onGetStarted}
                className="btn-gradient-stroke btn-shine inline-flex items-center gap-3 rounded-full pl-8 pr-3 py-2 min-h-[60px] text-xl font-semibold text-cream transition-transform active:scale-[0.98] cursor-pointer group mt-9 md:mt-12"
              >
                Start for free
                <span className="w-11 h-11 rounded-full bg-cream/[0.08] ring-1 ring-cream/15 inline-flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5">
                  <ArrowForward className="w-4 h-4" />
                </span>
              </button>
            </Magnetic>
            <p className="mt-5 text-sm text-muted">Create your profile in three minutes. No credit card required.</p>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}

function MiniCard({ s }: { s: Scholarship }) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium text-cream text-sm leading-snug line-clamp-2 flex-1">{s.name}</h3>
        {s.no_ielts && (
          <span className="shrink-0 px-2 py-0.5 rounded-full border border-accent-green/40 text-accent-green text-[10px] font-medium uppercase tracking-wide">
            No IELTS
          </span>
        )}
      </div>
      <p className="text-xs text-muted line-clamp-2">
        {s.provider}{s.host_institution ? ` \u00B7 ${s.host_institution}` : ''}
      </p>
      <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
        {s.funding_type && (
          <span className="px-2 py-0.5 rounded-full border border-hairline text-muted text-[10px]">{s.funding_type}</span>
        )}
        {s.degree_levels?.slice(0, 2).map(d => (
          <span key={d} className="px-2 py-0.5 rounded-full border border-hairline text-muted text-[10px]">{d}</span>
        ))}
        {s.deadline && (
          <span className="px-2 py-0.5 rounded-full border border-accent-pink/40 text-accent-pink text-[10px]">{s.deadline}</span>
        )}
      </div>
    </>
  );
}
