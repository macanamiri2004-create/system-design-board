import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { createBackup, parseBackup, restoreBackup } from "./backup";
import { createBoard, listBoards, loadScene, saveScene } from "./boards";
import { listShelf, putFiles } from "./files";
import { fakeFile, resetStores, sceneWith } from "./testing";

beforeEach(resetStores);

async function seed() {
  const a = await createBoard({ name: "Checkout flow" });
  const b = await createBoard({ name: "Chat system" });
  await saveScene(a.id, sceneWith([{ type: "rectangle" }, { type: "image", fileId: "f1" }]).data);
  await putFiles([fakeFile("f1")]);
  return { a, b };
}

describe("backup round-trip", () => {
  it("restores boards and files into an empty workspace", async () => {
    const { a } = await seed();
    const text = JSON.stringify(await createBackup());
    await resetStores();

    const result = await restoreBackup(parseBackup(text));
    expect(result).toEqual({ added: 2, renamed: 0 });
    expect((await listBoards()).map((m) => m.name).sort()).toEqual(["Chat system", "Checkout flow"]);
    expect((await loadScene(a.id))?.data?.elements).toHaveLength(2);
    expect((await listShelf()).map((f) => f.id)).toEqual(["f1"]);
  });

  it("restores conflicting boards as copies instead of overwriting", async () => {
    await seed();
    const backup = parseBackup(JSON.stringify(await createBackup()));

    const result = await restoreBackup(backup);
    expect(result).toEqual({ added: 2, renamed: 2 });
    const names = (await listBoards()).map((m) => m.name).sort();
    expect(names).toEqual(["Chat system", "Chat system (restored)", "Checkout flow", "Checkout flow (restored)"]);
    expect(await listShelf()).toHaveLength(1);
  });
});

describe("parseBackup", () => {
  it.each([
    ["not json", "{"],
    ["another format", JSON.stringify({ format: "other", version: 1, boards: [], files: [] })],
    ["a future version", JSON.stringify({ format: "sdb-backup", version: 9, boards: [], files: [] })],
    ["missing arrays", JSON.stringify({ format: "sdb-backup", version: 1 })],
    ["a board without an id", JSON.stringify({ format: "sdb-backup", version: 1, boards: [{ meta: {} }], files: [] })],
  ])("rejects %s", (_label, text) => {
    expect(() => parseBackup(text)).toThrow(expect.objectContaining({ kind: "invalid" }));
  });
});
