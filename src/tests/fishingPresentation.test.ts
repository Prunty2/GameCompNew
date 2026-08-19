import { describe, expect, test } from "vitest";
import { FISH } from "../game/balance";
import {
  FISHING_ENVIRONMENT_KEYS,
  FISHING_RARITY_COLOURS,
  fishingPointToScreen,
  fishingViewLayout,
} from "../game/fishingPresentation";

describe("fishing presentation", () => {
  test("maps Fishing interaction dive progress to the waterline", () => {
    const start = fishingViewLayout(900, 0, 0);
    const middle = fishingViewLayout(900, 0, 0.5);
    const settled = fishingViewLayout(900, 0, 1);

    expect(start.surfaceY).toBeCloseTo(702);
    expect(middle.surfaceY).toBeLessThan(start.surfaceY);
    expect(settled.surfaceY).toBeCloseTo(279);
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
    expect(FISH.bluegill.rarity).toBe("common");
    expect(FISH.largemouthBass.rarity).toBe("uncommon");
    expect(FISH.burbot.rarity).toBe("rare");
    expect(FISH.lakeSturgeon.rarity).toBe("legendary");
    expect(new Set(Object.values(FISHING_ENVIRONMENT_KEYS))).toHaveProperty("size", 3);
  });
});
