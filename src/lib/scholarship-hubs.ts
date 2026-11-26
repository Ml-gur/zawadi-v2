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
    subject: 'Masters Scholarships for African Students', // the form people search
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
    lede: `Scholarships that ${demonym} citizens can apply for: awards limited to selected countries that include ${name}, followed by pan-African programmes that accept students from every African country, ${name} included.`,
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

// ─── Titles and descriptions ──────────────────────────────────────
// Google shows ~60 characters of a title and ~155–160 of a description.
// Each builder lists candidates from most to least informative and takes the
// first that fits, so live counts and deadlines are shown whenever there is
// room, and nothing is ever cut mid-word.

const BRAND = ' | Techsari';

function cutAtWord(s: string, max: number): string {
  if (s.length <= max) return s;
  const c = s.slice(0, max + 1);
  return c.slice(0, c.lastIndexOf(' ')).replace(/[\s,:;–—-]+$/, '');
}

/** First candidate ≤ 60 characters, else the last one cut at a word. */
export function fitTitle(cands: string[], max = 60): string {
  for (const c of cands) if (c.length <= max) return c;
  return cutAtWord(cands[cands.length - 1], max);
}

/** First candidate of 140–158 characters, else the longest ≤ 158, else the first cut. */
export function fitDesc(cands: string[], min = 140, max = 158): string {
  const ok = cands.find(c => c.length >= min && c.length <= max);
  if (ok) return ok;
  const under = cands.filter(c => c.length <= max).sort((a, b) => b.length - a.length)[0];
  return under || `${cutAtWord(cands[0], max - 1)}…`;
}

/** Live counts for a hub; omit them (e.g. in middleware) for count-free copy. */
export interface HubCounts {
  total: number;
  full: number;
  countryOnly: number;
}

export function hubCounts(hub: Hub, all: HubScholarship[]): HubCounts {
  return {
    total: all.length,
    full: all.filter(s => s.funding_type === 'Full').length,
    countryOnly: hub.kind === 'country' ? all.filter(s => !isOpenToAllAfricans(s)).length : 0,
  };
}

/** Keyword first, then year and live count, brand last. */
export function hubTitle(hub: Hub, year = intakeYear(), c?: HubCounts): string {
  const S = `${hub.subject} ${year}`;
  return fitTitle(c && c.total > 0
    ? [`${S}: ${c.total} Open${BRAND}`, `${S}: ${c.total} Open`, `${S} (${c.total})`, `${S}${BRAND}`, S]
    : [`${S}${BRAND}`, S]);
}

export function hubDescription(hub: Hub, year = intakeYear(), c?: HubCounts): string {
  const y = year;
  const counted = c && c.total > 0 ? c : undefined;
  if (hub.kind === 'country') {
    const d = hub.demonym;
    const k = hub.country;
    return fitDesc(counted ? [
      `${counted.total} scholarships ${d} students can apply for in ${y}, ${counted.countryOnly} limited to selected countries incl. ${k}, ${counted.full} fully funded. Deadlines and IELTS rules checked.`,
      `${counted.total} scholarships ${d} students can apply for in ${y}, ${counted.countryOnly} for selected countries incl. ${k}, ${counted.full} fully funded. Deadlines and IELTS checked.`,
    ] : [
      `Open ${y} scholarships for ${d} students, fully funded and no-IELTS awards included. Awards for selected countries incl. ${k} come first, deadlines checked.`,
      `Open ${y} scholarships for ${d} students, fully funded and no-IELTS awards included. Awards open to ${k} but not all of Africa come first.`,
      `Open ${y} scholarships for ${d} students, fully funded and no-IELTS included, deadlines checked. Awards for ${k} and selected countries first.`,
    ]);
  }
  const withCounts: Record<string, (n: HubCounts) => string[]> = {
    'fully-funded': n => [
      `${n.total} fully funded scholarships for African students for ${y}: full tuition, and most add a stipend, flights or health cover. Each listing shows what it pays.`,
      `${n.total} fully funded scholarships for African students for ${y}: full tuition, and most add a stipend, flights or health cover. Deadlines checked.`,
    ],
    'no-ielts': n => [`${n.total} scholarships for African students that accept an MOI letter or other English proof instead of IELTS, ${n.full} of them fully funded. ${y} deadlines checked.`],
    masters: n => [`${n.total} Masters scholarships open to African students for ${y}, ${n.full} fully funded: taught MSc and MA courses plus research degrees. Deadlines checked.`],
    phd: n => [
      `${n.total} PhD scholarships open to African students for ${y}, ${n.full} fully funded, including studentships that pay a monthly stipend on top of fees.`,
      `${n.total} PhD scholarships open to African students for ${y}, ${n.full} fully funded, including studentships that pay a monthly stipend on top of fees. Deadlines checked.`,
    ],
    undergraduate: n => [`${n.total} undergraduate scholarships for African students for ${y}, ${n.full} fully funded, at African universities and abroad. See deadlines and who can apply.`],
  };
  const fallback: Record<string, string> = {
    'fully-funded': `Fully funded scholarships for African students for ${y}: full tuition, and most add a stipend, flights or health cover. Each listing shows what it pays.`,
    'no-ielts': `Scholarships for African students with no IELTS needed: apply with an MOI letter or other English proof instead. Fully funded options, ${y} deadlines checked.`,
    masters: `Masters scholarships open to African students for ${y}, fully funded and partial: taught MSc and MA courses plus research degrees. Deadlines checked.`,
    phd: `PhD scholarships open to African students for ${y}, fully funded and partial, including studentships that pay a monthly stipend on top of fees.`,
    undergraduate: `Undergraduate scholarships for African students for ${y}, fully funded and partial, at African universities and abroad. See deadlines and who can apply.`,
  };
  return fitDesc(counted && withCounts[hub.slug] ? withCounts[hub.slug](counted) : [fallback[hub.slug]]);
}

// ─── Scholarship detail pages ─────────────────────────────────────

export interface ScholarshipMetaInput extends HubScholarship {
  name: string;
  deadline?: string | null;
  provider?: string | null;
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const parseDeadline = (dl?: string | null) => {
  if (!dl) return null;
  const d = new Date(dl);
  return Number.isNaN(d.getTime()) ? null : d;
};
/** The intake a deadline feeds: a September–December deadline is for next year. */
const cycleYear = (d: Date) => (d.getUTCMonth() >= 8 ? d.getUTCFullYear() + 1 : d.getUTCFullYear());
const dayMon = (d: Date) => `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;
const fullDate = (d: Date) => `${dayMon(d)} ${d.getUTCFullYear()}`;
const joinLevels = (l: string[]) =>
  l.length <= 1 ? (l[0] || '') : l.length === 2 ? `${l[0]} and ${l[1]}` : `${l.slice(0, -1).join(', ')} and ${l[l.length - 1]}`;

/** Shorter forms of a long name: without a trailing "(…)", then without a trailing " – …" clause. */
function shortNames(n: string): string[] {
  const a = n.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const b = a.replace(/\s+[–—-]\s+[^–—-]+$/, '').trim();
  return [...new Set([a, b])].filter(x => x && x !== n);
}

/** Name first (what people search), intake year and deadline when they fit (what earns the click). */
export function scholarshipTitle(s: ScholarshipMetaInput): string {
  const d = parseDeadline(s.deadline);
  const hasYear = /\b20\d\d\b/.test(s.name);
  const build = (name: string) => {
    const yr = d && !hasYear ? ` ${cycleYear(d)}` : '';
    const dl = d ? (yr && cycleYear(d) === d.getUTCFullYear() ? dayMon(d) : fullDate(d)) : '';
    const base = `${name}${yr}`;
    return [...(dl ? [`${base}: Deadline ${dl}${BRAND}`, `${base}: Deadline ${dl}`] : []), `${base}${BRAND}`, base, `${name}${BRAND}`, name];
  };
  return fitTitle([...build(s.name), ...shortNames(s.name).flatMap(build)]);
}

export function scholarshipDescription(s: ScholarshipMetaInput): string {
  const funding = s.funding_type === 'Full' ? 'Fully funded' : s.funding_type === 'Partial' ? 'Partially funded' : '';
  const what = [funding, joinLevels(s.degree_levels || []), 'scholarship'].filter(Boolean).join(' ');
  const What = what.charAt(0).toUpperCase() + what.slice(1);
  const specific = (s.countries || []).filter(c => !OPEN_TO_ALL_AFRICANS.has(c));
  const all = isOpenToAllAfricans(s);
  const who = all
    ? 'open to students from every African country'
    : `for students from ${specific.slice(0, 3).join(', ')}${specific.length > 3 ? ' and more' : ''}`;
  const d = parseDeadline(s.deadline);
  const dl = d ? ` Apply by ${fullDate(d)}.` : '';
  const ielts = s.no_ielts ? ' No IELTS needed.' : '';
  const from = s.provider ? ` from ${s.provider}` : '';
  const sep = all ? ', ' : ' ';
  const tails = [' See what it pays, who qualifies and how to apply.', ' See eligibility, funding and how to apply.', ' See eligibility and how to apply.'];
  const cands: string[] = [];
  for (const extra of ['', ' Listing checked by Techsari.']) {
    for (const f of [from, '']) for (const t of tails) cands.push(`${What}${f}${sep}${who}.${dl}${ielts}${t}${extra}`);
  }
  return fitDesc(cands);
}

