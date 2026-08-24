export interface ScholarshipTeaser {
  id: string;
  slug: string;
  name: string;
  provider: string;
  countries: string[];
  degree_levels: string[];
  funding_type: string;
  amount: string;
  deadline: string;
  urgency: string;
  description: string;
  no_ielts: boolean;
  targets_financial_need: boolean;
  is_intra_african: boolean;
  host_region?: string;
  fields_of_study?: string[];
  iso2?: string | string[];
  opens_at?: string | null;
}

export function formatDeadline(dateStr: string | null): string {
  if (!dateStr) return 'Check website';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Check website';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function isClosingSoon(deadline: string | null, urgency: string): boolean {
  if (!deadline) return false;
  if (urgency === 'Urgent') return true;
  const d = new Date(deadline);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return diff > 0 && diff <= 14 * 24 * 60 * 60 * 1000;
}

export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

const ROLLING_RE = /varies|annual|rolling|ongoing/i;

export type BadgeTone = 'urgent' | 'normal' | 'opens' | 'rolling' | 'closed';

export interface DeadlineBadge {
  label: string;
  tone: BadgeTone;
}

/**
 * Day-based deadline badge — "Closes in 12 days" reads as urgency;
 * "Closing soon" could mean anything from next week to next quarter.
 */
export function deadlineBadge(
  deadline: string | null,
  urgency: string,
  opensAt?: string | null
): DeadlineBadge {
  const opensIn = daysUntil(opensAt);
  if (opensAt && opensIn !== null && opensIn > 0) {
    return { label: opensIn === 1 ? 'Opens tomorrow' : `Opens in ${opensIn} days`, tone: 'opens' };
  }

  if (!deadline || ROLLING_RE.test(deadline)) {
    return { label: 'Rolling — check website', tone: 'rolling' };
  }

  const d = daysUntil(deadline);
  if (d === null) return { label: `Deadline ${deadline}`, tone: 'normal' };
  if (d < 0) return { label: 'Closed', tone: 'closed' };
  if (d === 0) return { label: 'Closes today', tone: 'urgent' };
  if (d === 1) return { label: 'Closes tomorrow', tone: 'urgent' };
  return { label: `Closes in ${d} days`, tone: d <= 14 ? 'urgent' : 'normal' };
}

// ─── Eligibility expansion ───
// "Pan-African" or "ECOWAS" is not something a student can picture. Expand
// every regional marker to its actual member countries; only genuine
// continent-wide eligibility gets the summary "All African countries".

import {
  getCountriesByAURegion,
  getCommonwealthCountries,
  getFrancophonieCountries,
  getCPLPCountries,
  getAfricanCountries,
} from '../../lib/country-graph';
import { OIC_MEMBER_NAMES, REGION_NAMES } from '../../config/matching-config';

const setToNames = (set: Set<string>): string[] =>
  [...set].map(n => n.replace(/\b\w/g, ch => ch.toUpperCase()));

const MARKER_EXPANDERS: Record<string, () => string[]> = {
  'ECOWAS': () => getCountriesByAURegion('ECOWAS'),
  'SADC': () => getCountriesByAURegion('SADC'),
  'EAC': () => getCountriesByAURegion('EAC'),
  'IGAD': () => getCountriesByAURegion('IGAD'),
  'COMESA': () => getCountriesByAURegion('COMESA'),
  'CENSAD': () => getCountriesByAURegion('CENSAD'),
  'AMU': () => getCountriesByAURegion('AMU'),
  'ECCAS': () => getCountriesByAURegion('ECCAS'),
  'SUB-SAHARAN AFRICA': () => [...REGION_NAMES['Sub-Saharan Africa'] ?? []].map(n => n.replace(/\b\w/g, ch => ch.toUpperCase())),
  'SUB_SAHARAN': () => [...REGION_NAMES['Sub-Saharan Africa'] ?? []].map(n => n.replace(/\b\w/g, ch => ch.toUpperCase())),
  'SUB-SAHARAN': () => [...REGION_NAMES['Sub-Saharan Africa'] ?? []].map(n => n.replace(/\b\w/g, ch => ch.toUpperCase())),
  'FRANCOPHONE': () => {
    const african = new Set(getAfricanCountries().map(c => c.toLowerCase()));
    return getFrancophonieCountries().filter(c => african.has(c.toLowerCase()));
  },
  'LUSOPHONE': () => {
    const african = new Set(getAfricanCountries().map(c => c.toLowerCase()));
    return getCPLPCountries().filter(c => african.has(c.toLowerCase()));
  },
  'OIC': () => setToNames(OIC_MEMBER_NAMES),
  'COMMONWEALTH': () => getCommonwealthCountries(),
};

const ALL_AFRICA_MARKERS = new Set([
  'PAN-AFRICAN', 'PAN_AFRICAN', 'AFRICAN', 'ALL', 'GLOBAL',
  'ALL AFRICAN COUNTRIES', 'ALL AFRICA', 'AFRICA',
]);

const MARKER_LABELS: Record<string, string> = {
  'ECOWAS': 'West Africa (ECOWAS)',
  'SADC': 'Southern Africa (SADC)',
  'EAC': 'East Africa (EAC)',
  'IGAD': 'East Africa (IGAD)',
  'COMESA': 'COMESA member states',
  'CENSAD': 'CEN-SAD member states',
  'AMU': 'North Africa (AMU)',
  'ECCAS': 'Central Africa (ECCAS)',
  'SUB-SAHARAN AFRICA': 'Sub-Saharan Africa',
  'SUB_SAHARAN': 'Sub-Saharan Africa',
  'SUB-SAHARAN': 'Sub-Saharan Africa',
  'FRANCOPHONE': 'Francophone Africa',
  'LUSOPHONE': 'Lusophone Africa',
  'OIC': 'OIC member states',
  'COMMONWEALTH': 'Commonwealth countries',
};

export interface EligibilityInfo {
  /** Expanded, concrete country names — safe to list verbatim */
  countries: string[];
  /** True only when eligibility genuinely covers the whole continent */
  isAllAfrica: boolean;
  /** Optional grouping label, e.g. "West Africa (ECOWAS)" when the list came from a marker */
  markerLabel: string | null;
}

export function eligibilityInfo(countries?: string[] | null): EligibilityInfo {
  const list = (countries || []).map(c => (c || '').trim()).filter(Boolean);
  if (list.length === 0) return { countries: [], isAllAfrica: true, markerLabel: null };

  if (list.some(c => ALL_AFRICA_MARKERS.has(c.toUpperCase()))) {
    return { countries: [], isAllAfrica: true, markerLabel: null };
  }

  const expanded: string[] = [];
  let markerLabel: string | null = null;
  for (const c of list) {
    const key = c.toUpperCase();
    if (MARKER_EXPANDERS[key]) {
      markerLabel = MARKER_LABELS[key] ?? markerLabel;
      for (const name of MARKER_EXPANDERS[key]()) {
        if (!expanded.some(e => e.toLowerCase() === name.toLowerCase())) expanded.push(name);
      }
    } else if (!expanded.some(e => e.toLowerCase() === c.toLowerCase())) {
      expanded.push(c);
    }
  }

  return { countries: expanded, isAllAfrica: false, markerLabel };
}

/** Back-compat wrapper for tight spaces. */
export function truncateCountries(countries: string[]): string {
  const info = eligibilityInfo(countries);
  if (info.isAllAfrica) return 'All African countries';
  const { countries: names } = info;
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 3).join(', ')} +${names.length - 3} more`;
}
