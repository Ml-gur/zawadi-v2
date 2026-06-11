import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    res.status(500).end();
    return;
  }

  const supabase = createClient(supabaseUrl, anonKey);

  try {
    const { data } = await supabase
      .from('scholarships')
      .select('slug,updated_at')
      .eq('published', true)
      .or('deadline.is.null,deadline.gte.' + new Date().toISOString().split('T')[0])
      .order('updated_at', { ascending: false });

    const today = new Date().toISOString().split('T')[0];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    const staticPages = [
      { loc: 'https://techsari.online/', freq: 'weekly', priority: '1.0' },
      { loc: 'https://techsari.online/scholarships/browse', freq: 'daily', priority: '0.9' },
      { loc: 'https://techsari.online/about', freq: 'monthly', priority: '0.5' },
      { loc: 'https://techsari.online/faq', freq: 'monthly', priority: '0.5' },
      { loc: 'https://techsari.online/how-it-works', freq: 'monthly', priority: '0.6' },
    ];

    for (const page of staticPages) {
      xml += '  <url>\n';
      xml += `    <loc>${page.loc}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>${page.freq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    }

    if (data) {
      for (const s of data) {
        const lastmod = s.updated_at ? s.updated_at.split('T')[0] : today;
        xml += '  <url>\n';
        xml += `    <loc>https://techsari.online/scholarships/browse/${encodeURIComponent(s.slug)}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.8</priority>\n';
        xml += '  </url>\n';
      }
    }

    xml += '</urlset>';

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=43200');
    return res.status(200).send(xml);
  } catch {
    res.status(500).end();
  }
}
