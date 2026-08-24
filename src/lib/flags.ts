import type { Scholarship } from '../types';

/** ISO 3166-1 alpha-2 → regional-indicator flag emoji */
export function flagFromIso2(iso2: string): string | null {
  const code = iso2.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return String.fromCodePoint(...[...code].map(c => 0x1f1e6 + c.charCodeAt(0) - 65));
}

const REGION_FLAGS: Array<[RegExp, string]> = [
  [/germany|austria|swiss/i, '🇩🇪'],
  [/united kingdom|ireland|britain/i, '🇬🇧'],
  [/united states|america|canada/i, '🇺🇸'],
  [/china|east asia/i, '🇨🇳'],
  [/japan|korea/i, '🇯🇵'],
  [/france|belgium/i, '🇫🇷'],
  [/italy|mediterranean/i, '🇮🇹'],
  [/russia|cis/i, '🇷🇺'],
  [/australia|new zealand|oceania/i, '🇦🇺'],
  [/middle east|turkey|gulf|saudi/i, '🇸🇦'],
  [/india|south asia/i, '🇮🇳'],
  [/brazil|south america/i, '🇧🇷'],
  [/africa|intra-african|commonwealth africa/i, '🌍'],
  [/europe/i, '🇪🇺'],
  [/asia/i, '🌏'],
  [/global|anywhere|world/i, '🌍'],
];

/** Best-effort flag for a scholarship: explicit iso2 first, then host country/region hints. */
export function flagFor(s: Pick<Scholarship, 'iso2' | 'countries' | 'host_country' | 'host_region' | 'name'> | undefined): string {
  if (!s) return '🌍';

  const iso = s.iso2;
  const isoList = Array.isArray(iso) ? iso : iso ? [iso] : [];
  const valid = isoList.map(flagFromIso2).filter((f): f is string => Boolean(f));
  if (valid.length > 0) return valid.slice(0, 3).join('');

  const haystack = [
    ...(s.host_country || []),
    s.host_region || '',
    ...(s.countries || []),
    s.name || '',
  ].join(' ');

  for (const [pattern, flag] of REGION_FLAGS) {
    if (pattern.test(haystack)) return flag;
  }
  return '🌍';
}
