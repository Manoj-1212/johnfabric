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
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">John Fabric</h1>
        <span className="text-sm text-stone-400">Shirt Configurator</span>
      </header>

      {error && (
        <div className="mx-auto max-w-5xl mt-4 px-6">
          <div className="rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-6 py-8 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
        {/* Left: Selectors */}
        <aside>
          <ConfiguratorSelectors />
        </aside>

        {/* Right: Preview */}
        <section>
          <PreviewPanes />
        </section>
      </div>
    </main>
  );
}
