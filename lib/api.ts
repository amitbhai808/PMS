import { NextResponse } from "next/server";
import type { z } from "zod";

export function apiError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status });
}

export async function readJson<TSchema extends z.ZodType>(request: Request, schema: TSchema) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { response: apiError("Request body must be valid JSON", 400) } as const;
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      response: apiError("Request validation failed", 422, parsed.error.flatten()),
    } as const;
  }

  return { data: parsed.data as z.infer<TSchema> } as const;
}

export function unexpectedError(error: unknown) {
  console.error("API request failed", error);
  return apiError("An unexpected server error occurred", 500);
}

export function noStoreHeaders() {
  return { "Cache-Control": "no-store" };
}
