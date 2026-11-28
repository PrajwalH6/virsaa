
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
const serviceKey = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!serviceKey) throw new Error("Supabase server key is missing.");
const siteUrl = new URL(Deno.env.get("SITE_URL")!).origin;

const corsHeaders = {
  "Access-Control-Allow-Origin": siteUrl,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const service = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return respond({ error: "Method not allowed" }, 405);
  }

  try {
    const token = req.headers
      .get("Authorization")
      ?.match(/^Bearer\s+(\S+)$/i)?.[1];

    if (!token) {
      return respond({ error: "Authentication required" }, 401);
    }

    // Verify the token with Supabase Auth.
    const {
      data: { user },
      error: userError,
    } = await service.auth.getUser(token);

    if (userError || !user) {
      return respond({ error: "Invalid session" }, 401);
    }

    // Authorization is based on the trusted database,
    // not a role supplied by the browser.
    const { data: caller, error: roleError } = await service
      .from("admin_users")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || caller?.role !== "super_admin") {
      return respond({ error: "Super Admin access required" }, 403);
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return respond({ error: "Invalid request body" }, 400);
    }
    const action = body?.action;

    if (action === "invite") {
      const email = String(body.email || "")
        .trim()
        .toLowerCase();

      const role = body.role;

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        email.length > 254
      ) {
        return respond({ error: "Invalid email" }, 400);
      }

      if (!["admin", "super_admin"].includes(role)) {
        return respond({ error: "Invalid role" }, 400);
      }

      const { error: reserveError } = await service
        .from("cafe_staff_invitations")
        .upsert({ email, role }, { onConflict: "email", ignoreDuplicates: true });
      if (reserveError) throw reserveError;

      const { data: invitation, error: readError } = await service
        .from("cafe_staff_invitations")
        .select("role, marker")
        .eq("email", email)
        .single();
      if (readError) throw readError;
      if (invitation.role !== role) {
        return respond({ error: "An invitation already exists with a different role." }, 409);
      }

      async function finishInvitation() {
        const { data, error } = await service.rpc("cafe_finish_staff_invite", {
          p_caller: user!.id,
          p_email: email,
        });
        if (error) throw error;
        return data;
      }

      let state = await finishInvitation();
      if (state === "pending") {
        const { data: claim, error: claimError } = await service.rpc("cafe_claim_staff_invite", {
          p_caller: user.id,
          p_email: email,
        });
        if (claimError) throw claimError;
        if (claim === "forbidden") return respond({ error: "Super Admin access required" }, 403);
        if (claim !== "claimed") {
          return respond({ error: "Invitation is being processed. Retry in one minute with the same role." }, 409);
        }

        const { error: inviteError } = await service.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${siteUrl}/admin/setup`,
          data: { cafe_invitation_marker: invitation.marker },
        });
        state = await finishInvitation();
        if (inviteError && state === "pending") {
          console.error("Staff invitation provider error", { code: inviteError.code, status: inviteError.status });
          return respond({ error: "Invitation delivery could not be verified. Retry in one minute with the same role." }, 502);
        }
      }

      if (state === "complete") return respond({ success: true });
      if (state === "forbidden") return respond({ error: "Super Admin access required" }, 403);
      if (state === "existing_account" || state === "removed") {
        return respond({ error: "This email already has an account. Ask the owner to review its existing access." }, 409);
      }
      return respond({ error: "Staff access could not be verified. Retry with the same email and role." }, 409);
    }

    if (action === "list") {
      const { data: admins, error } = await service
        .from("admin_users")
        .select("user_id, role");

      if (error) throw error;

      const staff = [];

      for (const admin of admins || []) {
        const { data, error: lookupError } =
          await service.auth.admin.getUserById(admin.user_id);
        if (lookupError) throw lookupError;

        staff.push({
          user_id: admin.user_id,
          role: admin.role,
          email: data.user?.email || "Unknown",
          confirmed: Boolean(data.user?.email_confirmed_at),
        });
      }

      return respond({ staff });
    }

    if (action === "remove") {
      const targetId = String(body.user_id || "");

      if (
        !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(targetId)
      ) {
        return respond({ error: "Invalid user ID" }, 400);
      }

      if (targetId === user.id) {
        return respond(
          { error: "You cannot remove your own account" },
          400
        );
      }

      const { data: state, error } = await service.rpc("cafe_remove_staff", {
        p_caller: user.id,
        p_target: targetId,
      });
      if (error) throw error;
      if (state === "forbidden") return respond({ error: "Super Admin access required" }, 403);
      if (state === "missing") return respond({ error: "Staff member not found" }, 404);
      if (state !== "removed") return respond({ error: "Staff access could not be removed" }, 409);
      return respond({ success: true });
    }

    return respond({ error: "Unknown action" }, 400);
  } catch (error) {
    const failure = error as { code?: string; status?: number };
    console.error("Staff management failed", { code: failure?.code, status: failure?.status });
    return respond({ error: "Server error" }, 500);
  }
});
