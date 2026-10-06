import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { apiError } from "@/lib/api";
import { handleEntry } from "@/app/api/parking/entry/route";
import { serverEnv } from "@/lib/env";

function validGateKey(value: string | null) {
  const expected = serverEnv().ANPR_GATE_SECRET;
  if (!expected || !value) return false;
  const suppliedBytes = Buffer.from(value);
  const expectedBytes = Buffer.from(expected);
  return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
}

export async function POST(request: NextRequest) {
  if (!validGateKey(request.headers.get("x-anpr-gate-secret"))) {
    return apiError("Valid ANPR service key required", 401);
  }
  return handleEntry(request, null, true);
}
