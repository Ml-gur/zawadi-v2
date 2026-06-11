export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.status(200).send(
    'User-agent: *\n' +
    'Allow: /\n' +
    'Allow: /scholarships/browse\n' +
    'Allow: /scholarships/browse/*\n' +
    'Allow: /about\n' +
    'Allow: /faq\n' +
    'Allow: /how-it-works\n' +
    'Allow: /privacy\n' +
    'Allow: /terms\n' +
    'Allow: /contact\n' +
    'Disallow: /dashboard\n' +
    'Disallow: /scholarships\n' +
    'Disallow: /vault\n' +
    'Disallow: /essays\n' +
    'Disallow: /profile\n' +
    'Disallow: /applications\n' +
    'Disallow: /billing\n' +
    'Disallow: /admin\n' +
    'Disallow: /api/\n' +
    '\n' +
    'Sitemap: https://techsari.online/sitemap.xml\n'
  );
}
