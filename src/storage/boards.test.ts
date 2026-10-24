import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createBoard,
  deleteBoard,
  duplicateBoard,
  getThumbnails,
  listBoards,
  loadScene,
  renameBoard,
  saveScene,
  saveThumbnail,
  saveViewport,
} from "./boards";
import { resetStores, sceneWith } from "./testing";

beforeEach(resetStores);

describe("createBoard", () => {
  it("lists the newest board first", async () => {
    const a = await createBoard({ name: "A" });
    const b = await createBoard({ name: "B" });
    expect((await listBoards()).map((m) => m.id)).toEqual([b.id, a.id]);
  });

  it("names unnamed boards from the date and avoids duplicates", async () => {
    const first = await createBoard();
    const second = await createBoard();
    expect(first.name).toMatch(/^Sketch [A-Z][a-z]{2} \d{1,2}$/);
    expect(second.name).toBe(`${first.name} (2)`);
  });

  it("starts with an empty scene", async () => {
    const board = await createBoard();
    expect(await loadScene(board.id)).toEqual({ data: null });
  });
});

describe("saveScene and saveViewport", () => {
  it("bumps updatedAt on content saves only", async () => {
    const board = await createBoard();
    await saveViewport(board.id, { scrollX: 10, scrollY: 20, zoom: 1.5 });
    expect((await listBoards())[0]!.updatedAt).toBe(board.updatedAt);

    await saveScene(board.id, sceneWith([{ type: "rectangle" }]).data);
    expect((await listBoards())[0]!.updatedAt).toBeGreaterThan(board.updatedAt);
  });

  it("keeps the viewport when content is saved afterwards", async () => {
    const board = await createBoard();
    await saveViewport(board.id, { scrollX: 10, scrollY: 20, zoom: 2 });
    await saveScene(board.id, sceneWith([{ type: "ellipse" }]).data);
    const scene = await loadScene(board.id);
    expect(scene?.viewport).toEqual({ scrollX: 10, scrollY: 20, zoom: 2 });
    expect(scene?.data?.elements).toHaveLength(1);
  });

  it("does not resurrect a deleted board", async () => {
    const board = await createBoard();
    await deleteBoard(board.id);
    await saveScene(board.id, sceneWith([]).data);
    await saveViewport(board.id, { scrollX: 0, scrollY: 0, zoom: 1 });
    expect(await loadScene(board.id)).toBeUndefined();
    expect(await listBoards()).toEqual([]);
  });
});

describe("renameBoard", () => {
  it("trims and saves the new name", async () => {
    const board = await createBoard({ name: "Old" });
    await renameBoard(board.id, "  Checkout flow  ");
    expect((await listBoards())[0]!.name).toBe("Checkout flow");
  });

  it("ignores a blank name", async () => {
    const board = await createBoard({ name: "Keep" });
    await renameBoard(board.id, "   ");
    expect((await listBoards())[0]!.name).toBe("Keep");
  });
});

describe("duplicateBoard", () => {
  it("copies content and thumbnail under a new id", async () => {
    const board = await createBoard({ name: "Chat system" });
    await saveScene(board.id, sceneWith([{ type: "rectangle" }, { type: "arrow" }, { type: "text" }]).data);
    await saveThumbnail(board.id, "data:image/webp;base64,AAA");

    const copy = await duplicateBoard(board.id);
    expect(copy?.id).not.toBe(board.id);
    expect(copy?.name).toBe("Chat system copy");
    expect((await loadScene(copy!.id))?.data?.elements).toHaveLength(3);
    expect(await getThumbnails([copy!.id])).toEqual({ [copy!.id]: "data:image/webp;base64,AAA" });
  });

  it("returns undefined for a missing board", async () => {
    expect(await duplicateBoard("nope")).toBeUndefined();
  });
});

describe("deleteBoard", () => {
  it("removes meta, scene and thumbnail", async () => {
    const board = await createBoard();
    await saveThumbnail(board.id, "data:x");
    await deleteBoard(board.id);
    expect(await listBoards()).toEqual([]);
    expect(await loadScene(board.id)).toBeUndefined();
    expect(await getThumbnails([board.id])).toEqual({});
  });
});
