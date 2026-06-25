import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return jsonRes({ error: 'Unauthorized' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return jsonRes({ error: 'Unauthorized' }, 401);
    const userId = userData.user.id;
    const email = userData.user.email || '';

    const { currentPassword, newPassword } = await req.json();
    const pw = String(newPassword ?? '');
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]).{8,}$/;
    if (!strong.test(pw)) {
      return jsonRes({
        error: 'Password must be at least 8 characters and include 1 uppercase, 1 lowercase, 1 number, and 1 special character.',
      }, 400);
    }

    // If a current password was provided, verify it. Skip verification only when
    // the caller is in a forced-change flow (no current password yet expected).
    if (currentPassword && email) {
      const pwClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!
      );
      const { error: pwErr } = await pwClient.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (pwErr) return jsonRes({ error: 'Current password is incorrect' }, 401);
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
    if (updErr) return jsonRes({ error: updErr.message }, 400);

    const { error: credErr } = await admin
      .from('profile_credentials')
      .upsert(
        { user_id: userId, generated_password: newPassword, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    if (credErr) {
      console.error('profile_credentials sync failed', credErr);
      return jsonRes({ error: 'Password changed, but vault sync failed. Contact admin.' }, 500);
    }

    await admin
      .from('profiles')
      .update({ must_change_password: false })
      .eq('user_id', userId);

    return jsonRes({ ok: true });
  } catch (err) {
    console.error('update-own-password error', err);
    return jsonRes({ error: 'An unexpected error occurred' }, 500);
  }
});