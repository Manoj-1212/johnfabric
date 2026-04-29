"use client";
import { useEffect } from "react";
import { useConfigStore } from "@/store/configStore";
import { ConfiguratorSelectors } from "@/components/ConfiguratorSelectors";
import { PreviewPanes } from "@/components/PreviewPanes";

export default function Home() {
  const { loadCatalog, error } = useConfigStore();

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F8F4EE" }}>
      {/* Header */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1
              className="font-bold tracking-[0.2em] text-stone-900"
              style={{ fontSize: "1.1rem", letterSpacing: "0.25em" }}
            >
              JOHN FABRIC
            </h1>
            <p className="text-[10px] tracking-[0.15em] text-stone-400 uppercase mt-0.5">
              Bespoke Shirt Studio
            </p>
          </div>
          <a
            href="/admin"
            className="text-xs tracking-widest text-stone-400 hover:text-stone-700 transition-colors uppercase"
          >
            Admin
          </a>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto w-full px-6 pt-4">
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-6 py-8 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8 items-start">
        {/* Left: Selector sidebar */}
        <aside className="lg:sticky lg:top-[73px] bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-6 pt-6 pb-2 border-b border-stone-100">
            <p className="text-xs tracking-[0.18em] text-stone-400 uppercase font-medium">
              Configure Your Shirt
            </p>
          </div>
          <div className="p-6">
            <ConfiguratorSelectors />
          </div>
        </aside>

        {/* Right: Preview */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-stone-800 tracking-tight">Your Shirt</h2>
            <p className="text-sm text-stone-400 mt-0.5">Preview updates automatically as you select options</p>
          </div>
          <PreviewPanes />
        </section>
      </div>

      <footer className="border-t border-stone-200 py-4 text-center text-xs text-stone-400">
        John Fabric &copy; {new Date().getFullYear()} &mdash; All configurations are saved automatically
      </footer>
    </div>
  );
}
