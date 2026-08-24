import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { ScholarshipTeaser } from './browse-shared';
import { formatDeadline, isClosingSoon, truncateCountries } from './browse-shared';

export default function BrowseTable({ items }: { items: ScholarshipTeaser[] }) {
  return (
    <div className="rounded-ed border border-ash/70 bg-pure-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[860px]">
          <thead>
            <tr className="border-b border-ash bg-mist text-ed-caption uppercase text-graphite">
              <th className="px-6 py-4 font-medium">Scholarship</th>
              <th className="px-6 py-4 font-medium">Provider &amp; coverage</th>
              <th className="px-6 py-4 font-medium">Levels</th>
              <th className="px-6 py-4 font-medium">Deadline</th>
              <th className="px-6 py-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ash text-ed-body text-off-black-ink">
            {items.map(s => {
              const closing = isClosingSoon(s.deadline || null, s.urgency);
              const href = `/scholarships/browse/${s.slug || s.id}`;
              return (
                <tr key={s.id} className="group hover:bg-mist transition-colors">
                  <td className="px-6 py-5">
                    <Link
                      to={href}
                      className="inline-flex flex-wrap items-center gap-2 font-medium tracking-[-0.01em] hover:underline underline-offset-4 decoration-ash"
                    >
                      {s.name}
                      {closing ? (
                        <span className="rounded-full bg-electric-lime px-2.5 py-0.5 text-ed-caption uppercase text-off-black-ink">
                          Closing soon
                        </span>
                      ) : (
                        <span className="rounded-full border border-ash px-2.5 py-0.5 text-ed-caption uppercase text-graphite">Open</span>
                      )}
                    </Link>
                    {s.no_ielts && (
                      <span className="mt-1 block text-xs text-graphite">No IELTS accepted</span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <span className="block font-medium">{s.provider || '—'}</span>
                    <span className="block text-ed-body-sm text-graphite mt-0.5">{truncateCountries(s.countries || [])}</span>
                  </td>
                  <td className="px-6 py-5 text-sm text-graphite">
                    {s.degree_levels?.length ? s.degree_levels.join(', ') : '—'}
                  </td>
                  <td className="px-6 py-5 text-graphite whitespace-nowrap">{formatDeadline(s.deadline || null)}</td>
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
