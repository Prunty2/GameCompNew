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
}

const AUTHORED_WATERLINE_RATIO = 0.61;
const MAXIMUM_DISPLAYED_WATERLINE_RATIO = 0.68;

export function calculatePanoramaLayout(input: PanoramaLayoutInput): PanoramaLayout {
  const viewportAspect = input.viewportWidth / input.viewportHeight;
  const cameraSourceWidth = input.imageWidth * input.camera.viewWidth;
  let sourceWidth = Math.min(
    input.imageWidth,
    Math.max(cameraSourceWidth, input.viewportWidth),
  );
  let sourceHeight = sourceWidth / viewportAspect;
  if (sourceHeight > input.imageHeight) {
    sourceHeight = input.imageHeight;
    sourceWidth = sourceHeight * viewportAspect;
  }

  const sourceX = clamp(
    input.camera.center * input.imageWidth - sourceWidth / 2,
    0,
    input.imageWidth - sourceWidth,
  );
  const authoredWaterline = input.imageHeight * AUTHORED_WATERLINE_RATIO;
  const sourceY = clamp(
    authoredWaterline - sourceHeight * MAXIMUM_DISPLAYED_WATERLINE_RATIO,
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
