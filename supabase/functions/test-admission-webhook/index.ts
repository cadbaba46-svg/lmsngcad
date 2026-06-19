import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Admin-only: validate caller JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admins only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const secret = Deno.env.get("ADMISSIONS_API_SECRET");
    if (!secret) {
      return new Response(
        JSON.stringify({ error: "ADMISSIONS_API_SECRET not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build a harmless sample payload (missing required fields) so the
    // webhook validates the secret and returns 400 without creating a user.
    // If the user passed a custom payload, use that instead.
    let samplePayload: Record<string, unknown> = {
      __test: true,
      application_number: "TEST-PING",
    };
    try {
      if (req.headers.get("content-type")?.includes("application/json")) {
        const body = await req.json();
        if (body && typeof body === "object" && Object.keys(body).length > 0) {
          samplePayload = body as Record<string, unknown>;
        }
      }
    } catch (_) {
      // ignore
    }

    const target = `${supabaseUrl}/functions/v1/admission-webhook`;
    const started = Date.now();
    const res = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admissions-API-Secret": secret,
        // anon key satisfies the platform gateway when verify_jwt=true
        "Authorization": `Bearer ${anonKey}`,
        "apikey": anonKey,
      },
      body: JSON.stringify(samplePayload),
    });
    const elapsedMs = Date.now() - started;
    const text = await res.text();
    let parsed: unknown = text;
    try { parsed = JSON.parse(text); } catch (_) { /* keep text */ }

    // Secret-auth check: a 401 from the webhook means our secret is wrong.
    const secretOk = res.status !== 401;
    // Reachability: any HTTP response means the function is reachable.
    const reachable = true;

    return new Response(
      JSON.stringify({
        ok: secretOk,
        reachable,
        webhook_url: target,
        status: res.status,
        statusText: res.statusText,
        elapsedMs,
        response: parsed,
        sent_payload: samplePayload,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("test-admission-webhook error", err);
    return new Response(
      JSON.stringify({ error: (err as Error)?.message ?? "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});