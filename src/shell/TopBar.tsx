import { Monitor, Moon, PanelLeft, Sun } from "lucide-react";
import { useState } from "react";
import { nextThemePref } from "../hooks/useTheme";
import { StorageError } from "../storage/errors";
import type { BoardMeta, SaveStatus, ThemePref } from "../types";
import { InlineNameInput } from "./InlineNameInput";
import styles from "./TopBar.module.css";

type Props = {
  board: BoardMeta | null;
  status: SaveStatus;
  railOpen: boolean;
  themePref: ThemePref;
  onToggleRail(): void;
  onRename(name: string): void;
  onCycleTheme(): void;
};

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
const THEME_ICON = { system: Monitor, light: Sun, dark: Moon } as const;

function statusText(status: SaveStatus): string {
  switch (status.kind) {
    case "idle":
      return "Saved";
    case "saving":
      return "Saving";
    case "saved":
      return `Saved ${timeFormat.format(status.at)}`;
    case "error":
      return status.error instanceof StorageError && status.error.kind === "quota"
        ? "Storage full. Download a backup"
        : "Not saved, retrying";
    case "load-error":
      return status.error.message;
  }
}

export function TopBar({ board, status, railOpen, themePref, onToggleRail, onRename, onCycleTheme }: Props) {
  const [editing, setEditing] = useState(false);
  const ThemeIcon = THEME_ICON[themePref];
  const isError = status.kind === "error" || status.kind === "load-error";
  const text = board ? statusText(status) : "";

  return (
    <div className={styles.bar}>
      <button
        type="button"
        className="icon-btn"
        aria-label={railOpen ? "Hide board list" : "Show board list"}
        aria-expanded={railOpen}
        aria-controls="board-rail"
        onClick={onToggleRail}
      >
        <PanelLeft size={18} aria-hidden />
      </button>

      <div className={styles.name}>
        {board &&
          (editing ? (
            <InlineNameInput
              key={board.id}
              initial={board.name}
              label="Board name"
              className={styles.nameInput}
              onCommit={(name) => {
                onRename(name);
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <button
              type="button"
              className={styles.nameButton}
              title="Rename board"
              onClick={() => setEditing(true)}
            >
              {board.name}
            </button>
          ))}
      </div>

      <span className={`mono ${styles.status}`} data-kind={status.kind} aria-hidden>
        {board && <span className={styles.dot} />}
        <span className={styles.statusText}>{text}</span>
      </span>
      {/* Announce problems only; a "Saved" announcement on every edit would be noise. */}
      <span role="status" className="visually-hidden">
        {isError ? text : ""}
      </span>

      <button
        type="button"
        className="icon-btn"
        aria-label={`Theme: ${themePref}. Switch to ${nextThemePref(themePref)}`}
        title={`Theme: ${themePref}`}
        onClick={onCycleTheme}
      >
        <ThemeIcon size={18} aria-hidden />
      </button>
    </div>
  );
}
