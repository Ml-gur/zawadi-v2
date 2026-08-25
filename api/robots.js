// Serves at /api/robots — kept in sync with public/robots.txt
export default function handler(_req, res) {
  const body = [
    'User-agent: *',
    'Allow: /',
    'Allow: /scholarships',
    'Allow: /scholarships/browse',
    'Disallow: /dashboard',
    'Disallow: /applications',
    'Disallow: /vault',
    'Disallow: /essays',
    'Disallow: /profile',
    'Disallow: /billing',
    'Disallow: /admin',
    'Disallow: /mentor',
    'Disallow: /api/',
    '',
    'Sitemap: https://www.techsari.online/sitemap.xml',
    '',
  ].join('\n');
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send(body);
}
