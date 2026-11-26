import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../../components/SEO';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import BrowseTable from './BrowseTable';
import { formatDeadline, type ScholarshipTeaser } from './browse-shared';
import { usePublicScholarships } from '../../lib/usePublicScholarships';
import { HUBS, hubCounts, hubDescription, hubPath, hubTitle, intakeYear, isOpenToAllAfricans, type Hub } from '../../lib/scholarship-hubs';

const SITE_URL = 'https://www.techsari.online';
const PAN_AFRICAN_PREVIEW = 12;
/** Country pages with fewer country-only awards than this are noindexed. */
const MIN_COUNTRY_ONLY = 5;

const scholarshipUrl = (s: ScholarshipTeaser) => `${SITE_URL}/scholarships/browse/${s.slug || s.id}`;

function names(list: ScholarshipTeaser[], n = 3): string {
  const picked = list.slice(0, n).map(s => s.name);
  if (picked.length <= 1) return picked.join('');
  return `${picked.slice(0, -1).join(', ')} and ${picked[picked.length - 1]}`;
}

/** Questions answered from the live listings, so every answer stays true. */
function buildQuestions(hub: Hub, all: ScholarshipTeaser[], year: number) {
  const full = all.filter(s => s.funding_type === 'Full');
  const noIelts = all.filter(s => s.no_ielts);
  const dated = all.filter(s => s.deadline && !Number.isNaN(Date.parse(s.deadline)));
  const who = hub.kind === 'country' ? `${hub.demonym} students` : 'African students';
  const qs: Array<{ q: string; a: string }> = [];

  qs.push({
    q: `How many ${hub.kind === 'level' ? hub.label.replace('Masters', "master's") + ' ' : ''}scholarships are open to ${who} for ${year}?`,
    a: `${all.length} scholarship${all.length === 1 ? ' is' : 's are'} open right now. ${full.length} of them ${full.length === 1 ? 'is' : 'are'} fully funded.`,
  });
  if (hub.slug !== 'fully-funded' && full.length > 0) {
    qs.push({ q: `Are there fully funded scholarships for ${who}?`, a: `Yes. ${full.length} listings cover full tuition, including ${names(full)}.` });
  }
  if (hub.slug !== 'no-ielts') {
    qs.push({
      q: `Can ${who} get a scholarship without IELTS?`,
      a: noIelts.length > 0
        ? `Yes. ${noIelts.length} of these scholarships accept an English-medium (MOI) letter instead of IELTS, including ${names(noIelts, 2)}.`
        : 'None of the scholarships currently open in this list waive IELTS. Check the no-IELTS list for awards that do.',
    });
  }
  if (dated.length > 0) {
    qs.push({ q: `Which deadline is next?`, a: `${dated[0].name} closes on ${formatDeadline(dated[0].deadline)}. Listings are sorted by deadline, soonest first.` });
  }
  return qs;
}

export default function ScholarshipHubPage({ hub }: { hub: Hub }) {
  const { items, loading, error } = usePublicScholarships();
  const year = intakeYear();

  const all = useMemo(() => items.filter(hub.matches), [items, hub]);
  // Country hubs: awards reserved for that country first, then pan-African ones
  const countryOnly = useMemo(
    () => (hub.kind === 'country' ? all.filter(s => !isOpenToAllAfricans(s)) : []),
    [all, hub],
  );
  const rest = useMemo(
    () => (hub.kind === 'country' ? all.filter(s => isOpenToAllAfricans(s)) : all),
    [all, hub],
  );
  // On country pages the pan-African block is the same on every country, so
  // show only the soonest deadlines and link to the full directory. The
  // country-only awards are what make each page worth indexing.
  const restShown = hub.kind === 'country' ? rest.slice(0, PAN_AFRICAN_PREVIEW) : rest;
  // Thin, empty or failed pages stay out of the index (doorway-page risk)
  const noindex = !loading && (error || all.length === 0 || (hub.kind === 'country' && countryOnly.length < MIN_COUNTRY_ONLY));
  // Live counts in the title/description (prerendered, so crawlers see them)
  const counts = loading || error ? undefined : hubCounts(hub, all);
  const questions = useMemo(() => buildQuestions(hub, all, year), [hub, all, year]);

  const listed = [...countryOnly, ...restShown].slice(0, 50);
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${hub.subject} ${year}`,
    numberOfItems: listed.length,
    itemListElement: listed.map((s, i) => ({ '@type': 'ListItem', position: i + 1, url: scholarshipUrl(s), name: s.name })),
  };

  const related = HUBS.filter(h => h.slug !== hub.slug);

  return (
    <div className="min-h-[100dvh] bg-parchment text-off-black-ink flex flex-col">
      <SEO title={hubTitle(hub, year, counts)} description={hubDescription(hub, year, counts)} path={hubPath(hub)} schema={listed.length ? itemList : undefined} noindex={noindex} />

      <main className="flex-grow w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-14 md:py-20">
        <Breadcrumbs items={[{ name: 'Scholarships', path: '/scholarships/browse' }, { name: hub.subject }]} />

        <header className="mb-10 md:mb-12">
          <p className="text-ed-caption uppercase text-graphite mb-5">{year} intake · updated daily</p>
          <h1 className="text-ed-h1-sm md:text-ed-h1 text-off-black-ink max-w-[24ch]">{hub.subject} {year}</h1>
          <p className="mt-5 text-ed-body text-graphite max-w-[68ch]">{hub.lede}</p>
          {!loading && (
            <p className="mt-4 text-ed-body-sm text-off-black-ink" role="status">
              <strong>{all.length}</strong> open now
              {' · '}<strong>{all.filter(s => s.funding_type === 'Full').length}</strong> fully funded
              {' · '}<strong>{all.filter(s => s.no_ielts).length}</strong> without IELTS
            </p>
          )}
        </header>

        {loading ? (
          <p className="py-16 text-center text-ed-body-sm text-graphite">Loading scholarships…</p>
        ) : error ? (
          <div className="rounded-ed border border-ash/70 bg-pure-white py-16 px-6 text-center" role="alert">
            <p className="text-ed-sub">We couldn't load scholarships just now.</p>
            <button onClick={() => window.location.reload()} className="mt-4 inline-flex underline underline-offset-4 cursor-pointer">Try again</button>
          </div>
        ) : all.length === 0 ? (
          <div className="rounded-ed border border-ash/70 bg-pure-white py-16 px-6 text-center">
            <p className="text-ed-sub">No scholarships in this list are open right now.</p>
            <Link to="/scholarships/browse" className="mt-4 inline-flex underline underline-offset-4">See every open scholarship</Link>
          </div>
        ) : (
          <>
            {countryOnly.length > 0 && (
              <section aria-labelledby="country-only" className="mb-12">
                <h2 id="country-only" className="text-ed-sub mb-5">Limited to selected countries, {hub.country} included ({countryOnly.length})</h2>
                <BrowseTable items={countryOnly} />
              </section>
            )}
            {rest.length > 0 && (
              <section aria-labelledby="open-list">
                <h2 id="open-list" className="text-ed-sub mb-5">
                  {hub.kind === 'country' ? `Open to all African students, ${hub.country} included (${rest.length})` : `All open listings (${rest.length})`}
                </h2>
                <BrowseTable items={restShown} />
                {restShown.length < rest.length && (
                  <p className="mt-5 text-ed-body">
                    Showing the {restShown.length} soonest deadlines.{' '}
                    <Link to="/scholarships/browse" className="underline underline-offset-4">See all {rest.length} pan-African scholarships</Link>
                  </p>
                )}
              </section>
            )}
          </>
        )}

        {!loading && !error && all.length > 0 && (
          <section aria-labelledby="hub-questions" className="mt-16 max-w-[72ch]">
            <h2 id="hub-questions" className="text-ed-sub mb-6">Common questions</h2>
            <dl className="flex flex-col gap-6">
              {questions.map(({ q, a }) => (
                <div key={q}>
                  <dt className="text-ed-body font-medium text-off-black-ink">{q}</dt>
                  <dd className="mt-1 text-ed-body text-graphite">{a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <nav aria-labelledby="more-hubs" className="mt-16 rounded-ed border border-ash/70 bg-pure-white p-8">
          <h2 id="more-hubs" className="text-ed-sub mb-5">More scholarship lists</h2>
          <ul className="flex flex-wrap gap-2">
            {related.map(h => (
              <li key={h.slug}>
                <Link to={hubPath(h)} className="px-4 py-1.5 rounded-full text-sm font-medium border border-ash text-graphite hover:border-off-black-ink hover:text-off-black-ink transition-colors">
                  {h.kind === 'country' ? `${h.demonym} students` : h.subject.replace(' for African Students', '')}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/scholarships/browse" className="px-4 py-1.5 rounded-full text-sm font-medium border border-off-black-ink text-off-black-ink">All scholarships</Link>
            </li>
          </ul>
        </nav>
      </main>
    </div>
  );
}
