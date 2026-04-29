"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function adminFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API}/admin${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<"fabrics" | "collars" | "cuffs" | "renders" | "analytics" | "audit">("fabrics");
  const [data, setData] = useState<Record<string, unknown>[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load(t: string, section: string) {
    setErr(null);
    setData(null);
    try {
      const res = await adminFetch<Record<string, unknown>[]>(`/${section}`, t);
      setData(res);
    } catch (e: unknown) {
      setErr((e as Error).message);
    }
  }

  function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthed(true);
    load(token, tab);
  }

  useEffect(() => {
    if (authed) load(token, tab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50">
        <form onSubmit={handleAuth} className="bg-white rounded-xl border border-stone-200 p-8 w-80 space-y-4 shadow-sm">
          <h1 className="font-semibold text-lg">Admin Login</h1>
          <input
            className="w-full border border-stone-200 rounded px-3 py-2 text-sm"
            placeholder="Bearer token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <button type="submit"
            className="w-full bg-stone-900 text-white rounded px-4 py-2 text-sm font-medium hover:bg-stone-700">
            Enter
          </button>
        </form>
      </main>
    );
  }

  const TABS = ["fabrics", "collars", "cuffs", "renders", "analytics", "audit"] as const;

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
        <h1 className="font-semibold">John Fabric — Admin</h1>
        <button onClick={() => setAuthed(false)} className="text-sm text-stone-400 hover:text-stone-700">
          Sign out
        </button>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-stone-200">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t as typeof tab)}
              className={`px-4 py-2 text-sm capitalize rounded-t transition-colors
                ${tab === t ? "bg-white border border-b-white border-stone-200 font-medium" : "text-stone-500 hover:text-stone-800"}`}>
              {t}
            </button>
          ))}
        </div>

        {err && (
          <div className="mb-4 rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{err}</div>
        )}

        {/* Analytics tabs have sub-routes */}
        {tab === "analytics" ? (
          <AnalyticsPanel token={token} />
        ) : data ? (
          <DataTable data={data} />
        ) : (
          <div className="text-stone-400 text-sm">Loading…</div>
        )}
      </div>
    </main>
  );
}

function DataTable({ data }: { data: Record<string, unknown>[] }) {
  if (!data.length) return <p className="text-stone-400 text-sm">No records.</p>;
  const keys = Object.keys(data[0]);
  return (
    <div className="overflow-auto rounded-lg border border-stone-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-stone-50 border-b border-stone-200">
          <tr>
            {keys.map((k) => (
              <th key={k} className="px-4 py-2 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-stone-100 hover:bg-stone-50">
              {keys.map((k) => (
                <td key={k} className="px-4 py-2 text-stone-700 max-w-xs truncate">
                  {String(row[k] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnalyticsPanel({ token }: { token: string }) {
  const [tab, setTab] = useState<"popular" | "fabrics" | "funnel">("popular");
  const [data, setData] = useState<Record<string, unknown>[] | null>(null);

  useEffect(() => {
    adminFetch<Record<string, unknown>[]>(`/analytics/${tab}`, token)
      .then(setData)
      .catch(() => setData(null));
  }, [tab, token]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["popular", "fabrics", "funnel"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded text-sm border transition-colors
              ${tab === t ? "bg-stone-800 text-white border-stone-800" : "border-stone-200 hover:border-stone-400"}`}>
            {t}
          </button>
        ))}
      </div>
      {data ? <DataTable data={data} /> : <p className="text-stone-400 text-sm">Loading…</p>}
    </div>
  );
}
