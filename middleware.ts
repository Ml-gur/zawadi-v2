// Vercel Edge Middleware — injects Open Graph meta tags for social media crawlers
// Social bots (WhatsApp, Facebook, Twitter, LinkedIn, etc.) don't execute JS.
// They only read the static HTML. This middleware intercepts their requests,
// fetches the SPA's index.html, and injects route-specific OG tags server-side.

const SITE_URL = 'https://www.techsari.online';

const CRAWLER_PATTERNS = [
  'whatsapp', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
  'slackbot', 'telegrambot', 'discordbot', 'googlebot',
  'bingbot', 'applebot', 'yandexbot', 'duckduckbot',
  'baiduspider', 'ia_archiver', 'semrushbot', 'ahrefsbot',
  'gptbot', 'claude-web', 'anthropic-ai', 'chatgpt-user',
];

function isCrawler(ua: string): boolean {
  const lower = ua.toLowerCase();
  return CRAWLER_PATTERNS.some(bot => lower.includes(bot));
}

interface RouteMeta {
  title: string;
  description: string;
  image: string;
  ogTitle?: string;
  ogDescription?: string;
}

const ROUTE_META: Record<string, RouteMeta> = {
  '/': {
    title: 'Techsari | Scholarships Matched to You',
    description: 'An end-to-end scholarship platform for African students. Find scholarships matched to your profile, prepare applications with AI, and get support from mentors.',
    image: `${SITE_URL}/og-home.png`,
    ogTitle: 'Techsari | Scholarships Matched to You',
    ogDescription: 'An end-to-end scholarship platform for African students. Find scholarships matched to your profile, prepare applications with AI, and get support from mentors.',
  },
  '/scholarships': {
    title: 'Scholarships for African Students | Techsari',
    description: 'Browse verified scholarships open to students from all 54 African countries. Every listing checked for active deadlines and real eligibility. Full funding and partial funding available.',
    image: `${SITE_URL}/og-scholarships.png`,
    ogTitle: 'Scholarships for African Students | Techsari',
    ogDescription: 'Browse verified scholarships open to African students. Every listing is checked for active deadlines and real eligibility. Full and partial funding from universities worldwide.',
  },
  '/about': {
    title: 'About Techsari | Scholarship Platform for African Students',
    description: 'Techsari was built to fix the scholarship access gap for African students. We filter out irrelevant results, remove the IELTS barrier, and pair AI essay tools with human mentor review.',
    image: `${SITE_URL}/og-about.png`,
    ogTitle: 'About Techsari | Built for African Students',
    ogDescription: 'Most scholarship platforms sell student data to advertisers. Techsari does not. We match students to funding they qualify for and help them apply without wasting time.',
  },
  '/how-it-works': {
    title: 'How Techsari Works | Scholarship Matching for African Students',
    description: 'Create a profile in three minutes. See scholarships you qualify for. Build your application with AI that learns your writing style. Get mentor review before you submit.',
    image: `${SITE_URL}/og-how-it-works.png`,
    ogTitle: 'How Techsari Works | Profile to Application',
    ogDescription: 'Four steps from registration to submitted application. Techsari handles eligibility filtering, essay drafting, and human mentor review so you can focus on applying.',
  },
  '/faq': {
    title: 'Scholarship FAQ for African Students | Techsari',
    description: 'Answers to common questions about finding scholarships as an African student. Covers IELTS alternatives, eligibility matching, how to apply, and which countries qualify.',
    image: `${SITE_URL}/og-faq.png`,
    ogTitle: 'Scholarship FAQ | Techsari',
    ogDescription: 'Common questions about scholarships for African students. IELTS requirements, application tips, eligibility criteria, and how the Techsari matching system works.',
  },
  '/contact': {
    title: 'Contact Techsari | Get Help or Partner With Us',
    description: 'Contact the Techsari team for student support, scholarship provider listings, institutional partnerships, or press inquiries.',
    image: `${SITE_URL}/og-image.png`,
    ogTitle: 'Contact Techsari',
    ogDescription: 'Reach out to the Techsari team for student support, institutional partnerships, or scholarship provider inquiries. We respond within 24 hours.',
  },
  '/privacy': {
    title: 'Privacy Policy | Techsari',
    description: 'How Techsari collects, uses, and protects your data as an African student using our scholarship platform.',
    image: `${SITE_URL}/og-image.png`,
  },
  '/terms': {
    title: 'Terms of Service | Techsari',
    description: 'The terms governing your use of Techsari, an AI-powered scholarship platform for African students.',
    image: `${SITE_URL}/og-image.png`,
  },
};

function getMeta(pathname: string): RouteMeta {
  const normalized = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  return ROUTE_META[normalized] || ROUTE_META['/scholarships'];
}

function slugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/scholarships\/browse\/([^/]+)/);
  return match ? decodeURIComponent(match[1]).replace(/\/$/, '').slice(0, 100) : null;
}

function encodeQueryValue(s: string): string {
  return encodeURIComponent(s).replace(/%20/g, '+');
}

function buildScholarOgUrl(data: Record<string, any>): string {
  const name = String(data.name || 'Scholarship').slice(0, 60);
  const provider = String(data.provider || '').slice(0, 50);
  const funding = String(data.funding_type || '');
  const deadline = data.deadline ? formatDeadlineEdge(String(data.deadline)).slice(0, 40) : '';
  const countries = (Array.isArray(data.countries) ? data.countries.slice(0, 3).join(', ') : '').slice(0, 80);
  const degrees = (Array.isArray(data.degree_levels) ? data.degree_levels.slice(0, 2).join(', ') : '').slice(0, 40);
  const noIelts = data.no_ielts ? 'true' : '';
  // Cache-bust: append updated_at so crawlers fetch a fresh image after data changes
  const ts = data.updated_at ? `&_=${data.updated_at.slice(0, 10)}` : '';
  return `${SITE_URL}/api/og-scholarship?name=${encodeQueryValue(name)}&provider=${encodeQueryValue(provider)}&funding_type=${encodeQueryValue(funding)}&deadline=${encodeQueryValue(deadline)}&countries=${encodeQueryValue(countries)}&degree_levels=${encodeQueryValue(degrees)}&no_ielts=${noIelts}${ts}`;
}

function stripHtml(s: string): string {
  return (s || '').replace(/<[^>]*>/g, '').trim();
}

function formatDeadlineEdge(dateStr: string): string {
  if (!dateStr) return 'Check website';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Check website';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function buildScholarDescription(data: Record<string, any>): string {
  const parts: string[] = [];

  // Build a factual, specific description
  const funding = data.funding_type === 'Full' ? 'Fully funded' : data.funding_type === 'Partial' ? 'Partially funded' : '';
  const degrees = Array.isArray(data.degree_levels) ? data.degree_levels.join(', ') : '';
  const countries = Array.isArray(data.countries) ? data.countries.join(', ') : '';
  const deadline = data.deadline ? formatDeadlineEdge(String(data.deadline)) : '';

  if (funding || degrees) {
    const level = degrees ? `${degrees} scholarship` : 'scholarship';
    parts.push(`${funding ? funding + ' ' : ''}${level}`.trim());
  }
  if (countries) {
    parts.push(`for eligible African students from ${countries}`);
  } else {
    parts.push('for eligible African students');
  }

  let desc = parts.join(' ');
  if (deadline && deadline !== 'Check website') {
    desc += `. Deadline: ${deadline}`;
  }
  desc += '. View eligibility, funding details and application information.';

  return desc.slice(0, 200);
}

function buildMetaTags(meta: RouteMeta, url: string): string {
  const title = meta.ogTitle || meta.title;
  const desc = meta.ogDescription || meta.description;
  return `\n<meta charset="UTF-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n<title>${escapeHtml(meta.title)}</title>\n<meta name="description" content="${escapeHtml(meta.description)}" />\n<meta property="og:type" content="website" />\n<meta property="og:url" content="${escapeHtml(url)}" />\n<meta property="og:title" content="${escapeHtml(title)}" />\n<meta property="og:description" content="${escapeHtml(desc)}" />\n<meta property="og:image" content="${escapeHtml(meta.image)}" />\n<meta property="og:image:width" content="1200" />\n<meta property="og:image:height" content="630" />\n<meta property="og:image:alt" content="${escapeHtml(title)}" />\n<meta property="og:site_name" content="Techsari" />\n<meta property="og:locale" content="en_US" />\n<meta name="twitter:card" content="summary_large_image" />\n<meta name="twitter:title" content="${escapeHtml(title)}" />\n<meta name="twitter:description" content="${escapeHtml(desc)}" />\n<meta name="twitter:image" content="${escapeHtml(meta.image)}" />\n<meta name="twitter:image:alt" content="${escapeHtml(title)}" />\n<meta name="twitter:site" content="@techsari" />\n<meta name="twitter:creator" content="@techsari" />\n`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webmanifest|js|css|json|xml|txt)).*)',
  ],
};

export default async function middleware(request: Request): Promise<Response> {
  const userAgent = request.headers.get('user-agent') || '';
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Only intercept social media crawlers
  if (!isCrawler(userAgent)) {
    return fetch(request);
  }

  // Skip API, static files, authenticated routes
  const skipPrefixes = ['/api/', '/dashboard', '/admin', '/vault', '/essays', '/applications', '/profile', '/billing', '/mentor'];
  for (const prefix of skipPrefixes) {
    if (pathname.startsWith(prefix)) {
      return fetch(request);
    }
  }

  // Skip if this is already a re-fetch from the middleware (avoid loop)
  if (request.headers.get('x-vercel-og')) {
    return fetch(request);
  }

  try {
    // Fetch the actual SPA HTML from the origin
    const originResponse = await fetch(request.url, {
      headers: {
        'User-Agent': 'VercelEdge/1.0',
        'x-vercel-og': '1',
      },
    });

    const html = await originResponse.text();

    // Try per-scholarship OG tags for /scholarships/browse/:slug
    let meta = getMeta(pathname);
    const slug = slugFromPath(pathname);
    if (slug) {
      try {
        const apiUrl = `${SITE_URL}/api/scholarships-public-detail?slug=${encodeURIComponent(slug)}`;
        const apiRes = await fetch(apiUrl, { headers: { 'x-vercel-og': '1' } });
        if (apiRes.ok) {
          const data = await apiRes.json();
          const ogImageUrl = buildScholarOgUrl(data);
          const seoDesc = buildScholarDescription(data);
          // Name-first title: "Scholarship Name | Techsari"
          meta = {
            title: `${data.name} | Techsari`,
            description: seoDesc,
            image: ogImageUrl,
            ogTitle: `${data.name} | Techsari`,
            ogDescription: seoDesc,
          };
        } else {
          // API returned non-200 — use a scholarship-aware fallback
          const displayName = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          meta = {
            title: `${displayName} | Techsari`,
            description: `Scholarship opportunity for eligible African students. View eligibility requirements, funding details, deadline and application information.`,
            image: `${SITE_URL}/og-scholarships.png`,
            ogTitle: `${displayName} | Techsari`,
            ogDescription: `Scholarship opportunity for eligible African students. View eligibility, funding details and application information.`,
          };
        }
      } catch {
        // API fetch failed — use a scholarship-aware fallback
        const displayName = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        meta = {
          title: `${displayName} | Techsari`,
          description: `Scholarship opportunity for eligible African students. View eligibility requirements, funding details, deadline and application information.`,
          image: `${SITE_URL}/og-scholarships.png`,
          ogTitle: `${displayName} | Techsari`,
          ogDescription: `Scholarship opportunity for eligible African students. View eligibility, funding details and application information.`,
        };
      }
    }

    const metaTags = buildMetaTags(meta, url.href);

    // Inject meta tags into <head>
    const modifiedHTML = html.replace('<head>', `<head>${metaTags}`);

    return new Response(modifiedHTML, {
      status: 200,
      headers: {
        'content-type': 'text/html;charset=utf-8',
        'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
        'x-og-middleware': '1',
      },
    });
  } catch {
    // If anything fails, pass through normally
    return fetch(request);
  }
}
