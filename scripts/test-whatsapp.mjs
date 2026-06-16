import https from 'https';

const paths = ['/how-it-works', '/scholarships', '/about', '/faq', '/'];
const ua = 'Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36 WhatsApp/2.23.8.15';
const base = 'https://techsari.online';

function fetchPath(url, redirects = 0) {
  if (redirects > 3) return Promise.resolve({ url, data: '', status: 0 });
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': ua } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location.startsWith('http') ? res.headers.location : base + res.headers.location;
        return fetchPath(loc, redirects + 1).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ url, data, status: res.statusCode }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  for (const p of paths) {
    const { data, status, url } = await fetchPath(base + p);
    const ogTitle = data.match(/<meta property="og:title" content="([^"]+)"/);
    const ogDesc = data.match(/<meta property="og:image" content="([^"]+)"/);
    const ogImage = data.match(/<meta property="og:image" content="([^"]+)"/);
    const title = data.match(/<title>([^<]+)<\/title>/);
    const isRouteSpecific =
      (p === '/how-it-works' && data.includes('og-how-it-works.png')) ||
      (p === '/scholarships' && data.includes('og-scholarships.png')) ||
      (p === '/about' && data.includes('og-about.png')) ||
      (p === '/faq' && data.includes('og-faq.png')) ||
      (p === '/' && data.includes('og-home.png'));
    console.log(`\n=== ${p} (HTTP ${status}) ===`);
    console.log(`title:      ${title ? title[1].substring(0, 70) : 'NOT FOUND'}`);
    console.log(`og:image:   ${ogImage ? ogImage[1].substring(0, 70) : 'NOT FOUND'}`);
    console.log(`route-OG:   ${isRouteSpecific ? '✅ ROUTE-SPECIFIC' : '⚠️  GENERIC/FALLBACK'}`);
  }
}

main().catch(console.error);
