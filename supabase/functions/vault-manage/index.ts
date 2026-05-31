import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as OTPAuth from 'npm:otpauth@9';

const ISSUER = 'NGCAD LMS Vault';

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

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return jsonRes({ error: 'Unauthorized' }, 401);
    const userId = claimsData.claims.sub as string;
    const userEmail = (claimsData.claims.email as string) || 'admin';

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify caller is admin
    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleRow) return jsonRes({ error: 'Forbidden' }, 403);

    const { action, otp, password } = await req.json();

    if (action === 'status') {
      const { data } = await admin
        .from('admin_totp_secrets')
        .select('verified')
        .eq('user_id', userId)
        .maybeSingle();
      return jsonRes({ has_secret: !!data, verified: !!data?.verified });
    }

    if (action === 'setup_init' || action === 'reset') {
      const secret = new OTPAuth.Secret({ size: 20 }).base32;
      await admin.from('admin_totp_secrets').upsert(
        { user_id: userId, secret, verified: false },
        { onConflict: 'user_id' }
      );
      const totp = new OTPAuth.TOTP({ issuer: ISSUER, label: userEmail, secret });
      return jsonRes({ secret, otpauth_url: totp.toString() });
    }

    if (action === 'setup_verify') {
      if (!otp) return jsonRes({ error: 'OTP required' }, 400);
      const { data: row } = await admin
        .from('admin_totp_secrets')
        .select('secret, verified')
        .eq('user_id', userId)
        .maybeSingle();
      if (!row) return jsonRes({ error: 'No setup in progress' }, 400);
      const totp = new OTPAuth.TOTP({ issuer: ISSUER, label: userEmail, secret: row.secret });
      const delta = totp.validate({ token: String(otp).replace(/\s+/g, ''), window: 1 });
      if (delta === null) return jsonRes({ error: 'Invalid code' }, 400);
      await admin.from('admin_totp_secrets').update({ verified: true }).eq('user_id', userId);
      return jsonRes({ ok: true });
    }

    if (action === 'unlock') {
      if (!password || !otp) return jsonRes({ error: 'Password and OTP required' }, 400);
      // Verify password without affecting the user's existing session: use an isolated client.
      const pwClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!
      );
      const { error: pwErr } = await pwClient.auth.signInWithPassword({
        email: userEmail,
        password,
      });
      if (pwErr) return jsonRes({ error: 'Incorrect password' }, 401);

      const { data: row } = await admin
        .from('admin_totp_secrets')
        .select('secret, verified')
        .eq('user_id', userId)
        .maybeSingle();
      if (!row || !row.verified) return jsonRes({ error: '2FA not configured' }, 400);
      const totp = new OTPAuth.TOTP({ issuer: ISSUER, label: userEmail, secret: row.secret });
      const delta = totp.validate({ token: String(otp).replace(/\s+/g, ''), window: 1 });
      if (delta === null) return jsonRes({ error: 'Invalid 2FA code' }, 401);

      const { data: rows } = await admin
        .from('profiles')
        .select('user_id, full_name, email, roll_number, generated_password')
        .order('created_at', { ascending: false });
      return jsonRes({ rows: rows || [] });
    }

    return jsonRes({ error: 'Unknown action' }, 400);
  } catch (err) {
    console.error('vault-manage error', err);
    return jsonRes({ error: 'An unexpected error occurred' }, 500);
  }
});