import { describe, expect, test } from "vitest";
import {
  displayResolutionOptions,
  isDisplayResolution,
  isResolutionControlDisabled,
} from "../services/windowService";

describe("displayResolutionOptions", () => {
  test("adds the active monitor native mode using its physical and usable logical sizes", () => {
    const options = displayResolutionOptions({
      physicalWidth: 3600,
      physicalHeight: 2338,
      logicalWidth: 1800,
      logicalHeight: 1130,
    });

    expect(options.at(-1)).toEqual({
      id: "native",
      width: 1800,
      height: 1130,
      label: "Native (3600 × 2338)",
    });
    expect(isDisplayResolution("native")).toBe(true);
  });

  test("omits the native mode when monitor discovery is unavailable", () => {
    expect(displayResolutionOptions(null).map((option) => option.id)).toEqual([
      "1280x720",
      "1600x900",
      "1920x1080",
      "2560x1440",
    ]);
  });
});

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
