"use client";
import { useEffect, useState, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function adminFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API}/admin${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const NAV_ITEMS = ["fabrics", "collars", "cuffs", "renders", "analytics", "audit"] as const;
type NavTab = (typeof NAV_ITEMS)[number];

// ─── Login Page ───────────────────────────────────────────────────────────────

function LoginPage({ onLogin }: { onLogin: (token: string, email: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: "Login failed" }));
        setErr(body.detail ?? "Invalid email or password");
        return;
      }
      const data = await res.json() as { access_token: string; email: string };
      localStorage.setItem("jf_admin_token", data.access_token);
      localStorage.setItem("jf_admin_email", data.email ?? email);
      onLogin(data.access_token, data.email ?? email);
    } catch {
      setErr("Could not reach server. Is the backend running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="font-bold tracking-[0.3em] text-stone-900 text-lg">JOHN FABRIC</h1>
          <p className="text-xs tracking-widest text-stone-400 uppercase mt-1">Admin Panel</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8 space-y-4"
        >
          <h2 className="text-base font-semibold text-stone-800 mb-1">Sign in</h2>

          {err && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              required
              autoFocus
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-800 focus:border-transparent"
              placeholder="admin@johnfabric.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-800 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-stone-900 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-stone-700 transition-colors disabled:opacity-60 mt-2"
          >
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs text-stone-400 mt-6">
          Default credentials set during deployment
        </p>
      </div>
    </main>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [tab, setTab] = useState<NavTab>("fabrics");
  const [data, setData] = useState<Record<string, unknown>[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Restore session from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("jf_admin_token");
    const email = localStorage.getItem("jf_admin_email");
    if (saved) {
      setToken(saved);
      setAdminEmail(email ?? "");
    }
  }, []);

  const loadTab = useCallback(
    async (t: NavTab, tok: string) => {
      setErr(null);
      setData(null);
      setLoadingData(true);
      try {
        if (t === "analytics") {
          // analytics has sub-routes — load popular by default
          const res = await adminFetch<Record<string, unknown>[]>("/analytics/popular", tok);
          setData(res);
        } else {
          const res = await adminFetch<Record<string, unknown>[]>(`/${t}`, tok);
          setData(Array.isArray(res) ? res : [res]);
        }
      } catch (e: unknown) {
        const msg = (e as Error).message;
        if (msg.includes("401") || msg.includes("403")) {
          // Token expired — log out
          handleLogout();
          return;
        }
        setErr(msg);
      } finally {
        setLoadingData(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    if (token) loadTab(tab, token);
  }, [tab, token, loadTab]);

  function handleLogin(tok: string, email: string) {
    setToken(tok);
    setAdminEmail(email);
    loadTab(tab, tok);
  }

  function handleLogout() {
    localStorage.removeItem("jf_admin_token");
    localStorage.removeItem("jf_admin_email");
    setToken(null);
    setData(null);
  }

  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const tabIcons: Record<NavTab, string> = {
    fabrics: "🧵",
    collars: "👔",
    cuffs: "🔲",
    renders: "🖼️",
    analytics: "📊",
    audit: "📋",
  };

  return (
    <div className="min-h-screen flex bg-stone-50">
      {/* Sidebar */}
      <nav className="w-56 bg-white border-r border-stone-200 flex flex-col">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-stone-100">
          <h1 className="font-bold tracking-[0.2em] text-stone-900 text-sm">JOHN FABRIC</h1>
          <p className="text-[10px] tracking-wider text-stone-400 uppercase mt-0.5">Admin</p>
        </div>

        {/* Nav */}
        <div className="flex-1 py-4 space-y-0.5 px-2">
          {NAV_ITEMS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors capitalize text-left ${
                tab === t
                  ? "bg-stone-900 text-white font-medium"
                  : "text-stone-500 hover:bg-stone-100 hover:text-stone-800"
              }`}
            >
              <span>{tabIcons[t]}</span>
              <span>{t}</span>
            </button>
          ))}
        </div>

        {/* User */}
        <div className="px-4 py-4 border-t border-stone-100">
          <p className="text-[11px] text-stone-500 truncate mb-2">{adminEmail}</p>
          <button
            onClick={handleLogout}
            className="text-xs text-stone-400 hover:text-red-600 transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* Link to configurator */}
        <div className="px-4 pb-4">
          <a
            href="/"
            className="block text-center text-xs text-stone-400 hover:text-stone-700 border border-stone-200 rounded-lg py-1.5 transition-colors"
          >
            ← Configurator
          </a>
        </div>
      </nav>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-800 capitalize">{tab}</h2>
          <button
            onClick={() => token && loadTab(tab, token)}
            className="text-xs text-stone-400 hover:text-stone-700 border border-stone-200 rounded px-3 py-1.5 transition-colors"
          >
            ↻ Refresh
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">
          {err && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          )}

          {tab === "analytics" ? (
            <AnalyticsPanel token={token} />
          ) : loadingData ? (
            <div className="flex items-center gap-2 text-stone-400 text-sm py-8">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Loading…
            </div>
          ) : data ? (
            <DataTable data={data} />
          ) : null}
        </main>
      </div>
    </div>
  );
}

// ─── Data Table ───────────────────────────────────────────────────────────────

function DataTable({ data }: { data: Record<string, unknown>[] }) {
  if (!data.length) {
    return <p className="text-stone-400 text-sm py-8">No records found.</p>;
  }
  const keys = Object.keys(data[0]);
  return (
    <div className="overflow-auto rounded-xl border border-stone-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-stone-50 border-b border-stone-200">
          <tr>
            {keys.map((k) => (
              <th
                key={k}
                className="px-4 py-3 text-left text-[11px] font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap"
              >
                {k.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-stone-50 transition-colors">
              {keys.map((k) => (
                <td key={k} className="px-4 py-2.5 text-stone-700 max-w-[220px] truncate">
                  {String(row[k] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-right text-[11px] text-stone-400 px-4 py-2 border-t border-stone-100">
        {data.length} record{data.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

// ─── Analytics Panel ──────────────────────────────────────────────────────────

function AnalyticsPanel({ token }: { token: string }) {
  const [sub, setSub] = useState<"popular" | "fabrics" | "funnel">("popular");
  const [data, setData] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setData(null);
    setLoading(true);
    adminFetch<Record<string, unknown>[]>(`/analytics/${sub}`, token)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [sub, token]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["popular", "fabrics", "funnel"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSub(t)}
            className={`px-4 py-1.5 rounded-lg text-sm border transition-colors capitalize ${
              sub === t
                ? "bg-stone-800 text-white border-stone-800"
                : "border-stone-200 text-stone-500 hover:border-stone-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="text-stone-400 text-sm">Loading…</p>
      ) : data ? (
        <DataTable data={data} />
      ) : null}
    </div>
  );
}


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
