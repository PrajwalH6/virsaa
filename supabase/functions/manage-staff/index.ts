
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const siteUrl = Deno.env.get("SITE_URL")!;

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
      ?.replace(/^Bearer\s+/i, "");

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

    const body = await req.json();
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

      const { data, error } =
        await service.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${siteUrl}/admin/setup`,
        });

      if (error || !data.user) {
        return respond(
          { error: error?.message || "Invitation failed" },
          400
        );
      }

      // Authorize the invited account, but do not replace
      // an existing staff member's role.
      const { error: insertError } = await service
        .from("admin_users")
        .insert({
          user_id: data.user.id,
          role,
        });

      if (insertError) {
        // Avoid leaving a newly invited, unauthorized account.
        // Do not delete an existing account automatically.
        return respond(
          {
            error:
              "Invitation was generated but staff authorization failed. " +
              "Check whether this account is already registered.",
          },
          409
        );
      }

      return respond({ success: true });
    }

    if (action === "list") {
      const { data: admins, error } = await service
        .from("admin_users")
        .select("user_id, role");

      if (error) throw error;

      const staff = [];

      for (const admin of admins || []) {
        const { data } =
          await service.auth.admin.getUserById(admin.user_id);

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

      const { data: target, error: targetError } =
        await service
          .from("admin_users")
          .select("role")
          .eq("user_id", targetId)
          .single();

      if (targetError || !target) {
        return respond({ error: "Staff member not found" }, 404);
      }

      if (target.role === "super_admin") {
        const { count, error: countError } = await service
          .from("admin_users")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("role", "super_admin");

        if (countError) throw countError;

        if ((count || 0) <= 1) {
          return respond(
            { error: "Cannot remove the last Super Admin" },
            400
          );
        }
      }

      const { error } = await service
        .from("admin_users")
        .delete()
        .eq("user_id", targetId);

      if (error) throw error;

      // Removes dashboard authorization.
      // The Auth account itself remains for audit/recovery.
      return respond({ success: true });
    }

    return respond({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error(error);
    return respond({ error: "Server error" }, 500);
  }
});
