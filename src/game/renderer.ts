import boatSteamAtlasUrl from "../assets/boat-steam-atlas.png";
import tackleAtlasUrl from "../assets/fish-atlas.png";
import fishAtlasUrl from "../assets/fish-atlas-v2.png";
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
  fishingPointToScreen,
  fishingViewLayout,
  type FishingViewLayout,
} from "./fishingPresentation";
import { surfaceFishingCue, surfaceFishPose, type SurfaceFishingCue } from "./fishingSpotEffects";
import { calculatePanoramaLayout } from "./panorama";
import {
  maxFishingDepth,
  nightVisualIntensity,
  objective,
  type Simulation,
} from "./simulation";
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
  pier: HTMLImageElement;
  boat: HTMLCanvasElement;
  fish: HTMLCanvasElement;
  fishOutlines: Record<FishRarity, HTMLCanvasElement>;
  fishingEnvironments: Record<SpotId, HTMLImageElement>;
  lineLimitFloat: HTMLImageElement;
  fishingCues: HTMLCanvasElement;
  polarizedLens: HTMLImageElement;
  tackle: HTMLCanvasElement;
  world: HTMLCanvasElement;
}

const SURFACE_FISH_CELLS = [
  [0, 0],
  [1, 0],
  [2, 0],
  [3, 0],
  [0, 1],
  [1, 1],
] as const;

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
  private surfaceMotionElapsed: number | null = null;
  private surfaceCameraVelocity = 0;
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
      loadImage(harborPierUrl),
      loadImage(playerBoatUrl),
      loadImage(fishAtlasUrl),
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
      pier,
      boat,
      fish,
      sunwardFishing,
      mosswaterFishing,
      gloamFishing,
      lineLimitFloat,
      fishingCues,
      polarizedLens,
      tackle,
      world,
    ]) => {
      const keyedFish = keyMagenta(fish, false);
      this.art = {
        boatSteam,
        lake,
        lakeNight,
        pier,
        boat: keyMagenta(boat, true),
        fish: keyedFish,
        fishOutlines: {
          common: tintAlpha(keyedFish, FISHING_RARITY_COLOURS.common),
          uncommon: tintAlpha(keyedFish, FISHING_RARITY_COLOURS.uncommon),
          rare: tintAlpha(keyedFish, FISHING_RARITY_COLOURS.rare),
          legendary: tintAlpha(keyedFish, FISHING_RARITY_COLOURS.legendary),
        },
        fishingEnvironments: {
          sunwardShoal: sunwardFishing,
          mosswaterPool: mosswaterFishing,
          outerGloam: gloamFishing,
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
    this.resize();
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.context.clearRect(0, 0, width, height);
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
      delete this.canvas.dataset.fishingSpot;
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
    const nightIntensity = nightVisualIntensity(simulation);
    const waterline = this.drawPanorama(nightIntensity >= 1 ? art.lakeNight : art.lake, camera, width, height);
    if (nightIntensity > 0 && nightIntensity < 1) {
      context.save();
      context.globalAlpha = nightIntensity;
      this.drawPanorama(art.lakeNight, camera, width, height);
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
        surfaceLayer,
        width,
        height,
        simulation.elapsed,
        settings,
      );
    }

    this.drawBoat(simulation, camera, width, height, waterline, surfaceLayer, settings, motionDelta);

    let activeFishingCue: { cue: SurfaceFishingCue; x: number } | null = null;
    for (const [spotIndex, spot] of FISHING_SPOTS.entries()) {
      const x = worldToScreenX(spot.x, camera, width);
      if (!isNearScreen(x, width, 260)) continue;
      const permitLocked = spot.requiresPermit && !simulation.progress.outerUnlocked;
      const depthLocked = spot.requiredDepthTier > simulation.progress.upgrades.line;
      const population = simulation.progress.populations[spot.species];
      const cue = surfaceFishingCue(simulation.boat.x, spot.x, BALANCE.fishingRadius, population);
      this.drawSurfaceFishingGround({
        spotIndex,
        cue,
        locked: permitLocked || depthLocked,
        x,
        waterline,
        width,
        height,
        elapsed: simulation.elapsed,
        reducedMotion: settings.reducedMotion,
        highContrast: settings.highContrast,
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
      );
      this.interactionAnchor = { x: activeFishingCue.x, y: hookY };
    }

    this.drawObjective(simulation, camera, width, height);
    this.drawWeather(simulation, camera, width, height, settings);

  }

  private drawHarborPier(
    x: number,
    waterline: number,
    fromRightShore: boolean,
    surfaceLayer: HTMLCanvasElement,
    viewportWidth: number,
    viewportHeight: number,
    elapsed: number,
    settings: RenderSettings,
  ): void {
    const art = this.art;
    if (!art) return;
    const pierWidth = clamp(this.canvas.clientHeight * 0.53, 300, 495);
    const pierHeight = pierWidth * (art.pier.naturalHeight / art.pier.naturalWidth);
    const deckTop = waterline - 32;
    const pierLift = clamp(pierHeight * 0.04, 4, 9);
    const drawY = deckTop - pierHeight * 0.43 - pierLift;
    const outboardOverlap = 24;
    const pierCenter = fromRightShore
      ? x - outboardOverlap + pierWidth / 2
      : x + outboardOverlap - pierWidth / 2;

    this.context.save();
    if (fromRightShore) {
      this.context.translate(x - outboardOverlap, 0);
      this.context.scale(-1, 1);
      this.context.drawImage(art.pier, -pierWidth, drawY, pierWidth, pierHeight);
    } else {
      this.context.drawImage(art.pier, x + outboardOverlap - pierWidth, drawY, pierWidth, pierHeight);
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
  }): void {
    const { context } = this;
    const shoalWidth = clamp(options.height * 0.55, 250, 480);
    const shoalDepth = clamp((options.height - options.waterline) * 0.82, 130, 290);
    const lensStrength = options.cue.lensVisibility * (options.locked ? 0.62 : 1);

    if (lensStrength > 0.01) {
      const art = this.art;
      if (!art) return;
      const lensWidth = shoalWidth * 1.04;
      const lensHeight = Math.min(options.height - options.waterline + 28, shoalDepth * 1.32);
      context.save();
      context.globalCompositeOperation = "screen";
      context.globalAlpha = lensStrength * (options.highContrast ? 0.96 : 0.84);
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
      context.globalAlpha = options.cue.fishVisibility
        * (options.locked ? 0.58 : 1)
        * (options.highContrast ? 1.28 : 1);
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
  ): void {
    const { context } = this;
    const pulse = settings.reducedMotion ? 0 : Math.sin(elapsed * 4) * 2;
    const radius = (clamp(this.canvas.clientHeight * 0.042, 22, 34) + pulse) * SURFACE_HOOK_SCALE;
    const cueWidth = radius * 2.3;

    context.save();
    context.globalAlpha = visibility;
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
    const targetSpecies = simulation.activeContract?.spot === spot.id
      ? simulation.activeContract.species
      : spot.species;
    const maximumDepth = maxFishingDepth(simulation);
    const diveProgress = fishingDiveProgress(simulation.elapsed, fishing.startedAt, settings.reducedMotion);
    const layout = fishingViewLayout(height, simulation.progress.upgrades.line, diveProgress);
    this.canvas.dataset.fishingDiveProgress = diveProgress.toFixed(3);
    this.canvas.dataset.fishingSpot = spot.id;
    this.canvas.dataset.targetRarity = FISH[targetSpecies].rarity;
    this.canvas.setAttribute(
      "aria-label",
      `Fishing at ${spot.name}. Target ${FISH[targetSpecies].name}, ${FISH[targetSpecies].rarity} rarity.`,
    );
    this.drawFishingEnvironment(art.fishingEnvironments[spot.id], layout, width, height, settings.highContrast);
    this.drawFishingSurfaceBand(simulation, settings, width, height, layout.surfaceY);

    const gameplayVisibility = clamp((diveProgress - 0.24) / 0.54, 0, 1);
    context.save();
    context.globalAlpha = gameplayVisibility;
    const depthLine = layout.lineLimitY;
    if (maximumDepth < 0.93) {
      context.fillStyle = "rgba(3, 12, 21, 0.2)";
      context.fillRect(0, depthLine, width, height - depthLine);
      this.drawFishingLineLimit(depthLine, width, height, settings.highContrast);
    }

    for (const target of fishing.targets) {
      const point = fishingPointToScreen(target, width, layout, maximumDepth);
      const pose = fishingFishPose(target.species, simulation.elapsed, target.phase, settings.reducedMotion);
      const animatedPoint = {
        x: point.x,
        y: point.y + pose.verticalOffsetRatio * layout.underwaterHeight,
      };
      const reachable = FISH[target.species].depthTier <= simulation.progress.upgrades.line;
      context.save();
      context.globalAlpha = reachable ? 1 : 0.3;
      context.translate(animatedPoint.x, animatedPoint.y);
      context.rotate(pose.rotation * target.direction);
      context.scale(pose.scaleX, pose.scaleY);
      if (target.species === targetSpecies) {
        this.drawFishOutline(target.species, { x: 0, y: 0 }, target.direction, width, height, settings.highContrast);
      }
      this.drawFish(target.species, { x: 0, y: 0 }, target.direction, width, height, settings.highContrast);
      context.restore();
      if (target.species === targetSpecies) {
        this.drawFishingTargetChevron(animatedPoint, target.species, width, height, settings.highContrast);
      }
    }

    const hook = fishingPointToScreen(fishing.hook, width, layout, maximumDepth);
    context.strokeStyle = settings.highContrast ? "#ffffff" : "#f4e2b9";
    context.lineWidth = settings.highContrast ? 3 : 2;
    context.beginPath();
    context.moveTo(width * 0.5, layout.surfaceY - 2);
    context.lineTo(hook.x, hook.y);
    context.stroke();
    const hookSize = clamp(Math.min(width, height) * 0.076, 46, 68);
    this.drawTackleCell(1, 1, hook.x, hook.y, hookSize, hookSize);

    this.drawFishingTargetGuide(targetSpecies, width, height, settings.highContrast, layout.surfaceY);
    this.drawFishingControlCue(width, height, settings.highContrast);
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
  ): void {
    const art = this.art;
    if (!art) return;
    const { context } = this;
    const motionDelta = this.updateSurfaceMotion(simulation, false, settings.reducedMotion);
    const camera = this.camera(simulation, false, settings.reducedMotion, motionDelta);
    const nightIntensity = nightVisualIntensity(simulation);
    const drawSurfaceImage = (image: HTMLImageElement, alpha: number): void => {
      const panorama = calculatePanoramaLayout({
        imageWidth: image.naturalWidth,
        imageHeight: image.naturalHeight,
        camera,
        viewportWidth: width,
        viewportHeight: height,
      });
      context.save();
      context.beginPath();
      context.rect(0, 0, width, surfaceY + 3);
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
    drawSurfaceImage(art.lake, 1);
    if (nightIntensity > 0) drawSurfaceImage(art.lakeNight, nightIntensity);

    context.save();
    context.beginPath();
    context.rect(0, 0, width, surfaceY);
    context.clip();
    context.globalAlpha = settings.highContrast ? 0.06 : 0.08;
    context.fillStyle = regionSurfaceTintAt(simulation.boat.x);
    context.fillRect(0, 0, width, surfaceY);
    context.restore();

    const surfaceLayer = captureSurfaceLayer(this.canvas, this.surfaceLayer);
    this.drawBoat(simulation, camera, width, height, surfaceY, surfaceLayer, settings, motionDelta);
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
    for (const [index, key] of ["W", "S"].entries()) {
      const keyX = x + index * 28;
      context.strokeRect(keyX, y - 12, 22, 22);
      context.textAlign = "center";
      context.fillText(key, keyX + 11, y - 1);
    }
    context.textAlign = "left";
    context.fillText("MOVE HOOK", x + 67, y - 1);
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
  ): number {
    const layout = calculatePanoramaLayout({
      imageWidth: image.naturalWidth,
      imageHeight: image.naturalHeight,
      camera,
      viewportWidth: width,
      viewportHeight: height,
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
    const boatWidth = clamp(this.canvas.clientHeight * 0.421 * boatScale, 172, 412);
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

  private drawObjective(simulation: Simulation, camera: SideScrollCamera, width: number, height: number): void {
    const goal = objective(simulation);
    if (Math.abs(goal.point.x - simulation.boat.x) <= BALANCE.fishingRadius * 3.6) return;
    const x = worldToScreenX(goal.point.x, camera, width);
    const clampedX = clamp(x, 30, width - 30);
    const edge = x < 0 ? -1 : x > width ? 1 : 0;
    const y = height * 0.27;
    const { context } = this;
    context.save();
    context.translate(clampedX, y);
    context.fillStyle = "#e8a44d";
    context.beginPath();
    if (edge < 0) {
      context.moveTo(-12, 0);
      context.lineTo(8, -10);
      context.lineTo(8, 10);
    } else if (edge > 0) {
      context.moveTo(12, 0);
      context.lineTo(-8, -10);
      context.lineTo(-8, 10);
    } else {
      context.moveTo(0, 12);
      context.lineTo(-10, -8);
      context.lineTo(10, -8);
    }
    context.closePath();
    context.fill();
    context.restore();
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
    const lampTier = simulation.progress.upgrades.lamp;
    const radius = Math.min(width, height) * (0.25 + lampTier * 0.055);
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
    point: WorldPoint,
    direction: -1 | 1,
    width: number,
    height: number,
    highContrast: boolean,
  ): void {
    const fish = FISH[species];
    const [column, row] = fish.atlasCell;
    const { fishWidth, fishHeight } = this.fishDimensions(species, width, height);
    this.context.save();
    this.context.translate(point.x, point.y);
    this.context.scale(direction, 1);
    this.drawFishCell(column, row, 0, 0, fishWidth, fishHeight);
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
    point: WorldPoint,
    direction: -1 | 1,
    width: number,
    height: number,
    highContrast: boolean,
  ): void {
    const art = this.art;
    if (!art) return;
    const fish = FISH[species];
    const [column, row] = fish.atlasCell;
    const { fishWidth, fishHeight } = this.fishDimensions(species, width, height);
    const outlineAtlas = art.fishOutlines[fish.rarity];
    const offset = highContrast ? 4 : 3;
    const { context } = this;
    context.save();
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
      this.drawFishAtlasCell(outlineAtlas, column, row, offsetX, offsetY, fishWidth, fishHeight);
    }
    context.restore();
  }

  private drawFishingTargetChevron(
    point: WorldPoint,
    species: FishSpecies,
    width: number,
    height: number,
    highContrast: boolean,
  ): void {
    const { fishHeight } = this.fishDimensions(species, width, height);
    const { context } = this;
    const y = point.y + fishHeight * 0.46;
    const size = clamp(Math.min(width, height) * 0.016, 10, 15);
    context.save();
    context.strokeStyle = highContrast ? "#ffffff" : "#e8a44d";
    context.lineWidth = highContrast ? 4 : 3;
    context.lineCap = "round";
    context.shadowColor = "rgba(2, 10, 18, 0.82)";
    context.shadowBlur = 5;
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
    const fish = FISH[species];
    const [column, row] = fish.atlasCell;
    const guideWidth = clamp(width * 0.22, 190, 300);
    const guideX = width - guideWidth - clamp(width * 0.035, 20, 48);
    const guideY = Math.max(18, Math.min(surfaceY * 0.14, 42));
    const portraitWidth = clamp(guideWidth * 0.56, 110, 160);
    const portraitHeight = portraitWidth * 0.58;

    context.save();
    context.shadowColor = "rgba(2, 10, 18, 0.86)";
    context.shadowBlur = 9;
    this.drawFishCell(
      column,
      row,
      guideX + guideWidth / 2,
      guideY + portraitHeight / 2,
      portraitWidth,
      portraitHeight,
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
    const scale = clamp(Math.min(width, height) * 0.105, 54, 92) * fish.scale;
    const longBody = species === "needlePike" || species === "lanternEel";
    const wideBody = species === "violetRay";
    return {
      fishWidth: scale * (longBody ? 1.42 : wideBody ? 1.24 : 1.08),
      fishHeight: scale * (longBody ? 0.82 : wideBody ? 0.94 : 1),
    };
  }

  private drawFishCell(column: number, row: number, x: number, y: number, width: number, height: number): void {
    const art = this.art;
    if (!art) return;
    this.drawFishAtlasCell(art.fish, column, row, x, y, width, height);
  }

  private drawFishAtlasCell(
    atlas: HTMLCanvasElement,
    column: number,
    row: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const sourceWidth = atlas.width / 3;
    const sourceHeight = atlas.height / 3;
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
    const target = createSideScrollCamera({
      focusX: simulation.boat.x,
      velocityX: cinematic ? 0 : this.surfaceCameraVelocity,
      viewWidth: cinematic ? 0.54 : BALANCE.cameraViewWidth,
      lookAheadTime: 0.24,
    });
    const camera = cinematic || reducedMotion || this.surfaceCameraCenter === null
      ? target
      : dampSideScrollCamera(this.surfaceCameraCenter, target, deltaSeconds, 3.2);

    this.surfaceCameraCenter = camera.center;
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

function keyMagenta(image: HTMLImageElement, crop: boolean): HTMLCanvasElement {
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


function fishShortName(species: FishSpecies): string {
  return FISH[species].name.toUpperCase();
}

function isNearScreen(x: number, width: number, margin: number): boolean {
  return x >= -margin && x <= width + margin;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
