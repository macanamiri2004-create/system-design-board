import { createStore, type UseStore } from "idb-keyval";

// One idb-keyval store per database: idb-keyval can't safely hold two object stores in one database.
// Opened lazily so a browser without IndexedDB (some private windows) fails at the first save, not at import.
let boards: UseStore | undefined;
let files: UseStore | undefined;

export function boardsStore(): UseStore {
  return (boards ??= createStore("sdb-boards", "kv"));
}

export function filesStore(): UseStore {
  return (files ??= createStore("sdb-files", "kv"));
}
