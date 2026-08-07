import { describe, expect, it } from "vitest";
import { surfaceFishingCue, surfaceFishPose } from "../game/fishingSpotEffects";

describe("surface fishing-spot effects", () => {
  it("keeps distant grounds discoverable without showing the hook", () => {
    const cue = surfaceFishingCue(0.1, 0.3, 0.027, 65);

    expect(cue.fishVisibility).toBe(0.3);
    expect(cue.lensVisibility).toBe(0);
    expect(cue.hookVisibility).toBe(0);
  });

  it("reveals the hook from three times the interaction radius", () => {
    const radius = 0.027;
    const outsideReveal = surfaceFishingCue(0.2 - radius * 3.01, 0.2, radius, 65);
    const revealEdge = surfaceFishingCue(0.2 - radius * 2.99, 0.2, radius, 65);
    const interactionEdge = surfaceFishingCue(0.2 - radius, 0.2, radius, 65);

    expect(outsideReveal.lensVisibility).toBeGreaterThan(0);
    expect(outsideReveal.hookVisibility).toBe(0);
    expect(revealEdge.hookVisibility).toBeGreaterThanOrEqual(0.4);
    expect(interactionEdge.hookVisibility).toBeGreaterThan(revealEdge.hookVisibility);
    expect(interactionEdge.hookVisibility).toBeGreaterThan(0.8);
  });

  it("makes the lens and fish clearly strengthen during approach", () => {
    const radius = 0.027;
    const distant = surfaceFishingCue(0.1, 0.3, radius, 65);
    const approach = surfaceFishingCue(0.3 - radius * 3, 0.3, radius, 65);
    const overhead = surfaceFishingCue(0.3, 0.3, radius, 65);

    expect(approach.lensVisibility).toBeGreaterThan(0.15);
    expect(approach.fishVisibility).toBeGreaterThan(distant.fishVisibility);
    expect(overhead.fishVisibility).toBeCloseTo(0.65);
  });

  it("uses broad population steps while retaining a minimum visible school", () => {
    expect(surfaceFishingCue(0, 0.3, 0.027, 0).fishCount).toBe(4);
    expect(surfaceFishingCue(0, 0.3, 0.027, 50).fishCount).toBe(9);
    expect(surfaceFishingCue(0, 0.3, 0.027, 100).fishCount).toBe(12);
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
