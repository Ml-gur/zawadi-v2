// Programmatic landing pages ("hubs") for the queries African students search:
// "scholarships for Kenyan students", "masters scholarships for Africans",
// "fully funded scholarships", "no IELTS scholarships".
//
// Dependency-free on purpose: imported by the React app AND by middleware.ts
// (Vercel Edge), so crawlers and users get the same titles and descriptions.
// api/sitemap.js keeps its own copy of the paths (HUB_PATHS) — update both together.

export interface HubScholarship {
  countries?: string[] | null;
  degree_levels?: string[] | null;
  funding_type?: string | null;
  no_ielts?: boolean | null;
}

export type HubKind = 'country' | 'level' | 'feature';

export interface Hub {
  slug: string;
  kind: HubKind;
  /** Short label for link lists, e.g. "Kenya", "Masters". */
  label: string;
  /** Builds the H1 / title subject, e.g. "Scholarships for Kenyan Students". */
  subject: string;
  /** Country name as stored in scholarships.countries (country hubs only). */
  country?: string;
  /** e.g. "Kenyan" (country hubs only). */
  demonym?: string;
  /** One factual sentence that is specific to this hub. */
  lede: string;
  matches: (s: HubScholarship) => boolean;
}

/** Listings that accept applicants from every African country. */
export const OPEN_TO_ALL_AFRICANS = new Set(['Pan-African', 'All African Countries', 'Global']);

export function isOpenToAllAfricans(s: HubScholarship): boolean {
  const c = s.countries || [];
  return c.length === 0 || c.some(x => OPEN_TO_ALL_AFRICANS.has(x));
}

/** The intake students are applying for now: from September, next year's intake. */
export function intakeYear(now: Date = new Date()): number {
  return now.getUTCMonth() >= 8 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
}

const hasLevel = (s: HubScholarship, levels: string[]) =>
  (s.degree_levels || []).some(l => levels.includes(l));

const COUNTRIES: Array<[slug: string, name: string, demonym: string]> = [
  ['kenya', 'Kenya', 'Kenyan'],
  ['nigeria', 'Nigeria', 'Nigerian'],
  ['ghana', 'Ghana', 'Ghanaian'],
  ['south-africa', 'South Africa', 'South African'],
  ['uganda', 'Uganda', 'Ugandan'],
  ['tanzania', 'Tanzania', 'Tanzanian'],
  ['rwanda', 'Rwanda', 'Rwandan'],
  ['zambia', 'Zambia', 'Zambian'],
];

export const HUBS: Hub[] = [
  {
    slug: 'fully-funded',
    kind: 'feature',
    label: 'Fully funded',
    subject: 'Fully Funded Scholarships for African Students',
    lede: 'Every scholarship here covers tuition in full, and most add a living stipend, flights or health cover. The amount column shows exactly what each award pays.',
    matches: s => s.funding_type === 'Full',
  },
  {
    slug: 'no-ielts',
    kind: 'feature',
    label: 'No IELTS',
    subject: 'Scholarships Without IELTS for African Students',
    lede: 'These scholarships accept a Medium of Instruction (MOI) letter or another proof of English instead of an IELTS or TOEFL score, which can save you the test fee and months of waiting.',
    matches: s => Boolean(s.no_ielts),
  },
  {
    slug: 'masters',
    kind: 'level',
    label: 'Masters',
    subject: "Master's Scholarships for African Students",
    lede: "Funded master's programmes open to African applicants, from one-year taught MSc and MA courses to two-year research degrees.",
    matches: s => hasLevel(s, ['Masters']),
  },
  {
    slug: 'phd',
    kind: 'level',
    label: 'PhD',
    subject: 'PhD Scholarships for African Students',
    lede: 'Doctoral and postdoctoral funding open to African researchers, including studentships that pay a monthly stipend on top of fees.',
    matches: s => hasLevel(s, ['PhD', 'Postdoc']),
  },
  {
    slug: 'undergraduate',
    kind: 'level',
    label: 'Undergraduate',
    subject: 'Undergraduate Scholarships for African Students',
    lede: "Bachelor's degree scholarships open to African school leavers and first-year applicants, at African universities and abroad.",
    matches: s => hasLevel(s, ['Undergraduate', 'Bachelors', 'Honours']),
  },
  ...COUNTRIES.map(([slug, name, demonym]): Hub => ({
    slug,
    kind: 'country',
    label: name,
    country: name,
    demonym,
    subject: `Scholarships for ${demonym} Students`,
    lede: `Scholarships that ${demonym} citizens can apply for: awards reserved for applicants from ${name}, followed by pan-African programmes that accept students from every African country, ${name} included.`,
    matches: s => (s.countries || []).includes(name) || isOpenToAllAfricans(s),
  })),
];

/**
 * Typed URLs: /scholarships/country/kenya, /scholarships/level/masters,
 * /scholarships/fully-funded. The country/level prefix keeps a hub from ever
 * colliding with a legacy /scholarships/<scholarship-slug> link.
 */
export function hubPath(hub: Hub): string {
  if (hub.kind === 'country') return `/scholarships/country/${hub.slug}`;
  if (hub.kind === 'level') return `/scholarships/level/${hub.slug}`;
  return `/scholarships/${hub.slug}`;
}

const HUB_BY_PATH: Record<string, Hub> = Object.fromEntries(HUBS.map(h => [hubPath(h), h]));

/** Hub for a pathname (trailing slash and case tolerated), or undefined. */
export function hubFromPath(pathname: string): Hub | undefined {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return HUB_BY_PATH[p.toLowerCase()];
}

/** <title>: keyword first, year for freshness, brand last; ~60 chars or less. */
export function hubTitle(hub: Hub, year = intakeYear()): string {
  return `${hub.subject} ${year} | Techsari`;
}

export function hubDescription(hub: Hub, year = intakeYear()): string {
  if (hub.kind === 'country') {
    return `Open ${year} scholarships for ${hub.demonym} students, with deadlines, funding and eligibility checked. Awards only for applicants from ${hub.country} are listed first.`;
  }
  const what = hub.label === 'PhD' ? 'PhD' : hub.label === 'No IELTS' ? 'no-IELTS' : hub.label.toLowerCase();
  return `Verified ${what} scholarships for African students for the ${year} intake. See deadlines, funding, IELTS rules and who can apply.`;
}

// ─── Scholarship detail pages ─────────────────────────────────────

export interface ScholarshipMetaInput extends HubScholarship {
  name: string;
  deadline?: string | null;
}

function deadlineLabel(deadline?: string | null): string {
  if (!deadline) return '';
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Name first (what people search), deadline when it fits (what makes them click). */
export function scholarshipTitle(s: ScholarshipMetaInput): string {
  const when = deadlineLabel(s.deadline);
  // Keep the whole title within ~60 characters so Google doesn't truncate it
  return when && s.name.length <= 26 ? `${s.name} — Deadline ${when} | Techsari` : `${s.name} | Techsari`;
}

export function scholarshipDescription(s: ScholarshipMetaInput): string {
  const funding = s.funding_type === 'Full' ? 'Fully funded' : s.funding_type === 'Partial' ? 'Partially funded' : '';
  const levels = (s.degree_levels || []).join(', ');
  const what = [funding, levels ? `${levels} scholarship` : 'scholarship'].filter(Boolean).join(' ');
  const specific = (s.countries || []).filter(c => !OPEN_TO_ALL_AFRICANS.has(c));
  const who = isOpenToAllAfricans(s)
    ? 'open to students from any African country'
    : `for students from ${specific.slice(0, 4).join(', ')}${specific.length > 4 ? ' and more' : ''}`;
  const when = deadlineLabel(s.deadline);
  const parts = [
    `${what.charAt(0).toUpperCase()}${what.slice(1)} ${who}.`,
    when ? `Deadline ${when}.` : '',
    s.no_ielts ? 'No IELTS required.' : '',
    'See eligibility, funding and how to apply.',
  ];
  const text = parts.filter(Boolean).join(' ');
  if (text.length <= 160) return text;
  const cut = text.slice(0, 157);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}
