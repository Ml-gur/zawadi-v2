import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, Globe2, PenLine, ScanSearch } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { FadeUp } from './primitives';

interface Feature {
  n: string;
  icon: LucideIcon;
  title: string;
  body: ReactNode;
}

const CARDS: Array<Feature & { surface: string; numberPill: string; bodyClass?: string }> = [
  {
    n: '01',
    icon: ScanSearch,
    title: 'AI-powered scholarship matching',
    body: 'Nationality, degree level, field of study and GPA are checked against each listing\u2019s exact criteria. If we say you qualify, you qualify.',
    surface: 'bg-parchment',
    numberPill: 'border-ash text-graphite',
  },
  {
    n: '02',
    icon: Globe2,
    title: 'All 54 countries covered',
    body: 'One profile unlocks verified listings across the continent and beyond, including funds reserved for your specific nationality.',
    surface: 'bg-pure-white border border-ash',
    numberPill: 'border-ash text-graphite',
  },
  {
    n: '03',
    icon: CalendarClock,
    title: 'Deadlines handled',
    body: 'Timezone-aware reminders land before every window closes, so a missed date never costs you an offer.',
    surface: 'bg-deep-charcoal text-pure-white',
    numberPill: 'border-stone text-smoke',
  },
  {
    n: '04',
    icon: PenLine,
    title: 'AI essay partner',
    body: 'use AI to prepare your essays, and get guidance from mentors to strengthen your resume and application.',
    surface: 'bg-electric-lime',
    numberPill: 'border-off-black-ink/25 text-off-black-ink',
    bodyClass: 'text-on-lime',
  },
];

export default function FeatureBento() {
  return (
    <section className="bg-pure-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-20 md:py-32">
        <FadeUp>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b border-ash pb-10 mb-10 md:mb-14">
            <h2 className="text-ed-h1-sm md:text-ed-h1 text-off-black-ink max-w-[16ch]">
              Every scholarship has rules. We read them.
            </h2>
            <p className="text-ed-body text-graphite max-w-[38ch] md:pb-2">
              From scholarship discovery to a stronger application.
            </p>
          </div>
        </FadeUp>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          {CARDS.map((card, i) => (
            <FadeUp key={card.n} delay={i * 0.07}>
              <article
                className={`group flex flex-col justify-between rounded-ed p-8 md:p-12 min-h-[320px] md:min-h-[420px] transition-transform duration-300 hover:-translate-y-1 ${card.surface}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <card.icon
                    className={`w-7 h-7 ${i === 2 ? 'text-electric-lime' : 'text-off-black-ink'}`}
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <span className={`rounded-full border px-3 py-1 text-ed-eyebrow uppercase ${card.numberPill}`}>
                    {card.n}
                  </span>
                </div>

                <div className="mt-10">
                  <h3 className="text-ed-h2 text-off-black-ink mb-2">{card.title}</h3>
                  <p className={`text-ed-body max-w-[48ch] ${card.bodyClass ?? (i === 2 ? 'text-smoke' : 'text-graphite')}`}>
                    {card.body}
                  </p>

                  {i === 2 && (
                    <Link
                      to="/how-it-works"
                      className="mt-6 inline-flex w-max items-center gap-2 text-base font-medium text-electric-lime border-b border-transparent group-hover:border-electric-lime hover:text-pure-white transition-colors"
                    >
                      See how tracking works
                      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                    </Link>
                  )}
                </div>
              </article>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
