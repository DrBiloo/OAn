import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  const { photoId } = await params;
  const form = await request.formData();
  const action = form.get("action");
  const supabase = await createClient();
  if (action === "delete") await supabase.from("photos").delete().eq("id", photoId);
  else if (action === "removeWall") await supabase.from("photos").update({ show_on_wall: false }).eq("id", photoId);
  else if (action === "showWall") await supabase.from("photos").update({ show_on_wall: true }).eq("id", photoId);
  else await supabase.from("photos").update({ hidden: action === "hide" }).eq("id", photoId);
  return NextResponse.redirect(new URL(request.headers.get("referer") || "/", request.url));
}
