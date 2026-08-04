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

export function worldToScreenX(worldX: number, camera: SideScrollCamera, viewportWidth: number): number {
  return ((worldX - camera.left) / camera.viewWidth) * viewportWidth;
}
