import { NextRequest, NextResponse } from "next/server";
import { getPrincipal } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const principal = await getPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  return NextResponse.json({ user: principal }, { headers: { "Cache-Control": "no-store" } });
}
