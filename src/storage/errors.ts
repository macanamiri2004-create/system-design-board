export type StorageErrorKind = "quota" | "unavailable" | "in-use" | "invalid" | "unknown";

export class StorageError extends Error {
  readonly kind: StorageErrorKind;

  constructor(message: string, kind: StorageErrorKind, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "StorageError";
    this.kind = kind;
  }
}

export function toStorageError(err: unknown): StorageError {
  if (err instanceof StorageError) return err;
  const name = (err as { name?: string } | null)?.name;
  if (name === "QuotaExceededError") return new StorageError("Storage is full", "quota", { cause: err });
  if (name === "InvalidStateError" || name === "UnknownError" || name === "SecurityError") {
    return new StorageError("Storage unavailable", "unavailable", { cause: err });
  }
  return new StorageError("Storage error", "unknown", { cause: err });
}

/** Runs an IndexedDB operation and rethrows any failure as a StorageError. */
export async function guard<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op();
  } catch (err) {
    throw toStorageError(err);
  }
}
