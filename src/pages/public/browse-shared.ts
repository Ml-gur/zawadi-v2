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

export function truncateCountries(countries: string[]): string {
  if (!countries || countries.length === 0) return 'All countries';
  if (countries.length <= 3) return countries.join(', ');
  return countries.slice(0, 3).join(', ') + ` +${countries.length - 3} more`;
}
