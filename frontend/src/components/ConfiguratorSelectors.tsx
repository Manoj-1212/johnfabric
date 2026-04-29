"use client";
import { useConfigStore } from "@/store/configStore";
import type { Fabric, Collar, Cuff } from "@/types";
import clsx from "clsx";

// ── Collar style decorative icons (CSS polygons) ───────────────────────────
const CollarIcon = ({ style }: { style: string }) => {
  const spread = "polygon(50% 0%, 90% 40%, 65% 60%, 50% 45%, 35% 60%, 10% 40%)";
  const cutaway = "polygon(50% 0%, 95% 35%, 70% 55%, 50% 42%, 30% 55%, 5% 35%)";
  const club = "polygon(50% 0%, 80% 35%, 60% 55%, 50% 45%, 40% 55%, 20% 35%)";
  const shapes: Record<string, string> = { spread, cutaway, club, wing: spread };
  const clip = shapes[style] ?? spread;
  return (
    <div
      className="w-8 h-7 mb-2"
      style={{
        background: "currentColor",
        clipPath: clip,
        opacity: 0.55,
      }}
    />
  );
};

// ── Cuff style decorative icons ────────────────────────────────────────────
const CuffIcon = ({ style }: { style: string }) => {
  const isBarrel = style === "barrel";
  return (
    <div
      className="w-9 h-5 mb-2 border-2 border-current opacity-50"
      style={{ borderRadius: isBarrel ? "4px" : "1px" }}
    />
  );
};

export function ConfiguratorSelectors() {
  const {
    fabrics, collars, cuffs,
    selectedFabric, selectedCollar, selectedCuff,
    selectFabric, selectCollar, selectCuff,
    loading,
  } = useConfigStore();

  return (
    <div className="space-y-7">
      {/* ── Step 1: Collar ───────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="flex-shrink-0 w-7 h-7 rounded-full border-2 border-stone-800 text-stone-800 flex items-center justify-center text-xs font-bold">
            01
          </span>
          <span className="text-sm font-semibold text-stone-700 tracking-wide uppercase">
            Collar Style
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {collars.map((c) => (
            <button
              key={c.id}
              onClick={() => selectCollar(c)}
              disabled={loading}
              className={clsx(
                "group flex flex-col items-center justify-center text-center px-3 py-4 rounded-xl border-2 transition-all duration-150 focus:outline-none",
                selectedCollar?.id === c.id
                  ? "border-stone-800 bg-stone-800 text-white shadow-md"
                  : "border-stone-200 bg-white text-stone-600 hover:border-stone-400 hover:bg-stone-50"
              )}
            >
              <CollarIcon style={(c as Collar & { style?: string }).style ?? "spread"} />
              <span className="text-xs font-semibold tracking-wide leading-tight">{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Step 2: Cuff ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="flex-shrink-0 w-7 h-7 rounded-full border-2 border-stone-800 text-stone-800 flex items-center justify-center text-xs font-bold">
            02
          </span>
          <span className="text-sm font-semibold text-stone-700 tracking-wide uppercase">
            Cuff Style
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {cuffs.map((c) => (
            <button
              key={c.id}
              onClick={() => selectCuff(c)}
              disabled={loading}
              className={clsx(
                "group flex flex-col items-center justify-center text-center px-3 py-4 rounded-xl border-2 transition-all duration-150 focus:outline-none",
                selectedCuff?.id === c.id
                  ? "border-stone-800 bg-stone-800 text-white shadow-md"
                  : "border-stone-200 bg-white text-stone-600 hover:border-stone-400 hover:bg-stone-50"
              )}
            >
              <CuffIcon style={(c as Cuff & { style?: string }).style ?? "barrel"} />
              <span className="text-xs font-semibold tracking-wide leading-tight">{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Step 3: Fabric ───────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="flex-shrink-0 w-7 h-7 rounded-full border-2 border-stone-800 text-stone-800 flex items-center justify-center text-xs font-bold">
            03
          </span>
          <span className="text-sm font-semibold text-stone-700 tracking-wide uppercase">
            Fabric
          </span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {fabrics.map((f) => (
            <button
              key={f.id}
              onClick={() => selectFabric(f)}
              disabled={loading}
              title={f.name}
              className={clsx(
                "relative flex flex-col items-center gap-1.5 focus:outline-none group"
              )}
            >
              <span
                className={clsx(
                  "w-10 h-10 rounded-full border-2 transition-all duration-150 shadow-sm",
                  selectedFabric?.id === f.id
                    ? "border-stone-800 scale-110 ring-2 ring-stone-800 ring-offset-2"
                    : "border-stone-200 group-hover:border-stone-400 group-hover:scale-105"
                )}
                style={{ background: f.hex_primary ?? "#e5e7eb" }}
              />
              <span className="text-[9px] tracking-wide text-stone-500 text-center leading-tight max-w-full truncate px-0.5">
                {f.name.replace("Classic ", "").replace(" Twill", "")}
              </span>
            </button>
          ))}
        </div>
        {selectedFabric && (
          <div className="mt-3 p-3 rounded-lg bg-stone-50 border border-stone-100">
            <p className="text-xs font-medium text-stone-700">{selectedFabric.name}</p>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Tier {selectedFabric.tier} &middot; {selectedFabric.pattern_type}
              {selectedFabric.colorway ? ` · ${selectedFabric.colorway}` : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


export function ConfiguratorSelectors() {
  const {
    fabrics, collars, cuffs,
    selectedFabric, selectedCollar, selectedCuff,
    selectFabric, selectCollar, selectCuff,
    loading,
  } = useConfigStore();

  return (
    <div className="space-y-8">
      {/* Collar selector */}
      <SelectorSection<Collar>
        title="Collar Style"
        items={collars}
        selected={selectedCollar}
        onSelect={selectCollar}
        disabled={loading}
        renderItem={(c) => (
          <div className="flex flex-col items-center gap-1">
            {c.thumb_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.thumb_url} alt={c.name}
                className="w-14 h-14 object-cover rounded"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="w-14 h-14 rounded bg-stone-200 flex items-center justify-center text-[10px] text-stone-400">
                {c.sku}
              </div>
            )}
            <span className="text-xs text-center leading-tight">{c.name}</span>
          </div>
        )}
      />

      {/* Cuff selector */}
      <SelectorSection<Cuff>
        title="Cuff Style"
        items={cuffs}
        selected={selectedCuff}
        onSelect={selectCuff}
        disabled={loading}
        renderItem={(c) => (
          <div className="flex flex-col items-center gap-1">
            {c.thumb_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.thumb_url} alt={c.name}
                className="w-14 h-14 object-cover rounded"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="w-14 h-14 rounded bg-stone-200 flex items-center justify-center text-[10px] text-stone-400">
                {c.sku}
              </div>
            )}
            <span className="text-xs text-center leading-tight">{c.name}</span>
          </div>
        )}
      />

      {/* Fabric selector */}
      <div>
        <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-3">Fabric</h2>
        <div className="grid grid-cols-4 gap-2">
          {fabrics.map((f) => (
            <button
              key={f.id}
              onClick={() => selectFabric(f)}
              disabled={loading}
              title={`${f.name} (${f.tier})`}
              className={clsx(
                "rounded border-2 p-0.5 transition-all focus:outline-none",
                selectedFabric?.id === f.id
                  ? "border-stone-800 ring-1 ring-stone-800"
                  : "border-transparent hover:border-stone-300"
              )}
            >
              {f.swatch_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={f.swatch_url}
                  alt={f.name}
                  className="w-full aspect-square object-cover rounded"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div
                  className="w-full aspect-square rounded"
                  style={{ background: f.hex_primary ?? "#e5e7eb" }}
                />
              )}
            </button>
          ))}
        </div>
        {selectedFabric && (
          <p className="mt-2 text-xs text-stone-500">
            {selectedFabric.name} · Tier {selectedFabric.tier} · {selectedFabric.pattern_type}
          </p>
        )}
      </div>
    </div>
  );
}

// Generic selector section for collar/cuff
function SelectorSection<T extends { id: string; name: string }>({
  title, items, selected, onSelect, disabled, renderItem,
}: {
  title: string;
  items: T[];
  selected: T | null;
  onSelect: (item: T) => void;
  disabled: boolean;
  renderItem: (item: T) => React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-3">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            disabled={disabled}
            className={clsx(
              "rounded-lg border-2 p-2 transition-all focus:outline-none",
              selected?.id === item.id
                ? "border-stone-800 bg-stone-100"
                : "border-stone-200 hover:border-stone-400 bg-white"
            )}
          >
            {renderItem(item)}
          </button>
        ))}
      </div>
    </div>
  );
}
