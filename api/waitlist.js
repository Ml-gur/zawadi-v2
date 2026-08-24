import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body || {};

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return res.status(500).json({ error: 'Something went wrong, please try again' });
  }

  const supabase = createClient(supabaseUrl, anonKey);

  try {
    const { error } = await supabase
      .from('waitlist')
      .insert({ email: email.trim().toLowerCase() });

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'This email is already on the waitlist' });
      }
      return res.status(500).json({ error: 'Something went wrong, please try again' });
    }

    return res.status(200).json({ success: true, message: 'You are on the list!' });
  } catch (err) {
    return res.status(500).json({ error: 'Something went wrong, please try again' });
  }
}
