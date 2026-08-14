import { describe, expect, it } from "vitest";
import { surfaceFishingCue, surfaceFishPose } from "../game/fishingSpotEffects";

describe("surface fishing-spot effects", () => {
  it("keeps distant grounds discoverable without showing the hook", () => {
    const cue = surfaceFishingCue(0.1, 0.3, 0.027);

    expect(cue.fishVisibility).toBe(0.3);
    expect(cue.lensVisibility).toBe(0);
    expect(cue.hookVisibility).toBe(0);
  });

  it("smoothly fades the hook around its prominent and full-visibility ranges", () => {
    const radius = 0.027;
    const outsideFade = surfaceFishingCue(0.2 - radius * 5.01, 0.2, radius);
    const fadeStart = surfaceFishingCue(0.2 - radius * 5, 0.2, radius);
    const fading = surfaceFishingCue(0.2 - radius * 4.5, 0.2, radius);
    const fadingFromOtherDirection = surfaceFishingCue(0.2 + radius * 4.5, 0.2, radius);
    const prominentVisibilityEdge = surfaceFishingCue(0.2 - radius * 4, 0.2, radius);
    const fullVisibilityEdge = surfaceFishingCue(0.2 - radius * 3, 0.2, radius);
    const interactionEdge = surfaceFishingCue(0.2 - radius, 0.2, radius);

    expect(outsideFade.hookVisibility).toBe(0);
    expect(fadeStart.hookVisibility).toBe(0);
    expect(fading.hookVisibility).toBeGreaterThan(0);
    expect(fading.hookVisibility).toBeLessThan(0.65);
    expect(fadingFromOtherDirection.hookVisibility).toBeCloseTo(fading.hookVisibility);
    expect(prominentVisibilityEdge.hookVisibility).toBeCloseTo(0.65);
    expect(fullVisibilityEdge.hookVisibility).toBe(1);
    expect(interactionEdge.hookVisibility).toBe(1);
  });

  it("makes the lens and fish clearly strengthen during approach", () => {
    const radius = 0.027;
    const distant = surfaceFishingCue(0.1, 0.3, radius);
    const approach = surfaceFishingCue(0.3 - radius * 3, 0.3, radius);
    const overhead = surfaceFishingCue(0.3, 0.3, radius);

    expect(approach.lensVisibility).toBeGreaterThan(0.15);
    expect(approach.fishVisibility).toBeGreaterThan(distant.fishVisibility);
    expect(overhead.fishVisibility).toBeCloseTo(0.65);
  });

  it("keeps a full visible school at every fishing ground", () => {
    expect(surfaceFishingCue(0, 0.3, 0.027).fishCount).toBe(12);
  });

  it("produces deterministic bounded poses and freezes them for reduced motion", () => {
    const first = surfaceFishPose(2, 5, 18, true);
    const second = surfaceFishPose(2, 5, 91, true);

    expect(second).toEqual(first);
    expect(first.offsetX).toBeGreaterThanOrEqual(-0.5);
    expect(first.offsetX).toBeLessThanOrEqual(0.5);
    expect(first.depth).toBeGreaterThanOrEqual(0.1);
    expect(first.depth).toBeLessThanOrEqual(0.82);
    expect([-1, 1]).toContain(first.direction);
  });
});
