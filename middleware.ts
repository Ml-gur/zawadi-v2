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
    image: `${SITE_URL}/og-home-v2.png`,
    ogTitle: 'Techsari | Scholarships Matched to You',
    ogDescription: 'An end-to-end scholarship platform for African students. Find scholarships matched to your profile, prepare applications with AI, and get support from mentors.',
  },
  '/scholarships': {
    title: 'Scholarships for African Students | Techsari',
    description: 'Browse verified scholarships open to students from all 54 African countries. Every listing checked for active deadlines and real eligibility. Full funding and partial funding available.',
    image: `${SITE_URL}/og-scholarships-v2.png`,
    ogTitle: 'Scholarships for African Students | Techsari',
    ogDescription: 'Browse verified scholarships open to African students. Every listing is checked for active deadlines and real eligibility. Full and partial funding from universities worldwide.',
  },
  '/scholarships/browse': {
    title: 'Scholarships for African Students | Techsari',
    description: 'Browse verified scholarships open to students from all 54 African countries. Every listing checked for active deadlines and real eligibility. Full funding and partial funding available.',
    image: `${SITE_URL}/og-scholarships-v2.png`,
    ogTitle: 'Scholarships for African Students | Techsari',
    ogDescription: 'Browse verified scholarships open to African students. Every listing is checked for active deadlines and real eligibility. Full and partial funding from universities worldwide.',
  },
  '/about': {
    title: 'About Techsari | Scholarship Platform for African Students',
    description: 'Techsari was built to fix the scholarship access gap for African students. We filter out irrelevant results, remove the IELTS barrier, and pair AI essay tools with human mentor review.',
    image: `${SITE_URL}/og-about-v2.png`,
    ogTitle: 'About Techsari | Built for African Students',
    ogDescription: 'Most scholarship platforms sell student data to advertisers. Techsari does not. We match students to funding they qualify for and help them apply without wasting time.',
  },
  '/how-it-works': {
    title: 'How Techsari Works | Scholarship Matching for African Students',
    description: 'Create a profile in three minutes. See scholarships you qualify for. Build your application with AI that learns your writing style. Get mentor review before you submit.',
    image: `${SITE_URL}/og-how-it-works-v2.png`,
    ogTitle: 'How Techsari Works | Profile to Application',
    ogDescription: 'Four steps from registration to submitted application. Techsari handles eligibility filtering, essay drafting, and human mentor review so you can focus on applying.',
  },
  '/faq': {
    title: 'Scholarship FAQ for African Students | Techsari',
    description: 'Answers to common questions about finding scholarships as an African student. Covers IELTS alternatives, eligibility matching, how to apply, and which countries qualify.',
    image: `${SITE_URL}/og-faq-v2.png`,
    ogTitle: 'Scholarship FAQ | Techsari',
    ogDescription: 'Common questions about scholarships for African students. IELTS requirements, application tips, eligibility criteria, and how the Techsari matching system works.',
  },
  '/contact': {
    title: 'Contact Techsari | Get Help or Partner With Us',
    description: 'Contact the Techsari team for student support, scholarship provider listings, institutional partnerships, or press inquiries.',
    image: `${SITE_URL}/og-image-v2.png`,
    ogTitle: 'Contact Techsari',
    ogDescription: 'Reach out to the Techsari team for student support, institutional partnerships, or scholarship provider inquiries. We respond within 24 hours.',
  },
  '/privacy': {
    title: 'Privacy Policy | Techsari',
    description: 'How Techsari collects, uses, and protects your data as an African student using our scholarship platform.',
    image: `${SITE_URL}/og-image-v2.png`,
  },
  '/terms': {
    title: 'Terms of Service | Techsari',
    description: 'The terms governing your use of Techsari, an AI-powered scholarship platform for African students.',
    image: `${SITE_URL}/og-image-v2.png`,
  },
};

function normalizePath(pathname: string): string {
  return pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
}

// Public SPA routes that exist but carry no route-specific meta of their own
const OTHER_PUBLIC_ROUTES = new Set(['/forgot-password', '/reset-password']);

const NOT_FOUND_META: RouteMeta = {
  title: 'Page Not Found | Techsari',
  description: 'The page you are looking for does not exist. Browse verified scholarships for African students on Techsari.',
  image: `${SITE_URL}/og-image-v2.png`,
};

// Returns null when the path is not a route the SPA serves, so crawlers get a real 404
function getMeta(pathname: string): RouteMeta | null {
  const normalized = normalizePath(pathname);
  // React Router matches case-insensitively, so /About renders the About page too
  const lower = normalized.toLowerCase();
  if (ROUTE_META[lower]) return ROUTE_META[lower];
  if (OTHER_PUBLIC_ROUTES.has(lower)) return ROUTE_META['/'];
  // /scholarships/:slug is a client-side redirect to /scholarships/browse/:slug
  if (/^\/scholarships\/(browse\/)?[^/]+$/.test(normalized)) return ROUTE_META['/scholarships'];
  return null;
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

function buildMetaTags(meta: RouteMeta, url: string, noindex = false): string {
  const title = meta.ogTitle || meta.title;
  const desc = meta.ogDescription || meta.description;
  const indexing = noindex
    ? '<meta name="robots" content="noindex" />'
    : `<link rel="canonical" href="${escapeHtml(url)}" />`;
  return `\n${indexing}\n<title>${escapeHtml(meta.title)}</title>\n<meta name="description" content="${escapeHtml(meta.description)}" />\n<meta property="og:type" content="website" />\n<meta property="og:url" content="${escapeHtml(url)}" />\n<meta property="og:title" content="${escapeHtml(title)}" />\n<meta property="og:description" content="${escapeHtml(desc)}" />\n<meta property="og:image" content="${escapeHtml(meta.image)}" />\n<meta property="og:image:width" content="1200" />\n<meta property="og:image:height" content="630" />\n<meta property="og:image:alt" content="${escapeHtml(title)}" />\n<meta property="og:site_name" content="Techsari" />\n<meta property="og:locale" content="en_US" />\n<meta name="twitter:card" content="summary_large_image" />\n<meta name="twitter:title" content="${escapeHtml(title)}" />\n<meta name="twitter:description" content="${escapeHtml(desc)}" />\n<meta name="twitter:image" content="${escapeHtml(meta.image)}" />\n<meta name="twitter:image:alt" content="${escapeHtml(title)}" />\n<meta name="twitter:site" content="@techsari" />\n<meta name="twitter:creator" content="@techsari" />\n`;
}

// The SPA shell ships generic fallback tags. Remove them before injecting the
// route-specific set, otherwise crawlers see two <title>s and conflicting og:* tags.
function stripDefaultHeadTags(html: string): string {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<link rel="canonical"[^>]*>\s*/gi, '')
    .replace(/<meta name="(?:description|robots)"[^>]*>\s*/gi, '')
    .replace(/<meta property="og:[^"]*"[^>]*>\s*/gi, '')
    .replace(/<meta name="twitter:[^"]*"[^>]*>\s*/gi, '');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webmanifest|js|css|json|xml|txt)).*)',
  ],
};

// Returning undefined lets Vercel continue to the origin without an extra subrequest
export default async function middleware(request: Request): Promise<Response | undefined> {
  const userAgent = request.headers.get('user-agent') || '';
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Only intercept social media crawlers
  if (!isCrawler(userAgent)) {
    return undefined;
  }

  // Skip API, static files, authenticated routes
  const skipPrefixes = ['/api/', '/dashboard', '/admin', '/vault', '/essays', '/applications', '/profile', '/billing', '/mentor'];
  for (const prefix of skipPrefixes) {
    if (pathname.startsWith(prefix)) {
      return undefined;
    }
  }

  // Skip if this is already a re-fetch from the middleware (avoid loop)
  if (request.headers.get('x-vercel-og')) {
    return undefined;
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
    const routeMeta = getMeta(pathname);
    let notFound = routeMeta === null;
    let meta: RouteMeta = routeMeta || NOT_FOUND_META;
    const slug = notFound ? null : slugFromPath(pathname);

    // Canonical must match what the client-side <SEO> component emits, or
    // Google sees two disagreeing canonicals after rendering and ignores both.
    const normalizedPath = normalizePath(pathname);
    let canonicalPath = ROUTE_META[normalizedPath.toLowerCase()] ? normalizedPath.toLowerCase() : normalizedPath;
    const legacySlug = normalizedPath.match(/^\/scholarships\/(?!browse(?:\/|$))([^/]+)$/);
    if (legacySlug) canonicalPath = `/scholarships/browse/${legacySlug[1]}`;

    if (slug) {
      try {
        const apiUrl = `${SITE_URL}/api/scholarships-public-detail?slug=${encodeURIComponent(slug)}`;
        const apiRes = await fetch(apiUrl, { headers: { 'x-vercel-og': '1' } });
        if (apiRes.ok) {
          const data = await apiRes.json();
          const ogImageUrl = buildScholarOgUrl(data);
          const seoDesc = buildScholarDescription(data);
          // PublicScholarshipDetail uses slug || id, so an id URL canonicalises to the slug URL
          const key = data.slug || data.id;
          if (key) canonicalPath = `/scholarships/browse/${encodeURIComponent(String(key))}`;
          // Name-first title: "Scholarship Name | Techsari"
          meta = {
            title: `${data.name} | Techsari`,
            description: seoDesc,
            image: ogImageUrl,
            ogTitle: `${data.name} | Techsari`,
            ogDescription: seoDesc,
          };
        } else if (apiRes.status === 404 || apiRes.status === 400) {
          // Unpublished/unknown scholarship, or a slug the API rejects outright — tell crawlers it is gone
          notFound = true;
          meta = NOT_FOUND_META;
        } else {
          // API error — use a scholarship-aware fallback
          const displayName = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          meta = {
            title: `${displayName} | Techsari`,
            description: `Scholarship opportunity for eligible African students. View eligibility requirements, funding details, deadline and application information.`,
            image: `${SITE_URL}/og-scholarships-v2.png`,
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
          image: `${SITE_URL}/og-scholarships-v2.png`,
          ogTitle: `${displayName} | Techsari`,
          ogDescription: `Scholarship opportunity for eligible African students. View eligibility, funding details and application information.`,
        };
      }
    }

    const canonicalUrl = `${SITE_URL}${canonicalPath}`;
    // data-mw marks these tags so src/main.tsx can remove them before React's
    // <SEO> adds its own — otherwise JS-rendering crawlers (Googlebot, Bingbot)
    // would see every tag twice in the rendered DOM.
    const metaTags = buildMetaTags(meta, canonicalUrl, notFound).replace(/<(title|meta|link)\b/g, '<$1 data-mw');

    // Replace the shell's generic tags with the route-specific set.
    // Function replacer: metaTags holds DB text, and a "$&" or "$'" in a
    // scholarship name would otherwise be expanded by String.replace.
    const modifiedHTML = stripDefaultHeadTags(html).replace('</head>', () => `${metaTags}</head>`);

    return new Response(modifiedHTML, {
      status: notFound ? 404 : 200,
      headers: {
        'content-type': 'text/html;charset=utf-8',
        'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
        'x-og-middleware': '1',
      },
    });
  } catch {
    // If anything fails, pass through normally
    return undefined;
  }
}
