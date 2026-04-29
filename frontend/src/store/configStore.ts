import { create } from "zustand";
import type { Fabric, Collar, Cuff, RenderAllResponse } from "@/types";
import { api } from "@/lib/api";

type ConfigStore = {
  fabrics: Fabric[];
  collars: Collar[];
  cuffs: Cuff[];
  selectedFabric: Fabric | null;
  selectedCollar: Collar | null;
  selectedCuff: Cuff | null;
  render: RenderAllResponse | null;
  loading: boolean;
  error: string | null;
  loadCatalog: () => Promise<void>;
  selectFabric: (f: Fabric) => void;
  selectCollar: (c: Collar) => void;
  selectCuff: (c: Cuff) => void;
};

export const useConfigStore = create<ConfigStore>((set, get) => ({
  fabrics: [],
  collars: [],
  cuffs: [],
  selectedFabric: null,
  selectedCollar: null,
  selectedCuff: null,
  render: null,
  loading: false,
  error: null,

  loadCatalog: async () => {
    set({ loading: true, error: null });
    try {
      const [fabrics, collars, cuffs] = await Promise.all([
        api.getFabrics(),
        api.getCollars(),
        api.getCuffs(),
      ]);
      set({
        fabrics,
        collars,
        cuffs,
        selectedFabric: fabrics[0] ?? null,
        selectedCollar: collars[0] ?? null,
        selectedCuff: cuffs[0] ?? null,
        loading: false,
      });
      // Trigger initial render
      const { selectedFabric, selectedCollar, selectedCuff } = get();
      if (selectedFabric && selectedCollar && selectedCuff) {
        await _triggerRender(set, selectedCollar.id, selectedCuff.id, selectedFabric.id);
      }
    } catch (e: unknown) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  selectFabric: (f: Fabric) => {
    const { selectedCollar, selectedCuff } = get();
    set({ selectedFabric: f });
    if (selectedCollar && selectedCuff)
      _triggerRender(set, selectedCollar.id, selectedCuff.id, f.id);
    api.trackEvent("select", { fabric_id: f.id });
  },

  selectCollar: (c: Collar) => {
    const { selectedFabric, selectedCuff } = get();
    set({ selectedCollar: c });
    if (selectedFabric && selectedCuff)
      _triggerRender(set, c.id, selectedCuff.id, selectedFabric.id);
    api.trackEvent("select", { collar_id: c.id });
  },

  selectCuff: (c: Cuff) => {
    const { selectedFabric, selectedCollar } = get();
    set({ selectedCuff: c });
    if (selectedFabric && selectedCollar)
      _triggerRender(set, selectedCollar.id, c.id, selectedFabric.id);
    api.trackEvent("select", { cuff_id: c.id });
  },
}));

async function _triggerRender(
  set: (partial: Partial<ConfigStore>) => void,
  collarId: string,
  cuffId: string,
  fabricId: string,
) {
  set({ loading: true, error: null });
  try {
    const render = await api.renderAll(collarId, cuffId, fabricId);
    set({ render, loading: false });
  } catch (e: unknown) {
    set({ loading: false, error: (e as Error).message });
  }
}
