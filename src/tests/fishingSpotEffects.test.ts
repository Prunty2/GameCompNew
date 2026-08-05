import { describe, expect, it } from "vitest";
import { surfaceFishingCue, surfaceFishPose } from "../game/fishingSpotEffects";

describe("surface fishing-spot effects", () => {
  it("keeps distant grounds discoverable without showing the hook", () => {
    const cue = surfaceFishingCue(0.1, 0.3, 0.027, 65);

    expect(cue.fishVisibility).toBeGreaterThan(0);
    expect(cue.lensVisibility).toBe(0);
    expect(cue.hookVisibility).toBe(0);
  });

  it("reveals the polarized lens before the interaction hook", () => {
    const radius = 0.027;
    const approach = surfaceFishingCue(0.2 - radius * 2, 0.2, radius, 65);
    const interactionEdge = surfaceFishingCue(0.2 - radius * 0.8, 0.2, radius, 65);

    expect(approach.lensVisibility).toBeGreaterThan(0);
    expect(approach.hookVisibility).toBe(0);
    expect(interactionEdge.lensVisibility).toBeGreaterThan(approach.lensVisibility);
    expect(interactionEdge.hookVisibility).toBeGreaterThan(0);
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
