"use client";
import Image from "next/image";
import { useConfigStore } from "@/store/configStore";

export function PreviewPanes() {
  const { render, loading, selectedCollar, selectedCuff, selectedFabric } = useConfigStore();

  const isEmpty = !render && !loading;

  return (
    <div className="space-y-4">
      {/* Main shirt preview */}
      <div
        className="relative w-full rounded-2xl border border-stone-200 bg-white overflow-hidden flex items-center justify-center shadow-sm"
        style={{ minHeight: "480px" }}
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-10 gap-3">
            <Spinner />
            <span className="text-xs text-stone-400 tracking-widest uppercase">Composing…</span>
          </div>
        )}

        {render?.front_url ? (
          <Image
            src={render.front_url}
            alt="Full shirt preview"
            fill
            className="object-contain p-8"
            unoptimized
          />
        ) : isEmpty ? (
          <EmptyState />
        ) : null}

        {/* Label bottom-left */}
        <span className="absolute bottom-3 left-4 text-[10px] tracking-[0.15em] uppercase text-stone-400">
          Full Shirt
        </span>

        {/* Source badge top-right */}
        {render?.source && (
          <span className="absolute top-3 right-3 text-[9px] tracking-wider text-stone-300 uppercase bg-stone-50 border border-stone-100 rounded px-1.5 py-0.5">
            {render.source} · {render.ms}ms
          </span>
        )}
      </div>

      {/* Detail panes row */}
      <div className="grid grid-cols-2 gap-4">
        <DetailCard
          label="Collar Detail"
          url={render?.collar_url}
          loading={loading}
          hint={selectedCollar?.name}
        />
        <DetailCard
          label="Cuff Detail"
          url={render?.cuff_url}
          loading={loading}
          hint={selectedCuff?.name}
        />
      </div>

      {/* Config summary bar */}
      {(selectedCollar || selectedCuff || selectedFabric) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {selectedCollar && <Tag label="Collar" value={selectedCollar.name} />}
          {selectedCuff && <Tag label="Cuff" value={selectedCuff.name} />}
          {selectedFabric && (
            <Tag
              label="Fabric"
              value={selectedFabric.name}
              swatch={selectedFabric.hex_primary ?? undefined}
            />
          )}
        </div>
      )}
    </div>
  );
}

function DetailCard({
  label,
  url,
  loading,
  hint,
}: {
  label: string;
  url?: string | null;
  loading: boolean;
  hint?: string | null;
}) {
  return (
    <div className="relative aspect-square rounded-2xl border border-stone-200 bg-white overflow-hidden flex items-center justify-center shadow-sm">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <Spinner size="sm" />
        </div>
      )}
      {url ? (
        <Image src={url} alt={label} fill className="object-contain p-6" unoptimized />
      ) : (
        !loading && (
          <span className="text-[10px] tracking-widest uppercase text-stone-300">{hint ?? label}</span>
        )
      )}
      <span className="absolute bottom-2 left-0 right-0 text-center text-[9px] tracking-[0.15em] uppercase text-stone-400">
        {label}
      </span>
    </div>
  );
}

function Tag({ label, value, swatch }: { label: string; value: string; swatch?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-stone-500 bg-white border border-stone-200 rounded-full px-3 py-1">
      {swatch && (
        <span
          className="w-3 h-3 rounded-full border border-stone-200 flex-shrink-0"
          style={{ background: swatch }}
        />
      )}
      <span className="text-stone-400">{label}:</span>
      <span className="font-medium text-stone-600">{value}</span>
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 text-stone-300 select-none py-16 px-8 text-center">
      {/* Minimalist shirt outline */}
      <svg width="72" height="80" viewBox="0 0 72 80" fill="none" className="opacity-30">
        <path
          d="M20 4 L4 20 L16 24 L16 76 L56 76 L56 24 L68 20 L52 4 L40 14 C38 16 34 16 32 14 Z"
          stroke="#9ca3af"
          strokeWidth="2"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      <p className="text-sm text-stone-400">Select collar, cuff &amp; fabric to see your shirt</p>
    </div>
  );
}

function Spinner({ size = "md" }: { size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-5 w-5" : "h-9 w-9";
  return (
    <svg className={`animate-spin ${cls} text-stone-300`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
