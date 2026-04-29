"use client";
import { useConfigStore } from "@/store/configStore";
import type { Fabric, Collar, Cuff } from "@/types";
import clsx from "clsx";

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
