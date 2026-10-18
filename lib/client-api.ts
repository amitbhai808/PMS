/**
 * Client-side API utilities.
 * Every client component that talks to the PMS backend uses these helpers.
 * They handle JSON serialization, error normalization, and session cookies
 * (sent automatically via same-origin fetch with `credentials: "include"`).
 */

export type ApiResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; details?: unknown; status: number };

async function api<T>(url: string, options?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      credentials: "include",
      ...options,
      headers: {
        ...(options?.body ? { "Content-Type": "application/json" } : {}),
        ...options?.headers,
      },
    });

    let body: Record<string, unknown> | null = null;
    try {
      body = await res.json();
    } catch {
      /* empty or non-JSON response */
    }

    if (!res.ok) {
      const errorMsg =
        (body && typeof body.error === "string" ? body.error : null) ??
        `Request failed (${res.status})`;
      return { ok: false, error: errorMsg, details: body?.details, status: res.status };
    }

    return { ok: true, data: body as T, status: res.status };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
      status: 0,
    };
  }
}

export async function apiGet<T>(url: string): Promise<ApiResult<T>> {
  return api<T>(url);
}

export async function apiPost<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  return api<T>(url, { method: "POST", body: JSON.stringify(body) });
}

export async function apiPatch<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  return api<T>(url, { method: "PATCH", body: JSON.stringify(body) });
}

export async function apiDelete<T>(url: string): Promise<ApiResult<T>> {
  return api<T>(url, { method: "DELETE" });
}
