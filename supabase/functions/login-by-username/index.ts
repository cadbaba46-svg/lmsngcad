import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return new Response(JSON.stringify({ error: "Identifier and password are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let email = identifier;

    // Check if identifier is not an email (i.e., it's a registration number)
    if (!identifier.includes("@")) {
      // Case-insensitive, dash/space-insensitive lookup
      const { data: userId, error: lookupErr } = await supabaseAdmin
        .rpc("find_user_id_by_login", { _identifier: identifier });

      if (lookupErr || !userId) {
        return new Response(JSON.stringify({ error: "Invalid username or password" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId as string);
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Invalid username or password" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      email = user.email;
    }

    // Validate credentials server-side BEFORE returning the email to prevent
    // username/email enumeration. Use the anon client so we don't create a session here.
    const verifyClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { error: signInErr } = await verifyClient.auth.signInWithPassword({ email, password });
    if (signInErr) {
      return new Response(JSON.stringify({ error: "Invalid username or password" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error('login-by-username error', err);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
