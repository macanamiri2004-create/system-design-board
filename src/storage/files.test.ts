import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBoard, deleteBoard, saveScene } from "./boards";
import { StorageError } from "./errors";
import { getFiles, listShelf, putFiles, referencedFileIds, removeFromShelf, shelfEvents } from "./files";
import { fakeFile, resetStores, sceneWith } from "./testing";

beforeEach(resetStores);

describe("putFiles", () => {
  it("stores each id once", async () => {
    expect(await putFiles([fakeFile("a"), fakeFile("a")])).toEqual(["a"]);
    expect(await putFiles([fakeFile("a"), fakeFile("b")])).toEqual(["b"]);
    expect((await listShelf()).map((f) => f.id).sort()).toEqual(["a", "b"]);
  });

  it("fires a change event only when something new is stored", async () => {
    const onChange = vi.fn();
    shelfEvents.addEventListener("change", onChange);
    await putFiles([fakeFile("a")]);
    await putFiles([fakeFile("a")]);
    shelfEvents.removeEventListener("change", onChange);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe("getFiles", () => {
  it("returns only the files that exist, keyed by id", async () => {
    await putFiles([fakeFile("a"), fakeFile("b")]);
    const files = await getFiles(["a", "missing", "a"]);
    expect(Object.keys(files)).toEqual(["a"]);
  });
});

describe("listShelf", () => {
  it("orders newest first", async () => {
    await putFiles([fakeFile("old", 1), fakeFile("new", 3), fakeFile("mid", 2)]);
    expect((await listShelf()).map((f) => f.id)).toEqual(["new", "mid", "old"]);
  });
});

describe("removeFromShelf", () => {
  it("refuses to remove a sketch a board still uses", async () => {
    await putFiles([fakeFile("used")]);
    const board = await createBoard();
    await saveScene(board.id, sceneWith([{ type: "image", fileId: "used" }]).data);

    await expect(removeFromShelf("used")).rejects.toMatchObject({ kind: "in-use" });
    await expect(removeFromShelf("used")).rejects.toBeInstanceOf(StorageError);
  });

  it("removes a sketch once no board uses it", async () => {
    await putFiles([fakeFile("used")]);
    const board = await createBoard();
    await saveScene(board.id, sceneWith([{ type: "image", fileId: "used" }]).data);
    await deleteBoard(board.id);

    await removeFromShelf("used");
    expect(await listShelf()).toEqual([]);
  });

  it("treats deleted image elements as unused", async () => {
    await putFiles([fakeFile("gone")]);
    const board = await createBoard();
    await saveScene(board.id, sceneWith([{ type: "image", fileId: "gone", isDeleted: true }]).data);
    expect(await referencedFileIds()).toEqual(new Set());
  });
});
