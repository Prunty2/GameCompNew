import { clamp } from "./math";

export interface SideScrollCamera {
  left: number;
  right: number;
  center: number;
  viewWidth: number;
}

interface SideScrollCameraInput {
  focusX: number;
  velocityX: number;
  viewWidth: number;
  lookAheadTime: number;
}

export function createSideScrollCamera(input: SideScrollCameraInput): SideScrollCamera {
  const viewWidth = clamp(input.viewWidth, Number.EPSILON, 1);
  const maximumLeft = 1 - viewWidth;
  const desiredCenter = input.focusX + input.velocityX * input.lookAheadTime;
  const left = clamp(desiredCenter - viewWidth / 2, 0, maximumLeft);

  return {
    left,
    right: left + viewWidth,
    center: left + viewWidth / 2,
    viewWidth,
  };
}

export function dampSideScrollCamera(
  currentCenter: number,
  target: SideScrollCamera,
  deltaSeconds: number,
  followRate: number,
): SideScrollCamera {
  const minimumCenter = target.viewWidth / 2;
  const maximumCenter = 1 - target.viewWidth / 2;
  const safeDelta = clamp(deltaSeconds, 0, 0.1);
  const blend = 1 - Math.exp(-Math.max(0, followRate) * safeDelta);
  const center = clamp(
    currentCenter + (target.center - currentCenter) * blend,
    minimumCenter,
    maximumCenter,
  );
  const left = center - target.viewWidth / 2;

  return {
    left,
    right: left + target.viewWidth,
    center,
    viewWidth: target.viewWidth,
  };
}

export function worldToScreenX(worldX: number, camera: SideScrollCamera, viewportWidth: number): number {
  return ((worldX - camera.left) / camera.viewWidth) * viewportWidth;
}
