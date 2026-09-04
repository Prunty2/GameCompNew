import { describe, expect, test } from "vitest";
import { FISH } from "../game/balance";
import {
  FISHING_DIVE_DURATION,
  FISHING_ENVIRONMENT_KEYS,
  FISHING_HOOK_ATTACHMENT_DURATION,
  FISHING_RARITY_COLOURS,
  fishingDepthRequirementLabel,
  fishingDiveProgress,
  fishingFishPose,
  fishingFocusPresentation,
  fishingHookAttachmentProgress,
  fishingLineAppearance,
  fishingLineCurve,
  fishingPointToScreen,
  fishingReelCameraProgress,
  fishingViewLayout,
} from "../game/fishingPresentation";

describe("fishing presentation", () => {
  test("names the exact depth level required to go deeper", () => {
    expect(fishingDepthRequirementLabel(1)).toBe("DEPTH LEVEL 1 REQUIRED TO GO DEEPER");
    expect(fishingDepthRequirementLabel(4)).toBe("DEPTH LEVEL 4 REQUIRED TO GO DEEPER");
  });

  test("moves the waterline upward as the camera descends below the surface", () => {
    const start = fishingViewLayout(900, 0, fishingDiveProgress(20, 20, false));
    const middle = fishingViewLayout(900, 0, fishingDiveProgress(20 + FISHING_DIVE_DURATION / 2, 20, false));
    const settled = fishingViewLayout(900, 0, fishingDiveProgress(20 + FISHING_DIVE_DURATION, 20, false));

    expect(start.surfaceY).toBeCloseTo(702);
    expect(middle.surfaceY).toBeLessThan(start.surfaceY);
    expect(settled.surfaceY).toBeCloseTo(279);
    expect(fishingDiveProgress(20, 20, true)).toBe(1);
  });

  test("returns the camera to sailing height during the reel", () => {
    expect(fishingReelCameraProgress(1, 0, false)).toBe(1);
    expect(fishingReelCameraProgress(1, 0.5, false)).toBe(0.5);
    expect(fishingReelCameraProgress(1, 1, false)).toBe(0);
    expect(fishingReelCameraProgress(1, 0, true)).toBe(0);
  });

  test("eases the hook into the fish over a short attachment window", () => {
    expect(fishingHookAttachmentProgress(10, 10)).toBe(0);
    expect(fishingHookAttachmentProgress(10 + FISHING_HOOK_ATTACHMENT_DURATION / 2, 10)).toBeCloseTo(0.5);
    expect(fishingHookAttachmentProgress(10 + FISHING_HOOK_ATTACHMENT_DURATION, 10)).toBe(1);
    expect(fishingHookAttachmentProgress(20, 10)).toBe(1);
  });

  test("keeps the subdued background school moving during a fight", () => {
    expect(fishingFocusPresentation(12, 1, null)).toEqual({
      backgroundFishOpacity: 1,
      backgroundPoseElapsed: 12,
      showTargetGuides: true,
    });
    expect(fishingFocusPresentation(15, 1, 12)).toEqual({
      backgroundFishOpacity: 0.68,
      backgroundPoseElapsed: 15,
      showTargetGuides: false,
    });
    expect(fishingFocusPresentation(16, 0.5, 12).backgroundFishOpacity).toBeCloseTo(0.34);
  });

  test("gives each fish a deterministic swim cycle and respects reduced motion", () => {
    const first = fishingFishPose("bluegill", 12.5, 2.4, false);
    const repeated = fishingFishPose("bluegill", 12.5, 2.4, false);
    const neighbor = fishingFishPose("emeraldShiner", 12.5, 2.4, false);

    expect(first).toEqual(repeated);
    expect(first).not.toEqual(neighbor);
    expect(first.animationFrame).toBeGreaterThanOrEqual(0);
    expect(first.animationFrame).toBeLessThan(4);
    expect(new Set(Array.from({ length: 24 }, (_, index) => (
      fishingFishPose("bluegill", index * 0.2, 0, false).animationFrame
    )))).toHaveProperty("size", 4);
    expect(Math.abs(first.verticalOffsetRatio)).toBeLessThanOrEqual(0.012);
    const reducedMotionPose = fishingFishPose("bluegill", 12.5, 2.4, true);
    expect(reducedMotionPose).toMatchObject({
      animationFrame: 0,
      verticalOffsetRatio: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    });
    expect(Math.abs(reducedMotionPose.heading)).toBe(1);
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

  test("warms the fishing line from cream through amber to red as tension rises", () => {
    const rest = fishingLineAppearance(0.12, false);
    const warning = fishingLineAppearance(0.6, false);
    const critical = fishingLineAppearance(0.94, false);
    expect(rest.colour).toMatch(/^#[0-9a-f]{6}$/);
    expect(warning.colour).not.toBe(rest.colour);
    expect(critical.colour).not.toBe(warning.colour);
    expect(critical.width).toBeGreaterThan(rest.width);

    const contrastSafe = fishingLineAppearance(0, true);
    const contrastCritical = fishingLineAppearance(0.94, true);
    expect(contrastSafe.colour).toBe("#ffffff");
    expect(contrastCritical.colour).not.toBe(contrastSafe.colour);
  });

  test("lets a slack line sag and drift before straightening under tension", () => {
    const start = { x: 500, y: 200 };
    const end = { x: 720, y: 700 };
    const slack = fishingLineCurve(start, end, 0.12, 4, false);
    const loaded = fishingLineCurve(start, end, 0.6, 4, false);
    const taut = fishingLineCurve(start, end, 0.9, 4, false);
    const midpointIndex = Math.floor(slack.points.length / 2);
    const straightMidpointY = (start.y + end.y) * 0.5;

    expect(slack.points[0]).toEqual(start);
    expect(slack.points.at(-1)).toEqual(end);
    expect(slack.points[midpointIndex]!.y).toBeGreaterThan(straightMidpointY + 60);
    expect(loaded.points[midpointIndex]!.y).toBeGreaterThan(straightMidpointY);
    expect(loaded.points[midpointIndex]!.y).toBeLessThan(slack.points[midpointIndex]!.y);
    expect(taut.points[midpointIndex]).toEqual({ x: 610, y: 450 });
    expect(slack.slack).toBeGreaterThan(loaded.slack);
    expect(loaded.slack).toBeGreaterThan(taut.slack);
  });

  test("animates only the fluid drift when reduced motion is allowed", () => {
    const start = { x: 400, y: 180 };
    const end = { x: 640, y: 680 };
    const movingFirst = fishingLineCurve(start, end, 0.1, 1, false);
    const movingLater = fishingLineCurve(start, end, 0.1, 2, false);
    const reducedFirst = fishingLineCurve(start, end, 0.1, 1, true);
    const reducedLater = fishingLineCurve(start, end, 0.1, 2, true);

    expect(movingFirst.points).not.toEqual(movingLater.points);
    expect(reducedFirst.points).toEqual(reducedLater.points);
    expect(reducedFirst.points[6]!.y).toBeGreaterThan((start.y + end.y) * 0.5);
  });
});
