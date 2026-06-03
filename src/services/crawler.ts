import axios from 'axios';
import * as cheerio from 'cheerio';

export const SCHOLARSHIP_SOURCES: string[] = [
  'https://www.scholars4dev.com/category/scholarships-for-africans/',
  'https://www.scholars4dev.com/category/scholarships-for-africans/page/2/',
  'https://www.scholars4dev.com/category/scholarships-for-africans/page/3/',
  'https://www.opportunitydesk.org/category/scholarships/',
  'https://www.opportunitydesk.org/category/scholarships/page/2/',
  'https://www.afterschoolafrica.com/category/scholarships/',
  'https://africabursaries.co.za/scholarships/',
  'https://www.youthop.com/scholarships/for-africans',
  'https://www.chevening.org/scholarships/',
  'https://fulbrightprogram.org/programs/',
  'https://www.daad.de/en/studying-in-germany/scholarships/',
  'https://www.campusfrance.org/en/the-french-government-scholarships',
  'https://www.nuffic.nl/en/subjects/scholarships',
  'https://www.studyinaustralia.gov.au/english/australian-scholarships',
  'https://www.educanada.ca/scholarships-bourses/index.aspx',
  'https://www.studyinsweden.se/scholarships/',
  'https://www.studyinkorea.go.kr/en/sub/gokorea/scholarship.do',
  'https://www.jasso.go.jp/en/study_j/scholarships/',
  'https://www.csc.edu.cn/studyinchina/',
  'https://www.mastercardfdn.org/all-programs/scholars-program/',
  'https://www.gatescambridge.org/apply/',
  'https://rhodeshouse.ox.ac.uk/scholarships/',
  'https://commonwealthscholarships.ac.uk/scholarships/',
  'https://www.agakhanfoundation.org/international-scholarship-programme',
  'https://www.rockefellerbrothers.org/our-work/programs/democratic-practice/',
  'https://www.opensocietyfoundations.org/grants',
  'https://www.moibrahimfoundation.org/fellowship/',
  'https://www.africanleadershipacademy.org/admissions/scholarships/',
  'https://www.undp.org/scholarships',
  'https://www.unesco.org/en/fellowships',
  'https://www.worldbank.org/en/programs/scholarships',
  'https://www.afdb.org/en/news-and-events/afdb-scholarship-program',
];

export interface CrawlResult {
  url: string;
  content: string | null;
  error: string | null;
  crawled_at: string;
}

export async function crawlScholarshipPage(url: string): Promise<CrawlResult> {
  const crawled_at = new Date().toISOString();

  try {
    const response = await axios.get(url, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Zawadi-ScholarshipBot/1.0)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (response.status !== 200) {
      return { url, content: null, error: `HTTP ${response.status}`, crawled_at };
    }

    const html = response.data;
    const $ = cheerio.load(html);

    $('script, style, nav, header, footer, aside, iframe, noscript').remove();
    $('[class*="ad"], [class*="advertisement"], [class*="cookie"], [class*="popup"], [class*="banner"], [class*="sidebar"], [class*="modal"], [class*="overlay"]').remove();
    $('[id*="ad"], [id*="advertisement"], [id*="cookie"], [id*="popup"], [id*="banner"], [id*="sidebar"], [id*="modal"], [id*="overlay"]').remove();

    let text = '';
    const mainSelectors = ['main', 'article', 'div[role=main]', 'div.content', 'div.main'];
    for (const selector of mainSelectors) {
      const el = $(selector).first();
      if (el.length > 0) {
        text = el.text();
        break;
      }
    }
    if (!text.trim()) {
      text = $('body').text();
    }

    text = text.replace(/\s+/g, ' ').trim();

    const lines = text.split('\n').filter((line: string) => line.trim().length >= 20);
    text = lines.join('\n').trim();

    return { url, content: text.length > 0 ? text : null, error: text.length > 0 ? null : 'No content extracted', crawled_at };
  } catch (err: any) {
    return { url, content: null, error: err.message || 'Unknown error', crawled_at };
  }
}

const DEFAULT_DELAY_MS = parseInt(process.env.CRAWL_DELAY_MS || '2000', 10);

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function crawlAllSources(sources?: string[]): Promise<CrawlResult[]> {
  const urls = sources || SCHOLARSHIP_SOURCES;
  const results: CrawlResult[] = [];

  console.log(`[Crawler] Starting crawl of ${urls.length} sources`);

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`[Crawler] [${i + 1}/${urls.length}] Crawling: ${url}`);

    const result = await crawlScholarshipPage(url);
    results.push(result);

    if (result.content) {
      console.log(`[Crawler] [${i + 1}/${urls.length}] Success: ${result.content.length} chars`);
    } else {
      console.log(`[Crawler] [${i + 1}/${urls.length}] Failed: ${result.error}`);
    }

    if (i < urls.length - 1) {
      await delay(DEFAULT_DELAY_MS);
    }
  }

  console.log(`[Crawler] Completed: ${results.filter(r => r.content).length}/${urls.length} succeeded`);
  return results;
}

export async function crawlPaginatedSource(baseUrl: string, maxPages: number = 5): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  let previousContent: string | null = null;

  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1 ? baseUrl : `${baseUrl.replace(/\/$/, '')}/page/${page}/`;
    console.log(`[Crawler] Paginated crawl page ${page}: ${url}`);

    const result = await crawlScholarshipPage(url);
    results.push(result);

    if (!result.content) {
      console.log(`[Crawler] Pagination stopped at page ${page}: no content`);
      break;
    }

    if (previousContent && result.content === previousContent) {
      console.log(`[Crawler] Pagination stopped at page ${page}: duplicate content`);
      break;
    }

    previousContent = result.content;

    if (page < maxPages) {
      await delay(DEFAULT_DELAY_MS);
    }
  }

  return results;
}
