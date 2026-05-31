import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { session_id, answers } = await req.json();
    if (!session_id || !Array.isArray(answers)) {
      return new Response(JSON.stringify({ error: 'session_id and answers[] required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: session, error: sErr } = await admin
      .from('quiz_sessions')
      .select('*')
      .eq('id', session_id)
      .maybeSingle();

    if (sErr || !session || session.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (session.consumed) {
      return new Response(JSON.stringify({ error: 'Quiz already submitted' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (new Date(session.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Quiz session expired' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const qs: { correct_index: number }[] = session.questions;
    if (answers.length !== qs.length) {
      return new Response(JSON.stringify({ error: 'Answer count mismatch' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let correct = 0;
    for (let i = 0; i < qs.length; i++) {
      if (Number(answers[i]) === qs[i].correct_index) correct++;
    }
    const passed = correct >= session.pass_threshold;

    // Mark session consumed
    await admin.from('quiz_sessions').update({ consumed: true }).eq('id', session_id);

    // Upsert completion (service role; client RLS no longer allows writes)
    const { data: existing } = await admin
      .from('lecture_completions')
      .select('attempts')
      .eq('user_id', userId)
      .eq('lecture_id', session.lecture_id)
      .maybeSingle();
    const attempts = ((existing as any)?.attempts || 0) + 1;

    await admin.from('lecture_completions').upsert(
      {
        user_id: userId,
        lecture_id: session.lecture_id,
        attempts,
        last_score: correct,
        passed,
        completed_at: passed ? new Date().toISOString() : null,
      },
      { onConflict: 'user_id,lecture_id' }
    );

    return new Response(
      JSON.stringify({ passed, score: correct, total: qs.length, threshold: session.pass_threshold }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});