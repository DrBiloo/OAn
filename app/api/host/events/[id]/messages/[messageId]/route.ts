import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  const { messageId } = await params;
  const form = await request.formData();
  const action = form.get("action");
  const supabase = await createClient();
  if (action === "delete") await supabase.from("messages").delete().eq("id", messageId);
  else await supabase.from("messages").update({ hidden: action === "hide" }).eq("id", messageId);
  return NextResponse.redirect(new URL(request.headers.get("referer") || "/", request.url));
}
