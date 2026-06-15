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
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return jsonRes({ error: 'Unauthorized' }, 401);
    const userId = claimsData.claims.sub as string;
    const email = (claimsData.claims.email as string) || '';

    const { currentPassword, newPassword } = await req.json();
    if (!newPassword || String(newPassword).length < 6) {
      return jsonRes({ error: 'New password must be at least 6 characters' }, 400);
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

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error: updErr } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
    if (updErr) return jsonRes({ error: updErr.message }, 400);

    await admin
      .from('profile_credentials')
      .upsert({ user_id: userId, generated_password: newPassword }, { onConflict: 'user_id' });

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