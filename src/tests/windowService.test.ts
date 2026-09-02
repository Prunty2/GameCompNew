import { describe, expect, test } from "vitest";
import { isResolutionControlDisabled } from "../services/windowService";

describe("isResolutionControlDisabled", () => {
  test("disables resolution outside the desktop app", () => {
    expect(isResolutionControlDisabled(false, false)).toBe(true);
  });

  test("disables resolution while fullscreen is active", () => {
    expect(isResolutionControlDisabled(true, true)).toBe(true);
  });

  test("enables resolution for a windowed desktop app", () => {
    expect(isResolutionControlDisabled(true, false)).toBe(false);
  });
});
