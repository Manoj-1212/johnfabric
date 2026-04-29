const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getFabrics: () => apiFetch<import("@/types").Fabric[]>("/fabrics"),
  getCollars: () => apiFetch<import("@/types").Collar[]>("/collars"),
  getCuffs:   () => apiFetch<import("@/types").Cuff[]>("/cuffs"),

  renderAll: (collar_id: string, cuff_id: string, fabric_id: string) =>
    apiFetch<import("@/types").RenderAllResponse>("/render/all", {
      method: "POST",
      body: JSON.stringify({ collar_id, cuff_id, fabric_id }),
    }),

  login: (email: string, password: string) =>
    apiFetch<{ access_token: string; token_type: string; role: string; email: string }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),

  trackEvent: (event_type: string, ids: Record<string, string>, session_id?: string) =>
    apiFetch("/events", {
      method: "POST",
      body: JSON.stringify({ event_type, ...ids, session_id }),
    }).catch(() => {}), // fire-and-forget — swallow errors
};
