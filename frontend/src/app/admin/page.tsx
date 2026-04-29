"use client";
import { useEffect, useState, useCallback, useRef } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// ─── API helpers ─────────────────────────────────────────────────────────────

async function adminFetch<T>(path: string, token: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API}/admin${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(opts?.headers ?? {}) },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function adminUpload(path: string, token: string, file: File, query?: string): Promise<unknown> {
  const form = new FormData();
  form.append("file", file);
  const url = `${API}/admin${path}${query ? `?${query}` : ""}`;
  const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Record types ─────────────────────────────────────────────────────────────

type FabricRecord = { id: string; sku: string; name: string; tier: string; pattern_type: string; colorway: string | null; hex_primary: string | null; active: boolean; asset_version: number };
type CatalogRecord = { id: string; sku: string; name: string; style: string; active: boolean; asset_version: number };
type RenderRecord = { id: string; collar_id: string; cuff_id: string; fabric_id: string; front_url: string; collar_url: string; cuff_url: string; is_valid: boolean };

// ─── Shared CSS constants ─────────────────────────────────────────────────────

const inputCls = "w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-800 focus:border-transparent";
const btnPrimary = "bg-stone-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-50";
const btnSecondary = "border border-stone-200 text-stone-600 rounded-lg px-4 py-2 text-sm hover:bg-stone-50 transition-colors";
const btnSmDefault = "text-xs text-stone-600 hover:text-stone-900 border border-stone-200 rounded px-2 py-1 transition-colors";
const btnSmDanger = "text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1 transition-colors";
const btnSmSuccess = "text-xs text-green-600 hover:text-green-800 border border-green-200 rounded px-2 py-1 transition-colors";

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center gap-2 text-stone-400 text-sm py-8">
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      Loading…
    </div>
  );
}

function ErrBox({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start justify-between gap-4">
      <span>{msg}</span>
      <button onClick={onClose} className="text-red-400 hover:text-red-700 shrink-0">✕</button>
    </div>
  );
}

function OkBox({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 flex items-start justify-between gap-4">
      <span>{msg}</span>
      <button onClick={onClose} className="text-green-400 hover:text-green-700 shrink-0">✕</button>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-xl leading-none">✕</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function UploadZone({ label, accept, onFile, onCancel, extraFields }: {
  label: string; accept: string;
  onFile: (f: File) => Promise<void>;
  onCancel: () => void;
  extraFields?: React.ReactNode;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function go() {
    if (!ref.current?.files?.[0]) return;
    setErr(null); setBusy(true);
    try { await onFile(ref.current.files[0]); }
    catch (e: unknown) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      {extraFields}
      <div
        className="border-2 border-dashed border-stone-200 rounded-xl p-8 text-center cursor-pointer hover:border-stone-400 transition-colors"
        onClick={() => ref.current?.click()}
      >
        <input ref={ref} type="file" accept={accept} className="hidden"
          onChange={e => setFileName(e.target.files?.[0]?.name ?? null)} />
        {fileName
          ? <p className="text-sm text-stone-700 font-medium">{fileName}</p>
          : <><p className="text-stone-400 text-sm">Click to choose file</p><p className="text-stone-300 text-xs mt-1">{label}</p></>
        }
      </div>
      {err && <ErrBox msg={err} onClose={() => setErr(null)} />}
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className={btnSecondary}>Cancel</button>
        <button onClick={go} disabled={!fileName || busy} className={btnPrimary}>{busy ? "Uploading…" : "Upload"}</button>
      </div>
    </div>
  );
}

// ─── Fabrics Panel ────────────────────────────────────────────────────────────

function FabricForm({ onSubmit, onCancel }: { onSubmit: (d: Record<string, unknown>) => Promise<void>; onCancel: () => void }) {
  const [f, setF] = useState({ sku: "", name: "", tier: "A", tile_width_mm: "20", pattern_type: "solid", colorway: "", hex_primary: "#F2EEE6" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(p => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      await onSubmit({ ...f, tile_width_mm: parseFloat(f.tile_width_mm), tile_path: `fabrics/${f.sku}/tile.png`, colorway: f.colorway || null, hex_primary: f.hex_primary || null });
    } catch (ex: unknown) { setErr((ex as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {err && <ErrBox msg={err} onClose={() => setErr(null)} />}
      <div className="grid grid-cols-2 gap-4">
        <Field label="SKU *"><input required value={f.sku} onChange={set("sku")} className={inputCls} placeholder="F-A-002-BLUE" /></Field>
        <Field label="Name *"><input required value={f.name} onChange={set("name")} className={inputCls} placeholder="Royal Blue Oxford" /></Field>
        <Field label="Tier">
          <select value={f.tier} onChange={set("tier")} className={inputCls}>
            {["A","B","C"].map(t => <option key={t} value={t}>Tier {t}</option>)}
          </select>
        </Field>
        <Field label="Pattern Type">
          <select value={f.pattern_type} onChange={set("pattern_type")} className={inputCls}>
            {["solid","stripe","check","twill","oxford","herringbone","poplin"].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Tile Width (mm)"><input type="number" step="0.1" value={f.tile_width_mm} onChange={set("tile_width_mm")} className={inputCls} /></Field>
        <Field label="Colorway"><input value={f.colorway} onChange={set("colorway")} className={inputCls} placeholder="white" /></Field>
        <Field label="Primary Colour">
          <input type="color" value={f.hex_primary} onChange={set("hex_primary")} className="w-full h-10 rounded-lg border border-stone-200 cursor-pointer p-1" />
        </Field>
      </div>
      <p className="text-xs text-stone-400">Tile PNG (200×200 px) can be uploaded after creation.</p>
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onCancel} className={btnSecondary}>Cancel</button>
        <button type="submit" disabled={busy} className={btnPrimary}>{busy ? "Creating…" : "Create Fabric"}</button>
      </div>
    </form>
  );
}

function FabricsPanel({ token }: { token: string }) {
  const [items, setItems] = useState<FabricRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<FabricRecord | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    adminFetch<FabricRecord[]>("/fabrics", token).then(setItems).catch(e => setErr(e.message)).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { reload(); }, [reload]);

  async function create(data: Record<string, unknown>) {
    await adminFetch("/fabrics", token, { method: "POST", body: JSON.stringify(data) });
    setShowForm(false); setMsg("Fabric created — upload the tile PNG next."); reload();
  }

  async function toggleActive(f: FabricRecord) {
    await adminFetch(`/fabrics/${f.id}`, token, { method: "PATCH", body: JSON.stringify({ active: !f.active }) }).catch(e => setErr(e.message));
    reload();
  }

  return (
    <div className="space-y-4">
      {err && <ErrBox msg={err} onClose={() => setErr(null)} />}
      {msg && <OkBox msg={msg} onClose={() => setMsg(null)} />}
      {showForm && <Modal title="Add Fabric" onClose={() => setShowForm(false)}><FabricForm onSubmit={create} onCancel={() => setShowForm(false)} /></Modal>}
      {uploadTarget && (
        <Modal title={`Upload Tile — ${uploadTarget.name}`} onClose={() => setUploadTarget(null)}>
          <UploadZone label="PNG tile (200×200 px recommended)" accept=".png,image/png"
            onFile={async file => { await adminUpload(`/fabrics/${uploadTarget.id}/asset`, token, file); setMsg(`Tile uploaded for ${uploadTarget.name}.`); setUploadTarget(null); reload(); }}
            onCancel={() => setUploadTarget(null)} />
        </Modal>
      )}
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">{items.length} fabric{items.length !== 1 ? "s" : ""}</p>
        <button onClick={() => setShowForm(true)} className={btnPrimary}>+ Add Fabric</button>
      </div>
      {loading ? <Spinner /> : items.length === 0 ? <p className="text-stone-400 text-sm py-4">No fabrics yet.</p> : (
        <div className="rounded-xl border border-stone-200 bg-white overflow-auto shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>{["SKU","Name","Tier","Pattern","Colorway","Colour","v","Active","Actions"].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map(f => (
                <tr key={f.id} className="hover:bg-stone-50">
                  <td className="px-3 py-2 font-mono text-xs text-stone-500">{f.sku}</td>
                  <td className="px-3 py-2 font-medium text-stone-800">{f.name}</td>
                  <td className="px-3 py-2 text-stone-500">{f.tier}</td>
                  <td className="px-3 py-2 text-stone-500 capitalize">{f.pattern_type}</td>
                  <td className="px-3 py-2 text-stone-400">{f.colorway ?? "—"}</td>
                  <td className="px-3 py-2">
                    {f.hex_primary ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full border border-stone-200 shrink-0" style={{ background: f.hex_primary }} />
                        <span className="text-xs text-stone-400 font-mono">{f.hex_primary}</span>
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-stone-400">{f.asset_version}</td>
                  <td className="px-3 py-2"><span className={`text-xs font-medium ${f.active ? "text-green-600" : "text-stone-400"}`}>{f.active ? "✓" : "✗"}</span></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5 whitespace-nowrap">
                      <button onClick={() => setUploadTarget(f)} className={btnSmDefault}>Upload Tile</button>
                      <button onClick={() => toggleActive(f)} className={f.active ? btnSmDanger : btnSmSuccess}>{f.active ? "Deactivate" : "Activate"}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Collar / Cuff Panel (shared) ─────────────────────────────────────────────

function CollarCuffForm({ type, onSubmit, onCancel }: { type: "collar" | "cuff"; onSubmit: (d: Record<string, unknown>) => Promise<void>; onCancel: () => void }) {
  const collarStyles = ["spread","cutaway","club","wing","button-down","tab","band"];
  const cuffStyles = ["barrel","french","convertible","link"];
  const styles = type === "collar" ? collarStyles : cuffStyles;
  const [f, setF] = useState({ sku: "", name: "", style: styles[0] });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(p => ({ ...p, [k]: e.target.value }));
  const dir = type === "collar" ? "collars" : "cuffs";

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      await onSubmit({ ...f, base_mask_path: `${dir}/${f.sku}/base_mask.png`, fabric_mask_path: `${dir}/${f.sku}/fabric_mask.png`, shading_path: `${dir}/${f.sku}/shading.png`, preview_anchor_xy: { x: 0, y: 0 } });
    } catch (ex: unknown) { setErr((ex as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {err && <ErrBox msg={err} onClose={() => setErr(null)} />}
      <div className="grid grid-cols-2 gap-4">
        <Field label="SKU *"><input required value={f.sku} onChange={set("sku")} className={inputCls} placeholder={type === "collar" ? "SPREAD-02" : "BARREL-02"} /></Field>
        <Field label="Name *"><input required value={f.name} onChange={set("name")} className={inputCls} placeholder={type === "collar" ? "Wide Spread" : "Double Barrel"} /></Field>
        <Field label="Style">
          <select value={f.style} onChange={set("style")} className={inputCls}>
            {styles.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <p className="text-xs text-stone-400">Asset PNG layers (base_mask, fabric_mask, shading) are uploaded per-layer after creation.</p>
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onCancel} className={btnSecondary}>Cancel</button>
        <button type="submit" disabled={busy} className={btnPrimary}>{busy ? "Creating…" : `Create ${type === "collar" ? "Collar" : "Cuff"}`}</button>
      </div>
    </form>
  );
}

function CollarCuffPanel({ type, token }: { type: "collar" | "cuff"; token: string }) {
  const path = type === "collar" ? "collars" : "cuffs";
  const label = type === "collar" ? "Collar" : "Cuff";
  const [items, setItems] = useState<CatalogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<CatalogRecord | null>(null);
  const [uploadLayer, setUploadLayer] = useState("base_mask");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    adminFetch<CatalogRecord[]>(`/${path}`, token).then(setItems).catch(e => setErr(e.message)).finally(() => setLoading(false));
  }, [token, path]);

  useEffect(() => { reload(); }, [reload]);

  async function create(data: Record<string, unknown>) {
    await adminFetch(`/${path}`, token, { method: "POST", body: JSON.stringify(data) });
    setShowForm(false); setMsg(`${label} created — upload asset PNG layers next.`); reload();
  }

  async function toggleActive(item: CatalogRecord) {
    await adminFetch(`/${path}/${item.id}`, token, { method: "PATCH", body: JSON.stringify({ active: !item.active }) }).catch(e => setErr(e.message));
    reload();
  }

  return (
    <div className="space-y-4">
      {err && <ErrBox msg={err} onClose={() => setErr(null)} />}
      {msg && <OkBox msg={msg} onClose={() => setMsg(null)} />}
      {showForm && <Modal title={`Add ${label}`} onClose={() => setShowForm(false)}><CollarCuffForm type={type} onSubmit={create} onCancel={() => setShowForm(false)} /></Modal>}
      {uploadTarget && (
        <Modal title={`Upload Layer — ${uploadTarget.name}`} onClose={() => setUploadTarget(null)}>
          <UploadZone label="PNG mask (same size as collar/cuff canvas, RGBA or Greyscale)" accept=".png,image/png"
            extraFields={
              <Field label="Layer to upload">
                <select value={uploadLayer} onChange={e => setUploadLayer(e.target.value)} className={inputCls}>
                  {["base_mask","fabric_mask","shading","highlight"].map(l => <option key={l} value={l}>{l}.png</option>)}
                </select>
              </Field>
            }
            onFile={async file => {
              await adminUpload(`/${path}/${uploadTarget.id}/asset`, token, file, `layer=${uploadLayer}`);
              setMsg(`${uploadLayer}.png uploaded for ${uploadTarget.name}.`); setUploadTarget(null); reload();
            }}
            onCancel={() => setUploadTarget(null)} />
        </Modal>
      )}
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">{items.length} {label.toLowerCase()}{items.length !== 1 ? "s" : ""}</p>
        <button onClick={() => setShowForm(true)} className={btnPrimary}>+ Add {label}</button>
      </div>
      {loading ? <Spinner /> : items.length === 0 ? <p className="text-stone-400 text-sm py-4">No {label.toLowerCase()}s yet.</p> : (
        <div className="rounded-xl border border-stone-200 bg-white overflow-auto shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>{["SKU","Name","Style","v","Active","Actions"].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-stone-50">
                  <td className="px-3 py-2 font-mono text-xs text-stone-500">{item.sku}</td>
                  <td className="px-3 py-2 font-medium text-stone-800">{item.name}</td>
                  <td className="px-3 py-2 text-stone-500 capitalize">{item.style}</td>
                  <td className="px-3 py-2 text-xs text-stone-400">{item.asset_version}</td>
                  <td className="px-3 py-2"><span className={`text-xs font-medium ${item.active ? "text-green-600" : "text-stone-400"}`}>{item.active ? "✓" : "✗"}</span></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5 whitespace-nowrap">
                      <button onClick={() => { setUploadTarget(item); setUploadLayer("base_mask"); }} className={btnSmDefault}>Upload Layers</button>
                      <button onClick={() => toggleActive(item)} className={item.active ? btnSmDanger : btnSmSuccess}>{item.active ? "Deactivate" : "Activate"}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Renders Panel ────────────────────────────────────────────────────────────

function RendersPanel({ token }: { token: string }) {
  const [items, setItems] = useState<RenderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "valid" | "invalid">("all");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    const q = filter === "valid" ? "?is_valid=true" : filter === "invalid" ? "?is_valid=false" : "";
    adminFetch<RenderRecord[]>(`/renders${q}`, token)
      .then(data => { setItems(data); setSelected(new Set()); })
      .catch(e => setErr(e.message)).finally(() => setLoading(false));
  }, [token, filter]);

  useEffect(() => { reload(); }, [reload]);

  async function invalidate() {
    if (!selected.size) return;
    await adminFetch("/renders/invalidate", token, { method: "POST", body: JSON.stringify({ render_ids: [...selected] }) });
    setMsg(`${selected.size} render(s) marked stale.`); reload();
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <div className="space-y-4">
      {err && <ErrBox msg={err} onClose={() => setErr(null)} />}
      {msg && <OkBox msg={msg} onClose={() => setMsg(null)} />}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {(["all","valid","invalid"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors capitalize ${filter === f ? "bg-stone-900 text-white border-stone-900" : "border-stone-200 text-stone-500 hover:border-stone-400"}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button onClick={invalidate} className="bg-red-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-red-700">
              Invalidate {selected.size} selected
            </button>
          )}
          <button onClick={reload} className="border border-stone-200 text-stone-500 rounded-lg px-3 py-1.5 text-xs hover:bg-stone-50">
            ↻ Refresh
          </button>
        </div>
      </div>
      {loading ? <Spinner /> : items.length === 0 ? <p className="text-stone-400 text-sm py-4">No renders match filter.</p> : (
        <div className="rounded-xl border border-stone-200 bg-white overflow-auto shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="px-3 py-2.5 w-10">
                  <input type="checkbox" checked={selected.size === items.length && items.length > 0}
                    onChange={() => setSelected(selected.size === items.length ? new Set() : new Set(items.map(i => i.id)))} />
                </th>
                {["Collar ID","Cuff ID","Fabric ID","Status","Previews"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map(r => (
                <tr key={r.id} className="hover:bg-stone-50">
                  <td className="px-3 py-2"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} /></td>
                  <td className="px-3 py-2 font-mono text-[10px] text-stone-500">{r.collar_id.slice(0,8)}…</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-stone-500">{r.cuff_id.slice(0,8)}…</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-stone-500">{r.fabric_id.slice(0,8)}…</td>
                  <td className="px-3 py-2"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.is_valid ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{r.is_valid ? "Valid" : "Stale"}</span></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      {r.front_url && <a href={r.front_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">Front</a>}
                      {r.collar_url && <a href={r.collar_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">Collar</a>}
                      {r.cuff_url && <a href={r.cuff_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">Cuff</a>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-right text-[11px] text-stone-400 px-4 py-2 border-t border-stone-100">{items.length} render{items.length !== 1 ? "s" : ""}</p>
        </div>
      )}
    </div>
  );
}

// ─── Analytics Panel ──────────────────────────────────────────────────────────

function AnalyticsPanel({ token }: { token: string }) {
  const [sub, setSub] = useState<"popular" | "fabrics" | "funnel">("popular");
  const [data, setData] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setData(null); setLoading(true);
    adminFetch<Record<string, unknown>[]>(`/analytics/${sub}`, token)
      .then(setData).catch(() => setData([])).finally(() => setLoading(false));
  }, [sub, token]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["popular","fabrics","funnel"] as const).map(t => (
          <button key={t} onClick={() => setSub(t)}
            className={`px-4 py-1.5 rounded-lg text-sm border transition-colors capitalize ${sub === t ? "bg-stone-800 text-white border-stone-800" : "border-stone-200 text-stone-500 hover:border-stone-400"}`}>
            {t}
          </button>
        ))}
      </div>
      {loading ? <Spinner /> : data?.length ? <DataTable data={data} /> : <p className="text-stone-400 text-sm py-4">No data yet.</p>}
    </div>
  );
}

// ─── Generic Data Table ───────────────────────────────────────────────────────

function DataTable({ data }: { data: Record<string, unknown>[] }) {
  if (!data.length) return <p className="text-stone-400 text-sm py-8">No records found.</p>;
  const keys = Object.keys(data[0]);
  return (
    <div className="overflow-auto rounded-xl border border-stone-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-stone-50 border-b border-stone-200">
          <tr>{keys.map(k => <th key={k} className="px-4 py-3 text-left text-[11px] font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{k.replace(/_/g, " ")}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-stone-50">
              {keys.map(k => <td key={k} className="px-4 py-2.5 text-stone-700 max-w-[200px] truncate">{String(row[k] ?? "—")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-right text-[11px] text-stone-400 px-4 py-2 border-t border-stone-100">{data.length} record{data.length !== 1 ? "s" : ""}</p>
    </div>
  );
}

const NAV_ITEMS = ["fabrics", "collars", "cuffs", "renders", "analytics", "audit"] as const;
type NavTab = (typeof NAV_ITEMS)[number];

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

  // Restore session from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("jf_admin_token");
    const email = localStorage.getItem("jf_admin_email");
    if (saved) {
      setToken(saved);
      setAdminEmail(email ?? "");
    }
  }, []);

  function handleLogin(tok: string, email: string) {
    setToken(tok);
    setAdminEmail(email);
  }

  function handleLogout() {
    localStorage.removeItem("jf_admin_token");
    localStorage.removeItem("jf_admin_email");
    setToken(null);
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
            onClick={() => window.location.reload()}
            className="text-xs text-stone-400 hover:text-stone-700 border border-stone-200 rounded px-3 py-1.5 transition-colors"
          >
            ↻ Refresh
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {tab === "fabrics" && <FabricsPanel token={token} />}
          {tab === "collars" && <CollarCuffPanel type="collar" token={token} />}
          {tab === "cuffs" && <CollarCuffPanel type="cuff" token={token} />}
          {tab === "renders" && <RendersPanel token={token} />}
          {tab === "analytics" && <AnalyticsPanel token={token} />}
          {tab === "audit" && <AuditTab token={token} />}
        </main>
      </div>
    </div>
  );
}

function AuditTab({ token }: { token: string }) {
  const [data, setData] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    adminFetch<Record<string, unknown>[]>("/audit", token)
      .then(setData).catch(e => setErr(e.message)).finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="space-y-4">
      {err && <ErrBox msg={err} onClose={() => setErr(null)} />}
      {loading ? <Spinner /> : data ? <DataTable data={data} /> : null}
    </div>
  );
}

