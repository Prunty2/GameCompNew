import { describe, expect, test } from "vitest";
import {
  createSideScrollCamera,
  dampMotionValue,
  dampSideScrollCamera,
  worldToScreenX,
} from "../game/camera";
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

    expect(waterlineRatio).toBeGreaterThanOrEqual(0.61);
    expect(waterlineRatio).toBeLessThanOrEqual(0.680001);
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

  test("expands the painted source crop as the viewport grows", () => {
    const camera = createSideScrollCamera({
      focusX: 0.56,
      velocityX: 0.04,
      viewWidth: 0.3,
      lookAheadTime: 0.24,
    });
    const compact = calculatePanoramaLayout({
      imageWidth: IMAGE_WIDTH,
      imageHeight: IMAGE_HEIGHT,
      camera,
      viewportWidth: 960,
      viewportHeight: 540,
    });
    const large = calculatePanoramaLayout({
      imageWidth: IMAGE_WIDTH,
      imageHeight: IMAGE_HEIGHT,
      camera,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });

    expect(compact.sourceWidth).toBe(960);
    expect(large.sourceWidth).toBe(IMAGE_WIDTH);
    expect(large.sourceWidth).toBeGreaterThan(compact.sourceWidth);
    expect(1920 / large.sourceWidth).toBeLessThan(1.15);
  });

  test("pans the distant plate more slowly than the gameplay camera", () => {
    const leftCamera = createSideScrollCamera({
      focusX: 0.35,
      velocityX: 0,
      viewWidth: 0.3,
      lookAheadTime: 0.24,
    });
    const rightCamera = createSideScrollCamera({
      focusX: 0.65,
      velocityX: 0,
      viewWidth: 0.3,
      lookAheadTime: 0.24,
    });
    const leftLayout = calculatePanoramaLayout({
      imageWidth: IMAGE_WIDTH,
      imageHeight: IMAGE_HEIGHT,
      camera: leftCamera,
      viewportWidth: 960,
      viewportHeight: 540,
    });
    const rightLayout = calculatePanoramaLayout({
      imageWidth: IMAGE_WIDTH,
      imageHeight: IMAGE_HEIGHT,
      camera: rightCamera,
      viewportWidth: 960,
      viewportHeight: 540,
    });
    const backgroundTravel = rightLayout.sourceX - leftLayout.sourceX;
    const foregroundTravel = worldToScreenX(0.5, leftCamera, 960)
      - worldToScreenX(0.5, rightCamera, 960);

    expect(backgroundTravel).toBeGreaterThan(0);
    expect(backgroundTravel).toBeLessThan(Math.abs(foregroundTravel));
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

  test("damps camera follow while preserving the unified projection", () => {
    const target = createSideScrollCamera({
      focusX: 0.7,
      velocityX: 0.05,
      viewWidth: 0.3,
      lookAheadTime: 0.24,
    });
    const camera = dampSideScrollCamera(0.5, target, 1 / 60, 3.2);

    expect(camera.center).toBeGreaterThan(0.5);
    expect(camera.center).toBeLessThan(target.center);
    expect(camera.right - camera.left).toBeCloseTo(target.viewWidth);
    expect(worldToScreenX(camera.center, camera, 1440)).toBeCloseTo(720);
  });

  test("filters rapid direction changes without snapping velocity look-ahead", () => {
    let smoothedVelocity = 0.04;

    for (const targetVelocity of [-0.04, 0.04, -0.04, 0.04]) {
      smoothedVelocity = dampMotionValue(smoothedVelocity, targetVelocity, 1 / 30, 2.8);
    }

    expect(smoothedVelocity).toBeGreaterThan(0);
    expect(smoothedVelocity).toBeLessThan(0.04);
  });
});
