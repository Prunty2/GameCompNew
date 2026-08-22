const FISH_ATLAS_COLUMNS = 4;
const FISH_ATLAS_ROWS = 3;

export function fishAtlasCellAspect(
  atlasWidth: number,
  atlasHeight: number,
  atlasRows = FISH_ATLAS_ROWS,
): number {
  return (atlasWidth / FISH_ATLAS_COLUMNS) / Math.max(atlasHeight / atlasRows, 1);
}

export function fishSpriteDestination(
  size: number,
  cellAspect: number,
): { fishWidth: number; fishHeight: number } {
  const aspect = Math.max(cellAspect, 0.01);
  return { fishWidth: size, fishHeight: size / aspect };
}

export function containedSpriteSize(
  boxWidth: number,
  boxHeight: number,
  cellAspect: number,
): { width: number; height: number } {
  const aspect = Math.max(cellAspect, 0.01);
  let width = boxWidth;
  let height = width / aspect;
  if (height > boxHeight) {
    height = boxHeight;
    width = height * aspect;
  }
  return { width, height };
}
