import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as "email" | "magiclink" | null;
  const next = url.searchParams.get("next") || "/de/dashboard";
  const supabase = await createClient();
  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Missing auth callback parameters") };
  if (result.error) return NextResponse.redirect(new URL("/de/login?error=auth", url.origin));
  return NextResponse.redirect(new URL(next.startsWith("/") ? next : "/de/dashboard", url.origin));
}
