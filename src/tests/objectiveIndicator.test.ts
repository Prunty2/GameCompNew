import { describe, expect, test } from "vitest";
import { objectiveIndicatorLayout, objectiveIndicatorOpacity } from "../game/objectiveIndicator";

describe("objective indicator layout", () => {
  test("keeps a prominent left-pointing destination badge inside the viewport", () => {
    const layout = objectiveIndicatorLayout(-240, 1_200, 800, 92);

    expect(layout.direction).toBe("left");
    expect(layout.panelX).toBe(16);
    expect(layout.panelWidth).toBe(200);
    expect(layout.panelHeight).toBe(64);
    expect(layout.markerX).toBe(48);
    expect(layout.textCenterX).toBeGreaterThan(layout.markerX);
  });

  test("mirrors the badge when the destination is beyond the right edge", () => {
    const layout = objectiveIndicatorLayout(1_440, 1_200, 800, 160);

    expect(layout.direction).toBe("right");
    expect(layout.panelX + layout.panelWidth).toBe(1_184);
    expect(layout.markerX).toBeGreaterThan(layout.textCenterX);
  });

  test("centres a downward badge over a visible destination", () => {
    const layout = objectiveIndicatorLayout(640, 1_200, 800, 80);

    expect(layout.direction).toBe("down");
    expect(layout.panelX + layout.panelWidth / 2).toBe(640);
  });
});

describe("objective indicator opacity", () => {
  const interactionRadius = 0.027;

  test("remains fully visible until the player is close to the destination", () => {
    expect(objectiveIndicatorOpacity(interactionRadius * 3.2, interactionRadius)).toBe(1);
    expect(objectiveIndicatorOpacity(interactionRadius * 4, interactionRadius)).toBe(1);
  });

  test("fades smoothly through the final approach", () => {
    const halfwayDistance = interactionRadius * 2.1;

    expect(objectiveIndicatorOpacity(halfwayDistance, interactionRadius)).toBeCloseTo(0.5);
  });

  test("clears only once the destination is in interaction range", () => {
    expect(objectiveIndicatorOpacity(interactionRadius, interactionRadius)).toBe(0);
    expect(objectiveIndicatorOpacity(interactionRadius * 0.5, interactionRadius)).toBe(0);
  });
});
