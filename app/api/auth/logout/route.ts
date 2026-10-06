import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, getPrincipal, revokeSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const principal = await getPrincipal(request);
  if (principal) await revokeSession(principal.sessionId);
  return clearSessionCookie(NextResponse.json({ message: "Logged out" }));
}
