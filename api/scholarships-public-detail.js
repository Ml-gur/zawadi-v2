import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slug } = req.query;
  if (!slug) {
    return res.status(400).json({ error: 'Slug parameter is required' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, anonKey);

  try {
    const { data, error } = await supabase
      .from('scholarships')
      .select(`
        id,slug,name,provider,countries,degree_levels,funding_type,amount,deadline,
        urgency,description,no_ielts,targets_financial_need,targets_first_generation,
        is_intra_african,updated_at,fields_of_study,instruction_language,host_institution,
        host_country,host_region,targets_rural_origin,targets_ldc_countries,stem_focus,
        development_focus,min_gpa_normalised,requires_leadership,requires_community
      `)
      .eq('slug', slug)
      .eq('published', true)
      .or('deadline.is.null,deadline.gte.' + new Date().toISOString().split('T')[0])
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch scholarship' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Scholarship not found' });
    }

    const result = {
      ...data,
      description: data.description ? data.description.slice(0, 500) : null,
    };

    res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    return res.status(200).json(result);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch scholarship' });
  }
}
