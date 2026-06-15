import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendTransactionalEmail(body: Record<string, unknown>) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const res = await fetch(`${url}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceKey}`,
      "apikey": serviceKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`send-transactional-email failed: ${res.status} ${await res.text()}`);
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
    const otp = (body.otp || "").trim();
    const newPassword = body.newPassword || "";

    if (!email || !otp || !newPassword) {
      return new Response(JSON.stringify({ error: "Email, OTP, and new password are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (newPassword.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const otp_hash = await sha256(otp);

    const { data: row } = await admin
      .from("password_reset_otps")
      .select("*")
      .ilike("email", email)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) {
      return new Response(JSON.stringify({ error: "Invalid or expired code" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
      await admin.from("password_reset_otps").update({ used: true }).eq("id", row.id);
      return new Response(JSON.stringify({ error: "Code has expired" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (row.attempts >= 5) {
      await admin.from("password_reset_otps").update({ used: true }).eq("id", row.id);
      return new Response(JSON.stringify({ error: "Too many attempts. Request a new code." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (row.otp_hash !== otp_hash) {
      await admin.from("password_reset_otps")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      return new Response(JSON.stringify({ error: "Invalid code" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update password
    const { error: updateErr } = await admin.auth.admin.updateUserById(row.user_id, {
      password: newPassword,
    });
    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("password_reset_otps").update({ used: true }).eq("id", row.id);
    await admin.from("profiles")
      .update({ must_change_password: false })
      .eq("user_id", row.user_id);

    // Fetch name for confirmation email
    const { data: profile } = await admin
      .from("profiles").select("full_name, email").eq("user_id", row.user_id).maybeSingle();

    if (profile?.email) {
      await sendTransactionalEmail({
        templateName: "password-reset-confirmation",
        recipientEmail: profile.email,
        idempotencyKey: `pwd-reset-confirm-${row.user_id}-${Date.now()}`,
        templateData: { name: profile.full_name },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("verify-password-reset-otp error", err);
    console.error('verify-password-reset-otp error', err);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});