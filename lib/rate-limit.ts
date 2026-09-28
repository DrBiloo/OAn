import { createAdminClient } from "./supabase/admin";

// Backed by the check_rate_limit() Postgres function (see supabase/migrations)
// so the counters are shared across all serverless instances, instead of the
// per-instance in-memory counters a plain Map would give on Vercel.
export async function allowRequest(key: string, limit: number, windowSeconds = 5 * 60) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("check_rate_limit", { p_key: key, p_limit: limit, p_window_seconds: windowSeconds });
  if (error) {
    console.error("rate limit check failed, allowing request", error);
    return true;
  }
  return data === true;
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
