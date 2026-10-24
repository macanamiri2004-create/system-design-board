import { describe, expect, it } from "vitest";
import { CATALOG, findComponent, type ComponentDef } from "./catalog";
import { mainId, toSkeleton } from "./toSkeleton";

type Part = { type: string; id?: string; x: number; y: number; width?: number; height?: number; groupIds?: string[] };
type Box = { minX: number; minY: number; maxX: number; maxY: number };

const parts = (def: ComponentDef, center = { x: 300, y: 200 }) =>
  toSkeleton(def, center, "inst") as unknown as (Part & Record<string, unknown>)[];

/** Bounds of the shapes; free text is excluded because its width is only known after measuring. */
function shapeBounds(list: Part[]): Box {
  const shapes = list.filter((p) => p.type !== "text");
  return {
    minX: Math.min(...shapes.map((p) => p.x)),
    minY: Math.min(...shapes.map((p) => p.y)),
    maxX: Math.max(...shapes.map((p) => p.x + (p.width ?? 0))),
    maxY: Math.max(...shapes.map((p) => p.y + (p.height ?? 0))),
  };
}

const component = (kind: string) => {
  const def = findComponent(kind);
  if (!def) throw new Error(`no component ${kind}`);
  return def;
};

describe("toSkeleton", () => {
  it.each(CATALOG.map((def) => [def.kind, def] as const))("%s: one group, one main element, tagged parts", (_kind, def) => {
    const list = parts(def);
    expect(list.length).toBeGreaterThan(0);
    for (const p of list) {
      expect(p.groupIds).toEqual(["inst"]);
      expect(p.customData).toEqual({ sdb: { kind: def.kind, instanceId: "inst" } });
    }
    expect(list.filter((p) => p.id === mainId("inst"))).toHaveLength(1);
    expect(new Set(list.map((p) => p.id)).size).toBe(list.length);
  });

  it.each(CATALOG.map((def) => [def.kind, def] as const))("%s: shapes are centered on the drop point", (_kind, def) => {
    const box = shapeBounds(parts(def, { x: 300, y: 200 }));
    expect((box.minX + box.maxX) / 2).toBeCloseTo(300, 0);
    expect((box.minY + box.maxY) / 2).toBeCloseTo(200, 0);
    expect(box.maxX - box.minX).toBeCloseTo(def.w, 0);
    expect(box.maxY - box.minY).toBeCloseTo(def.h, 0);
  });

  it("draws the database cap after its body", () => {
    const list = parts(component("database"));
    expect(list.map((p) => p.type)).toEqual(["rectangle", "ellipse"]);
    expect(list[0]!.id).toBe(mainId("inst"));
    expect(list[0]!.label).toMatchObject({ text: "Database" });
  });

  it("gives a queue its dividers and a caption underneath", () => {
    const def = component("queue");
    const list = parts(def);
    expect(list).toHaveLength((def.dividers ?? 0) + 2);
    expect(list.filter((p) => p.type === "line")).toHaveLength(def.dividers!);
    const caption = list.find((p) => p.type === "text")!;
    expect(caption.text).toBe("Message queue");
    expect(caption.y).toBeGreaterThan(200 + def.h / 2);
  });

  it("labels a boundary in its top-left corner with no fill", () => {
    const list = parts(component("boundary"));
    expect(list[0]).toMatchObject({ strokeStyle: "dashed", backgroundColor: "transparent" });
    expect(list[1]).toMatchObject({ type: "text", text: "Region / VPC", textAlign: "left" });
  });

  it("uses tier fills and the hand-drawn font", () => {
    expect(parts(component("service"))[0]).toMatchObject({ backgroundColor: "#b2f2bb", roughness: 1, strokeWidth: 2 });
    expect(parts(component("cache"))[0]).toMatchObject({ strokeStyle: "dashed", backgroundColor: "#ffec99" });
    expect(parts(component("external-api"))[0]).toMatchObject({ strokeStyle: "dotted", backgroundColor: "transparent" });
    expect(parts(component("client"))[0]!.label).toMatchObject({ fontFamily: 5, fontSize: 20 });
  });
});
