import { describe, expect, test } from "vitest";
import { FISH } from "../game/balance";
import {
  FISHING_DIVE_DURATION,
  FISHING_ENVIRONMENT_KEYS,
  FISHING_RARITY_COLOURS,
  fishingDiveProgress,
  fishingFishPose,
  fishingPointToScreen,
  fishingViewLayout,
} from "../game/fishingPresentation";

describe("fishing presentation", () => {
  test("moves the waterline upward as the camera descends below the surface", () => {
    const start = fishingViewLayout(900, 0, fishingDiveProgress(20, 20, false));
    const middle = fishingViewLayout(900, 0, fishingDiveProgress(20 + FISHING_DIVE_DURATION / 2, 20, false));
    const settled = fishingViewLayout(900, 0, fishingDiveProgress(20 + FISHING_DIVE_DURATION, 20, false));

    expect(start.surfaceY).toBeCloseTo(702);
    expect(middle.surfaceY).toBeLessThan(start.surfaceY);
    expect(settled.surfaceY).toBeCloseTo(279);
    expect(fishingDiveProgress(20, 20, true)).toBe(1);
  });

  test("gives each fish a deterministic swim cycle and respects reduced motion", () => {
    const first = fishingFishPose(12.5, 2, 0.05, false);
    const repeated = fishingFishPose(12.5, 2, 0.05, false);
    const neighbor = fishingFishPose(12.5, 3, 0.05, false);

    expect(first).toEqual(repeated);
    expect(first).not.toEqual(neighbor);
    expect(Math.abs(first.verticalOffsetRatio)).toBeLessThanOrEqual(0.012);
    expect(fishingFishPose(12.5, 2, 0.05, true)).toEqual({
      verticalOffsetRatio: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    });
  });

  test("keeps the simulated hook limit aligned with the visible float line", () => {
    const layout = fishingViewLayout(900, 0, 1);
    const mappedLimit = fishingPointToScreen({ x: 0.5, y: 0.3 }, 1440, layout, 0.3);

    expect(mappedLimit.x).toBe(720);
    expect(mappedLimit.y).toBeCloseTo(layout.lineLimitY);
    expect(layout.lineLimitY).toBeGreaterThan(600);
  });

  test("assigns distinct rarity colors and site-specific environment assets", () => {
    expect(new Set(Object.values(FISHING_RARITY_COLOURS))).toHaveProperty("size", 4);
    expect(FISH.reedfin.rarity).toBe("common");
    expect(FISH.mossback.rarity).toBe("uncommon");
    expect(FISH.violetRay.rarity).toBe("rare");
    expect(FISH.abyssCrown.rarity).toBe("legendary");
    expect(new Set(Object.values(FISHING_ENVIRONMENT_KEYS))).toHaveProperty("size", 3);
  });
});
