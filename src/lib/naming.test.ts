import { describe, expect, it } from "vitest";
import { formatRelative, nextBoardName } from "./naming";

const oct24 = new Date(2026, 9, 24, 14, 5);

describe("nextBoardName", () => {
  it("uses the date", () => {
    expect(nextBoardName([], oct24)).toBe("Sketch Oct 24");
  });

  it("adds the first free suffix", () => {
    expect(nextBoardName(["Sketch Oct 24"], oct24)).toBe("Sketch Oct 24 (2)");
    expect(nextBoardName(["Sketch Oct 24", "Sketch Oct 24 (2)"], oct24)).toBe("Sketch Oct 24 (3)");
  });
});

describe("formatRelative", () => {
  const now = oct24.getTime();
  const ago = (seconds: number) => now - seconds * 1000;

  it.each([
    [10, "just now"],
    [90, "2m ago"],
    [3 * 3600, "3h ago"],
    [26 * 3600, "yesterday"],
    [4 * 86400, "4d ago"],
  ])("%is ago reads %s", (seconds, expected) => {
    expect(formatRelative(ago(seconds), now)).toBe(expected);
  });

  it("falls back to a date after about a month", () => {
    expect(formatRelative(new Date(2026, 6, 2).getTime(), now)).toBe("Jul 2");
    expect(formatRelative(new Date(2025, 6, 2).getTime(), now)).toBe("Jul 2, 2025");
  });
});
