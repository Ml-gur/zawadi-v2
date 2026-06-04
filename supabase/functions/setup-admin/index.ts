import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req: Request) => {
  const origin = req.headers.get('origin') || ''
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const setupSecret = req.headers.get('x-setup-secret')
    const expected = Deno.env.get('SETUP_ADMIN_SECRET')
    if (!expected || setupSecret !== expected) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: corsHeaders,
      })
    }

    const { email, password } = await req.json()
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'email and password required' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check if auth user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existing = existingUsers?.users?.find(u => u.email === email)
    if (existing) {
      return new Response(JSON.stringify({ error: 'Admin auth user already exists', user_id: existing.id }), {
        status: 409,
        headers: corsHeaders,
      })
    }

    // Fetch old profile data before it's overwritten by the trigger
    const { data: oldProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    // Create auth user — trigger will create a new profile row
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: oldProfile ? {
        name: oldProfile.name || '',
        country: oldProfile.country || '',
      } : {},
    })

    if (createErr || !newUser?.user) {
      return new Response(JSON.stringify({ error: createErr?.message || 'Failed to create user' }), {
        status: 500,
        headers: corsHeaders,
      })
    }

    const newUserId = newUser.user.id

    // Update the new profile with old profile data and super_admin role
    const profileUpdate: Record<string, unknown> = {}
    if (oldProfile) {
      const copyFields = ['name', 'country', 'plan', 'gpa', 'field_of_study', 'degree_level', 'institution', 'date_of_birth', 'phone', 'gender', 'native_language', 'financial_need', 'has_research', 'has_leadership', 'work_experience_years', 'publications', 'destination_openness', 'english_test_type', 'essays_written', 'voice_profile', 'essay_style_notes', 'confirmed_fields']
      for (const f of copyFields) {
        if (oldProfile[f] !== undefined && oldProfile[f] !== null) {
          profileUpdate[f] = oldProfile[f]
        }
      }
    }
    profileUpdate.role = 'super_admin'
    profileUpdate.updated_at = new Date().toISOString()

    const { error: updateErr } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', newUserId)

    if (updateErr) {
      console.error('[setup-admin] Failed to update profile:', updateErr.message)
    }

    // Delete the old profile row if it had a different id
    if (oldProfile && oldProfile.id !== newUserId) {
      await supabase.from('profiles').delete().eq('id', oldProfile.id)
    }

    return new Response(JSON.stringify({
      success: true,
      user_id: newUserId,
      email,
    }), { status: 200, headers: corsHeaders })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    })
  }
})
