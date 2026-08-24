import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { FC } from 'react';
import type { ScholarshipTeaser } from './browse-shared';
import { formatDeadline, deadlineBadge, eligibilityInfo } from './browse-shared';
import { flagFor } from '../../lib/flags';

const Badge: FC<{ s: ScholarshipTeaser }> = ({ s }) => {
  const badge = deadlineBadge(s.deadline || null, s.urgency, s.opens_at);
  const tone =
    badge.tone === 'urgent' ? 'bg-electric-lime text-off-black-ink'
    : badge.tone === 'opens' ? 'border border-surface-tint text-primary'
    : 'border border-ash text-graphite';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-ed-caption uppercase whitespace-nowrap ${tone}`}>
      {badge.label}
    </span>
  );
};

export default function BrowseTable({ items }: { items: ScholarshipTeaser[] }) {
  return (
    <div className="rounded-ed border border-ash/70 bg-pure-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[860px]">
          <thead>
            <tr className="border-b border-ash bg-mist text-ed-caption uppercase text-graphite">
              <th className="px-6 py-4 font-medium">Scholarship</th>
              <th className="px-6 py-4 font-medium">Open to</th>
              <th className="px-6 py-4 font-medium">Levels</th>
              <th className="px-6 py-4 font-medium">Deadline</th>
              <th className="px-6 py-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ash text-ed-body text-off-black-ink">
            {items.map(s => {
              const badge = deadlineBadge(s.deadline || null, s.urgency, s.opens_at);
              const href = `/scholarships/browse/${s.slug || s.id}`;
              const eligibility = eligibilityInfo(s.countries);
              return (
                <tr key={s.id} className="group hover:bg-mist transition-colors">
                  <td className="px-6 py-5">
                    <Link
                      to={href}
                      className="inline-flex flex-wrap items-center gap-2 font-medium tracking-[-0.01em] hover:underline underline-offset-4 decoration-ash"
                    >
                      <span aria-hidden className="text-base leading-none">{flagFor(s)}</span>
                      {s.name}
                    </Link>
                    {s.no_ielts && (
                      <span className="mt-1 block text-xs text-graphite">No IELTS accepted</span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <span className="block font-medium">{s.provider || '—'}</span>
                    <span className="block text-ed-body-sm text-graphite mt-0.5">{eligibility.label}</span>
                  </td>
                  <td className="px-6 py-5 text-sm text-graphite">
                    {s.degree_levels?.length ? s.degree_levels.join(', ') : '—'}
                  </td>
                  <td className="px-6 py-5 text-graphite whitespace-nowrap">
                    <span className="block"><Badge s={s} /></span>
                    <span className="mt-1 block text-xs">{badge.tone === 'rolling' ? 'No fixed date' : formatDeadline(s.deadline || null)}</span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <Link
                      to={href}
                      className="inline-flex items-center gap-1.5 font-medium text-off-black-ink group-hover:text-graphite transition-colors"
                    >
                      View
                      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
