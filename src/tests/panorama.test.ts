import { describe, expect, test } from "vitest";
import { createSideScrollCamera, worldToScreenX } from "../game/camera";
import { calculatePanoramaLayout } from "../game/panorama";

const IMAGE_WIDTH = 1672;
const IMAGE_HEIGHT = 941;

describe("panorama layout", () => {
  test.each([
    [1920, 1010],
    [1070, 1016],
    [844, 390],
  ])("keeps painted water visible at a %d x %d viewport", (viewportWidth, viewportHeight) => {
    const camera = createSideScrollCamera({
      focusX: 0.5,
      velocityX: 0,
      viewWidth: 0.3,
      lookAheadTime: 0.24,
    });
    const layout = calculatePanoramaLayout({
      imageWidth: IMAGE_WIDTH,
      imageHeight: IMAGE_HEIGHT,
      camera,
      viewportWidth,
      viewportHeight,
    });
    const waterlineRatio = layout.waterline / viewportHeight;

    expect(waterlineRatio).toBeCloseTo(0.78);
    expect(layout.sourceY).toBeLessThan(IMAGE_HEIGHT * 0.61);
    expect(layout.sourceY + layout.sourceHeight).toBeGreaterThan(IMAGE_HEIGHT * 0.61);
  });

  test("keeps the crop within the panorama at both lake edges", () => {
    for (const focusX of [0, 1]) {
      const camera = createSideScrollCamera({
        focusX,
        velocityX: 0,
        viewWidth: 0.3,
        lookAheadTime: 0.24,
      });
      const layout = calculatePanoramaLayout({
        imageWidth: IMAGE_WIDTH,
        imageHeight: IMAGE_HEIGHT,
        camera,
        viewportWidth: 1920,
        viewportHeight: 1010,
      });

      expect(layout.sourceX).toBeGreaterThanOrEqual(0);
      expect(layout.sourceX + layout.sourceWidth).toBeLessThanOrEqual(IMAGE_WIDTH);
    }
  });

  test("uses the same horizontal projection for scenery pixels and world sprites", () => {
    const viewportWidth = 1440;
    const camera = createSideScrollCamera({
      focusX: 0.56,
      velocityX: 0.04,
      viewWidth: 0.3,
      lookAheadTime: 0.24,
    });
    const layout = calculatePanoramaLayout({
      imageWidth: IMAGE_WIDTH,
      imageHeight: IMAGE_HEIGHT,
      camera,
      viewportWidth,
      viewportHeight: 810,
    });

    for (const worldX of [camera.left, camera.center, camera.right]) {
      const sceneryX = ((worldX * IMAGE_WIDTH - layout.sourceX) / layout.sourceWidth) * viewportWidth;
      expect(sceneryX).toBeCloseTo(worldToScreenX(worldX, camera, viewportWidth));
    }
  });

  test("clamps the unified camera at lake edges without changing its scale", () => {
    const leftCamera = createSideScrollCamera({
      focusX: 0.02,
      velocityX: -0.05,
      viewWidth: 0.3,
      lookAheadTime: 0.24,
    });
    const rightCamera = createSideScrollCamera({
      focusX: 0.98,
      velocityX: 0.05,
      viewWidth: 0.3,
      lookAheadTime: 0.24,
    });

    expect(leftCamera.left).toBe(0);
    expect(rightCamera.right).toBe(1);
    expect(leftCamera.viewWidth).toBe(rightCamera.viewWidth);
  });
});
