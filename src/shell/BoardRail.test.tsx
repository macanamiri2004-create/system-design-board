// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BoardMeta } from "../types";
import { BoardRail } from "./BoardRail";

afterEach(cleanup);

const NOW = new Date(2026, 9, 24, 14, 5).getTime();
const boards: BoardMeta[] = [
  { id: "a", name: "Checkout flow", createdAt: NOW, updatedAt: NOW - 120_000 },
  { id: "b", name: "Chat system", createdAt: NOW, updatedAt: NOW - 3 * 3600_000 },
  { id: "c", name: "News feed", createdAt: NOW, updatedAt: NOW - 4 * 86400_000 },
];

function setup(overrides: Partial<Parameters<typeof BoardRail>[0]> = {}) {
  const handlers = {
    onSelect: vi.fn(),
    onCreate: vi.fn(),
    onRename: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
  };
  render(<BoardRail boards={boards} thumbnails={{}} activeId="a" now={NOW} {...handlers} {...overrides} />);
  return { user: userEvent.setup(), ...handlers };
}

const rowNames = () =>
  within(screen.getByRole("list"))
    .getAllByRole("listitem")
    .map((li) => li.querySelector("span[class*='name']")?.textContent);

// Row buttons are named "<board name> <relative time>"; anchoring keeps the "Actions for …" kebabs out.
const rowButton = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}`) });

describe("BoardRail", () => {
  it("marks the active board", () => {
    setup();
    expect(rowButton("Checkout flow").getAttribute("aria-current")).toBe("true");
    expect(rowButton("Chat system").getAttribute("aria-current")).toBeNull();
  });

  it("shows relative update times", () => {
    setup();
    expect(screen.getByText("2m ago")).toBeTruthy();
    expect(screen.getByText("3h ago")).toBeTruthy();
    expect(screen.getByText("4d ago")).toBeTruthy();
  });

  it("filters by search and offers to clear an empty result", async () => {
    const { user } = setup();
    await user.type(screen.getByRole("searchbox", { name: "Search boards" }), "chat");
    expect(rowNames()).toEqual(["Chat system"]);

    await user.clear(screen.getByRole("searchbox", { name: "Search boards" }));
    await user.type(screen.getByRole("searchbox", { name: "Search boards" }), "zzz");
    expect(screen.getByText("No boards match “zzz”")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(rowNames()).toHaveLength(3);
  });

  it("renames on Enter", async () => {
    const { user, onRename } = setup();
    await user.dblClick(rowButton("Chat system"));
    const input = screen.getByRole("textbox", { name: "Rename Chat system" });
    await user.clear(input);
    await user.type(input, "Chat service{Enter}");
    expect(onRename).toHaveBeenCalledWith("b", "Chat service");
  });

  it("reverts on Escape and on a blank name", async () => {
    const { user, onRename } = setup();
    await user.dblClick(rowButton("Chat system"));
    await user.type(screen.getByRole("textbox", { name: "Rename Chat system" }), " v2{Escape}");
    expect(screen.queryByRole("textbox")).toBeNull();

    await user.dblClick(rowButton("Chat system"));
    const input = screen.getByRole("textbox", { name: "Rename Chat system" });
    await user.clear(input);
    await user.type(input, "{Enter}");
    expect(onRename).not.toHaveBeenCalled();
    expect(rowNames()).toContain("Chat system");
  });

  it("deletes only after confirmation", async () => {
    const { user, onDelete } = setup();
    await user.click(screen.getByRole("button", { name: "Actions for News feed" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete…" }));
    expect(screen.getByRole("heading", { name: "Delete “News feed”?" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Actions for News feed" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete…" }));
    await user.click(screen.getByRole("button", { name: "Delete board" }));
    expect(onDelete).toHaveBeenCalledWith("c");
  });

  it("duplicates from the row menu", async () => {
    const { user, onDuplicate } = setup();
    await user.click(screen.getByRole("button", { name: "Actions for Checkout flow" }));
    await user.click(screen.getByRole("menuitem", { name: "Duplicate" }));
    expect(onDuplicate).toHaveBeenCalledWith("a");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("shows skeleton rows while loading", () => {
    setup({ boards: null });
    expect(screen.getByRole("list", { name: "Loading boards" })).toBeTruthy();
  });
});
