import { Copy, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from "react";
import { formatRelative } from "../lib/naming";
import type { BoardId, BoardMeta } from "../types";
import styles from "./BoardRail.module.css";
import { ConfirmDialog } from "./ConfirmDialog";
import { InlineNameInput } from "./InlineNameInput";

type Props = {
  boards: BoardMeta[] | null;
  thumbnails: Record<BoardId, string>;
  activeId: BoardId | null;
  now: number;
  notice?: string | null;
  searchRef?: Ref<HTMLInputElement>;
  onSelect(id: BoardId): void;
  onCreate(): void;
  onRename(id: BoardId, name: string): void;
  onDuplicate(id: BoardId): void;
  onDelete(id: BoardId): void;
};

export function BoardRail(props: Props) {
  const { boards, thumbnails, activeId, now, notice, searchRef, onSelect, onCreate, onRename, onDuplicate, onDelete } =
    props;
  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState<BoardId | null>(null);
  const [menuId, setMenuId] = useState<BoardId | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BoardMeta | null>(null);
  const searchId = useId();
  const closeMenu = useCallback(() => setMenuId(null), []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!boards || !q) return boards;
    return boards.filter((b) => b.name.toLowerCase().includes(q));
  }, [boards, query]);

  return (
    <nav className={styles.rail} aria-label="Boards" id="board-rail">
      <div className={styles.head}>
        <label htmlFor={searchId} className="visually-hidden">
          Search boards
        </label>
        <div className={styles.search}>
          <Search size={16} aria-hidden className={styles.searchIcon} />
          <input
            ref={searchRef}
            id={searchId}
            className={`input ${styles.searchInput}`}
            type="search"
            placeholder="Search boards"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button type="button" className="btn btn--primary btn--block" onClick={onCreate}>
          <Plus size={16} aria-hidden />
          New board
        </button>
        {notice && (
          <p className="error-text" role="alert">
            {notice}
          </p>
        )}
      </div>

      <div className={styles.listWrap}>
        {visible === null ? (
          <SkeletonRows />
        ) : visible.length === 0 && query.trim() ? (
          <div className={styles.empty}>
            <p>No boards match “{query.trim()}”</p>
            <button type="button" className="btn btn--ghost" onClick={() => setQuery("")}>
              Clear search
            </button>
          </div>
        ) : (
          <ul className={styles.list} role="list">
            {visible.map((board, index) => {
              const active = board.id === activeId;
              const thumbnail = thumbnails[board.id];
              return (
                <li
                  key={board.id}
                  className={styles.row}
                  data-active={active || undefined}
                  style={index < 10 ? { animationDelay: `${index * 30}ms` } : { animation: "none" }}
                >
                  {renamingId === board.id ? (
                    <div className={styles.rowBody}>
                      <Thumb src={thumbnail} />
                      <InlineNameInput
                        initial={board.name}
                        label={`Rename ${board.name}`}
                        className={styles.renameInput}
                        onCommit={(name) => {
                          onRename(board.id, name);
                          setRenamingId(null);
                        }}
                        onCancel={() => setRenamingId(null)}
                      />
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={styles.rowBody}
                        aria-current={active ? "true" : undefined}
                        onClick={() => onSelect(board.id)}
                        onDoubleClick={() => setRenamingId(board.id)}
                      >
                        <Thumb src={thumbnail} />
                        <span className={styles.text}>
                          <span className={styles.name}>{board.name}</span>
                          <span className={`mono ${styles.meta}`}>{formatRelative(board.updatedAt, now)}</span>
                        </span>
                      </button>
                      <RowMenu
                        boardName={board.name}
                        open={menuId === board.id}
                        onToggle={() => setMenuId((id) => (id === board.id ? null : board.id))}
                        onClose={closeMenu}
                        onRename={() => setRenamingId(board.id)}
                        onDuplicate={() => onDuplicate(board.id)}
                        onDelete={() => setPendingDelete(board)}
                      />
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete “${pendingDelete?.name ?? ""}”?`}
        body="This can't be undone. Sketches on this board stay on your sketch shelf."
        confirmLabel="Delete board"
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </nav>
  );
}

function Thumb({ src }: { src: string | undefined }) {
  return (
    <span className={styles.thumb} aria-hidden>
      {src && <img src={src} alt="" draggable={false} />}
    </span>
  );
}

function SkeletonRows() {
  return (
    <ul className={styles.list} role="list" aria-label="Loading boards">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className={styles.skeletonRow} aria-hidden>
          <span className={`skeleton ${styles.thumb}`} />
          <span className={styles.text}>
            <span className={`skeleton ${styles.skeletonLine}`} />
            <span className={`skeleton ${styles.skeletonLineShort}`} />
          </span>
        </li>
      ))}
    </ul>
  );
}

type RowMenuProps = {
  boardName: string;
  open: boolean;
  onToggle(): void;
  onClose(): void;
  onRename(): void;
  onDuplicate(): void;
  onDelete(): void;
};

const MENU_WIDTH = 176;

function RowMenu({ boardName, open, onToggle, onClose, onRename, onDuplicate, onDelete }: RowMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  // The list scrolls and clips, so the menu is fixed-positioned next to its trigger.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const top = Math.min(rect.bottom + 4, window.innerHeight - 140);
    setPosition({ top, left: Math.max(8, rect.right - MENU_WIDTH) });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, onClose, position]);

  const run = (action: () => void) => () => {
    onClose();
    action();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape" || e.key === "Tab") {
      e.preventDefault();
      onClose();
      triggerRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    }
  };

  return (
    <div className={styles.menuWrap} data-open={open || undefined}>
      <button
        ref={triggerRef}
        type="button"
        className={`icon-btn ${styles.kebab}`}
        aria-label={`Actions for ${boardName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onToggle}
      >
        <MoreHorizontal size={16} aria-hidden />
      </button>
      {open && position && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Actions for ${boardName}`}
          className={styles.menu}
          style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
          onKeyDown={onKeyDown}
        >
          <button type="button" role="menuitem" className={styles.menuItem} onClick={run(onRename)}>
            <Pencil size={14} aria-hidden />
            Rename
          </button>
          <button type="button" role="menuitem" className={styles.menuItem} onClick={run(onDuplicate)}>
            <Copy size={14} aria-hidden />
            Duplicate
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${styles.menuItem} ${styles.danger}`}
            onClick={run(onDelete)}
          >
            <Trash2 size={14} aria-hidden />
            Delete…
          </button>
        </div>
      )}
    </div>
  );
}
