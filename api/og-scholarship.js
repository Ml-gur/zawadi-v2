// Vercel serverless function that generates a dynamic OG image (PNG) for a scholarship
// Palette: Electric Editorial — parchment canvas, ink text, electric-lime accents
// Usage: /api/og-scholarship?name=Chevening&provider=UK+Government&funding_type=Full&deadline=Nov+2026&countries=Kenya&degree_levels=Masters&no_ielts=true

function escapeXml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateSvg({ name, provider, funding_type, deadline, countries, degree_levels, no_ielts }) {
  const safeName = (name || 'Scholarship').slice(0, 50);
  const safeProvider = (provider || '').slice(0, 40);
  const safeCountries = (countries || 'Multiple countries').slice(0, 60);
  const safeDeadline = (deadline || 'Check website').slice(0, 30);
  const safeDegree = (degree_levels || 'Various levels').slice(0, 30);
  const fundingBadge = funding_type === 'Full' ? 'Fully Funded' : funding_type === 'Partial' ? 'Partial Funding' : 'Funding Available';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f5f5eb"/>

  <!-- brand mark: vault-Z -->
  <g transform="translate(60, 48)">
    <rect x="0" y="0" width="52" height="52" rx="14" fill="none" stroke="#14140f" stroke-width="3"/>
    <path d="M13 13 H39 L20 34 H40" fill="none" stroke="#14140f" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="41" cy="41" r="4.5" fill="#beff50"/>
    <text x="66" y="34" font-family="Arial, sans-serif" font-size="20" font-weight="600" fill="#14140f">Techsari</text>
  </g>

  <!-- scholarship card -->
  <g transform="translate(60, 140)">
    <rect width="1080" height="360" rx="28" fill="#beff50" stroke="#14140f" stroke-width="2"/>

    <rect x="36" y="36" width="${funding_type ? 130 : 0}" height="32" rx="16" fill="#14140f"/>
    ${funding_type ? `<text x="101" y="57" font-family="Arial, sans-serif" font-size="13" font-weight="600" fill="#ffffff" text-anchor="middle">${fundingBadge}</text>` : ''}

    ${no_ielts === 'true' || no_ielts === '1' ? `
    <rect x="${funding_type ? 182 : 36}" y="36" width="104" height="32" rx="16" fill="#f5f5eb" stroke="#14140f" stroke-width="1.5"/>
    <text x="${funding_type ? 234 : 88}" y="57" font-family="Arial, sans-serif" font-size="13" font-weight="600" fill="#14140f" text-anchor="middle">No IELTS</text>
    ` : ''}

    <text x="36" y="132" font-family="Arial, sans-serif" font-size="44" font-weight="600" fill="#14140f">${escapeXml(safeName)}</text>

    ${safeProvider ? `<text x="36" y="170" font-family="Arial, sans-serif" font-size="19" fill="#30302a">${escapeXml(safeProvider)}</text>` : ''}

    <g transform="translate(36, 210)">
      <rect x="0" y="0" width="220" height="60" rx="12" fill="#f5f5eb" stroke="#d2d2c8" stroke-width="1"/>
      <text x="14" y="24" font-family="Arial, sans-serif" font-size="11" letter-spacing="1" fill="#6e6e64">DEGREE LEVEL</text>
      <text x="14" y="46" font-family="Arial, sans-serif" font-size="15" font-weight="600" fill="#14140f">${escapeXml(safeDegree)}</text>
    </g>

    <g transform="translate(272, 210)">
      <rect x="0" y="0" width="240" height="60" rx="12" fill="#f5f5eb" stroke="#d2d2c8" stroke-width="1"/>
      <text x="14" y="24" font-family="Arial, sans-serif" font-size="11" letter-spacing="1" fill="#6e6e64">DEADLINE</text>
      <text x="14" y="46" font-family="Arial, sans-serif" font-size="15" font-weight="600" fill="#14140f">${escapeXml(safeDeadline)}</text>
    </g>

    <g transform="translate(528, 210)">
      <rect x="0" y="0" width="330" height="60" rx="12" fill="#f5f5eb" stroke="#d2d2c8" stroke-width="1"/>
      <text x="14" y="24" font-family="Arial, sans-serif" font-size="11" letter-spacing="1" fill="#6e6e64">ELIGIBLE COUNTRIES</text>
      <text x="14" y="46" font-family="Arial, sans-serif" font-size="15" font-weight="600" fill="#14140f">${escapeXml(safeCountries)}</text>
    </g>

    <text x="36" y="326" font-family="Arial, sans-serif" font-size="15" fill="#30302a">
      Know you qualify before you pay a shilling.
    </text>
  </g>

  <!-- footer strip -->
  <line x1="60" y1="552" x2="1140" y2="552" stroke="#d2d2c8" stroke-width="1"/>
  <circle cx="68" cy="584" r="4" fill="#beff50"/>
  <text x="82" y="589" font-family="Arial, sans-serif" font-size="14" fill="#6e6e64">Verified against official sources</text>

  <circle cx="380" cy="584" r="4" fill="#beff50"/>
  <text x="394" y="589" font-family="Arial, sans-serif" font-size="14" fill="#6e6e64">No application fees — ever</text>

  <circle cx="700" cy="584" r="4" fill="#beff50"/>
  <text x="714" y="589" font-family="Arial, sans-serif" font-size="14" fill="#6e6e64">Free for scholars</text>

  <text x="1140" y="589" font-family="Arial, sans-serif" font-size="13" fill="#919183" text-anchor="end">techsari.online/scholarships/browse</text>
</svg>`;
}

export default async function handler(req, res) {
  const {
    name = 'Scholarship',
    provider = '',
    funding_type = '',
    deadline = '',
    countries = '',
    degree_levels = '',
    no_ielts = '',
  } = req.query;

  // Generate SVG
  const svg = generateSvg({ name, provider, funding_type, deadline, countries, degree_levels, no_ielts });

  // Try sharp (native module) — if it fails, redirect to static fallback
  try {
    const { default: sharp } = await import('sharp');
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.setHeader('Content-Type', 'image/png');
    res.status(200).send(png);
  } catch (e) {
    console.error('og-scholarship: sharp unavailable, redirecting to static fallback', e.message || e);
    return res.redirect(302, 'https://www.techsari.online/og-scholarships.png');
  }
}
