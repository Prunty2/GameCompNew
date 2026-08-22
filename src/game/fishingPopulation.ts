import { clamp } from "./math";

export interface FishingViewport {
  width: number;
  height: number;
}

const REFERENCE_VIEWPORT: FishingViewport = { width: 1280, height: 720 };
const MINIMUM_FISH_SIZE = 54;
const MAXIMUM_FISH_SIZE = 92;
const FISH_SIZE_RATIO = 0.105;
const MINIMUM_CAPACITY_SCALE = 0.75;
const MAXIMUM_CAPACITY_SCALE = 2.5;
export const DEFAULT_POPULATION_DENSITY_MULTIPLIER = 0.7;
export const MOSSWATER_POPULATION_DENSITY_MULTIPLIER = 0.7;
export const BEACH_SUNWARD_POPULATION_BONUS = 2;

/**
 * Estimates how many readable fish silhouettes fit in a viewport. This mirrors
 * the renderer's sprite-size curve so larger windows gain fish after sprites
 * reach their size cap, while compact screens stay uncluttered.
 */
export function fishingPopulationScale(viewport: FishingViewport): number {
  const width = Math.max(1, viewport.width);
  const height = Math.max(1, viewport.height);
  const fishSize = clamp(Math.min(width, height) * FISH_SIZE_RATIO, MINIMUM_FISH_SIZE, MAXIMUM_FISH_SIZE);
  const referenceFishSize = clamp(
    Math.min(REFERENCE_VIEWPORT.width, REFERENCE_VIEWPORT.height) * FISH_SIZE_RATIO,
    MINIMUM_FISH_SIZE,
    MAXIMUM_FISH_SIZE,
  );
  const visibleSlots = (width * height) / fishSize ** 2;
  const referenceSlots = (REFERENCE_VIEWPORT.width * REFERENCE_VIEWPORT.height) / referenceFishSize ** 2;
  return clamp(visibleSlots / referenceSlots, MINIMUM_CAPACITY_SCALE, MAXIMUM_CAPACITY_SCALE);
}

export function responsiveResidentCount(
  baseCount: number,
  viewport: FishingViewport,
  densityMultiplier = DEFAULT_POPULATION_DENSITY_MULTIPLIER,
): number {
  return Math.max(
    1,
    Math.round(Math.max(1, baseCount) * fishingPopulationScale(viewport) * Math.max(0, densityMultiplier)),
  );
}
