import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface MCQ {
  question: string;
  options: string[];
  correct_index: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Require an authenticated user to prevent AI credit drain
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

    const { title, description, video_url, video_type } = await req.json();
    if (!title || !video_url) {
      return new Response(JSON.stringify({ error: 'title and video_url required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const seed = Math.random().toString(36).slice(2, 10);
    const sysPrompt = `You are an expert instructional designer. Generate exactly 10 multiple-choice questions strictly derived from the actual content, topics, concepts, and details of the given video lecture. Each question must have 4 plausible options with exactly one correct answer. Questions must be specific to the lecture content — not generic. Vary difficulty. Randomize phrasing (seed:${seed}).`;

    const userPrompt = `Lecture title: ${title}
Video URL: ${video_url} (${video_type})
${description ? `Lecture content / transcript / notes:\n${description}` : 'No transcript provided — infer the content from the video URL context and the title.'}

Return JSON with this exact shape:
{
  "questions": [
    { "question": "...", "options": ["A","B","C","D"], "correct_index": 0 },
    ... 10 total
  ]
}`;

    // Use Lovable AI Gateway directly for JSON output (multimodal video URL support varies via OpenAI-compat;
    // we pass the URL as context. For richer multimodal, Gemini Pro 2.5 can fetch YouTube transcripts when given the URL.)
    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: 'AI rate limit exceeded. Try again shortly.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'AI generation failed', detail: text }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const json = await aiRes.json();
    const content = json.choices?.[0]?.message?.content || '{}';
    let parsed: { questions?: MCQ[] };
    try { parsed = JSON.parse(content); } catch { parsed = {}; }
    const questions = (parsed.questions || []).slice(0, 10).filter(
      (q) => q && typeof q.question === 'string' && Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.correct_index)
    );

    if (questions.length < 5) {
      return new Response(JSON.stringify({ error: 'AI could not generate enough questions. Add more context in the lecture description.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Shuffle option order per question while keeping correct index aligned
    const shuffled = questions.map((q) => {
      const order = shuffle(q.options.map((_, i) => i));
      const newOptions = order.map((i) => q.options[i]);
      const newCorrect = order.indexOf(q.correct_index);
      return { question: q.question, options: newOptions, correct_index: newCorrect };
    });

    return new Response(JSON.stringify({ questions: shuffle(shuffled) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});