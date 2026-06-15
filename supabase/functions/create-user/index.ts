import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generatePassword(length = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join("");
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, full_name, roll_number, father_name, phone, cnic, role } = await req.json();

    if (!email || !full_name) {
      return new Response(JSON.stringify({ error: "Email and full name are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const password = generatePassword();

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (data.user) {
      const profileUpdate: Record<string, any> = {
        full_name,
        email,
        must_change_password: true,
      };
      if (roll_number) profileUpdate.roll_number = roll_number;
      if (father_name) profileUpdate.father_name = father_name;
      if (phone) profileUpdate.phone = phone;
      if (cnic) profileUpdate.cnic = cnic;

      await supabaseAdmin
        .from("profiles")
        .update(profileUpdate)
        .eq("user_id", data.user.id);

      await supabaseAdmin
        .from("profile_credentials")
        .upsert({ user_id: data.user.id, generated_password: password }, { onConflict: "user_id" });

      const targetRole = role === "teacher" ? "teacher" : role === "student" ? "student" : "user";
      await supabaseAdmin
        .from("user_roles")
        .update({ role: targetRole })
        .eq("user_id", data.user.id);

      // Send welcome email with credentials
      try {
        await sendTransactionalEmail({
          templateName: "welcome-credentials",
          recipientEmail: email,
          idempotencyKey: `welcome-${data.user.id}`,
          templateData: { name: full_name, email, password, rollNumber: roll_number },
        });
      } catch (e) {
        console.error("Failed to send welcome email", e);
      }
    }

    return new Response(
      JSON.stringify({ user: { id: data.user.id, email: data.user.email }, password }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error('create-user error', err);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
