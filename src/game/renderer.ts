import boatSteamAtlasUrl from "../assets/boat-steam-atlas.png";
import beachChartUrl from "../assets/beach-chart.png";
import beachChartNightUrl from "../assets/beach-chart-night.png";
import beachHarborPierUrl from "../assets/beach-harbor-pier.png";
import tackleAtlasUrl from "../assets/fish-atlas.png";
import beachBayFishAtlasUrl from "../assets/fish-beach-bay-swim.png";
import beachReefFishAtlasUrl from "../assets/fish-beach-reef-swim.png";
import beachSurfFishAtlasUrl from "../assets/fish-beach-surf-swim.png";
import beachBayFishingUrl from "../assets/fishing-beach-bay.jpg";
import beachReefFishingUrl from "../assets/fishing-beach-reef.jpg";
import beachSurfFishingUrl from "../assets/fishing-beach-surf.jpg";
import gloamFishAtlasUrl from "../assets/fish-gloam-swim.png";
import mosswaterFishAtlasUrl from "../assets/fish-mosswater-swim.png";
import sunwardFishAtlasUrl from "../assets/fish-sunward-swim.png";
import whiteSuckerFishAtlasUrl from "../assets/fish-white-sucker-swim.png";
import longnoseGarFishAtlasUrl from "../assets/fish-longnose-gar-swim.png";
import ciscoFishAtlasUrl from "../assets/fish-cisco-swim.png";
import estuaryPerchFishAtlasUrl from "../assets/fish-estuary-perch-swim.png";
import largetoothFlounderFishAtlasUrl from "../assets/fish-largetooth-flounder-swim.png";
import fishingLineLimitFloatUrl from "../assets/fishing-line-limit-float.png";
import mosswaterFishingUrl from "../assets/fishing-mosswater-pool.jpg";
import gloamFishingUrl from "../assets/fishing-outer-gloam.jpg";
import sunwardFishingUrl from "../assets/fishing-sunward-shoal.jpg";
import harborPierUrl from "../assets/harbor-pier.png";
import lakeChartUrl from "../assets/lake-chart.png";
import lakeChartNightUrl from "../assets/lake-chart-night.png";
import polarizedLensUrl from "../assets/polarized-lens.png";
import playerBoatUrl from "../assets/player-boat.png";
import surfaceFishingCuesUrl from "../assets/surface-fishing-cues.png";
import worldAtlasUrl from "../assets/world-atlas.png";
import {
  BALANCE,
  FISH,
  FISHING_SPOTS,
  HARBORS,
  regionSurfaceTintAt,
  type FishRarity,
  type FishSpecies,
  type SpotId,
  type WorldPoint,
} from "./balance";
import { boatSteamPuffs } from "./boatSteam";
import {
  createSideScrollCamera,
  dampMotionValue,
  dampSideScrollCamera,
  worldToScreenX,
  type SideScrollCamera,
} from "./camera";
import {
  FISHING_RARITY_COLOURS,
  fishingDiveProgress,
  fishingFishPose,
  fishingFocusPresentation,
  fishingHighlightSpecies,
  fishingLineAppearance,
  fishingPointToScreen,
  fishingReelCameraProgress,
  fishingViewLayout,
  type FishingViewLayout,
} from "./fishingPresentation";
import { fishingFightCue, fishingFightWriggle } from "./fishingFight";
import { FISHING_SPECIES_FIGHT_PROFILES } from "./fishingBehaviour";
import {
  fishingReelProgress,
  fishingReelSchoolOpacity,
} from "./fishingReeling";
import {
  surfaceFishingCue,
  surfaceFishingLocationVisibility,
  surfaceFishPose,
  type SurfaceFishingCue,
} from "./fishingSpotEffects";
import {
  BEACH_AUTHORED_WATERLINE_RATIO,
  calculatePanoramaLayout,
  LAKE_AUTHORED_WATERLINE_RATIO,
} from "./panorama";
import {
  questFollowArrows,
  questHookTargetIndex,
  type QuestFollowArrow,
} from "./quest";
import {
  maxFishingDepth,
  isFishingTargetReachable,
  navigationGuidance,
  nightVisualIntensity,
  type Simulation,
} from "./simulation";
import {
  objectiveIndicatorLayout,
  objectiveIndicatorOpacity,
  type ObjectiveIndicatorDirection,
} from "./objectiveIndicator";
import {
  containedSpriteSize,
  fishAtlasCellAspect,
  fishSpriteDestination,
} from "./fishSpriteLayout";
import { captureSurfaceLayer, drawWaterContact } from "./surfaceEffects";

export interface RenderSettings {
  highContrast: boolean;
  reducedMotion: boolean;
  cinematic: boolean;
}

interface LoadedArt {
  boatSteam: HTMLImageElement;
  lake: HTMLImageElement;
  lakeNight: HTMLImageElement;
  beach: HTMLImageElement;
  beachNight: HTMLImageElement;
  beachPier: HTMLImageElement;
  pier: HTMLImageElement;
  boat: HTMLCanvasElement;
  fish: Record<FishSheetId, HTMLCanvasElement>;
  fishOutlines: Record<FishRarity, Record<FishSheetId, HTMLCanvasElement>>;
  fishingEnvironments: Record<SpotId, HTMLImageElement>;
  beachFishingEnvironments: Record<SpotId, HTMLImageElement>;
  lineLimitFloat: HTMLImageElement;
  fishingCues: HTMLCanvasElement;
  polarizedLens: HTMLImageElement;
  tackle: HTMLCanvasElement;
  world: HTMLCanvasElement;
}

type FishSheetId = SpotId | "whiteSucker" | "longnoseGar" | "cisco" | "estuaryPerch" | "largetoothFlounder" | "beachSurf" | "beachBay" | "beachReef";

const SURFACE_FISH_CELLS = [
  [0, 0],
  [1, 0],
  [2, 0],
  [3, 0],
  [0, 1],
  [1, 1],
] as const;

const FISH_SPRITE_CELLS: Record<FishSpecies, { sheet: FishSheetId; row: number }> = {
  bluegill: { sheet: "sunwardShoal", row: 0 },
  yellowPerch: { sheet: "sunwardShoal", row: 1 },
  emeraldShiner: { sheet: "sunwardShoal", row: 2 },
  whiteSucker: { sheet: "whiteSucker", row: 0 },
  longnoseGar: { sheet: "longnoseGar", row: 0 },
  northernPike: { sheet: "mosswaterPool", row: 0 },
  largemouthBass: { sheet: "mosswaterPool", row: 1 },
  bowfin: { sheet: "mosswaterPool", row: 2 },
  cisco: { sheet: "cisco", row: 0 },
  lakeTrout: { sheet: "outerGloam", row: 0 },
  burbot: { sheet: "outerGloam", row: 1 },
  lakeSturgeon: { sheet: "outerGloam", row: 2 },
  seaMullet: { sheet: "beachSurf", row: 0 },
  yellowfinBream: { sheet: "beachSurf", row: 1 },
  sandWhiting: { sheet: "beachSurf", row: 2 },
  largetoothFlounder: { sheet: "largetoothFlounder", row: 0 },
  duskyFlathead: { sheet: "beachBay", row: 0 },
  luderick: { sheet: "beachBay", row: 1 },
  easternAustralianSalmon: { sheet: "beachBay", row: 2 },
  estuaryPerch: { sheet: "estuaryPerch", row: 0 },
  snapper: { sheet: "beachReef", row: 0 },
  yellowtailKingfish: { sheet: "beachReef", row: 1 },
  mulloway: { sheet: "beachReef", row: 2 },
};

const FISH_SHEET_ROWS: Record<FishSheetId, number> = {
  sunwardShoal: 3,
  mosswaterPool: 3,
  outerGloam: 3,
  whiteSucker: 1,
  longnoseGar: 1,
  cisco: 1,
  estuaryPerch: 1,
  largetoothFlounder: 1,
  beachSurf: 3,
  beachBay: 3,
  beachReef: 3,
};

const FISH_DRAW_SIZE: Record<FishSpecies, number> = {
  bluegill: 1.05,
  yellowPerch: 1.14,
  emeraldShiner: 1.46,
  whiteSucker: 1.48,
  longnoseGar: 1.62,
  cisco: 1.44,
  northernPike: 1.56,
  largemouthBass: 1.12,
  bowfin: 1.44,
  lakeTrout: 1.34,
  burbot: 1.46,
  lakeSturgeon: 1.56,
  seaMullet: 1.5,
  yellowfinBream: 1.08,
  sandWhiting: 1.58,
  largetoothFlounder: 1.34,
  duskyFlathead: 1.62,
  luderick: 1.08,
  easternAustralianSalmon: 1.45,
  estuaryPerch: 1.28,
  snapper: 1.18,
  yellowtailKingfish: 1.58,
  mulloway: 1.5,
};

// Center of the visible hook-and-arc paint inside each 192 × 256 authored atlas cell.
const SURFACE_HOOK_OPTICAL_CENTER = {
  x: 89 / 192,
  y: 92 / 256,
} as const;
const SURFACE_HOOK_SCALE = 1.05;
const SURFACE_HOOK_RAISE_PX = 12;
// Optical top-center of the exhaust stack in the keyed 1132 × 545 boat crop.
const BOAT_STACK_ANCHOR_X = -0.133;
const BOAT_STACK_ANCHOR_Y = -0.71;

export class CanvasRenderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly artReady: Promise<void>;
  private readonly surfaceLayer = document.createElement("canvas");
  private art: LoadedArt | null = null;
  private interactionAnchor: WorldPoint | null = null;
  private surfaceCameraCenter: number | null = null;
  private surfaceCameraWasCinematic = false;
  private surfaceMotionElapsed: number | null = null;
  private surfaceCameraVelocity = 0;
  private surfaceCameraViewWidth: number = BALANCE.cameraViewWidth;
  private surfaceSteamVelocity = 0;
  private surfaceSteamStackOffsetX: number | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable.");
    this.context = context;
    this.artReady = Promise.all([
      loadImage(boatSteamAtlasUrl),
      loadImage(lakeChartUrl),
      loadImage(lakeChartNightUrl),
      loadImage(beachChartUrl),
      loadImage(beachChartNightUrl),
      loadImage(beachHarborPierUrl),
      loadImage(harborPierUrl),
      loadImage(playerBoatUrl),
      loadImage(sunwardFishAtlasUrl),
      loadImage(whiteSuckerFishAtlasUrl),
      loadImage(longnoseGarFishAtlasUrl),
      loadImage(ciscoFishAtlasUrl),
      loadImage(estuaryPerchFishAtlasUrl),
      loadImage(largetoothFlounderFishAtlasUrl),
      loadImage(mosswaterFishAtlasUrl),
      loadImage(gloamFishAtlasUrl),
      loadImage(beachSurfFishAtlasUrl),
      loadImage(beachBayFishAtlasUrl),
      loadImage(beachReefFishAtlasUrl),
      loadImage(beachSurfFishingUrl),
      loadImage(beachBayFishingUrl),
      loadImage(beachReefFishingUrl),
      loadImage(sunwardFishingUrl),
      loadImage(mosswaterFishingUrl),
      loadImage(gloamFishingUrl),
      loadImage(fishingLineLimitFloatUrl),
      loadImage(surfaceFishingCuesUrl),
      loadImage(polarizedLensUrl),
      loadImage(tackleAtlasUrl),
      loadImage(worldAtlasUrl),
    ]).then(([
      boatSteam,
      lake,
      lakeNight,
      beach,
      beachNight,
      beachPier,
      pier,
      boat,
      sunwardFish,
      whiteSuckerFish,
      longnoseGarFish,
      ciscoFish,
      estuaryPerchFish,
      largetoothFlounderFish,
      mosswaterFish,
      gloamFish,
      beachSurfFish,
      beachBayFish,
      beachReefFish,
      beachSurfFishing,
      beachBayFishing,
      beachReefFishing,
      sunwardFishing,
      mosswaterFishing,
      gloamFishing,
      lineLimitFloat,
      fishingCues,
      polarizedLens,
      tackle,
      world,
    ]) => {
      const keyedFish: Record<FishSheetId, HTMLCanvasElement> = {
        sunwardShoal: keyMagenta(sunwardFish, false, true),
        whiteSucker: keyMagenta(whiteSuckerFish, false, true),
        longnoseGar: keyMagenta(longnoseGarFish, false, true),
        cisco: keyMagenta(ciscoFish, false, true),
        estuaryPerch: keyMagenta(estuaryPerchFish, false, true),
        largetoothFlounder: keyMagenta(largetoothFlounderFish, false, true),
        mosswaterPool: keyMagenta(mosswaterFish, false, true),
        outerGloam: keyMagenta(gloamFish, false, true),
        beachSurf: keyMagenta(beachSurfFish, false, true),
        beachBay: keyMagenta(beachBayFish, false, true),
        beachReef: keyMagenta(beachReefFish, false, true),
      };
      const tintedFish = (colour: string): Record<FishSheetId, HTMLCanvasElement> => ({
        sunwardShoal: tintAlpha(keyedFish.sunwardShoal, colour),
        whiteSucker: tintAlpha(keyedFish.whiteSucker, colour),
        longnoseGar: tintAlpha(keyedFish.longnoseGar, colour),
        cisco: tintAlpha(keyedFish.cisco, colour),
        estuaryPerch: tintAlpha(keyedFish.estuaryPerch, colour),
        largetoothFlounder: tintAlpha(keyedFish.largetoothFlounder, colour),
        mosswaterPool: tintAlpha(keyedFish.mosswaterPool, colour),
        outerGloam: tintAlpha(keyedFish.outerGloam, colour),
        beachSurf: tintAlpha(keyedFish.beachSurf, colour),
        beachBay: tintAlpha(keyedFish.beachBay, colour),
        beachReef: tintAlpha(keyedFish.beachReef, colour),
      });
      this.art = {
        boatSteam,
        lake,
        lakeNight,
        beach,
        beachNight,
        beachPier,
        pier,
        boat: keyMagenta(boat, true),
        fish: keyedFish,
        fishOutlines: {
          common: tintedFish(FISHING_RARITY_COLOURS.common),
          uncommon: tintedFish(FISHING_RARITY_COLOURS.uncommon),
          rare: tintedFish(FISHING_RARITY_COLOURS.rare),
          legendary: tintedFish(FISHING_RARITY_COLOURS.legendary),
        },
        fishingEnvironments: {
          sunwardShoal: sunwardFishing,
          mosswaterPool: mosswaterFishing,
          outerGloam: gloamFishing,
        },
        beachFishingEnvironments: {
          sunwardShoal: beachSurfFishing,
          mosswaterPool: beachBayFishing,
          outerGloam: beachReefFishing,
        },
        lineLimitFloat,
        fishingCues: keyMagenta(fishingCues, false),
        polarizedLens,
        tackle: keyMagenta(tackle, false),
        world: keyMagenta(world, false),
      };
    });
  }

  ready(): Promise<void> {
    return this.artReady;
  }

  surfaceInteractionAnchor(): WorldPoint | null {
    return this.interactionAnchor ? { ...this.interactionAnchor } : null;
  }

  render(simulation: Simulation, settings: RenderSettings): void {
    this.interactionAnchor = null;
    delete this.canvas.dataset.questFollow;
    delete this.canvas.dataset.questHookFollow;
    this.resize();
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.context.clearRect(0, 0, width, height);
    this.canvas.dataset.world = simulation.world;
    if (!this.art) {
      this.context.fillStyle = "#0b2630";
      this.context.fillRect(0, 0, width, height);
      return;
    }
    this.context.save();
    if (simulation.mode === "fishing" && simulation.fishing) {
      this.renderFishing(simulation, settings, width, height);
    } else {
      delete this.canvas.dataset.fishingDiveProgress;
      delete this.canvas.dataset.fishingSchoolOpacity;
      delete this.canvas.dataset.fishingBackgroundFishOpacity;
      delete this.canvas.dataset.fishingBackgroundPoseElapsed;
      delete this.canvas.dataset.fishingSurfaceSpriteOpacity;
      delete this.canvas.dataset.fishingSurfaceBlend;
      delete this.canvas.dataset.fishingSpot;
      delete this.canvas.dataset.fishingFishCount;
      delete this.canvas.dataset.fishingFishVerticalSpan;
      delete this.canvas.dataset.fishingState;
      delete this.canvas.dataset.fishingReelProgress;
      delete this.canvas.dataset.fishingLineTension;
      delete this.canvas.dataset.fishingLineColour;
      delete this.canvas.dataset.fishingFightCue;
      delete this.canvas.dataset.fishingFightBehaviour;
      delete this.canvas.dataset.fishingFightStyle;
      delete this.canvas.dataset.fishingFightMotionX;
      delete this.canvas.dataset.fishingFightMotionY;
      delete this.canvas.dataset.fishingFishStamina;
      delete this.canvas.dataset.targetRarity;
      this.canvas.setAttribute("aria-label", "Game area");
      this.renderSurface(simulation, settings, width, height);
    }
    this.context.restore();
  }

  private renderSurface(simulation: Simulation, settings: RenderSettings, width: number, height: number): void {
    const art = this.art;
    if (!art) return;
    const { context } = this;
    const motionDelta = this.updateSurfaceMotion(simulation, settings.cinematic, settings.reducedMotion);
    const camera = this.camera(simulation, settings.cinematic, settings.reducedMotion, motionDelta);
    this.canvas.dataset.surfaceCameraCenter = camera.center.toFixed(3);
    this.canvas.dataset.surfaceCameraViewWidth = camera.viewWidth.toFixed(3);
    const nightIntensity = nightVisualIntensity(simulation);
    const dayImage = simulation.world === "beach" ? art.beach : art.lake;
    const nightImage = simulation.world === "beach" ? art.beachNight : art.lakeNight;
    const authoredWaterlineRatio =
      simulation.world === "beach"
        ? BEACH_AUTHORED_WATERLINE_RATIO
        : LAKE_AUTHORED_WATERLINE_RATIO;
    const waterline = this.drawPanorama(
      nightIntensity >= 1 ? nightImage : dayImage,
      camera,
      width,
      height,
      authoredWaterlineRatio,
    );
    if (nightIntensity > 0 && nightIntensity < 1) {
      context.save();
      context.globalAlpha = nightIntensity;
      this.drawPanorama(nightImage, camera, width, height, authoredWaterlineRatio);
      context.restore();
    }
    context.save();
    context.globalAlpha = settings.highContrast ? 0.08 : 0.07;
    context.fillStyle = regionSurfaceTintAt(simulation.boat.x);
    context.fillRect(0, 0, width, height);
    context.restore();

    if (settings.cinematic) return;
    const surfaceLayer = captureSurfaceLayer(this.canvas, this.surfaceLayer);

    for (const harbor of HARBORS) {
      const x = worldToScreenX(harbor.x, camera, width);
      if (!isNearScreen(x, width, 540)) continue;
      this.drawHarborPier(
        x,
        waterline,
        harbor.id === "gloam",
        simulation.world === "beach",
        surfaceLayer,
        width,
        height,
        simulation.elapsed,
        settings,
        1,
      );
    }

    this.drawBoat(simulation, camera, width, height, waterline, surfaceLayer, settings, motionDelta);

    let activeFishingCue: { cue: SurfaceFishingCue; x: number } | null = null;
    for (const [spotIndex, spot] of FISHING_SPOTS.entries()) {
      const x = worldToScreenX(spot.x, camera, width);
      if (!isNearScreen(x, width, 260)) continue;
      const depthLocked = spot.requiredDepthTier[simulation.world] > simulation.progress.upgrades.line;
      const cue = surfaceFishingCue(simulation.boat.x, spot.x, BALANCE.fishingRadius);
      this.drawSurfaceFishingGround({
        spotIndex,
        cue,
        locked: depthLocked,
        x,
        waterline,
        width,
        height,
        elapsed: simulation.elapsed,
        reducedMotion: settings.reducedMotion,
        highContrast: settings.highContrast,
        beach: simulation.world === "beach",
        opacity: 1,
      });
      if (cue.hookVisibility > 0) {
        activeFishingCue = { cue, x };
      }
    }

    if (activeFishingCue) {
      const hookY = waterline - clamp(height * 0.22, 118, 220) - SURFACE_HOOK_RAISE_PX;
      this.drawSurfaceHookCue(
        activeFishingCue.x,
        hookY,
        activeFishingCue.cue.hookVisibility,
        simulation.elapsed,
        settings,
        1,
      );
      this.interactionAnchor = { x: activeFishingCue.x, y: hookY };
    }

    this.drawQuestFollowArrows(simulation, camera, width, waterline, settings, 1);
    this.drawObjective(simulation, camera, width, height, settings, 1);
    this.drawWeather(simulation, camera, width, height, settings);

  }

  private drawHarborPier(
    x: number,
    waterline: number,
    fromRightShore: boolean,
    beach: boolean,
    surfaceLayer: HTMLCanvasElement,
    viewportWidth: number,
    viewportHeight: number,
    elapsed: number,
    settings: RenderSettings,
    opacity: number,
  ): void {
    const art = this.art;
    if (!art) return;
    const pier = beach ? art.beachPier : art.pier;
    const pierWidth = beach
      ? clamp(this.canvas.clientHeight * 0.64, 340, 585)
      : clamp(this.canvas.clientHeight * 0.53, 300, 495);
    const pierHeight = pierWidth * (pier.naturalHeight / pier.naturalWidth);
    const deckTop = waterline - 32;
    const pierLift = clamp(pierHeight * 0.04, 4, 9);
    const drawY = deckTop - pierHeight * 0.43 - pierLift;
    const outboardOverlap = 24;
    const pierCenter = fromRightShore
      ? x - outboardOverlap + pierWidth / 2
      : x + outboardOverlap - pierWidth / 2;

    this.context.save();
    this.context.globalAlpha *= opacity;
    if (fromRightShore) {
      this.context.translate(x - outboardOverlap, 0);
      this.context.scale(-1, 1);
      this.context.drawImage(pier, -pierWidth, drawY, pierWidth, pierHeight);
    } else {
      this.context.drawImage(pier, x + outboardOverlap - pierWidth, drawY, pierWidth, pierHeight);
    }
    this.context.restore();

    drawWaterContact(this.context, surfaceLayer, {
      centerX: pierCenter,
      waterline,
      width: pierWidth + 16,
      viewportWidth,
      viewportHeight,
      elapsed,
      reducedMotion: settings.reducedMotion,
      highContrast: settings.highContrast,
      seed: fromRightShore ? 2.4 : 0.7,
      opacity,
    });
  }

  private drawSurfaceFishingGround(options: {
    spotIndex: number;
    cue: SurfaceFishingCue;
    locked: boolean;
    x: number;
    waterline: number;
    width: number;
    height: number;
    elapsed: number;
    reducedMotion: boolean;
    highContrast: boolean;
    beach: boolean;
    opacity: number;
  }): void {
    const { context } = this;
    const shoalWidth = clamp(options.height * 0.55, 250, 480);
    const shoalDepth = clamp((options.height - options.waterline) * 0.82, 130, 290);
    const locationVisibility = surfaceFishingLocationVisibility(options.cue, options.beach);
    const lensStrength = locationVisibility.lensVisibility * (options.locked ? 0.62 : 1);

    if (lensStrength > 0.01) {
      const art = this.art;
      if (!art) return;
      const lensWidth = shoalWidth * 1.04;
      const lensHeight = Math.min(options.height - options.waterline + 28, shoalDepth * 1.32);
      context.save();
      context.globalCompositeOperation = "screen";
      context.globalAlpha = clamp(
        lensStrength * (options.highContrast ? 0.96 : options.beach ? 0.98 : 0.84) * options.opacity,
        0,
        1,
      );
      context.drawImage(
        art.polarizedLens,
        options.x - lensWidth / 2,
        options.waterline - lensHeight * 0.13,
        lensWidth,
        lensHeight,
      );
      context.restore();
    }

    const fishBaseSize = clamp(Math.min(options.width, options.height) * 0.039, 27, 43);
    for (let index = 0; index < options.cue.fishCount; index += 1) {
      const pose = surfaceFishPose(options.spotIndex, index, options.elapsed, options.reducedMotion);
      const fishX = options.x + pose.offsetX * shoalWidth;
      const fishY = options.waterline + pose.depth * shoalDepth;
      const cellWidth = fishBaseSize * pose.scale * 1.4;
      const cellHeight = cellWidth * 4 / 3;
      const [column, row] = SURFACE_FISH_CELLS[index % SURFACE_FISH_CELLS.length]!;
      context.save();
      context.globalAlpha = clamp(locationVisibility.fishVisibility
        * (options.locked ? 0.58 : 1)
        * (options.highContrast ? 1.28 : 1)
        * options.opacity, 0, 1);
      context.translate(fishX, fishY);
      context.scale(pose.direction, 1);
      this.drawSurfaceFishingCueCell(column, row, 0, 0, cellWidth, cellHeight);
      context.restore();
    }
  }

  private drawSurfaceHookCue(
    x: number,
    y: number,
    visibility: number,
    elapsed: number,
    settings: RenderSettings,
    opacity: number,
  ): void {
    const { context } = this;
    const pulse = settings.reducedMotion ? 0 : Math.sin(elapsed * 4) * 2;
    const radius = (clamp(this.canvas.clientHeight * 0.042, 22, 34) + pulse) * SURFACE_HOOK_SCALE;
    const cueWidth = radius * 2.3;

    context.save();
    context.globalAlpha = visibility * opacity;
    context.shadowColor = settings.highContrast ? "rgba(255, 255, 255, 0.72)" : "rgba(232, 164, 77, 0.58)";
    context.shadowBlur = settings.highContrast ? 14 : 18;
    const cueHeight = cueWidth * 4 / 3;
    const opticalOffsetX = (0.5 - SURFACE_HOOK_OPTICAL_CENTER.x) * cueWidth;
    const opticalOffsetY = (0.5 - SURFACE_HOOK_OPTICAL_CENTER.y) * cueHeight;
    this.drawSurfaceFishingCueCell(
      2,
      1,
      x + opticalOffsetX,
      y + opticalOffsetY,
      cueWidth,
      cueHeight,
    );
    context.restore();
  }

  private renderFishing(simulation: Simulation, settings: RenderSettings, width: number, height: number): void {
    const fishing = simulation.fishing;
    if (!fishing) return;
    const art = this.art;
    if (!art) return;
    const { context } = this;
    const spot = FISHING_SPOTS.find((candidate) => candidate.id === fishing.spot);
    if (!spot) return;
    const targetSpecies = fishingHighlightSpecies(
      simulation.progress.marketTarget,
      simulation.world,
      spot.id,
    );
    const maximumDepth = maxFishingDepth(simulation);
    const entryDiveProgress = fishingDiveProgress(simulation.elapsed, fishing.startedAt, settings.reducedMotion);
    const reelProgress = fishing.reeling && fishing.reeling.landingAt !== null
      ? fishingReelProgress(simulation.elapsed, fishing.reeling.landingAt)
      : 0;
    const exitProgress = fishing.exitingAt === null
      ? 0
      : fishingReelProgress(simulation.elapsed, fishing.exitingAt);
    const surfaceProgress = fishing.reeling?.landingAt != null ? reelProgress : exitProgress;
    const surfacing = fishing.reeling?.landingAt != null || fishing.exitingAt !== null;
    const schoolOpacity = surfacing ? fishingReelSchoolOpacity(surfaceProgress) : 1;
    const focus = fishingFocusPresentation(
      simulation.elapsed,
      schoolOpacity,
      fishing.reeling?.hookedAt ?? null,
    );
    const diveProgress = surfacing
      ? fishingReelCameraProgress(entryDiveProgress, surfaceProgress, settings.reducedMotion)
      : entryDiveProgress;
    const layout = fishingViewLayout(height, simulation.progress.upgrades.line, diveProgress);
    this.canvas.dataset.fishingDiveProgress = diveProgress.toFixed(3);
    this.canvas.dataset.fishingSchoolOpacity = schoolOpacity.toFixed(3);
    this.canvas.dataset.fishingBackgroundFishOpacity = focus.backgroundFishOpacity.toFixed(3);
    this.canvas.dataset.fishingBackgroundPoseElapsed = focus.backgroundPoseElapsed.toFixed(3);
    this.canvas.dataset.fishingSurfaceSpriteOpacity = reelProgress.toFixed(3);
    this.canvas.dataset.fishingSurfaceBlend = surfaceProgress.toFixed(3);
    this.canvas.dataset.fishingSpot = spot.id;
    this.canvas.dataset.fishingFishCount = String(fishing.targets.length);
    const fishScreenDepths = fishing.targets.map((target) => (
      fishingPointToScreen(target, width, layout, maximumDepth).y
    ));
    this.canvas.dataset.fishingFishVerticalSpan = fishScreenDepths.length === 0
      ? "0"
      : (Math.max(...fishScreenDepths) - Math.min(...fishScreenDepths)).toFixed(1);
    if (targetSpecies) {
      this.canvas.dataset.targetRarity = FISH[targetSpecies].rarity;
    } else {
      delete this.canvas.dataset.targetRarity;
    }
    this.canvas.dataset.fishingState = fishing.reeling
      ? fishing.reeling.landingAt === null ? "fighting" : "landing"
      : fishing.exitingAt !== null ? "exiting" : "steering";
    const line = fishingLineAppearance(fishing.reeling?.tension ?? 0, settings.highContrast);
    this.canvas.dataset.fishingLineColour = line.colour;
    if (fishing.reeling) {
      this.canvas.dataset.fishingReelProgress = fishing.reeling.progress.toFixed(3);
      this.canvas.dataset.fishingLineTension = fishing.reeling.tension.toFixed(3);
      this.canvas.dataset.fishingFightCue = fishingFightCue(fishing.reeling);
      this.canvas.dataset.fishingFightBehaviour = fishing.reeling.behaviour;
      this.canvas.dataset.fishingFightStyle = FISHING_SPECIES_FIGHT_PROFILES[fishing.reeling.species].style;
      this.canvas.dataset.fishingFightMotionX = fishing.reeling.motionX.toFixed(4);
      this.canvas.dataset.fishingFightMotionY = fishing.reeling.motionY.toFixed(4);
      this.canvas.dataset.fishingFishStamina = fishing.reeling.stamina.toFixed(3);
    } else {
      delete this.canvas.dataset.fishingReelProgress;
      delete this.canvas.dataset.fishingLineTension;
      delete this.canvas.dataset.fishingFightCue;
      delete this.canvas.dataset.fishingFightBehaviour;
      delete this.canvas.dataset.fishingFightStyle;
      delete this.canvas.dataset.fishingFightMotionX;
      delete this.canvas.dataset.fishingFightMotionY;
      delete this.canvas.dataset.fishingFishStamina;
    }
    this.canvas.setAttribute(
      "aria-label",
      fishing.reeling
        ? fishingFightAriaLabel(spot.name, fishing.reeling)
        : fishing.exitingAt !== null
          ? `Leaving ${spot.name} and returning to the lake surface.`
        : targetSpecies
          ? `Fishing at ${spot.name}. Target ${FISH[targetSpecies].name}, ${FISH[targetSpecies].rarity} rarity.`
          : `Fishing at ${spot.name}.`,
    );
    const fishingEnvironments = simulation.world === "beach"
      ? art.beachFishingEnvironments
      : art.fishingEnvironments;
    this.drawFishingEnvironment(fishingEnvironments[spot.id], layout, width, height, settings.highContrast);
    this.drawFishingSurfaceBand(
      simulation,
      settings,
      width,
      height,
      layout.surfaceY,
      surfaceProgress,
    );

    const gameplayVisibility = clamp((diveProgress - 0.24) / 0.54, 0, 1);
    context.save();
    context.globalAlpha = gameplayVisibility;
    const depthLine = layout.lineLimitY;
    if (maximumDepth < 0.93) {
      context.fillStyle = "rgba(3, 12, 21, 0.2)";
      context.fillRect(0, depthLine, width, height - depthLine);
      this.drawFishingLineLimit(depthLine, width, height, settings.highContrast);
    }

    for (const [targetIndex, target] of fishing.targets.entries()) {
      if (fishing.reeling?.targetIndex === targetIndex) continue;
      const point = fishingPointToScreen(target, width, layout, maximumDepth);
      const pose = fishingFishPose(target.species, focus.backgroundPoseElapsed, target.phase, settings.reducedMotion);
      const heading = Math.abs(target.velocityX) > 0.002
        ? target.velocityX >= 0 ? 1 : -1
        : target.direction === pose.heading ? 1 : -1;
      const animatedPoint = {
        x: point.x,
        y: point.y + pose.verticalOffsetRatio * layout.underwaterHeight,
      };
      const reachable = isFishingTargetReachable(simulation, target);
      context.save();
      context.globalAlpha = (reachable ? 1 : 0.3) * focus.backgroundFishOpacity;
      if (!focus.showTargetGuides) context.filter = "grayscale(1) brightness(0.35) contrast(1.15)";
      context.translate(animatedPoint.x, animatedPoint.y);
      context.rotate(pose.rotation * heading);
      context.scale(pose.scaleX, pose.scaleY);
      if (focus.showTargetGuides && targetSpecies && target.species === targetSpecies) {
        this.drawFishOutline(target.species, pose.animationFrame, { x: 0, y: 0 }, heading, width, height, settings.highContrast);
      }
      this.drawFish(target.species, pose.animationFrame, { x: 0, y: 0 }, heading, width, height, settings.highContrast);
      context.restore();
      if (focus.showTargetGuides && targetSpecies && target.species === targetSpecies) {
        context.save();
        context.globalAlpha = schoolOpacity;
        this.drawFishingTargetChevron(
          animatedPoint,
          target.species,
          width,
          height,
          settings,
          simulation.elapsed,
          simulation.progress.marketTutorialStep === "catch",
        );
        context.restore();
      }
    }

    const restingHook = fishingPointToScreen(fishing.hook, width, layout, maximumDepth);
    const fightPull = fishing.reeling
      ? fishing.reeling.landingAt === null
        ? fishing.reeling.progress * 0.72
        : 0.72 + reelProgress * 0.28
      : exitProgress;
    const hook = fishing.reeling || fishing.exitingAt !== null
      ? {
          x: restingHook.x + (width * 0.5 - restingHook.x) * fightPull,
          y: restingHook.y + (layout.surfaceY + 10 - restingHook.y) * fightPull,
        }
      : restingHook;
    const fightMotionScale = settings.reducedMotion ? 0 : Math.min(width, height);
    if (fishing.reeling && fishing.reeling.landingAt === null) {
      hook.x += fishing.reeling.motionX * fightMotionScale;
      hook.y += fishing.reeling.motionY * fightMotionScale;
    }
    const hookSize = clamp(Math.min(width, height) * 0.076, 46, 68);
    const hooked = fishing.reeling !== null;
    const hookDrawY = hooked ? hook.y - hookSize * 0.12 : hook.y;
    const lineEndY = hooked ? hookDrawY - hookSize * 0.16 : hook.y;
    context.strokeStyle = line.colour;
    context.lineWidth = line.width;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(width * 0.5, layout.surfaceY - 2);
    context.lineTo(hook.x, lineEndY);
    context.stroke();
    this.drawTackleCell(1, 1, hook.x, hookDrawY, hookSize, hookSize);
    if (fishing.reeling) {
      const wriggle = fishingFightWriggle(
        fishing.reeling.species,
        simulation.elapsed,
        fishing.reeling.hookedAt,
        fishing.reeling.struggle,
        settings.reducedMotion,
        fishing.reeling.behaviour,
      );
      const facing = !settings.reducedMotion && Math.abs(fishing.reeling.motionVx) > 0.008
        ? fishing.reeling.motionVx >= 0 ? 1 : -1
        : fishing.reeling.direction;
      const fishOffset = facing * hookSize * 0.22;
      context.save();
      context.globalAlpha = 1;
      context.translate(hook.x - fishOffset, hook.y + hookSize * 0.04);
      context.rotate(wriggle * (fishing.reeling.behaviour === "thrash" ? 0.45 : 0.22));
      context.scale(1, 1 + Math.abs(wriggle) * 0.05);
      this.drawFish(
        fishing.reeling.species,
        fishingFishPose(fishing.reeling.species, simulation.elapsed, 0, settings.reducedMotion).animationFrame,
        { x: 0, y: 0 },
        facing,
        width,
        height,
        settings.highContrast,
      );
      context.restore();
    }
    if (focus.showTargetGuides) {
      this.drawQuestHookGuide(simulation, fishing, hook, width, layout, maximumDepth, settings);
    } else {
      this.canvas.dataset.questHookFollow = "0";
    }

    if (focus.showTargetGuides && targetSpecies) {
      this.drawFishingTargetGuide(targetSpecies, width, height, settings.highContrast, layout.surfaceY);
    }
    if (!fishing.reeling) {
      this.drawFishingControlCue(width, height, settings.highContrast);
    }
    context.restore();
  }

  private drawFishingEnvironment(
    image: HTMLImageElement,
    layout: FishingViewLayout,
    width: number,
    height: number,
    highContrast: boolean,
  ): void {
    const { context } = this;
    context.fillStyle = "#071c27";
    context.fillRect(0, 0, width, height);
    context.save();
    context.beginPath();
    context.rect(0, layout.surfaceY, width, layout.underwaterHeight);
    context.clip();
    this.drawImageCover(image, 0, layout.surfaceY, width, layout.underwaterHeight);
    if (highContrast) {
      context.globalCompositeOperation = "screen";
      context.fillStyle = "rgba(214, 232, 218, 0.08)";
      context.fillRect(0, layout.surfaceY, width, layout.underwaterHeight);
    }
    context.restore();
  }

  private drawFishingSurfaceBand(
    simulation: Simulation,
    settings: RenderSettings,
    width: number,
    height: number,
    surfaceY: number,
    underwaterReveal: number,
  ): void {
    const art = this.art;
    if (!art) return;
    const { context } = this;
    const motionDelta = this.updateSurfaceMotion(simulation, false, settings.reducedMotion);
    const camera = this.camera(simulation, false, settings.reducedMotion, motionDelta);
    const nightIntensity = nightVisualIntensity(simulation);
    const dayImage = simulation.world === "beach" ? art.beach : art.lake;
    const nightImage = simulation.world === "beach" ? art.beachNight : art.lakeNight;
    const authoredWaterlineRatio =
      simulation.world === "beach"
        ? BEACH_AUTHORED_WATERLINE_RATIO
        : LAKE_AUTHORED_WATERLINE_RATIO;
    const drawSurfaceImage = (
      image: HTMLImageElement,
      alpha: number,
      layer: "above" | "below",
    ): void => {
      const panorama = calculatePanoramaLayout({
        imageWidth: image.naturalWidth,
        imageHeight: image.naturalHeight,
        camera,
        viewportWidth: width,
        viewportHeight: height,
        authoredWaterlineRatio,
      });
      context.save();
      context.beginPath();
      if (layer === "above") {
        context.rect(0, 0, width, surfaceY + 3);
      } else {
        context.rect(0, surfaceY, width, height - surfaceY);
      }
      context.clip();
      context.globalAlpha = alpha;
      context.drawImage(
        image,
        panorama.sourceX,
        panorama.sourceY,
        panorama.sourceWidth,
        panorama.sourceHeight,
        0,
        surfaceY - panorama.waterline,
        width,
        height,
      );
      context.restore();
    };
    const surfaceBlend = clamp(underwaterReveal, 0, 1);
    if (surfaceBlend > 0) {
      drawSurfaceImage(dayImage, surfaceBlend, "below");
      if (nightIntensity > 0) {
        drawSurfaceImage(nightImage, surfaceBlend * nightIntensity, "below");
      }
      context.save();
      context.beginPath();
      context.rect(0, surfaceY, width, height - surfaceY);
      context.clip();
      context.globalAlpha = surfaceBlend * (settings.highContrast ? 0.08 : 0.07);
      context.fillStyle = regionSurfaceTintAt(simulation.boat.x);
      context.fillRect(0, surfaceY, width, height - surfaceY);
      context.restore();
    }
    drawSurfaceImage(dayImage, 1, "above");
    if (nightIntensity > 0) drawSurfaceImage(nightImage, nightIntensity, "above");

    context.save();
    context.beginPath();
    context.rect(0, 0, width, surfaceY);
    context.clip();
    context.globalAlpha = settings.highContrast ? 0.06 : 0.08;
    context.fillStyle = regionSurfaceTintAt(simulation.boat.x);
    context.fillRect(0, 0, width, surfaceY);
    context.restore();

    const surfaceLayer = captureSurfaceLayer(this.canvas, this.surfaceLayer);
    if (surfaceBlend > 0) {
      for (const harbor of HARBORS) {
        const x = worldToScreenX(harbor.x, camera, width);
        if (!isNearScreen(x, width, 540)) continue;
        this.drawHarborPier(
          x,
          surfaceY,
          harbor.id === "gloam",
          simulation.world === "beach",
          surfaceLayer,
          width,
          height,
          simulation.elapsed,
          settings,
          surfaceBlend,
        );
      }
    }

    this.drawBoat(simulation, camera, width, height, surfaceY, surfaceLayer, settings, motionDelta);

    let activeFishingCue: { cue: SurfaceFishingCue; x: number } | null = null;
    if (surfaceBlend > 0) {
      for (const [spotIndex, spot] of FISHING_SPOTS.entries()) {
        const x = worldToScreenX(spot.x, camera, width);
        if (!isNearScreen(x, width, 260)) continue;
        const depthLocked = spot.requiredDepthTier[simulation.world] > simulation.progress.upgrades.line;
        const cue = surfaceFishingCue(simulation.boat.x, spot.x, BALANCE.fishingRadius);
        this.drawSurfaceFishingGround({
          spotIndex,
          cue,
          locked: depthLocked,
          x,
          waterline: surfaceY,
          width,
          height,
          elapsed: simulation.elapsed,
          reducedMotion: settings.reducedMotion,
          highContrast: settings.highContrast,
          beach: simulation.world === "beach",
          opacity: surfaceBlend,
        });
        if (cue.hookVisibility > 0) activeFishingCue = { cue, x };
      }

      if (activeFishingCue) {
        const hookY = surfaceY - clamp(height * 0.22, 118, 220) - SURFACE_HOOK_RAISE_PX;
        this.drawSurfaceHookCue(
          activeFishingCue.x,
          hookY,
          activeFishingCue.cue.hookVisibility,
          simulation.elapsed,
          settings,
          surfaceBlend,
        );
      }

      const surfaceSimulation: Simulation = simulation.fishing?.reeling
        ? {
            ...simulation,
            cargo: [
              ...simulation.cargo,
              { species: simulation.fishing.reeling.species },
            ],
            mode: "cruising",
            fishing: null,
          }
        : simulation;
      this.drawQuestFollowArrows(surfaceSimulation, camera, width, surfaceY, settings, surfaceBlend);
      this.drawObjective(surfaceSimulation, camera, width, height, settings, surfaceBlend);
    }

    context.save();
    context.strokeStyle = settings.highContrast ? "rgba(255, 255, 255, 0.88)" : "rgba(244, 230, 197, 0.72)";
    context.lineWidth = settings.highContrast ? 3 : 2;
    context.beginPath();
    context.moveTo(0, surfaceY);
    const motion = settings.reducedMotion ? 0 : Math.sin(simulation.elapsed * 2.6) * 3;
    context.bezierCurveTo(width * 0.26, surfaceY - 3 + motion, width * 0.7, surfaceY + 4 - motion, width, surfaceY);
    context.stroke();
    context.restore();
  }

  private drawFishingLineLimit(depthLine: number, width: number, height: number, highContrast: boolean): void {
    const art = this.art;
    if (!art) return;
    const { context } = this;
    context.save();
    context.strokeStyle = highContrast ? "rgba(255, 246, 216, 0.9)" : "rgba(232, 164, 77, 0.52)";
    context.lineWidth = highContrast ? 2 : 1;
    context.beginPath();
    context.moveTo(0, depthLine);
    context.lineTo(width, depthLine);
    context.stroke();
    for (const ratio of [0.14, 0.38, 0.62, 0.86]) {
      const x = width * ratio;
      const floatSize = clamp(height * 0.052, 38, 50);
      context.drawImage(
        art.lineLimitFloat,
        x - floatSize / 2,
        depthLine - floatSize / 2,
        floatSize,
        floatSize,
      );
    }
    context.fillStyle = highContrast ? "#fff6d8" : "#f4e6c5";
    context.shadowColor = "rgba(2, 10, 18, 0.9)";
    context.shadowBlur = 7;
    context.font = `900 ${clamp(height * 0.015, 10, 14)}px system-ui, sans-serif`;
    context.textAlign = "right";
    context.textBaseline = "top";
    const labelY = height < 520 ? depthLine - 24 : depthLine + 17;
    context.fillText(height < 520 ? "UPGRADE LINE" : "UPGRADE LINE TO GO DEEPER", width - 24, labelY);
    context.restore();
  }

  private drawFishingControlCue(width: number, height: number, highContrast: boolean): void {
    if (width < 900 || height < 520) return;
    const { context } = this;
    const x = 34;
    const y = height - 42;
    context.save();
    context.fillStyle = highContrast ? "#ffffff" : "#f4e6c5";
    context.strokeStyle = highContrast ? "#ffffff" : "rgba(244, 230, 197, 0.78)";
    context.lineWidth = 1;
    context.font = "900 13px system-ui, sans-serif";
    context.textBaseline = "middle";
    const movementKeys = ["W", "A", "S", "D"];
    for (const [index, key] of movementKeys.entries()) {
      const keyX = x + index * 28;
      context.strokeRect(keyX, y - 12, 22, 22);
      context.textAlign = "center";
      context.fillText(key, keyX + 11, y - 1);
    }
    context.textAlign = "left";
    context.fillText("MOVE HOOK", x + movementKeys.length * 28 + 11, y - 1);
    context.restore();
  }

  private drawImageCover(
    image: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const sourceAspect = image.naturalWidth / image.naturalHeight;
    const targetAspect = width / height;
    let sourceWidth = image.naturalWidth;
    let sourceHeight = image.naturalHeight;
    let sourceX = 0;
    let sourceY = 0;
    if (sourceAspect > targetAspect) {
      sourceWidth = image.naturalHeight * targetAspect;
      sourceX = (image.naturalWidth - sourceWidth) / 2;
    } else {
      sourceHeight = image.naturalWidth / targetAspect;
      sourceY = (image.naturalHeight - sourceHeight) / 2;
    }
    this.context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  }

  private drawPanorama(
    image: HTMLImageElement,
    camera: SideScrollCamera,
    width: number,
    height: number,
    authoredWaterlineRatio: number,
  ): number {
    const layout = calculatePanoramaLayout({
      imageWidth: image.naturalWidth,
      imageHeight: image.naturalHeight,
      camera,
      viewportWidth: width,
      viewportHeight: height,
      authoredWaterlineRatio,
    });
    this.context.drawImage(
      image,
      layout.sourceX,
      layout.sourceY,
      layout.sourceWidth,
      layout.sourceHeight,
      0,
      0,
      width,
      height,
    );
    return layout.waterline;
  }

  private drawBoat(
    simulation: Simulation,
    camera: SideScrollCamera,
    width: number,
    height: number,
    waterline: number,
    surfaceLayer: HTMLCanvasElement,
    settings: RenderSettings,
    motionDelta: number,
  ): void {
    const art = this.art;
    if (!art) return;
    const { context } = this;
    const x = worldToScreenX(simulation.boat.x, camera, width);
    const boatScale = 1 + simulation.progress.upgrades.cargo * 0.055;
    const cameraScale = BALANCE.cameraViewWidth / camera.viewWidth;
    const boatWidth = clamp(this.canvas.clientHeight * 0.421 * boatScale, 172, 412) * cameraScale;
    this.canvas.dataset.surfaceBoatWidth = boatWidth.toFixed(2);
    const boatHeight = boatWidth * (art.boat.height / art.boat.width);
    const speedRatio = Math.min(1, Math.abs(simulation.boat.speed) / BALANCE.maxSurfaceSpeed);
    const steamSpeedRatio = Math.min(1, Math.abs(this.surfaceSteamVelocity) / BALANCE.maxSurfaceSpeed);
    const bob = settings.reducedMotion ? 0 : Math.sin(simulation.elapsed * (2 + speedRatio)) * (1.1 + speedRatio * 0.8);
    const tilt = settings.reducedMotion ? 0 : clamp(simulation.boat.speed * 0.16, -0.02, 0.02);
    const boatLift = clamp(boatHeight * 0.04, 4, 9);
    const boatY = waterline + bob - boatLift;
    const stackLocalX = boatWidth * BOAT_STACK_ANCHOR_X;
    const stackLocalY = boatHeight * BOAT_STACK_ANCHOR_Y;
    const targetStackOffsetX = simulation.boat.facing
      * (Math.cos(tilt) * stackLocalX - Math.sin(tilt) * stackLocalY);
    this.surfaceSteamStackOffsetX = settings.reducedMotion || this.surfaceSteamStackOffsetX === null
      ? targetStackOffsetX
      : dampMotionValue(this.surfaceSteamStackOffsetX, targetStackOffsetX, motionDelta, 5);
    const stackX = x + this.surfaceSteamStackOffsetX;
    const stackY = boatY + Math.sin(tilt) * stackLocalX + Math.cos(tilt) * stackLocalY;
    const nightIntensity = nightVisualIntensity(simulation);
    const boatFilter = `brightness(${1 - nightIntensity * 0.18}) saturate(${1 - nightIntensity * 0.08})`;

    this.drawBoostTrail(simulation, x, waterline + bob, boatWidth, settings);

    context.save();
    context.filter = boatFilter;
    this.drawBoatSteam(
      art.boatSteam,
      boatWidth,
      stackX,
      stackY,
      steamSpeedRatio,
      Math.sign(this.surfaceSteamVelocity),
      simulation.elapsed,
      settings,
    );
    context.restore();

    context.save();
    context.translate(x, boatY);
    context.scale(simulation.boat.facing, 1);
    context.rotate(tilt);
    context.filter = boatFilter;
    context.drawImage(art.boat, -boatWidth / 2, -boatHeight * 0.86, boatWidth, boatHeight);
    context.restore();

    drawWaterContact(context, surfaceLayer, {
      centerX: x,
      waterline: waterline + bob,
      width: boatWidth + 18,
      viewportWidth: width,
      viewportHeight: height,
      elapsed: simulation.elapsed,
      reducedMotion: settings.reducedMotion,
      highContrast: settings.highContrast,
      seed: 1.3,
    });
  }

  private drawBoostTrail(
    simulation: Simulation,
    boatX: number,
    waterline: number,
    boatWidth: number,
    settings: RenderSettings,
  ): void {
    if (!simulation.boost.active) return;
    const direction = simulation.boat.facing;
    const pulse = settings.reducedMotion ? 0 : (simulation.elapsed * 3.7) % 1;
    const trailOrigin = boatX - direction * boatWidth * 0.42;
    this.context.save();
    this.context.globalCompositeOperation = "screen";
    this.context.lineCap = "round";
    for (let index = 0; index < 4; index += 1) {
      const offset = ((index / 4 + pulse) % 1) * boatWidth * 0.35;
      const startX = trailOrigin - direction * offset;
      const length = boatWidth * (0.13 + index * 0.025);
      this.context.beginPath();
      this.context.moveTo(startX, waterline + 5 + index * 4);
      this.context.lineTo(startX - direction * length, waterline + 7 + index * 5);
      this.context.strokeStyle = index % 2 === 0 ? "rgb(255 190 86 / 62%)" : "rgb(134 224 231 / 48%)";
      this.context.lineWidth = Math.max(1.5, boatWidth * 0.008 - index * 0.35);
      this.context.stroke();
    }
    this.context.restore();
  }

  private drawBoatSteam(
    atlas: HTMLImageElement,
    boatWidth: number,
    stackX: number,
    stackY: number,
    speedRatio: number,
    movementDirection: number,
    elapsed: number,
    settings: RenderSettings,
  ): void {
    const columns = 4;
    const rows = 2;
    const cellWidth = atlas.naturalWidth / columns;
    const cellHeight = atlas.naturalHeight / rows;
    const puffs = boatSteamPuffs(elapsed, speedRatio, movementDirection, settings.reducedMotion);

    this.context.save();
    this.context.globalCompositeOperation = "screen";
    for (const puff of puffs) {
      const column = puff.spriteIndex % columns;
      const row = Math.floor(puff.spriteIndex / columns);
      const size = puff.radius * boatWidth * 2.7;
      const drawWidth = size * puff.stretchX;
      const drawHeight = size * puff.stretchY;

      this.context.save();
      this.context.translate(stackX + puff.x * boatWidth, stackY + puff.y * boatWidth);
      this.context.rotate(puff.rotation);
      this.context.globalAlpha = puff.opacity * (settings.highContrast ? 1.12 : 1);
      this.context.drawImage(
        atlas,
        column * cellWidth,
        row * cellHeight,
        cellWidth,
        cellHeight,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight,
      );
      this.context.restore();
    }
    this.context.restore();
  }

  private drawQuestFollowArrows(
    simulation: Simulation,
    camera: SideScrollCamera,
    width: number,
    waterline: number,
    settings: RenderSettings,
    opacityMultiplier: number,
  ): void {
    if (opacityMultiplier <= 0) return;
    const arrows = questFollowArrows(simulation);
    this.canvas.dataset.questFollow = String(arrows.length);
    if (arrows.length === 0) return;
    for (const arrow of arrows) {
      const x = worldToScreenX(arrow.x, camera, width);
      if (!isNearScreen(x, width, 40)) continue;
      this.drawGlowingFollowArrow(x, waterline - 54, arrow, simulation.elapsed, settings, opacityMultiplier);
    }
  }

  private drawGlowingFollowArrow(
    x: number,
    y: number,
    arrow: QuestFollowArrow,
    elapsed: number,
    settings: RenderSettings,
    opacity: number,
  ): void {
    const pulse = settings.reducedMotion ? 0.55 : (Math.sin(elapsed * 4.2 + arrow.x * 36) + 1) / 2;
    const slide = settings.reducedMotion ? 0 : (Math.sin(elapsed * 4.4) + 1) / 2 * 12;
    const { context } = this;
    context.save();
    context.translate(x + arrow.direction * (10 + slide), y);
    context.scale(arrow.direction, 1);
    context.globalAlpha = opacity * (0.55 + pulse * 0.45);
    context.shadowColor = settings.highContrast ? "#fff4cf" : "#f1ac50";
    context.shadowBlur = 18 + pulse * 10;
    context.strokeStyle = settings.highContrast ? "#ffffff" : "#ffe08a";
    context.lineWidth = 7;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(-16, 0);
    context.lineTo(14, 0);
    context.moveTo(2, -12);
    context.lineTo(16, 0);
    context.lineTo(2, 12);
    context.stroke();
    context.shadowBlur = 0;
    context.globalAlpha = opacity;
    context.strokeStyle = settings.highContrast ? "#fff8e6" : "#f7f1e3";
    context.lineWidth = 3.5;
    context.beginPath();
    context.moveTo(-16, 0);
    context.lineTo(14, 0);
    context.moveTo(2, -12);
    context.lineTo(16, 0);
    context.lineTo(2, 12);
    context.stroke();
    context.restore();
  }

  private drawQuestHookGuide(
    simulation: Simulation,
    fishing: NonNullable<Simulation["fishing"]>,
    hook: WorldPoint,
    width: number,
    layout: FishingViewLayout,
    maximumDepth: number,
    settings: RenderSettings,
  ): void {
    const targetIndex = questHookTargetIndex(simulation);
    this.canvas.dataset.questHookFollow = targetIndex === null ? "0" : "1";
    if (targetIndex === null) return;
    const target = fishing.targets[targetIndex];
    if (!target) return;
    const point = fishingPointToScreen(target, width, layout, maximumDepth);
    const pose = fishingFishPose(target.species, simulation.elapsed, target.phase, settings.reducedMotion);
    const to = {
      x: point.x,
      y: point.y + pose.verticalOffsetRatio * layout.underwaterHeight,
    };
    const dx = to.x - hook.x;
    const dy = to.y - hook.y;
    const length = Math.hypot(dx, dy);
    if (length < 28) return;
    const nx = dx / length;
    const ny = dy / length;
    const start = { x: hook.x + nx * 18, y: hook.y + ny * 18 };
    const tip = { x: hook.x + nx * (length * 0.72), y: hook.y + ny * (length * 0.72) };
    const pulse = settings.reducedMotion ? 0.5 : (Math.sin(simulation.elapsed * 5.2) + 1) / 2;
    const { context } = this;
    context.save();
    context.globalAlpha = 0.45 + pulse * 0.4;
    context.shadowColor = settings.highContrast ? "#fff4cf" : "#f1ac50";
    context.shadowBlur = 16 + pulse * 8;
    context.strokeStyle = settings.highContrast ? "#ffffff" : "#ffe08a";
    context.lineWidth = 6;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(tip.x, tip.y);
    context.stroke();
    const head = 14;
    const px = -ny;
    const py = nx;
    context.beginPath();
    context.moveTo(tip.x + px * 9 - nx * 2, tip.y + py * 9 - ny * 2);
    context.lineTo(tip.x + nx * head, tip.y + ny * head);
    context.lineTo(tip.x - px * 9 - nx * 2, tip.y - py * 9 - ny * 2);
    context.stroke();
    context.shadowBlur = 0;
    context.globalAlpha = 1;
    context.strokeStyle = settings.highContrast ? "#fff8e6" : "#f7f1e3";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(tip.x, tip.y);
    context.moveTo(tip.x + px * 9 - nx * 2, tip.y + py * 9 - ny * 2);
    context.lineTo(tip.x + nx * head, tip.y + ny * head);
    context.lineTo(tip.x - px * 9 - nx * 2, tip.y - py * 9 - ny * 2);
    context.stroke();
    context.restore();
  }

  private drawObjective(
    simulation: Simulation,
    camera: SideScrollCamera,
    width: number,
    height: number,
    settings: RenderSettings,
    opacityMultiplier: number,
  ): void {
    if (opacityMultiplier <= 0) return;
    const goal = navigationGuidance(simulation);
    if (!goal) return;
    const distance = Math.abs(goal.point.x - simulation.boat.x);
    const opacity = objectiveIndicatorOpacity(distance, BALANCE.fishingRadius);
    if (opacity <= 0) return;
    const x = worldToScreenX(goal.point.x, camera, width);
    const { context } = this;
    context.save();
    context.globalAlpha = opacity * opacityMultiplier;
    context.font = '700 16px "Avenir Next Condensed", "Arial Narrow", sans-serif';
    const layout = objectiveIndicatorLayout(x, width, height, context.measureText(goal.label.toUpperCase()).width);
    const pulse = settings.reducedMotion ? 0 : (Math.sin(simulation.elapsed * 3.2) + 1) / 2;

    context.shadowColor = "rgba(2, 12, 17, 0.55)";
    context.shadowBlur = 12;
    context.shadowOffsetY = 3;
    context.fillStyle = settings.highContrast ? "rgba(1, 12, 17, 0.98)" : "rgba(8, 29, 35, 0.92)";
    context.strokeStyle = settings.highContrast ? "#fff4cf" : "#e9b65f";
    context.lineWidth = settings.highContrast ? 4 : 3;
    context.beginPath();
    context.roundRect(layout.panelX, layout.panelY, layout.panelWidth, layout.panelHeight, 32);
    context.fill();
    context.stroke();

    context.shadowColor = "transparent";
    context.globalAlpha = opacity * opacityMultiplier * (0.18 + pulse * 0.18);
    context.strokeStyle = "#ffd67d";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(layout.markerX, layout.markerY, 28 + pulse * 3, 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = opacity * opacityMultiplier;

    context.fillStyle = settings.highContrast ? "#f6a83f" : "#d77f2f";
    context.strokeStyle = "#fff1c7";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(layout.markerX, layout.markerY, 25, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    this.drawObjectiveArrow(layout.markerX, layout.markerY, layout.direction);

    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#e9b65f";
    context.font = '700 10px "Avenir Next Condensed", "Arial Narrow", sans-serif';
    context.fillText(goal.kicker, layout.textCenterX, layout.markerY - 10);
    context.fillStyle = "#fff4cf";
    context.font = '700 16px "Avenir Next Condensed", "Arial Narrow", sans-serif';
    context.fillText(goal.label.toUpperCase(), layout.textCenterX, layout.markerY + 9);
    context.restore();
  }

  private drawObjectiveArrow(x: number, y: number, direction: ObjectiveIndicatorDirection): void {
    const vector = direction === "left"
      ? { x: -1, y: 0 }
      : direction === "right"
        ? { x: 1, y: 0 }
        : { x: 0, y: 1 };
    const perpendicular = { x: -vector.y, y: vector.x };
    const tip = { x: x + vector.x * 13, y: y + vector.y * 13 };
    const tail = { x: x - vector.x * 10, y: y - vector.y * 10 };
    const headBase = { x: tip.x - vector.x * 10, y: tip.y - vector.y * 10 };
    const { context } = this;

    context.strokeStyle = "#fff4cf";
    context.lineWidth = 6;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(tail.x, tail.y);
    context.lineTo(tip.x, tip.y);
    context.moveTo(headBase.x + perpendicular.x * 8, headBase.y + perpendicular.y * 8);
    context.lineTo(tip.x, tip.y);
    context.lineTo(headBase.x - perpendicular.x * 8, headBase.y - perpendicular.y * 8);
    context.stroke();
  }

  private drawWeather(
    simulation: Simulation,
    camera: SideScrollCamera,
    width: number,
    height: number,
    settings: RenderSettings,
  ): void {
    const nightIntensity = nightVisualIntensity(simulation);
    if (nightIntensity <= 0) return;
    const boatX = worldToScreenX(simulation.boat.x, camera, width);
    const radius = Math.min(width, height) * 0.25;
    const darkness = settings.highContrast ? 0.58 : 0.76;
    const vignette = this.context.createRadialGradient(
      boatX,
      height * 0.58,
      radius * 0.35,
      boatX,
      height * 0.58,
      radius * 2.2,
    );
    vignette.addColorStop(0, "rgba(2, 8, 16, 0.02)");
    vignette.addColorStop(0.45, "rgba(2, 8, 16, 0.2)");
    vignette.addColorStop(1, `rgba(2, 8, 16, ${darkness})`);
    this.context.save();
    this.context.globalAlpha = nightIntensity;
    this.context.fillStyle = vignette;
    this.context.fillRect(0, 0, width, height);
    this.context.restore();

    const threatPhase = settings.reducedMotion ? 0.5 : (Math.sin(simulation.elapsed * 0.43) + 1) / 2;
    this.context.save();
    this.context.globalAlpha = (0.06 + threatPhase * 0.08) * nightIntensity;
    this.drawWorldCell(2, 1, width * (0.74 + threatPhase * 0.09), height * 0.67, 190, 120);
    this.context.restore();
  }

  private drawFish(
    species: FishSpecies,
    animationFrame: number,
    point: WorldPoint,
    direction: -1 | 1,
    width: number,
    height: number,
    highContrast: boolean,
  ): void {
    const { fishWidth, fishHeight } = this.fishDimensions(species, width, height);
    this.context.save();
    this.context.translate(point.x, point.y);
    this.context.scale(direction, 1);
    this.drawFishCell(species, animationFrame, 0, 0, fishWidth, fishHeight);
    this.context.restore();
    if (highContrast) {
      this.context.save();
      this.context.globalCompositeOperation = "screen";
      this.context.globalAlpha = 0.12;
      this.context.fillStyle = "#ffffff";
      this.context.beginPath();
      this.context.ellipse(point.x, point.y, fishWidth * 0.46, fishHeight * 0.38, 0, 0, Math.PI * 2);
      this.context.fill();
      this.context.restore();
    }
  }

  private drawFishOutline(
    species: FishSpecies,
    animationFrame: number,
    point: WorldPoint,
    direction: -1 | 1,
    width: number,
    height: number,
    highContrast: boolean,
  ): void {
    const art = this.art;
    if (!art) return;
    const fish = FISH[species];
    const { fishWidth, fishHeight } = this.fishDimensions(species, width, height);
    const spriteCell = FISH_SPRITE_CELLS[species];
    const outlineAtlas = art.fishOutlines[fish.rarity][spriteCell.sheet];
    const offset = highContrast ? 2.25 : 1;
    const { context } = this;
    context.save();
    context.globalAlpha *= highContrast ? 0.88 : 0.62;
    context.translate(point.x, point.y);
    context.scale(direction, 1);
    for (const [offsetX, offsetY] of [
      [-offset, 0],
      [offset, 0],
      [0, -offset],
      [0, offset],
      [-offset * 0.72, -offset * 0.72],
      [offset * 0.72, -offset * 0.72],
      [-offset * 0.72, offset * 0.72],
      [offset * 0.72, offset * 0.72],
    ] as const) {
      this.drawFishAtlasCell(
        outlineAtlas,
        animationFrame,
        spriteCell.row,
        FISH_SHEET_ROWS[spriteCell.sheet],
        offsetX,
        offsetY,
        fishWidth,
        fishHeight,
      );
    }
    context.restore();
  }

  private drawFishingTargetChevron(
    point: WorldPoint,
    species: FishSpecies,
    width: number,
    height: number,
    settings: RenderSettings,
    elapsed: number,
    questGlow: boolean,
  ): void {
    const { fishHeight } = this.fishDimensions(species, width, height);
    const { context } = this;
    const y = point.y + fishHeight * 0.46;
    const size = clamp(Math.min(width, height) * 0.016, 10, 15);
    const pulse = settings.reducedMotion || !questGlow ? 0 : (Math.sin(elapsed * 5.2) + 1) / 2;
    context.save();
    if (questGlow) {
      context.shadowColor = settings.highContrast ? "#fff4cf" : "#f1ac50";
      context.shadowBlur = 14 + pulse * 10;
      context.strokeStyle = settings.highContrast ? "#ffffff" : "rgba(241, 172, 80, 0.55)";
      context.lineWidth = 8;
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(point.x - size, y);
      context.lineTo(point.x, y + size * 0.7);
      context.lineTo(point.x + size, y);
      context.stroke();
    }
    context.strokeStyle = settings.highContrast ? "#ffffff" : "#e8a44d";
    context.lineWidth = settings.highContrast ? 4 : 3;
    context.lineCap = "round";
    context.shadowColor = "rgba(2, 10, 18, 0.82)";
    context.shadowBlur = questGlow ? 10 : 5;
    context.beginPath();
    context.moveTo(point.x - size, y);
    context.lineTo(point.x, y + size * 0.7);
    context.lineTo(point.x + size, y);
    context.stroke();
    context.restore();
  }

  private drawFishingTargetGuide(
    species: FishSpecies,
    width: number,
    height: number,
    highContrast: boolean,
    surfaceY: number,
  ): void {
    const { context } = this;
    const guideWidth = clamp(width * 0.22, 190, 300);
    const guideX = width - guideWidth - clamp(width * 0.035, 20, 48);
    const guideY = Math.max(18, Math.min(surfaceY * 0.14, 42));
    const portraitWidth = clamp(guideWidth * 0.56, 110, 160);
    const portraitHeight = portraitWidth * 0.58;
    const portrait = containedSpriteSize(portraitWidth, portraitHeight, this.fishCellAspect(species));

    context.save();
    context.shadowColor = "rgba(2, 10, 18, 0.86)";
    context.shadowBlur = 9;
    this.drawFishCell(
      species,
      0,
      guideX + guideWidth / 2,
      guideY + portraitHeight / 2,
      portrait.width,
      portrait.height,
    );

    const textY = guideY + portraitHeight + 8;
    context.textAlign = "center";
    context.textBaseline = "alphabetic";
    context.fillStyle = highContrast ? "#ffffff" : "#f4e6c5";
    context.font = `900 ${clamp(height * 0.022, 14, 21)}px system-ui, sans-serif`;
    context.fillText(fishShortName(species), guideX + guideWidth / 2, textY + 15);
    context.restore();
  }

  private fishDimensions(species: FishSpecies, width: number, height: number): { fishWidth: number; fishHeight: number } {
    const fish = FISH[species];
    const scale = clamp(Math.min(width, height) * 0.105, 54, 92) * fish.scale * FISH_DRAW_SIZE[species];
    return fishSpriteDestination(scale, this.fishCellAspect(species));
  }

  private fishCellAspect(species: FishSpecies): number {
    const art = this.art;
    if (!art) return 1;
    const sheet = FISH_SPRITE_CELLS[species].sheet;
    const atlas = art.fish[sheet];
    return fishAtlasCellAspect(atlas.width, atlas.height, FISH_SHEET_ROWS[sheet]);
  }

  private drawFishCell(species: FishSpecies, animationFrame: number, x: number, y: number, width: number, height: number): void {
    const art = this.art;
    if (!art) return;
    const spriteCell = FISH_SPRITE_CELLS[species];
    this.drawFishAtlasCell(
      art.fish[spriteCell.sheet],
      animationFrame,
      spriteCell.row,
      FISH_SHEET_ROWS[spriteCell.sheet],
      x,
      y,
      width,
      height,
    );
  }

  private drawFishAtlasCell(
    atlas: HTMLCanvasElement,
    column: number,
    row: number,
    rowCount: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const sourceWidth = atlas.width / 4;
    const sourceHeight = atlas.height / rowCount;
    this.context.drawImage(
      atlas,
      column * sourceWidth,
      row * sourceHeight,
      sourceWidth,
      sourceHeight,
      x - width / 2,
      y - height / 2,
      width,
      height,
    );
  }

  private drawSurfaceFishingCueCell(column: number, row: number, x: number, y: number, width: number, height: number): void {
    const art = this.art;
    if (!art) return;
    const sourceWidth = art.fishingCues.width / 4;
    const sourceHeight = art.fishingCues.height / 2;
    this.context.drawImage(
      art.fishingCues,
      column * sourceWidth,
      row * sourceHeight,
      sourceWidth,
      sourceHeight,
      x - width / 2,
      y - height / 2,
      width,
      height,
    );
  }

  private drawTackleCell(column: number, row: number, x: number, y: number, width: number, height: number): void {
    const art = this.art;
    if (!art) return;
    const sourceWidth = art.tackle.width / 2;
    const sourceHeight = art.tackle.height / 2;
    this.context.drawImage(
      art.tackle,
      column * sourceWidth,
      row * sourceHeight,
      sourceWidth,
      sourceHeight,
      x - width / 2,
      y - height / 2,
      width,
      height,
    );
  }

  private drawWorldCell(column: number, row: number, x: number, y: number, width: number, height: number): void {
    const art = this.art;
    if (!art) return;
    const sourceWidth = art.world.width / 3;
    const sourceHeight = art.world.height / 2;
    this.context.drawImage(
      art.world,
      column * sourceWidth,
      row * sourceHeight,
      sourceWidth,
      sourceHeight,
      x - width / 2,
      y - height / 2,
      width,
      height,
    );
  }

  private updateSurfaceMotion(simulation: Simulation, cinematic: boolean, reducedMotion: boolean): number {
    const reset = this.surfaceMotionElapsed === null || simulation.elapsed < this.surfaceMotionElapsed;
    const deltaSeconds = reset ? 0 : Math.max(0, simulation.elapsed - this.surfaceMotionElapsed!);
    const direct = reset || cinematic || reducedMotion;

    this.surfaceCameraVelocity = direct
      ? simulation.boat.speed
      : dampMotionValue(this.surfaceCameraVelocity, simulation.boat.speed, deltaSeconds, 2.8);
    this.surfaceSteamVelocity = direct
      ? simulation.boat.speed
      : dampMotionValue(this.surfaceSteamVelocity, simulation.boat.speed, deltaSeconds, 2.2);
    this.surfaceMotionElapsed = simulation.elapsed;
    return deltaSeconds;
  }

  private camera(
    simulation: Simulation,
    cinematic: boolean,
    reducedMotion: boolean,
    deltaSeconds: number,
  ): SideScrollCamera {
    const gameplayViewWidth = simulation.boost.active && !reducedMotion
      ? BALANCE.cameraViewWidth * BALANCE.boostCameraViewMultiplier
      : BALANCE.cameraViewWidth;
    if (!cinematic) {
      this.surfaceCameraViewWidth = reducedMotion
        ? gameplayViewWidth
        : dampMotionValue(
          this.surfaceCameraViewWidth,
          gameplayViewWidth,
          deltaSeconds,
          BALANCE.boostCameraPullRate,
        );
    }
    const target = createSideScrollCamera({
      focusX: simulation.boat.x,
      velocityX: cinematic ? 0 : this.surfaceCameraVelocity,
      viewWidth: cinematic ? 0.54 : this.surfaceCameraViewWidth,
      lookAheadTime: 0.24,
    });
    const enteringGameplay = this.surfaceCameraWasCinematic && !cinematic;
    const camera = cinematic || enteringGameplay || reducedMotion || this.surfaceCameraCenter === null
      ? target
      : dampSideScrollCamera(this.surfaceCameraCenter, target, deltaSeconds, 3.2);

    this.surfaceCameraCenter = camera.center;
    this.surfaceCameraWasCinematic = cinematic;
    return camera;
  }

  private resize(): void {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(this.canvas.clientWidth * ratio);
    const height = Math.round(this.canvas.clientHeight * ratio);
    if (this.canvas.width === width && this.canvas.height === height) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
}

function loadImage(source: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = "async";
  return new Promise<HTMLImageElement>((resolve, reject) => {
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", () => reject(new Error(`Failed to load runtime art: ${source}`)), { once: true });
    image.src = source;
  });
}

function keyMagenta(image: HTMLImageElement, crop: boolean, softEdges = false): HTMLCanvasElement {
  const source = document.createElement("canvas");
  source.width = image.naturalWidth;
  source.height = image.naturalHeight;
  const context = source.getContext("2d", { willReadFrequently: true });
  if (!context) return source;
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, source.width, source.height);
  let left = source.width;
  let top = source.height;
  let right = 0;
  let bottom = 0;
  for (let index = 0; index < pixels.data.length; index += 4) {
    const red = pixels.data[index] ?? 0;
    const green = pixels.data[index + 1] ?? 0;
    const blue = pixels.data[index + 2] ?? 0;
    const magenta = red > 110
      && blue > 105
      && red > green * 1.28
      && blue > green * 1.22;
    if (magenta) {
      pixels.data[index + 3] = 0;
      continue;
    }
    if (softEdges && red > green * 1.05 && blue > green * 1.05) {
      const spill = Math.max(0, Math.min(red - green * 1.05, blue - green * 1.05));
      const alpha = clamp(1 - spill / 70, 0, 1);
      pixels.data[index] = Math.round(green + (red - green) * alpha);
      pixels.data[index + 2] = Math.round(green + (blue - green) * alpha);
      pixels.data[index + 3] = Math.round(alpha * 255);
      if (alpha < 0.03) continue;
    }
    const pixel = index / 4;
    const x = pixel % source.width;
    const y = Math.floor(pixel / source.width);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  context.putImageData(pixels, 0, 0);
  if (!crop || left > right || top > bottom) return source;
  const padding = 4;
  const cropLeft = Math.max(0, left - padding);
  const cropTop = Math.max(0, top - padding);
  const cropWidth = Math.min(source.width - cropLeft, right - left + padding * 2 + 1);
  const cropHeight = Math.min(source.height - cropTop, bottom - top + padding * 2 + 1);
  const output = document.createElement("canvas");
  output.width = cropWidth;
  output.height = cropHeight;
  output.getContext("2d")?.drawImage(source, cropLeft, cropTop, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  return output;
}

function tintAlpha(source: HTMLCanvasElement, colour: string): HTMLCanvasElement {
  const output = document.createElement("canvas");
  output.width = source.width;
  output.height = source.height;
  const context = output.getContext("2d");
  if (!context) return output;
  context.drawImage(source, 0, 0);
  context.globalCompositeOperation = "source-in";
  context.fillStyle = colour;
  context.fillRect(0, 0, output.width, output.height);
  context.globalCompositeOperation = "source-over";
  return output;
}


function fishingFightAriaLabel(
  spotName: string,
  fight: NonNullable<NonNullable<Simulation["fishing"]>["reeling"]>,
): string {
  const cue = fishingFightCue(fight);
  const tensionPercent = Math.round(fight.tension * 100);
  const tensionState = cue === "critical"
    ? "critical, release now"
    : fight.behaviour === "run"
      ? "the fish is racing away"
      : cue === "release"
        ? "high, release while it fights"
        : "safe";
  const action = cue === "landed"
    ? "Landing the catch."
    : fight.behaviour === "run" || cue === "critical" || cue === "release"
      ? "Release left click, touch, or the Reel key so the fish can run and the line can slacken."
      : "Hold left click, touch, or the Reel key while the fish is calm.";
  return `Fishing at ${spotName}. Fighting ${FISH[fight.species].name}. ${action} Reel progress ${Math.round(fight.progress * 100)} percent. Line tension ${tensionPercent} percent, ${tensionState}.`;
}

function fishShortName(species: FishSpecies): string {
  return FISH[species].name.toUpperCase();
}

function isNearScreen(x: number, width: number, margin: number): boolean {
  return x >= -margin && x <= width + margin;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
