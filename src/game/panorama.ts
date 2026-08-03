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
  cameraX: number;
  viewWidth: number;
  viewportWidth: number;
  viewportHeight: number;
}

const AUTHORED_WATERLINE_RATIO = 0.61;
const DISPLAYED_WATERLINE_RATIO = 0.78;

export function calculatePanoramaLayout(input: PanoramaLayoutInput): PanoramaLayout {
  let sourceWidth = input.imageWidth * input.viewWidth;
  let sourceHeight = input.imageHeight;
  const viewportAspect = input.viewportWidth / input.viewportHeight;

  if (sourceWidth / sourceHeight < viewportAspect) {
    sourceHeight = sourceWidth / viewportAspect;
  } else {
    sourceWidth = sourceHeight * viewportAspect;
  }

  const maxSourceX = input.imageWidth - sourceWidth;
  const sourceX = clamp(input.cameraX * input.imageWidth - sourceWidth / 2, 0, maxSourceX);
  const authoredWaterline = input.imageHeight * AUTHORED_WATERLINE_RATIO;
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
