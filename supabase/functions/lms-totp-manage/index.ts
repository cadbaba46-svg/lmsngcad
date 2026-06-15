import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as OTPAuth from 'npm:otpauth@9';

const ISSUER = 'NGCAD LMS';
const SESSION_HOURS = 12;

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
    const userEmail = (claimsData.claims.email as string) || 'user';

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { action, otp } = await req.json();

    if (action === 'status') {
      const { data: row } = await admin
        .from('lms_totp_secrets')
        .select('verified')
        .eq('user_id', userId)
        .maybeSingle();
      const { data: sess } = await admin
        .from('lms_totp_sessions')
        .select('expires_at')
        .eq('user_id', userId)
        .order('verified_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const session_valid = !!sess && new Date(sess.expires_at).getTime() > Date.now();
      return jsonRes({
        has_secret: !!row,
        verified: !!row?.verified,
        session_valid,
      });
    }

    if (action === 'setup_init' || action === 'reset') {
      let secret: string | null = null;
      if (action === 'setup_init') {
        const { data: existing } = await admin
          .from('lms_totp_secrets')
          .select('secret, verified')
          .eq('user_id', userId)
          .maybeSingle();
        if (existing && !existing.verified) secret = existing.secret as string;
      }
      if (!secret) {
        secret = new OTPAuth.Secret({ size: 20 }).base32;
        await admin.from('lms_totp_secrets').upsert(
          { user_id: userId, secret, verified: false },
          { onConflict: 'user_id' }
        );
        // Clear any existing sessions when a new secret is issued
        await admin.from('lms_totp_sessions').delete().eq('user_id', userId);
      }
      const totp = new OTPAuth.TOTP({ issuer: ISSUER, label: userEmail, secret });
      return jsonRes({ secret, otpauth_url: totp.toString() });
    }

    if (action === 'setup_verify' || action === 'verify_session') {
      if (!otp) return jsonRes({ error: 'OTP required' }, 400);
      const { data: row } = await admin
        .from('lms_totp_secrets')
        .select('secret, verified')
        .eq('user_id', userId)
        .maybeSingle();
      if (!row) return jsonRes({ error: 'No authenticator configured' }, 400);
      const totp = new OTPAuth.TOTP({ issuer: ISSUER, label: userEmail, secret: row.secret });
      const delta = totp.validate({ token: String(otp).replace(/\s+/g, ''), window: 1 });
      if (delta === null) return jsonRes({ error: 'Invalid code' }, 400);

      if (action === 'setup_verify' && !row.verified) {
        await admin.from('lms_totp_secrets').update({ verified: true }).eq('user_id', userId);
      }

      const expires = new Date(Date.now() + SESSION_HOURS * 3600 * 1000).toISOString();
      await admin.from('lms_totp_sessions').insert({
        user_id: userId,
        verified_at: new Date().toISOString(),
        expires_at: expires,
      });
      return jsonRes({ ok: true, expires_at: expires });
    }

    return jsonRes({ error: 'Unknown action' }, 400);
  } catch (err) {
    console.error('lms-totp-manage error', err);
    return jsonRes({ error: 'An unexpected error occurred' }, 500);
  }
});