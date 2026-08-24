import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { FC } from 'react';
import type { Scholarship, ApplicationTracker } from '../types';
import { formatDeadline, deadlineBadge } from '../pages/public/browse-shared';
import EligibilityList from './EligibilityList';
import { flagFor } from '../lib/flags';

const STAGES = [
  'Saved', 'Drafting', 'Preparing Documents', 'Essay Drafting',
  'Ready to Submit', 'Applied', 'Interview', 'Awarded', 'Rejected',
] as const;

const STAGE_TONE: Record<string, string> = {
  Saved: 'bg-parchment text-graphite border-ash',
  Drafting: 'bg-electric-lime text-off-black-ink border-transparent',
  'Preparing Documents': 'bg-electric-lime text-off-black-ink border-transparent',
  'Essay Drafting': 'bg-electric-lime text-off-black-ink border-transparent',
  'Ready to Submit': 'bg-off-black-ink text-pure-white border-transparent',
  Applied: 'bg-off-black-ink text-pure-white border-transparent',
  Interview: 'bg-deep-charcoal text-pure-white border-transparent',
  Awarded: 'bg-electric-lime text-off-black-ink border-transparent',
  Rejected: 'bg-error/10 text-error border-error/30',
};

interface TrackerTableProps {
  items: Scholarship[];
  applications: ApplicationTracker[];
  onTrackScholarship: (scholarshipId: string, status: string, notes?: string, priority?: string) => void;
}

const Badge: FC<{ s: Scholarship }> = ({ s }) => {
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

/** Table view for the logged-in finder — every row carries its application stage. */
export default function TrackerTable({ items, applications, onTrackScholarship }: TrackerTableProps) {
  const byId = new Map(applications.map(a => [a.scholarship_id, a]));

  return (
    <div className="rounded-ed border border-ash/70 bg-pure-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1020px]">
          <thead>
            <tr className="border-b border-ash bg-mist text-ed-caption uppercase text-graphite">
              <th className="px-6 py-4 font-medium">Scholarship</th>
              <th className="px-6 py-4 font-medium">Open to</th>
              <th className="px-6 py-4 font-medium">Amount</th>
              <th className="px-6 py-4 font-medium">Deadline</th>
              <th className="px-6 py-4 font-medium">My stage</th>
              <th className="px-6 py-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ash text-ed-body text-off-black-ink">
            {items.map(s => {
              const app = byId.get(s.id);
              const stage = app && app.status !== 'not_started' ? app.status : '';
              const href = `/scholarships/browse/${s.slug || s.id}`;
              return (
                <tr key={s.id} className="group align-top hover:bg-mist/60 transition-colors">
                  <td className="px-6 py-5 max-w-[320px]">
                    <Link
                      to={href}
                      className="inline-flex flex-wrap items-center gap-2 font-medium tracking-[-0.01em] hover:underline underline-offset-4 decoration-ash"
                    >
                      <span aria-hidden className="text-base leading-none">{flagFor(s)}</span>
                      <span className="truncate max-w-[260px]">{s.name}</span>
                    </Link>
                    <span className="mt-1 block text-ed-body-sm text-graphite">{s.provider || '—'}</span>
                    {s.no_ielts && <span className="mt-1 inline-block rounded-full border border-ash px-2 py-0.5 text-xs text-graphite">No IELTS</span>}
                  </td>
                  <td className="px-6 py-5 text-ed-body-sm text-graphite max-w-[220px]">
                    <EligibilityList countries={(s.countries || s.country) as string[]} max={2} />
                  </td>
                  <td className="px-6 py-5 text-ed-body-sm max-w-[180px]">{s.amount || '—'}</td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="block text-ed-body-sm"><Badge s={s} /></span>
                    <span className="mt-1 block text-xs text-graphite">{formatDeadline(s.deadline || null)}</span>
                  </td>
                  <td className="px-6 py-5">
                    <label className="sr-only" htmlFor={`stage-${s.id}`}>Application stage for {s.name}</label>
                    <select
                      id={`stage-${s.id}`}
                      value={stage}
                      onChange={e => onTrackScholarship(s.id, e.target.value || 'not_started')}
                      className={`appearance-none rounded-full px-4 min-h-[40px] text-ed-body-sm font-medium border cursor-pointer focus:outline-none focus:border-graphite ${STAGE_TONE[stage] || 'bg-pure-white text-graphite border-ash'}`}
                    >
                      <option value="">Not tracking</option>
                      {STAGES.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
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
