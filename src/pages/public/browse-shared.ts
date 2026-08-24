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

const REGIONAL_MARKERS: Record<string, string> = {
  'PAN-AFRICAN': 'All African countries',
  'PAN_AFRICAN': 'All African countries',
  'AFRICAN': 'All African countries',
  'ALL': 'All African countries',
  'GLOBAL': 'All African countries',
  'SUB-SAHARAN AFRICA': 'Sub-Saharan African countries',
  'SUB_SAHARAN': 'Sub-Saharan African countries',
  'SUB-SAHARAN': 'Sub-Saharan African countries',
  'ECOWAS': 'ECOWAS member states (West Africa)',
  'SADC': 'SADC member states (Southern Africa)',
  'EAC': 'East African Community member states',
  'IGAD': 'IGAD member states',
  'CENSAD': 'CEN-SAD member states',
  'AMU': 'Arab Maghreb Union member states',
  'ECCAS': 'ECCAS member states (Central Africa)',
  'COMESA': 'COMESA member states',
  'FRANCOPHONE': 'Francophone African countries',
  'LUSOPHONE': 'Lusophone African countries',
  'OIC': 'OIC member states',
  'COMMONWEALTH': 'Commonwealth countries',
};

function normaliseMarker(c: string): string | null {
  const key = c.toUpperCase().trim();
  return REGIONAL_MARKERS[key] ?? null;
}

export interface EligibilityInfo {
  /** Human-readable eligibility, e.g. "Kenya, Nigeria +12 more" or "All African countries" */
  label: string;
  /** True when eligibility is a broad regional/global list — never pair a national flag with it */
  isBroad: boolean;
  /** Concrete country names when isBroad is false */
  concrete: string[];
}

/**
 * Eligibility list → honest label. "Pan-African" is not a place students know;
 * "All African countries" is. Regional markers get expanded to what they mean.
 */
export function eligibilityInfo(countries?: string[] | null): EligibilityInfo {
  const list = (countries || []).map(c => (c || '').trim()).filter(Boolean);
  if (list.length === 0) return { label: 'All African countries', isBroad: true, concrete: [] };

  const expanded = list.map(c => normaliseMarker(c) ?? c);
  const broadCount = expanded.filter((c, i) => normaliseMarker(list[i]) !== null).length;

  // Any broad marker present means eligibility is regional/global — say so plainly.
  if (broadCount > 0) {
    // If the marker resolves to "All African countries" use it directly.
    const markerLabels = expanded.filter((c, i) => normaliseMarker(list[i]) !== null);
    if (markerLabels.includes('All African countries')) {
      return { label: 'All African countries', isBroad: true, concrete: [] };
    }
    return { label: markerLabels[0], isBroad: true, concrete: [] };
  }

  if (list.length <= 4) {
    return { label: expanded.join(', '), isBroad: false, concrete: expanded };
  }
  return {
    label: `${expanded.slice(0, 3).join(', ')} +${list.length - 3} more`,
    isBroad: false,
    concrete: expanded,
  };
}

/** Back-compat wrapper for card footers. */
export function truncateCountries(countries: string[]): string {
  return eligibilityInfo(countries).label;
}
