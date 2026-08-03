import { describe, expect, test } from "vitest";
import { calculatePanoramaLayout } from "../game/panorama";

const IMAGE_WIDTH = 1672;
const IMAGE_HEIGHT = 941;

describe("panorama layout", () => {
  test.each([
    [1920, 1010],
    [1070, 1016],
    [844, 390],
  ])("keeps painted water visible at a %d x %d viewport", (viewportWidth, viewportHeight) => {
    const layout = calculatePanoramaLayout({
      imageWidth: IMAGE_WIDTH,
      imageHeight: IMAGE_HEIGHT,
      cameraX: 0.5,
      viewWidth: 0.42,
      viewportWidth,
      viewportHeight,
    });
    const waterlineRatio = layout.waterline / viewportHeight;

    expect(waterlineRatio).toBeCloseTo(0.78);
    expect(layout.sourceY).toBeLessThan(IMAGE_HEIGHT * 0.61);
    expect(layout.sourceY + layout.sourceHeight).toBeGreaterThan(IMAGE_HEIGHT * 0.61);
  });

  test("keeps the crop within the panorama at both lake edges", () => {
    for (const cameraX of [0, 1]) {
      const layout = calculatePanoramaLayout({
        imageWidth: IMAGE_WIDTH,
        imageHeight: IMAGE_HEIGHT,
        cameraX,
        viewWidth: 0.42,
        viewportWidth: 1920,
        viewportHeight: 1010,
      });

      expect(layout.sourceX).toBeGreaterThanOrEqual(0);
      expect(layout.sourceX + layout.sourceWidth).toBeLessThanOrEqual(IMAGE_WIDTH);
    }
  });
});
