import { NextResponse } from "next/server";
import { getWallItems } from "@/lib/events";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const items = await getWallItems(slug);
  return NextResponse.json(items, { headers: { "cache-control": "no-store" } });
}
