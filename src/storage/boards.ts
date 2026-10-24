import { delMany, get, getMany, keys, setMany, update } from "idb-keyval";
import { nanoid } from "nanoid";
import { nextBoardName } from "../lib/naming";
import type { BoardId, BoardMeta, StoredScene, Viewport } from "../types";
import { boardsStore } from "./db";
import { guard } from "./errors";

const metaKey = (id: BoardId) => `meta:${id}`;
const sceneKey = (id: BoardId) => `scene:${id}`;
const thumbKey = (id: BoardId) => `thumb:${id}`;

// Strictly increasing timestamps, so boards created in the same millisecond still sort deterministically.
let lastStamp = 0;
function stamp(): number {
  const t = Date.now();
  lastStamp = t > lastStamp ? t : lastStamp + 1;
  return lastStamp;
}

async function keysWithPrefix(prefix: string): Promise<string[]> {
  return (await keys<string>(boardsStore())).filter((k) => typeof k === "string" && k.startsWith(prefix));
}

/** All boards, most recently updated first. */
export function listBoards(): Promise<BoardMeta[]> {
  return guard(async () => {
    const metas = await getMany<BoardMeta | undefined>(await keysWithPrefix("meta:"), boardsStore());
    return metas.filter((m): m is BoardMeta => !!m).sort((a, b) => b.updatedAt - a.updatedAt);
  });
}

export function getBoard(id: BoardId): Promise<BoardMeta | undefined> {
  return guard(() => get<BoardMeta>(metaKey(id), boardsStore()));
}

export function createBoard(opts: { name?: string; scene?: StoredScene } = {}): Promise<BoardMeta> {
  return guard(async () => {
    const name = opts.name?.trim() || nextBoardName((await listBoards()).map((m) => m.name), new Date());
    const t = stamp();
    const meta: BoardMeta = { id: nanoid(), name, createdAt: t, updatedAt: t };
    await setMany(
      [
        [metaKey(meta.id), meta],
        [sceneKey(meta.id), opts.scene ?? { data: null }],
      ],
      boardsStore(),
    );
    return meta;
  });
}

/** Writes a board exactly as given (used by backup restore). Overwrites any board with the same id. */
export function putBoard(meta: BoardMeta, scene: StoredScene): Promise<void> {
  return guard(() =>
    setMany(
      [
        [metaKey(meta.id), meta],
        [sceneKey(meta.id), scene],
      ],
      boardsStore(),
    ),
  );
}

export function loadScene(id: BoardId): Promise<StoredScene | undefined> {
  return guard(() => get<StoredScene>(sceneKey(id), boardsStore()));
}

/** Every stored scene, keyed by board id. */
export function loadAllScenes(): Promise<Map<BoardId, StoredScene>> {
  return guard(async () => {
    const sceneKeys = await keysWithPrefix("scene:");
    const scenes = await getMany<StoredScene | undefined>(sceneKeys, boardsStore());
    const out = new Map<BoardId, StoredScene>();
    sceneKeys.forEach((key, i) => {
      const scene = scenes[i];
      if (scene) out.set(key.slice("scene:".length), scene);
    });
    return out;
  });
}

/** Saves drawing content and bumps updatedAt. A board deleted mid-save is left deleted. */
export function saveScene(id: BoardId, data: StoredScene["data"]): Promise<void> {
  return guard(async () => {
    const store = boardsStore();
    if (!(await get<BoardMeta>(metaKey(id), store))) return;
    await update<StoredScene>(sceneKey(id), (old) => ({ ...old, data }), store);
    await update<BoardMeta>(metaKey(id), (meta) => ({ ...meta!, updatedAt: stamp() }), store);
  });
}

/** Saves scroll and zoom only. Doesn't count as an edit, so updatedAt is unchanged. */
export function saveViewport(id: BoardId, viewport: Viewport): Promise<void> {
  return guard(async () => {
    const store = boardsStore();
    if (!(await get<BoardMeta>(metaKey(id), store))) return;
    await update<StoredScene>(sceneKey(id), (old) => ({ data: null, ...old, viewport }), store);
  });
}

export function renameBoard(id: BoardId, name: string): Promise<BoardMeta | undefined> {
  return guard(async () => {
    const store = boardsStore();
    const meta = await get<BoardMeta>(metaKey(id), store);
    const trimmed = name.trim();
    if (!meta || !trimmed || trimmed === meta.name) return meta;
    const next = { ...meta, name: trimmed };
    await setMany([[metaKey(id), next]], store);
    return next;
  });
}

export function duplicateBoard(id: BoardId): Promise<BoardMeta | undefined> {
  return guard(async () => {
    const store = boardsStore();
    const [meta, scene, thumb] = await getMany<unknown>([metaKey(id), sceneKey(id), thumbKey(id)], store);
    if (!meta) return undefined;
    const copy = await createBoard({
      name: `${(meta as BoardMeta).name} copy`,
      scene: (scene as StoredScene | undefined) ?? { data: null },
    });
    if (typeof thumb === "string") await setMany([[thumbKey(copy.id), thumb]], store);
    return copy;
  });
}

export function deleteBoard(id: BoardId): Promise<void> {
  return guard(() => delMany([metaKey(id), sceneKey(id), thumbKey(id)], boardsStore()));
}

export function saveThumbnail(id: BoardId, dataURL: string): Promise<void> {
  return guard(() => setMany([[thumbKey(id), dataURL]], boardsStore()));
}

export function getThumbnails(ids: readonly BoardId[]): Promise<Record<BoardId, string>> {
  return guard(async () => {
    const thumbs = await getMany<string | undefined>(ids.map(thumbKey), boardsStore());
    const out: Record<BoardId, string> = {};
    ids.forEach((id, i) => {
      const t = thumbs[i];
      if (t) out[id] = t;
    });
    return out;
  });
}
