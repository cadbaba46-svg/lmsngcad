import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function genOtp(): string {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return (n[0] % 1000000).toString().padStart(6, "0");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const email = (body.email || "").trim().toLowerCase();
    const cnic = (body.cnic || "").trim();
    const isAdminFlow = !!body.adminFlow;

    if (!email || (!cnic && !isAdminFlow)) {
      return new Response(JSON.stringify({ error: "Email and CNIC are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up profile by email (+ cnic for non-admin flow)
    let profileQuery = admin
      .from("profiles")
      .select("user_id, full_name, email, cnic")
      .ilike("email", email);
    if (!isAdminFlow) profileQuery = profileQuery.eq("cnic", cnic);
    const { data: profile } = await profileQuery.maybeSingle();

    // For admin flow, require the matched user to actually have the admin role.
    if (isAdminFlow && profile) {
      const { data: isAdmin } = await admin.rpc("has_role", {
        _user_id: profile.user_id,
        _role: "admin",
      });
      if (!isAdmin) {
        // Don't reveal — respond success to avoid enumeration
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Always respond success to avoid enumeration
    if (!profile) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const otp = genOtp();
    const otp_hash = await sha256(otp);
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Invalidate previous unused OTPs for this user
    await admin
      .from("password_reset_otps")
      .update({ used: true })
      .eq("user_id", profile.user_id)
      .eq("used", false);

    await admin.from("password_reset_otps").insert({
      user_id: profile.user_id,
      email: profile.email,
      otp_hash,
      expires_at,
    });

    // Send via transactional email
    await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "password-reset-otp",
        recipientEmail: profile.email,
        idempotencyKey: `pwd-reset-otp-${profile.user_id}-${Date.now()}`,
        templateData: { name: profile.full_name, otp },
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("request-password-reset-otp error", err);
    console.error('request-password-reset-otp error', err);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});