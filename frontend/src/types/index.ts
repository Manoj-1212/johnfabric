export type Fabric = {
  id: string;
  sku: string;
  name: string;
  tier: string;
  swatch_url?: string;
  tile_width_mm: number;
  pattern_type: string;
  colorway?: string;
  hex_primary?: string;
};

export type Collar = {
  id: string;
  sku: string;
  name: string;
  style: string;
  thumb_url?: string;
};

export type Cuff = {
  id: string;
  sku: string;
  name: string;
  style: string;
  thumb_url?: string;
};

export type RenderAllResponse = {
  front_url: string;
  collar_url: string;
  cuff_url: string;
  source: "redis" | "db" | "generated";
  render_id?: string;
  ms: number;
};
