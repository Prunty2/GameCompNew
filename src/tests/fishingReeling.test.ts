import { describe, expect, test } from "vitest";
import {
  FISHING_REEL_DURATION,
  fishingReelProgress,
  fishingReelSchoolOpacity,
  fishingReelWriggle,
} from "../game/fishingReeling";

describe("fishing reeling", () => {
  test("eases from the hooked point to the boat over a fixed duration", () => {
    expect(fishingReelProgress(10, 10)).toBe(0);
    expect(fishingReelProgress(10 + FISHING_REEL_DURATION / 2, 10)).toBeCloseTo(0.5);
    expect(fishingReelProgress(10 + FISHING_REEL_DURATION, 10)).toBe(1);
  });

  test("settles the fish wriggle and removes it for reduced motion", () => {
    expect(Math.abs(fishingReelWriggle(10.1, 10, false))).toBeGreaterThan(0);
    expect(fishingReelWriggle(10 + FISHING_REEL_DURATION, 10, false)).toBeCloseTo(0);
    expect(fishingReelWriggle(10.1, 10, true)).toBe(0);
  });

  test("fades the remaining school throughout the reel", () => {
    expect(fishingReelSchoolOpacity(0)).toBe(1);
    expect(fishingReelSchoolOpacity(0.5)).toBe(0.5);
    expect(fishingReelSchoolOpacity(1)).toBe(0);
    expect(fishingReelSchoolOpacity(-1)).toBe(1);
    expect(fishingReelSchoolOpacity(2)).toBe(0);
  });
});
