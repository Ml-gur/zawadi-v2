import { useEffect } from 'react';

interface ScholarshipSchemaProps {
  scholarship: {
    name: string;
    description: string;
    amount: string;
    deadline: string;
    countries: string[];
    degree_levels: string[];
    slug: string;
    updated_at: string;
  };
}

export function ScholarshipSchema({ scholarship }: ScholarshipSchemaProps) {
  useEffect(() => {
    const existing = document.getElementById('scholarship-schema');
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'scholarship-schema';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'EducationalOccupationalCredential',
      name: scholarship.name,
      description: (scholarship.description || '').slice(0, 300),
      url: `https://techsari.online/scholarships/browse/${scholarship.slug}`,
      dateModified: scholarship.updated_at,
      offers: {
        '@type': 'Offer',
        description: scholarship.amount || 'See details',
        availability: 'https://schema.org/InStock',
        validThrough: scholarship.deadline,
      },
      eligibleRegion: (scholarship.countries || []).map(c => ({
        '@type': 'Country',
        name: c,
      })),
      educationalLevel: (scholarship.degree_levels || []).join(', '),
      provider: {
        '@type': 'Organization',
        name: 'Zawadi by Techsari',
        url: 'https://techsari.online',
      },
    });

    document.head.appendChild(script);

    return () => {
      const tag = document.getElementById('scholarship-schema');
      if (tag) tag.remove();
    };
  }, [scholarship]);

  return null;
}
