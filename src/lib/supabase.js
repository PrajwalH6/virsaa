
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configured = Boolean(url && key);

const recoveryCode = window.location.pathname.replace(/\/$/, "") === "/admin/reset-password"
  && new URLSearchParams(window.location.search).has("code");

export const supabase = configured
  ? createClient(url, key, { auth: { flowType: recoveryCode ? "pkce" : "implicit" } })
  : null;
