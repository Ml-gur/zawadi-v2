import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

const MATCH_ROWS = [
  {
    programme: 'MSc Renewable Energy',
    school: 'TU Munich · Full funding',
    score: 98,
    tags: ['Eligible', 'No IELTS'],
    deadline: 'Jun 12',
  },
  {
    programme: 'LLM Human Rights',
    school: 'University of Pretoria',
    score: 94,
    tags: ['Eligible'],
    deadline: 'Jul 03',
  },
  {
    programme: 'PhD Computer Science',
    school: 'KAIST · Full funding',
    score: 91,
    tags: ['Eligible'],
    deadline: 'Aug 21',
  },
];

function ScoreRing({ value }: { value: number }) {
  return (
    <span
      className="relative shrink-0 inline-flex w-9 h-9 rounded-full items-center justify-center"
      style={{ background: `conic-gradient(var(--color-electric-lime) ${value}%, var(--color-ash) 0)` }}
    >
      <span className="absolute inset-[3px] rounded-full bg-pure-white" />
      <span className="relative text-[9px] font-medium tabular-nums text-off-black-ink">{value}</span>
    </span>
  );
}

/** Decorative CSS laptop showing a stylised Zawadi match list. Not interactive. */
export default function ProductMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[540px]" aria-hidden="true">
      {/* Screen frame */}
      <div className="relative rounded-t-[20px] rounded-b-md border border-stone/70 bg-deep-charcoal p-2 sm:p-2.5">
        <span className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-stone/60" />

        <div className="aspect-[16/10] overflow-hidden rounded-md bg-pure-white mt-2 sm:mt-2.5">
          {/* Browser chrome bar */}
          <div className="flex items-center gap-1.5 px-3 h-7 border-b border-ash">
            <span className="w-2 h-2 rounded-full bg-ash" />
            <span className="w-2 h-2 rounded-full bg-ash" />
            <span className="w-2 h-2 rounded-full bg-ash" />
            <span className="ml-auto text-ed-caption uppercase text-off-black-ink truncate">zawadi.techsari.online</span>
          </div>

          <div className="p-3 sm:p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between pb-1">
              <p className="text-ed-caption uppercase text-graphite">Your matches</p>
              <p className="text-ed-caption text-off-black-ink">Ranked by fit</p>
            </div>

            {MATCH_ROWS.map(row => (
              <div
                key={row.programme}
                className="rounded-lg border border-ash bg-pure-white px-3 py-2.5 flex items-center gap-3"
              >
                <ScoreRing value={row.score} />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-off-black-ink truncate">{row.programme}</span>
                  <span className="block text-[11px] text-graphite truncate">{row.school}</span>
                </span>
                <span className="hidden sm:flex items-center gap-1.5 shrink-0">
                  {row.tags.includes('Eligible') && (
                    <span className="px-2 py-0.5 rounded-full bg-electric-lime text-[10px] font-medium text-off-black-ink">Eligible</span>
                  )}
                  {row.tags.includes('No IELTS') && (
                    <span className="px-2 py-0.5 rounded-full border border-ash text-[10px] text-graphite">No IELTS</span>
                  )}
                </span>
                <span className="shrink-0 text-[10px] font-medium text-off-black-ink border-l border-ash pl-2.5">
                  {row.deadline}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bezel */}
        <div className="h-4 sm:h-5 flex items-center justify-center">
          <span className="text-[8px] sm:text-[9px] font-medium tracking-[0.3em] text-smoke">TECHSARI</span>
        </div>
      </div>

      {/* Laptop base */}
      <div className="relative w-[108%] -left-[4%] h-3 sm:h-4 rounded-b-xl rounded-t-sm bg-[#e6ead8] border-t border-ash">
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-[18%] h-1.5 rounded-b-md bg-ash/70" />
      </div>
    </div>
  );
}

export function HeroCtaLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 text-base font-medium text-off-black-ink border-b border-off-black-ink pb-1 hover:text-graphite hover:border-graphite transition-colors"
    >
      {children}
      <ArrowRight className="w-4 h-4" />
    </Link>
  );
}
