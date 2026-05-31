import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-fms-api-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

  const errors: Record<string, string> = {};
  let enrollmentsDeleted = 0;
  let studentDeleted = false;
  let authUserDeleted = false;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const cnic: string | undefined = body?.cnic?.toString().trim() || undefined;
    const email: string | undefined = body?.user_email?.toString().trim().toLowerCase() || undefined;

    if (!cnic && !email) {
      return new Response(
        JSON.stringify({ error: "cnic or user_email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find matching profile(s)
    let query = supabase.from("profiles").select("user_id, email, cnic");
    if (cnic && email) {
      query = query.or(`cnic.eq.${cnic},email.eq.${email}`);
    } else if (cnic) {
      query = query.eq("cnic", cnic);
    } else {
      query = query.eq("email", email!);
    }

    const { data: profiles, error: profileErr } = await query;
    if (profileErr) errors.lookup = profileErr.message;

    const userIds = Array.from(new Set((profiles ?? []).map((p: any) => p.user_id).filter(Boolean)));
    const emails = Array.from(
      new Set([email, ...(profiles ?? []).map((p: any) => p.email).filter(Boolean)].filter(Boolean) as string[])
    );
    const cnics = Array.from(
      new Set([cnic, ...(profiles ?? []).map((p: any) => p.cnic).filter(Boolean)].filter(Boolean) as string[])
    );

    // Helper: run a delete and capture errors without throwing
    const safeDelete = async (label: string, fn: () => Promise<{ error: any; count?: number | null }>) => {
      try {
        const { error, count } = await fn();
        if (error) {
          errors[label] = error.message;
          return 0;
        }
        return count ?? 0;
      } catch (e: any) {
        errors[label] = e?.message ?? String(e);
        return 0;
      }
    };

    if (userIds.length > 0) {
      // Enrollments (count returned)
      try {
        const { data: enrs } = await supabase
          .from("enrollments")
          .select("id")
          .in("user_id", userIds);
        enrollmentsDeleted = enrs?.length ?? 0;
      } catch (_) { /* ignore */ }

      await safeDelete("enrollments", () =>
        supabase.from("enrollments").delete().in("user_id", userIds) as any
      );
      await safeDelete("lecture_completions", () =>
        supabase.from("lecture_completions").delete().in("user_id", userIds) as any
      );
      await safeDelete("survey_submissions", () =>
        supabase.from("survey_submissions").delete().in("student_id", userIds) as any
      );
      await safeDelete("complaints", () =>
        supabase.from("complaints").delete().in("student_id", userIds) as any
      );
      await safeDelete("password_reset_otps", () =>
        supabase.from("password_reset_otps").delete().in("user_id", userIds) as any
      );
      await safeDelete("teacher_assignments", () =>
        supabase.from("teacher_assignments").delete().in("teacher_id", userIds) as any
      );
      await safeDelete("user_roles", () =>
        supabase.from("user_roles").delete().in("user_id", userIds) as any
      );
    }

    // Challans are CNIC-scoped, not user_id
    if (cnics.length > 0) {
      await safeDelete("challans", () =>
        supabase.from("challans").delete().in("customer_cnic", cnics) as any
      );
    }

    // Delete profile rows
    if (userIds.length > 0) {
      const { error: profDelErr } = await supabase
        .from("profiles")
        .delete()
        .in("user_id", userIds);
      if (profDelErr) errors.profiles = profDelErr.message;
      else studentDeleted = true;
    }

    // Delete auth users — look up by email since admin.deleteUser needs the auth id
    if (emails.length > 0 || userIds.length > 0) {
      try {
        const idsToDelete = new Set<string>(userIds);
        if (emails.length > 0) {
          // Page through auth users to find matching emails
          let page = 1;
          const perPage = 1000;
          // cap at 10 pages to avoid infinite loop on huge projects
          while (page <= 10) {
            const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
            if (error) { errors.auth_lookup = error.message; break; }
            for (const u of data?.users ?? []) {
              if (u.email && emails.includes(u.email.toLowerCase())) idsToDelete.add(u.id);
            }
            if (!data?.users || data.users.length < perPage) break;
            page++;
          }
        }
        for (const id of idsToDelete) {
          const { error } = await supabase.auth.admin.deleteUser(id);
          if (error) {
            errors[`auth_delete_${id}`] = error.message;
          } else {
            authUserDeleted = true;
          }
        }
      } catch (e: any) {
        errors.auth = e?.message ?? String(e);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        deleted: {
          student: studentDeleted,
          enrollments: enrollmentsDeleted,
          auth_user: authUserDeleted,
        },
        errors: Object.keys(errors).length ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error('delete-student-from-admission error', err);
    return new Response(
      JSON.stringify({ ok: false, error: 'An unexpected error occurred', errors }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});