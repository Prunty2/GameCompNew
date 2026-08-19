import type { FishRarity, SpotId, WorldPoint } from "./balance";

export interface FishingViewLayout {
  surfaceY: number;
  underwaterHeight: number;
  lineLimitY: number;
  lineLimitRatio: number;
}

export const FISHING_RARITY_COLOURS: Record<FishRarity, string> = {
  common: "#f4e6c5",
  uncommon: "#79b99e",
  rare: "#e8a44d",
  legendary: "#9a82bd",
};

export const FISHING_ENVIRONMENT_KEYS: Record<SpotId, string> = {
  sunwardShoal: "fishing-sunward-shoal",
  mosswaterPool: "fishing-mosswater-pool",
  outerGloam: "fishing-outer-gloam",
};

export function fishingViewLayout(height: number, lineTier: number, diveProgress: number): FishingViewLayout {
  const settledSurfaceY = height * 0.31;
  const sailingSurfaceY = height * 0.78;
  const surfaceY = sailingSurfaceY + (settledSurfaceY - sailingSurfaceY) * clamp(diveProgress, 0, 1);
  const underwaterHeight = Math.max(1, height - surfaceY);
  const lineLimitRatio = Math.min(0.92, 0.67 + Math.max(0, lineTier) * 0.045);
  return {
    surfaceY,
    underwaterHeight,
    lineLimitY: surfaceY + underwaterHeight * lineLimitRatio,
    lineLimitRatio,
  };
}

export function fishingPointToScreen(
  point: WorldPoint,
  width: number,
  layout: FishingViewLayout,
  maximumDepth: number,
): WorldPoint {
  const topRatio = 0.08;
  const bottomRatio = 0.96;
  const safeMaximum = Math.max(0.08, maximumDepth);
  const depthRatio = point.y <= safeMaximum
    ? topRatio + (point.y / safeMaximum) * (layout.lineLimitRatio - topRatio)
    : layout.lineLimitRatio
      + ((point.y - safeMaximum) / Math.max(0.01, 0.94 - safeMaximum))
        * (bottomRatio - layout.lineLimitRatio);
  return {
    x: point.x * width,
    y: layout.surfaceY + layout.underwaterHeight * clamp(depthRatio, topRatio, bottomRatio),
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
