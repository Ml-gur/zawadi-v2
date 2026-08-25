import { Link } from 'react-router-dom';

export interface Crumb {
  name: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
}

const SITE_URL = 'https://www.techsari.online';

/** Visible breadcrumb trail + BreadcrumbList JSON-LD for search engines. */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const trail: Crumb[] = [{ name: 'Home', path: '/' }, ...items];

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      ...(c.path ? { item: `${SITE_URL}${c.path}` } : {}),
    })),
  };

  return (
    <>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex items-center gap-2 text-ed-body-sm text-graphite whitespace-nowrap">
          {trail.map((c, i) => {
            const last = i === trail.length - 1;
            return (
              <li key={`${c.name}-${i}`} className="flex items-center gap-2 min-w-0">
                {last ? (
                  <span aria-current="page" className="text-off-black-ink font-medium truncate max-w-[320px] sm:max-w-[480px]">{c.name}</span>
                ) : c.path ? (
                  <Link to={c.path} className="hover:text-off-black-ink transition-colors shrink-0">{c.name}</Link>
                ) : (
                  <span className="shrink-0">{c.name}</span>
                )}
                {!last && <span aria-hidden className="shrink-0">/</span>}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
