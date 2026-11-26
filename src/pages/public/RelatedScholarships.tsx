import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePublicScholarships } from '../../lib/usePublicScholarships';
import { HUBS, hubPath, isOpenToAllAfricans, type HubScholarship } from '../../lib/scholarship-hubs';
import { formatDeadline } from './browse-shared';

interface Current extends HubScholarship {
  id: string;
  slug?: string;
}

/**
 * Internal links from a detail page to similar awards and to the landing pages
 * it belongs to. Without them each detail page was a dead end that Google
 * could only discover through the sitemap.
 */
export default function RelatedScholarships({ current }: { current: Current }) {
  const { items, loading } = usePublicScholarships();

  const similar = useMemo(() => {
    const levels = new Set(current.degree_levels || []);
    return items
      .filter(s => s.id !== current.id && (s.degree_levels || []).some(l => levels.has(l)))
      .map(s => ({ s, score: (s.funding_type === current.funding_type ? 2 : 0) + (s.no_ielts && current.no_ielts ? 1 : 0) }))
      .sort((a, b) => b.score - a.score) // stable: keeps the API's deadline order within a score
      .slice(0, 6)
      .map(x => x.s);
  }, [items, current]);

  const hubs = useMemo(
    () => HUBS.filter(h => (h.kind === 'country'
      // Country lists only when the award is reserved for that country — every
      // pan-African award would otherwise link to all eight
      ? !isOpenToAllAfricans(current) && (current.countries || []).includes(h.country!)
      : h.matches(current))),
    [current],
  );

  if (loading || (similar.length === 0 && hubs.length === 0)) return null;

  return (
    <section aria-labelledby="related-heading" className="border-t border-ash pt-10 flex flex-col gap-8">
      {similar.length > 0 && (
        <div>
          <h2 id="related-heading" className="font-headline text-2xl font-medium text-deep-charcoal mb-5">Similar scholarships</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map(s => (
              <li key={s.id}>
                <Link to={`/scholarships/browse/${s.slug || s.id}`} className="block h-full rounded-ed border border-ash bg-pure-white p-5 hover:border-off-black-ink transition-colors">
                  <span className="block font-medium text-off-black-ink">{s.name}</span>
                  <span className="mt-1 block text-ed-body-sm text-graphite">
                    {[s.funding_type === 'Full' ? 'Fully funded' : s.funding_type, (s.degree_levels || []).join(', '), s.deadline ? `Deadline ${formatDeadline(s.deadline)}` : ''].filter(Boolean).join(' · ')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {hubs.length > 0 && (
        <nav aria-label="Scholarship lists this award appears in">
          <p className="text-ed-caption uppercase text-graphite mb-3">Listed in</p>
          <ul className="flex flex-wrap gap-2">
            {hubs.map(h => (
              <li key={h.slug}>
                <Link to={hubPath(h)} className="px-4 py-1.5 rounded-full text-sm font-medium border border-ash text-graphite hover:border-off-black-ink hover:text-off-black-ink transition-colors">
                  {h.kind === 'country' ? `Scholarships for ${h.demonym} students` : h.subject}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </section>
  );
}
