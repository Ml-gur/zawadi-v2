import type { CategoryDomain } from './CategoryLabel';

/** Single source of truth for domain → accent hue class mapping. */
export const domainClasses: Record<CategoryDomain, string> = {
  brand: 'text-accent-green',
  scholarships: 'text-accent-orange',
  deadlines: 'text-accent-pink',
  ai: 'text-accent-lilac',
  profile: 'text-accent-blue',
};
