// Vercel Edge Middleware — injects Open Graph meta tags for social media crawlers
// Social bots (WhatsApp, Facebook, Twitter, LinkedIn, etc.) don't execute JS.
// They only read the static HTML. This middleware intercepts their requests,
// fetches the SPA's index.html, and injects route-specific OG tags server-side.

const SITE_URL = 'https://techsari.online';

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
    title: 'Zawadi — Scholarship Matching for African Students',
    description: 'Find scholarships you are eligible to win across all 54 African countries. Strict eligibility filtering removes scholarships you do not qualify for. No IELTS required options included. Free for students.',
    image: `${SITE_URL}/og-home.png`,
    ogTitle: 'Zawadi — Find Scholarships You Actually Qualify For',
    ogDescription: 'Strict eligibility matching for African students. See only scholarships where you meet every requirement. No spam. No data selling. No IELTS barrier.',
  },
  '/scholarships': {
    title: 'Scholarships for African Students — Zawadi',
    description: 'Browse verified scholarships open to students from all 54 African countries. Every listing checked for real eligibility. No IELTS required options. Full funding and partial funding available.',
    image: `${SITE_URL}/og-scholarships.png`,
    ogTitle: 'Scholarships for African Students — Zawadi',
    ogDescription: 'Verified scholarships open to African students. Every listing is checked for active deadlines and real eligibility. See funding from UK, Germany, USA, Japan, and African universities.',
  },
  '/about': {
    title: 'About Zawadi — Scholarship Platform Built for African Students',
    description: 'Zawadi was built to fix the scholarship access gap for African students. We filter out irrelevant results, remove the IELTS barrier, and pair AI essay tools with human mentor review.',
    image: `${SITE_URL}/og-about.png`,
    ogTitle: 'About Zawadi — Built for African Students',
    ogDescription: 'Most scholarship platforms sell student data to advertisers. Zawadi does not. We match students to funding they qualify for and help them apply without wasting time on irrelevant results.',
  },
  '/how-it-works': {
    title: 'How Zawadi Works — Scholarship Matching for African Students',
    description: 'Create a profile in three minutes. See scholarships you qualify for. Build your application with AI that learns your writing style. Get mentor review before you submit.',
    image: `${SITE_URL}/og-how-it-works.png`,
    ogTitle: 'How Zawadi Works — From Profile to Scholarship Application',
    ogDescription: 'Four steps from registration to submitted application. Zawadi handles eligibility filtering, essay drafting, and human mentor review so African students can focus on applying.',
  },
  '/faq': {
    title: 'Scholarship FAQ for African Students — Zawadi',
    description: 'Answers to common questions about finding scholarships as an African student. Covers IELTS alternatives, eligibility matching, how to apply, and which countries qualify.',
    image: `${SITE_URL}/og-faq.png`,
    ogTitle: 'Scholarship FAQ for African Students — Zawadi',
    ogDescription: 'Common questions about scholarships for African students. IELTS requirements, application tips, eligibility criteria, and how the Zawadi matching system works.',
  },
  '/contact': {
    title: 'Contact Zawadi — Get Help or Partner With Us',
    description: 'Contact the Zawadi team for student support, scholarship provider listings, institutional partnerships, or press inquiries.',
    image: `${SITE_URL}/og-image.png`,
    ogTitle: 'Contact Zawadi — We\'re Here to Help',
    ogDescription: 'Reach out to the Zawadi team for student support, institutional partnerships, or scholarship provider inquiries. We respond within 24 hours.',
  },
  '/privacy': {
    title: 'Privacy Policy — Techsari Zawadi',
    description: 'Techsari Zawadi Privacy Policy — how we collect, use, and protect your data as an African student using our scholarship platform.',
    image: `${SITE_URL}/og-image.png`,
  },
  '/terms': {
    title: 'Terms of Service — Techsari Zawadi',
    description: 'Techsari Zawadi Terms of Service — the terms governing your use of our AI-powered scholarship platform for African students.',
    image: `${SITE_URL}/og-image.png`,
  },
};

function getMeta(pathname: string): RouteMeta {
  const normalized = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  return ROUTE_META[normalized] || ROUTE_META['/scholarships'];
}

function buildMetaTags(meta: RouteMeta, url: string): string {
  const title = meta.ogTitle || meta.title;
  const desc = meta.ogDescription || meta.description;
  return `
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(meta.title)}</title>
<meta name="description" content="${escapeHtml(meta.description)}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${escapeHtml(url)}" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(desc)}" />
<meta property="og:image" content="${escapeHtml(meta.image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${escapeHtml(title)}" />
<meta property="og:site_name" content="Zawadi" />
<meta property="og:locale" content="en_US" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(desc)}" />
<meta name="twitter:image" content="${escapeHtml(meta.image)}" />
<meta name="twitter:image:alt" content="${escapeHtml(title)}" />
<meta name="twitter:site" content="@techsari" />
<meta name="twitter:creator" content="@techsari" />
`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
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
    const meta = getMeta(pathname);
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
