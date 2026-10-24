// Per-viewer conveniences (active board, theme, rail state) in localStorage.
// Storage can be blocked or throw (private windows, cleared site data); the app must work without it.

export function readPref(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Nothing to do: losing a convenience setting is harmless.
  }
}
