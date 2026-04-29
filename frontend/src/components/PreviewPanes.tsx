"use client";
import Image from "next/image";
import { useConfigStore } from "@/store/configStore";

type Pane = { label: string; urlKey: "front_url" | "collar_url" | "cuff_url" };

const PANES: Pane[] = [
  { label: "Full Shirt", urlKey: "front_url" },
  { label: "Collar Detail", urlKey: "collar_url" },
  { label: "Cuff Detail", urlKey: "cuff_url" },
];

export function PreviewPanes() {
  const { render, loading } = useConfigStore();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PANES.map(({ label, urlKey }) => {
          const url = render?.[urlKey];
          return (
            <div
              key={urlKey}
              className="relative aspect-[3/4] sm:aspect-square rounded-xl border border-stone-200 bg-white overflow-hidden flex items-center justify-center"
            >
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                  <Spinner />
                </div>
              )}
              {url ? (
                <Image
                  src={url}
                  alt={label}
                  fill
                  className="object-contain p-3"
                  unoptimized
                />
              ) : (
                !loading && (
                  <div className="text-stone-300 text-sm select-none">
                    {label}
                  </div>
                )
              )}
              <span className="absolute bottom-2 left-0 right-0 text-center text-[11px] text-stone-400">
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {render && (
        <p className="text-right text-[11px] text-stone-400">
          Source: <strong>{render.source}</strong> · {render.ms}ms
        </p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-8 w-8 text-stone-400" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
