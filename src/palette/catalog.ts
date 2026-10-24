// System-design components offered in the palette. Canvas content colors live here, not in tokens.css:
// they are Excalidraw's own picker colors, so hand-recolored shapes stay in the same family (DESIGN.md §2).

export type Tier = "edge" | "compute" | "data" | "async" | "external" | "layout";

export type Recipe =
  | "box"
  | "rounded"
  | "ellipse"
  | "diamond"
  | "cylinder"
  | "queue"
  | "stack"
  | "dashed"
  | "dotted"
  | "boundary";

export type ComponentDef = {
  kind: string;
  label: string;
  tier: Tier;
  recipe: Recipe;
  w: number;
  h: number;
  dividers?: number;
};

export const TIER_FILL: Record<Tier, string> = {
  edge: "#a5d8ff",
  compute: "#b2f2bb",
  data: "#ffec99",
  async: "#ffc9c9",
  external: "transparent",
  layout: "transparent",
};

export const TIER_LABEL: Record<Tier, string> = {
  edge: "Edge",
  compute: "Compute",
  data: "Data",
  async: "Async",
  external: "External",
  layout: "Layout",
};

export const TIER_ORDER: Tier[] = ["edge", "compute", "data", "async", "external", "layout"];

export const CATALOG: ComponentDef[] = [
  { kind: "client", label: "Client", tier: "edge", recipe: "ellipse", w: 160, h: 90 },
  { kind: "mobile", label: "Mobile app", tier: "edge", recipe: "rounded", w: 110, h: 160 },
  { kind: "dns", label: "DNS", tier: "edge", recipe: "ellipse", w: 140, h: 80 },
  { kind: "cdn", label: "CDN", tier: "edge", recipe: "rounded", w: 180, h: 80 },
  { kind: "load-balancer", label: "Load balancer", tier: "edge", recipe: "diamond", w: 200, h: 120 },
  { kind: "api-gateway", label: "API gateway", tier: "edge", recipe: "box", w: 200, h: 80 },
  { kind: "service", label: "Service", tier: "compute", recipe: "rounded", w: 180, h: 90 },
  { kind: "worker-pool", label: "Worker pool", tier: "compute", recipe: "stack", w: 192, h: 102 },
  { kind: "auth", label: "Auth service", tier: "compute", recipe: "rounded", w: 180, h: 90 },
  { kind: "database", label: "Database", tier: "data", recipe: "cylinder", w: 160, h: 120 },
  { kind: "cache", label: "Cache", tier: "data", recipe: "dashed", w: 160, h: 80 },
  { kind: "object-store", label: "Object storage", tier: "data", recipe: "box", w: 190, h: 90 },
  { kind: "search", label: "Search index", tier: "data", recipe: "box", w: 180, h: 90 },
  { kind: "queue", label: "Message queue", tier: "async", recipe: "queue", w: 200, h: 70, dividers: 3 },
  { kind: "stream", label: "Event stream", tier: "async", recipe: "queue", w: 260, h: 70, dividers: 5 },
  { kind: "external-api", label: "Third-party API", tier: "external", recipe: "dotted", w: 210, h: 90 },
  { kind: "boundary", label: "Region / VPC", tier: "layout", recipe: "boundary", w: 520, h: 340 },
];

export function findComponent(kind: string): ComponentDef | undefined {
  return CATALOG.find((def) => def.kind === kind);
}
