import { useEffect, useState } from 'react';
import type { ScholarshipTeaser } from '../pages/public/browse-shared';

// Every open listing (~160 rows today). The directory, the hub pages and the
// "related scholarships" block all filter this same list, so filters work
// across the whole database instead of only the rows on screen, and the
// request is made once per visit.
const PAGE_SIZE = 200; // the API's maximum page size

const EMPTY: ScholarshipTeaser[] = [];

let cache: Promise<ScholarshipTeaser[]> | null = null;

async function fetchPage(page: number): Promise<{ scholarships: ScholarshipTeaser[]; total: number }> {
  const r = await fetch(`/api/scholarships-public?page=${page}&limit=${PAGE_SIZE}`);
  if (!r.ok) throw new Error(String(r.status));
  const d = await r.json();
  return { scholarships: d.scholarships || [], total: Number(d.total) || 0 };
}

async function fromApi(): Promise<ScholarshipTeaser[]> {
  const first = await fetchPage(1);
  const all = [...first.scholarships];
  // Page through instead of silently dropping the latest deadlines past 200
  for (let page = 2; all.length < first.total && page <= 10; page++) {
    const next = await fetchPage(page);
    if (next.scholarships.length === 0) break;
    all.push(...next.scholarships);
  }
  return all;
}

// Same query the API runs, for local dev where /api is not served
async function fromSupabase(): Promise<ScholarshipTeaser[]> {
  const { supabase } = await import('./supabase');
  const today = new Date().toISOString().split('T')[0];
  const base = 'id,slug,name,provider,countries,degree_levels,funding_type,amount,deadline,urgency,description,no_ielts,targets_financial_need,targets_first_generation,is_intra_african,fields_of_study,host_region,iso2,opens_at,updated_at';
  const run = (columns: string) => supabase.from('scholarships').select(columns)
    .eq('published', true).or(`deadline.is.null,deadline.gte.${today}`)
    .order('deadline', { ascending: true, nullsFirst: false }).range(0, 999);
  let res: any = await run(base);
  // migration 015 (opens_at) not applied yet — retry without the column
  if (res.error && (res.error.code === 'PGRST204' || res.error.code === '42703' || /opens_at/.test(res.error.message || ''))) {
    res = await run(base.replace(',opens_at', ''));
  }
  if (res.error) throw res.error;
  return (res.data || []).map((s: any) => ({ ...s, description: s.description ? String(s.description).slice(0, 300) : null }));
}

export function loadPublicScholarships(): Promise<ScholarshipTeaser[]> {
  if (!cache) {
    cache = fromApi().catch(fromSupabase);
    // A failure must not stick for the whole visit — let the next mount retry
    cache.catch(() => { cache = null; });
  }
  return cache;
}

/**
 * `error` is true when the list could not be loaded at all. Callers must show
 * an error state (and keep the page out of the index) rather than rendering
 * "no scholarships", which is indistinguishable from an empty database.
 */
export function usePublicScholarships() {
  const [state, setState] = useState<{ items: ScholarshipTeaser[] | null; error: boolean }>({ items: null, error: false });
  useEffect(() => {
    let cancelled = false;
    loadPublicScholarships().then(
      list => { if (!cancelled) setState({ items: list, error: false }); },
      () => { if (!cancelled) setState({ items: EMPTY, error: true }); },
    );
    return () => { cancelled = true; };
  }, []);
  return { items: state.items ?? EMPTY, loading: state.items === null, error: state.error };
}
