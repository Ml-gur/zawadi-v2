import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Columns2 } from 'lucide-react';
import type { FC } from 'react';
import ShareButton from '../../components/ShareButton';
import type { ScholarshipTeaser } from './browse-shared';
import { formatDeadline, isClosingSoon, truncateCountries } from './browse-shared';
import { flagFor } from '../../lib/flags';

interface BrowseCardProps {
  s: ScholarshipTeaser;
  dark?: boolean;
  comparing?: boolean;
  onToggleCompare?: () => void;
}

function ComparePill({ comparing, onToggleCompare }: { comparing?: boolean; onToggleCompare?: () => void }) {
  if (!onToggleCompare) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggleCompare();
      }}
      aria-pressed={comparing}
      title={comparing ? 'Remove from comparison' : 'Add to comparison'}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 min-h-[40px] text-ed-body-sm font-medium transition-all cursor-pointer ${
        comparing
          ? 'bg-off-black-ink text-pure-white'
          : 'border border-ash text-graphite hover:text-off-black-ink hover:border-off-black-ink'
      }`}
    >
      <Columns2 className="w-3.5 h-3.5" aria-hidden />
      <span className="hidden sm:inline">{comparing ? 'Comparing' : 'Compare'}</span>
    </button>
  );
}

const BrowseCard: FC<BrowseCardProps> = ({ s, dark, comparing, onToggleCompare }) => {
  const closing = isClosingSoon(s.deadline || null, s.urgency);
  const href = `/scholarships/browse/${s.slug || s.id}`;
  const category = (s.degree_levels?.[0] || s.funding_type || 'Opportunity').toUpperCase();
  const flag = flagFor(s);

  if (dark) {
    return (
      <article className="group h-full min-h-[300px] rounded-ed bg-deep-charcoal p-7 md:p-8 flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1">
        <div>
          <div className="flex items-start justify-between gap-3 mb-4">
            <span className="text-ed-eyebrow uppercase text-smoke pt-1"><span aria-hidden className="mr-1.5 text-base leading-none">{flag}</span>{category}</span>
            {closing ? (
              <span className="shrink-0 rounded-full bg-electric-lime px-3 py-1 text-ed-caption uppercase text-off-black-ink">Closing soon</span>
            ) : (
              <span className="shrink-0 rounded-full border border-stone px-3 py-1 text-ed-caption uppercase text-smoke">Open</span>
            )}
          </div>
          <h2 className="text-ed-h2 text-pure-white">
            <Link to={href} className="hover:underline underline-offset-4 decoration-stone">{s.name}</Link>
          </h2>
          {s.provider && <p className="mt-1 text-ed-body-sm font-medium text-pure-white/80">{s.provider}</p>}
          {s.description && <p className="mt-2.5 text-ed-body-sm text-smoke line-clamp-3">{s.description}</p>}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {s.no_ielts && <span className="px-2.5 py-0.5 rounded-full border border-stone text-xs font-medium text-smoke">No IELTS</span>}
            {s.targets_financial_need && <span className="px-2.5 py-0.5 rounded-full border border-stone text-xs font-medium text-smoke">Financial need</span>}
            {s.is_intra_african && <span className="px-2.5 py-0.5 rounded-full border border-stone text-xs font-medium text-smoke">Intra-African</span>}
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-stone flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-ed-body-sm text-smoke min-w-0">
            <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden />
            <span className="truncate">Closes {formatDeadline(s.deadline || null)}</span>
          </span>
          <span className="flex items-center gap-2 shrink-0">
            <ComparePill comparing={comparing} onToggleCompare={onToggleCompare} />
            <ShareButton url={href} title={s.name} iconOnly tone="dark" className="bg-deep-charcoal text-smoke border border-stone hover:text-pure-white" />
            <Link to={href} className="inline-flex items-center gap-1.5 text-base font-medium text-electric-lime hover:text-pure-white transition-colors">
              View<ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </Link>
          </span>
        </div>
      </article>
    );
  }

  return (
    <article className="group h-full min-h-[300px] rounded-ed border border-ash/70 bg-pure-white p-7 md:p-8 flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1">
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <span className="text-ed-eyebrow uppercase text-graphite pt-1"><span aria-hidden className="mr-1.5 text-base leading-none">{flag}</span>{category}</span>
          {closing ? (
            <span className="shrink-0 rounded-full bg-electric-lime px-3 py-1 text-ed-caption uppercase text-off-black-ink">
              Closing soon
            </span>
          ) : (
            <span className="shrink-0 rounded-full border border-ash px-3 py-1 text-ed-caption uppercase text-graphite">
              Open
            </span>
          )}
        </div>

        <h2 className="text-ed-h2 text-off-black-ink">
          <Link to={href} className="hover:underline underline-offset-4 decoration-ash">
            {s.name}
          </Link>
        </h2>

        {s.provider && (
          <p className="mt-1 text-ed-body-sm font-medium text-off-black-ink/80">{s.provider}</p>
        )}

        {s.description && (
          <p className="mt-2.5 text-ed-body-sm text-graphite line-clamp-3">{s.description}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-1.5">
          {s.no_ielts && (
            <span className="px-2.5 py-0.5 rounded-full border border-ash text-xs font-medium text-graphite">No IELTS</span>
          )}
          {s.targets_financial_need && (
            <span className="px-2.5 py-0.5 rounded-full border border-ash text-xs font-medium text-graphite">Financial need</span>
          )}
          {s.is_intra_african && (
            <span className="px-2.5 py-0.5 rounded-full border border-ash text-xs font-medium text-graphite">Intra-African</span>
          )}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-ash flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-ed-body-sm text-graphite min-w-0">
          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            Closes {formatDeadline(s.deadline || null)}
            {s.countries?.length > 0 && <span className="hidden sm:inline"> · {truncateCountries(s.countries)}</span>}
          </span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <ComparePill comparing={comparing} onToggleCompare={onToggleCompare} />
          <ShareButton url={href} title={s.name} iconOnly tone="light" />
          <Link
            to={href}
            className="inline-flex items-center gap-1.5 text-base font-medium text-off-black-ink hover:text-graphite transition-colors"
          >
            View
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </Link>
        </span>
      </div>
    </article>
  );
};

export default BrowseCard;
