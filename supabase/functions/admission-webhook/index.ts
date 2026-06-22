import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

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
    return new Response("ok", { headers: corsHeaders });
  }

  // Shared-secret auth for cross-project (Admissions Portal) calls
  const expected = Deno.env.get("ADMISSIONS_API_SECRET");
  const provided = req.headers.get("x-admissions-api-secret") ?? req.headers.get("X-Admissions-API-Secret");
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload = await req.json();

    // Expected payload from Admissions Portal (flat fields + nested personal/academic)
    const personal = (payload.personal ?? {}) as Record<string, any>;
    const email = payload.email ?? personal.email;
    const full_name = payload.full_name ?? personal.full_name;
    const father_name = payload.father_name ?? personal.father_name ?? null;
    const phone = payload.phone ?? personal.phone ?? null;
    const cnic = payload.cnic ?? personal.cnic ?? null;
    const address = payload.address ?? personal.address ?? null;
    const city = personal.city ?? null;
    const province = personal.province ?? null;
    const gender = personal.gender ?? null;
    const dob = personal.dob ?? null;
    const qualification = payload.qualification ?? null;
    const qualification_type = payload.qualification_type ?? personal.qualification_type ?? null;
    const qualification_field = payload.qualification_field ?? personal.qualification_field ?? qualification ?? null;
    const course_id = payload.course_id ?? null;
    const application_number = payload.application_number ?? null;
    const photo_url = payload.photo_url ?? personal.photo_url ?? null;
    const documents = payload.documents ?? {};

    if (!email || !cnic || !full_name) {
      return new Response(JSON.stringify({ error: "email, cnic, and full_name are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already exists by email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u: any) => u.email === email);
    if (existingUser) {
      return new Response(JSON.stringify({ error: "User with this email already exists in LMS" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const password = generatePassword();
    const { data: regData, error: regErr } = await supabaseAdmin.rpc("next_registration_number");
    if (regErr || !regData) {
      return new Response(JSON.stringify({ error: "Failed to generate registration number" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const regNumber = regData as string;
    let enrolledCourseId: string | null = null;

    // Create auth user
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
      // Update profile with admission data
      const { error: profileErr } = await supabaseAdmin
        .from("profiles")
        .update({
          full_name,
          email,
          father_name: father_name || null,
          phone: phone || null,
          cnic,
          city,
          province,
          gender,
          dob,
          qualification: qualification || null,
          qualification_type: qualification_type || null,
          qualification_field: qualification_field || null,
          photo_url: photo_url || null,
          documents: documents || {},
          roll_number: regNumber,
          must_change_password: true,
        })
        .eq("user_id", data.user.id);
      if (profileErr) console.error("profile update failed", profileErr);

      // Store generated password in vault
      await supabaseAdmin
        .from("profile_credentials")
        .upsert(
          { user_id: data.user.id, generated_password: password, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );

      // Set role to student (replace any default role assigned by handle_new_user trigger)
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user.id);
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.user.id, role: "student" });

      // Auto-enroll in selected course
      if (course_id) {
        const { data: course } = await supabaseAdmin
          .from("courses")
          .select("id, is_active")
          .eq("id", course_id)
          .maybeSingle();

        if (course?.is_active) {
          const { data: enrollment, error: enrollErr } = await supabaseAdmin
            .from("enrollments")
            .insert({
              user_id: data.user.id,
              course_id: course.id,
              status: "active",
              challan_paid: true,
              challan_paid_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (enrollErr) {
            console.error("Failed to auto-enroll student", enrollErr);
          } else {
            enrolledCourseId = course.id;
            // Mark challan as paid since fee was collected via admissions portal
            await supabaseAdmin
              .from("challans")
              .update({ status: "paid", paid_at: new Date().toISOString() })
              .eq("enrollment_id", enrollment.id);
          }
        } else {
          console.warn("course_id provided but course not found or inactive:", course_id);
        }
      }

      // Send welcome email with credentials
      try {
        await sendTransactionalEmail({
          templateName: "welcome-credentials",
          recipientEmail: email,
          idempotencyKey: `welcome-${data.user.id}`,
          templateData: { name: full_name, email, password, rollNumber: regNumber },
        });
      } catch (e) {
        console.error("Failed to send welcome email", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: data.user.id, email: data.user.email },
        registration_number: regNumber,
        enrolled_course_id: enrolledCourseId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("admission-webhook error", err);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
