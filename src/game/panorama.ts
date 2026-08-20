import type { SideScrollCamera } from "./camera";

export interface PanoramaLayout {
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  waterline: number;
}

interface PanoramaLayoutInput {
  imageWidth: number;
  imageHeight: number;
  camera: SideScrollCamera;
  viewportWidth: number;
  viewportHeight: number;
  authoredWaterlineRatio?: number;
}

export const LAKE_AUTHORED_WATERLINE_RATIO = 0.61;
export const BEACH_AUTHORED_WATERLINE_RATIO = 593 / 941;
const DISPLAYED_WATERLINE_RATIO = 0.78;

export function calculatePanoramaLayout(input: PanoramaLayoutInput): PanoramaLayout {
  const sourceWidth = input.imageWidth * input.camera.viewWidth;
  const viewportAspect = input.viewportWidth / input.viewportHeight;
  const sourceHeight = Math.min(input.imageHeight, sourceWidth / viewportAspect);
  const sourceX = input.camera.left * input.imageWidth;
  const authoredWaterline =
    input.imageHeight * (input.authoredWaterlineRatio ?? LAKE_AUTHORED_WATERLINE_RATIO);
  const sourceY = clamp(
    authoredWaterline - sourceHeight * DISPLAYED_WATERLINE_RATIO,
    0,
    input.imageHeight - sourceHeight,
  );

  return {
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    waterline: ((authoredWaterline - sourceY) / sourceHeight) * input.viewportHeight,
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
