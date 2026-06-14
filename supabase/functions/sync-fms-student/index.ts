import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-fms-api-secret",
};

function generatePassword(length = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join("");
}

function generateRegNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `NGCAD-${year}-${rand}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Shared-secret auth for cross-project (FMS) calls
  const expected = Deno.env.get("FMS_API_SECRET");
  const provided = req.headers.get("x-fms-api-secret") ?? req.headers.get("X-FMS-API-Secret");
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

    const { name, father_name, email, phone, cnic, address, qualification, course_id } = await req.json();

    if (!name || !email || !cnic) {
      return new Response(JSON.stringify({ error: "name, email, and cnic are required" }), {
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
    const regNumber = generateRegNumber();

    // Create auth user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (data.user) {
      // Update profile with FMS registration data + store generated password
      await supabaseAdmin
        .from("profiles")
        .update({
          full_name: name,
          email,
          father_name,
          phone,
          cnic,
          roll_number: regNumber,
          must_change_password: true,
        })
        .eq("user_id", data.user.id);

      await supabaseAdmin
        .from("profile_credentials")
        .upsert({ user_id: data.user.id, generated_password: password }, { onConflict: "user_id" });

      // Set role to student
      await supabaseAdmin
        .from("user_roles")
        .update({ role: "student" })
        .eq("user_id", data.user.id);

      // Auto-enroll in selected course (fee already paid via admissions portal)
      let enrolledCourseId: string | null = null;
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
            // The create_course_fee_challan trigger generates an unpaid challan;
            // mark it paid since fee was collected via the admissions portal.
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
        await supabaseAdmin.functions.invoke("send-transactional-email", {
          body: {
            templateName: "welcome-credentials",
            recipientEmail: email,
            idempotencyKey: `welcome-${data.user.id}`,
            templateData: { name, email, password, rollNumber: regNumber },
          },
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
        password,
        enrolled_course_id: typeof enrolledCourseId !== "undefined" ? enrolledCourseId : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error('sync-fms-student error', err);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
