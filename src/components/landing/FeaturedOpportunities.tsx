import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Columns2 } from 'lucide-react';
import type { Scholarship } from '../../types';
import { FadeUp } from './primitives';
import { flagFor } from '../../lib/flags';

interface FeaturedOpportunitiesProps {
  scholarships: Scholarship[];
  loading: boolean;
  compareIds: Set<string>;
  onToggleCompare: (id: string) => void;
  onOpenCompare: () => void;
}

function daysUntil(deadline: string): number | null {
  if (!deadline) return null;
  const t = Date.parse(deadline);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

function DueChip({ scholarship }: { scholarship: Scholarship }) {
  const d = daysUntil(scholarship.deadline);
  let label = scholarship.deadline;
  let tone = 'text-stone';

  if (d !== null) {
    if (d <= 0) label = 'Closing today';
    else label = `Due in ${d} day${d === 1 ? '' : 's'}`;
    tone = d <= 7 ? 'text-ed-error font-medium' : d <= 21 ? 'text-off-black-ink font-medium' : 'text-stone';
  }

  return (
    <span className={`flex items-center gap-1 text-ed-body-sm shrink-0 ${tone}`}>
      <Clock className="w-3.5 h-3.5" aria-hidden />
      {label}
    </span>
  );
}

function OpportunityCard({
  s,
  accent,
  comparing,
  onToggleCompare,
}: {
  s: Scholarship;
  accent: boolean;
  comparing: boolean;
  onToggleCompare: (id: string) => void;
}) {
  const href = `/scholarships/browse/${s.slug || s.id}`;
  const category = (s.funding_type || s.degree_levels?.[0] || 'Opportunity').toUpperCase();
  const flag = flagFor(s);

  return (
    <article
      className={`group relative h-full min-h-[300px] rounded-ed p-7 md:p-8 flex flex-col justify-between transition-transform duration-300 hover:-translate-y-2 ${
        accent ? 'bg-electric-lime' : 'bg-pure-white border border-ash'
      }`}
    >
      {/* Stretched link keeps the whole card clickable without nesting buttons inside an anchor */}
      <Link
        to={href}
        aria-label={`View details: ${s.name}`}
        className="absolute inset-0 rounded-ed focus-visible:outline-2 focus-visible:outline-surface-tint focus-visible:-outline-offset-4"
      />

      <div className="relative">
        <div className="flex items-center justify-between gap-3 mb-4">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-ed-eyebrow uppercase ${
              accent ? 'border-off-black-ink text-off-black-ink' : 'border-off-black-ink/70 text-off-black-ink'
            }`}
          >
            <span aria-hidden className="text-sm leading-none">{flag}</span>
            {category}
          </span>
          <DueChip scholarship={s} />
        </div>

        <h3 className="text-ed-sub tracking-[-0.01em] text-off-black-ink line-clamp-2">{s.name}</h3>

        {s.description && (
          <p className={`mt-2.5 text-ed-body-sm line-clamp-3 ${accent ? 'text-on-lime' : 'text-graphite'}`}>
            {s.description}
          </p>
        )}
      </div>

      <div
        className={`relative mt-6 pt-4 border-t flex items-center justify-between gap-3 ${
          accent ? 'border-off-black-ink/20' : 'border-ash'
        }`}
      >
        <button
          onClick={() => onToggleCompare(s.id)}
          aria-pressed={comparing}
          title={comparing ? 'Remove from comparison' : 'Add to comparison'}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 min-h-[40px] text-ed-body-sm font-medium active:scale-[0.98] transition-all cursor-pointer ${
            comparing
              ? 'bg-off-black-ink text-pure-white'
              : 'border border-off-black-ink/60 text-off-black-ink hover:bg-off-black-ink hover:text-pure-white'
          }`}
        >
          <Columns2 className="w-3.5 h-3.5" aria-hidden />
          {comparing ? 'Comparing' : 'Compare'}
        </button>

        <span className="flex items-center gap-1.5 text-base font-medium text-off-black-ink pointer-events-none">
          View details
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1.5" aria-hidden />
        </span>
      </div>
    </article>
  );
}

export default function FeaturedOpportunities({
  scholarships,
  loading,
  compareIds,
  onToggleCompare,
  onOpenCompare,
}: FeaturedOpportunitiesProps) {
  const today = new Date().toISOString().split('T')[0];
  const openScholarships = (scholarships || []).filter(s => {
    if (!s) return false;
    if (s.published === false) return false;
    if (!s.deadline) return true;
    return s.deadline >= today;
  });
  const cards = openScholarships.slice(0, 3);
  const compareCount = compareIds.size;

  const renderCard = (s: Scholarship, i: number) => (
    <OpportunityCard
      s={s}
      accent={i === 1}
      comparing={compareIds.has(s.id)}
      onToggleCompare={onToggleCompare}
    />
  );

  return (
    <section id="featured" className="bg-parchment border-b border-ash">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-20 md:py-32">
        <FadeUp>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b border-ash pb-10 mb-10 md:mb-14">
            <h2 className="text-ed-h1-sm md:text-ed-h1 text-off-black-ink max-w-[18ch]">
              Featured opportunities.
            </h2>
            <button
              onClick={onOpenCompare}
              className="inline-flex shrink-0 items-center gap-2 self-start md:self-auto rounded-full border border-off-black-ink px-6 min-h-[48px] text-ed-body-sm font-medium text-off-black-ink hover:bg-off-black-ink hover:text-pure-white active:scale-[0.98] transition-all cursor-pointer"
              aria-label={`Open comparison drawer (${compareCount} selected)`}
            >
              <Columns2 className="w-4 h-4" aria-hidden />
              Compare
              <span
                className={`inline-flex w-5 h-5 rounded-full text-[10px] font-medium items-center justify-center ${
                  compareCount > 0 ? 'bg-electric-lime text-off-black-ink' : 'bg-ash/60 text-graphite'
                }`}
                aria-hidden
              >
                {compareCount}
              </span>
            </button>
          </div>
        </FadeUp>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" aria-hidden>
            {[0, 1, 2].map(i => (
              <div key={i} className="bg-pure-white border border-ash rounded-ed p-8 min-h-[420px] md:min-h-[300px] animate-pulse">
                <div className="h-5 w-24 bg-ash/60 rounded-full mb-6" />
                <div className="h-5 w-3/4 bg-ash/50 rounded mb-3" />
                <div className="h-3 w-1/2 bg-ash/40 rounded" />
              </div>
            ))}
          </div>
        ) : cards.length === 0 ? (
          <FadeUp>
            <div className="bg-pure-white border border-ash rounded-ed py-14 px-6 text-center">
              <p className="text-ed-sub text-off-black-ink">No featured listings right now</p>
              <p className="mt-2 text-ed-body text-graphite">
                New opportunities are added daily — check back soon.
              </p>
            </div>
          </FadeUp>
        ) : (
          <>
            <div className="hidden md:grid grid-cols-3 gap-6">
              {cards.map((s, i) => (
                <FadeUp key={s.id} delay={i * 0.08}>
                  {renderCard(s, i)}
                </FadeUp>
              ))}
            </div>
            <div className="md:hidden flex flex-col gap-5">
              {cards.map((s, i) => (
                <FadeUp key={s.id} delay={i * 0.08}>
                  {renderCard(s, i)}
                </FadeUp>
              ))}
            </div>
          </>
        )}

        <FadeUp delay={0.15}>
          <div className="flex justify-center mt-12 md:mt-16">
            <Link
              to="/scholarships/browse"
              className="inline-flex items-center justify-center rounded-full border border-off-black-ink px-8 min-h-[52px] text-base font-medium text-off-black-ink hover:bg-off-black-ink hover:text-pure-white active:scale-[0.98] transition-all"
            >
              View all opportunities
            </Link>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
