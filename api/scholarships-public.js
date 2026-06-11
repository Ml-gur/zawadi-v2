import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, anonKey);

  try {
    const countQuery = supabase
      .from('scholarships')
      .select('id', { count: 'exact', head: true })
      .eq('published', true)
      .or('deadline.is.null,deadline.gte.' + new Date().toISOString().split('T')[0]);

    const dataQuery = supabase
      .from('scholarships')
      .select('id,slug,name,provider,countries,degree_levels,funding_type,amount,deadline,urgency,description,no_ielts,targets_financial_need,targets_first_generation,is_intra_african,updated_at')
      .eq('published', true)
      .or('deadline.is.null,deadline.gte.' + new Date().toISOString().split('T')[0])
      .order('deadline', { ascending: true, nullsLast: true })
      .range(offset, offset + limit - 1);

    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

    if (countResult.error) {
      return res.status(500).json({ error: 'Failed to fetch scholarships' });
    }
    if (dataResult.error) {
      return res.status(500).json({ error: 'Failed to fetch scholarships' });
    }

    const scholarships = (dataResult.data || []).map(s => ({
      ...s,
      description: s.description ? s.description.slice(0, 300) : null,
    }));

    res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    return res.status(200).json({
      scholarships,
      total: countResult.count || 0,
      page,
      limit,
      hasMore: offset + limit < (countResult.count || 0),
    });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch scholarships' });
  }
}
