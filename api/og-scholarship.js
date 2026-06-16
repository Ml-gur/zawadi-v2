// Vercel serverless function that generates a dynamic OG image (PNG) for a scholarship
// Usage: /api/og-scholarship?name=Chevening&provider=UK+Government&funding=Full&deadline=Nov+2026&countries=Kenya&degree=Masters&noIelts=true
const sharp = require('sharp');

function generateSvg({ name, provider, funding_type, deadline, countries, degree_levels, no_ielts }) {
  const safeName = (name || 'Scholarship').slice(0, 50);
  const safeProvider = (provider || '').slice(0, 40);
  const safeCountries = (countries || 'Multiple countries').slice(0, 60);
  const safeDeadline = (deadline || 'Check website').slice(0, 30);
  const safeDegree = (degree_levels || 'Various levels').slice(0, 30);
  const fundingBadge = funding_type === 'Full' ? 'Fully Funded' : funding_type === 'Partial' ? 'Partial Funding' : 'Funding Available';
  const fundingColor = funding_type === 'Full' ? '#6cf8bb' : '#fbbf24';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#001736"/>
      <stop offset="50%" style="stop-color:#0a2e5a"/>
      <stop offset="100%" style="stop-color:#1a4a7a"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#6cf8bb"/>
      <stop offset="100%" style="stop-color:#4ade80"/>
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.08)"/>
      <stop offset="100%" style="stop-color:rgba(255,255,255,0.03)"/>
    </linearGradient>
    <linearGradient id="badgeFund" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${fundingColor}22"/>
      <stop offset="100%" style="stop-color:${fundingColor}11"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)" rx="0"/>

  <circle cx="150" cy="150" r="350" fill="rgba(108,248,187,0.04)"/>
  <circle cx="1050" cy="500" r="280" fill="rgba(108,248,187,0.03)"/>

  <g opacity="0.03">
    <line x1="0" y1="100" x2="1200" y2="100" stroke="white" stroke-width="0.5"/>
    <line x1="0" y1="250" x2="1200" y2="250" stroke="white" stroke-width="0.5"/>
    <line x1="0" y1="450" x2="1200" y2="450" stroke="white" stroke-width="0.5"/>
    <line x1="400" y1="0" x2="400" y2="630" stroke="white" stroke-width="0.5"/>
    <line x1="800" y1="0" x2="800" y2="630" stroke="white" stroke-width="0.5"/>
  </g>

  <g transform="translate(60, 50)">
    <rect width="48" height="48" rx="12" fill="url(#accent)"/>
    <text x="24" y="33" font-family="Georgia, serif" font-size="28" font-weight="bold" fill="#001736" text-anchor="middle">Z</text>
    <text x="60" y="32" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#6cf8bb">Zawadi</text>
  </g>

  <!-- Scholarship Card -->
  <g transform="translate(60, 150)">
    <rect width="1080" height="340" rx="20" fill="url(#cardGrad)" stroke="rgba(255,255,255,0.1)" stroke-width="1.5"/>

    <!-- Badges -->
    <rect x="30" y="30" width="${funding_type ? 120 : 0}" height="28" rx="14" fill="url(#badgeFund)"/>
    <text x="${funding_type ? 90 : 0}" y="49" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="${fundingColor}" text-anchor="middle">${fundingBadge}</text>

    ${no_ielts === 'true' || no_ielts === '1' ? `
    <rect x="165" y="30" width="95" height="28" rx="14" fill="rgba(251,191,36,0.15)"/>
    <text x="212" y="49" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#fbbf24" text-anchor="middle">No IELTS</text>
    ` : ''}

    <!-- Scholarship Name -->
    <text x="30" y="110" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="white">${escapeXml(safeName)}</text>

    <!-- Provider -->
    ${safeProvider ? `<text x="30" y="145" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.5)">${escapeXml(safeProvider)}</text>` : ''}

    <!-- Detail fields -->
    <g transform="translate(30, 190)">
      <rect x="0" y="0" width="180" height="55" rx="10" fill="rgba(255,255,255,0.05)"/>
      <text x="12" y="22" font-family="Arial, sans-serif" font-size="10" fill="rgba(255,255,255,0.4)" text-anchor="start">DEGREE LEVEL</text>
      <text x="12" y="43" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="white">${escapeXml(safeDegree)}</text>
    </g>

    <g transform="translate(225, 190)">
      <rect x="0" y="0" width="220" height="55" rx="10" fill="rgba(255,255,255,0.05)"/>
      <text x="12" y="22" font-family="Arial, sans-serif" font-size="10" fill="rgba(255,255,255,0.4)" text-anchor="start">DEADLINE</text>
      <text x="12" y="43" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="white">${escapeXml(safeDeadline)}</text>
    </g>

    <g transform="translate(460, 190)">
      <rect x="0" y="0" width="280" height="55" rx="10" fill="rgba(255,255,255,0.05)"/>
      <text x="12" y="22" font-family="Arial, sans-serif" font-size="10" fill="rgba(255,255,255,0.4)" text-anchor="start">ELIGIBLE COUNTRIES</text>
      <text x="12" y="43" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="white">${escapeXml(safeCountries)}</text>
    </g>
  </g>

  <rect x="0" y="535" width="1200" height="95" fill="rgba(108,248,187,0.04)"/>
  <line x1="60" y1="535" x2="1140" y2="535" stroke="rgba(108,248,187,0.1)" stroke-width="1"/>

  <circle cx="100" cy="580" r="4" fill="#6cf8bb"/>
  <text x="115" y="584" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.5)">Deterministic Eligibility Matching</text>

  <circle cx="430" cy="580" r="4" fill="#6cf8bb"/>
  <text x="445" y="584" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.5)">No Data Selling</text>

  <circle cx="760" cy="580" r="4" fill="#6cf8bb"/>
  <text x="775" y="584" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.5)">Free for Students</text>

  <text x="920" y="615" font-family="Arial, sans-serif" font-size="12" fill="rgba(255,255,255,0.3)" text-anchor="end">techsari.online/scholarships</text>
</svg>`;
}

function escapeXml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = async (req, res) => {
  // Set CORS and caching headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400'); // cache 24h on CDN
  res.setHeader('Content-Type', 'image/png');

  const {
    name = 'Scholarship',
    provider = '',
    funding_type = '',
    deadline = '',
    countries = '',
    degree_levels = '',
    no_ielts = '',
  } = req.query;

  try {
    const svg = generateSvg({ name, provider, funding_type, deadline, countries, degree_levels, no_ielts });
    const png = await sharp(Buffer.from(svg))
      .resize(1200, 630)
      .png()
      .toBuffer();

    res.status(200).send(png);
  } catch (err) {
    console.error('OG image generation error:', err);
    // Fallback: return the static scholarships OG image as a redirect
    res.status(302).setHeader('Location', 'https://techsari.online/og-scholarships.png').end();
  }
};
