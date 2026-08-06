import boatSteamAtlasUrl from "../assets/boat-steam-atlas.png";
import tackleAtlasUrl from "../assets/fish-atlas.png";
import fishAtlasUrl from "../assets/fish-atlas-v2.png";
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
  regionById,
  regionSurfaceTintAt,
  type FishSpecies,
  type WorldPoint,
} from "./balance";
import { boatSteamPuffs } from "./boatSteam";
import { createSideScrollCamera, worldToScreenX, type SideScrollCamera } from "./camera";
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

export class CanvasRenderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly artReady: Promise<void>;
  private readonly surfaceLayer = document.createElement("canvas");
  private art: LoadedArt | null = null;
  private interactionAnchor: WorldPoint | null = null;

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
      loadImage(surfaceFishingCuesUrl),
      loadImage(polarizedLensUrl),
      loadImage(tackleAtlasUrl),
      loadImage(worldAtlasUrl),
    ]).then(([boatSteam, lake, lakeNight, pier, boat, fish, fishingCues, polarizedLens, tackle, world]) => {
      const keyedFish = keyMagenta(fish, false);
      this.art = {
        boatSteam,
        lake,
        lakeNight,
        pier,
        boat: keyMagenta(boat, true),
        fish: keyedFish,
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
      this.renderSurface(simulation, settings, width, height);
    }
    this.context.restore();
  }

  private renderSurface(simulation: Simulation, settings: RenderSettings, width: number, height: number): void {
    const art = this.art;
    if (!art) return;
    const { context } = this;
    const camera = this.camera(simulation, settings.cinematic);
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

    this.drawBoat(simulation, camera, width, height, waterline, surfaceLayer, settings);

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
    const { context } = this;
    const spot = FISHING_SPOTS.find((candidate) => candidate.id === fishing.spot);
    if (!spot) return;
    const targetSpecies = simulation.activeContract?.spot === spot.id
      ? simulation.activeContract.species
      : spot.species;
    const region = regionById(spot.region);
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, settings.highContrast ? "#72aeb0" : region.shallow);
    gradient.addColorStop(0.42, region.middle);
    gradient.addColorStop(1, region.deep);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.fillStyle = "#d6dacb";
    context.fillRect(0, 0, width, Math.max(5, height * 0.012));
    context.save();
    context.globalAlpha = 0.13;
    context.strokeStyle = "#d7eee6";
    const currentOffset = settings.reducedMotion ? 0 : (simulation.elapsed * 18) % 90;
    for (let y = 72; y < height; y += 82) {
      context.beginPath();
      context.moveTo(-80 + currentOffset, y);
      context.bezierCurveTo(width * 0.28, y - 18, width * 0.65, y + 18, width + 80, y - 4);
      context.stroke();
    }
    context.restore();

    context.save();
    context.globalAlpha = settings.highContrast ? 0.45 : 0.24;
    this.drawWorldCell(2, 1, width * 0.7, height * 0.86, 260, 150);
    context.restore();

    const maximumDepth = maxFishingDepth(simulation);
    const depthLine = this.fishingToScreen({ x: 0.5, y: maximumDepth }, width, height).y;
    if (maximumDepth < 0.93) {
      context.fillStyle = "rgba(4, 12, 25, 0.3)";
      context.fillRect(0, depthLine, width, height - depthLine);
      context.save();
      context.setLineDash([10, 8]);
      context.strokeStyle = "#e8a44d";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(0, depthLine);
      context.lineTo(width, depthLine);
      context.stroke();
      context.restore();
      context.fillStyle = "rgba(8, 31, 40, 0.88)";
      context.fillRect(width - 214, depthLine + 10, 194, 30);
      context.fillStyle = "#f7f1e3";
      context.font = "800 11px system-ui, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("UPGRADE LINE TO GO DEEPER", width - 117, depthLine + 25);
    }

    for (const target of fishing.targets) {
      const point = this.fishingToScreen(target, width, height);
      const reachable = FISH[target.species].depthTier <= simulation.progress.upgrades.line;
      context.save();
      context.globalAlpha = reachable ? 1 : 0.3;
      if (target.species === targetSpecies) {
        this.drawFishingTargetMarker(point, target.species, width, height, settings.highContrast);
      }
      this.drawFish(target.species, point, target.direction, width, height, settings.highContrast);
      context.restore();
    }

    const hook = this.fishingToScreen(fishing.hook, width, height);
    context.strokeStyle = settings.highContrast ? "#ffffff" : "#f4e2b9";
    context.lineWidth = settings.highContrast ? 3 : 2;
    context.beginPath();
    context.moveTo(width * 0.5, 0);
    context.lineTo(hook.x, hook.y);
    context.stroke();
    this.drawTackleCell(1, 1, hook.x, hook.y, 72, 72);
    context.strokeStyle = "#e8a44d";
    context.lineWidth = 2;
    context.strokeRect(hook.x - 20, hook.y - 20, 40, 40);

    this.drawFishingTargetGuide(targetSpecies, width, height, settings.highContrast);
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
  ): void {
    const art = this.art;
    if (!art) return;
    const { context } = this;
    const x = worldToScreenX(simulation.boat.x, camera, width);
    const boatScale = 1 + simulation.progress.upgrades.cargo * 0.055;
    const boatWidth = clamp(this.canvas.clientHeight * 0.421 * boatScale, 172, 412);
    const boatHeight = boatWidth * (art.boat.height / art.boat.width);
    const speedRatio = Math.min(1, Math.abs(simulation.boat.speed) / BALANCE.maxSurfaceSpeed);
    const bob = settings.reducedMotion ? 0 : Math.sin(simulation.elapsed * (2 + speedRatio)) * (1.1 + speedRatio * 0.8);
    const tilt = settings.reducedMotion ? 0 : clamp(simulation.boat.speed * 0.16, -0.02, 0.02);
    const boatLift = clamp(boatHeight * 0.04, 4, 9);

    context.save();
    context.translate(x, waterline + bob - boatLift);
    context.scale(simulation.boat.facing, 1);
    context.rotate(tilt);
    const nightIntensity = nightVisualIntensity(simulation);
    context.filter = `brightness(${1 - nightIntensity * 0.18}) saturate(${1 - nightIntensity * 0.08})`;
    this.drawBoatSteam(
      art.boatSteam,
      boatWidth,
      boatHeight,
      speedRatio,
      Math.sign(simulation.boat.speed) * simulation.boat.facing,
      simulation.elapsed,
      settings,
    );
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
    boatHeight: number,
    speedRatio: number,
    localMovementDirection: number,
    elapsed: number,
    settings: RenderSettings,
  ): void {
    const columns = 4;
    const rows = 2;
    const cellWidth = atlas.naturalWidth / columns;
    const cellHeight = atlas.naturalHeight / rows;
    const stackX = -boatWidth * 0.078;
    const stackY = -boatHeight * 0.566;
    const puffs = boatSteamPuffs(elapsed, speedRatio, localMovementDirection, settings.reducedMotion);

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
    const scale = clamp(Math.min(width, height) * 0.105, 54, 92) * fish.scale;
    const longBody = species === "needlePike" || species === "lanternEel";
    const wideBody = species === "violetRay";
    const fishWidth = scale * (longBody ? 1.42 : wideBody ? 1.24 : 1.08);
    const fishHeight = scale * (longBody ? 0.82 : wideBody ? 0.94 : 1);
    this.context.save();
    this.context.translate(point.x, point.y);
    this.context.scale(direction, 1);
    this.drawFishCell(column, row, 0, 0, fishWidth, fishHeight);
    this.context.restore();
    if (highContrast) {
      this.context.strokeStyle = "#fff6d8";
      this.context.lineWidth = 2;
      this.context.strokeRect(
        point.x - fishWidth * 0.38,
        point.y - fishHeight * 0.34,
        fishWidth * 0.76,
        fishHeight * 0.68,
      );
    }
  }

  private drawFishingTargetMarker(
    point: WorldPoint,
    species: FishSpecies,
    width: number,
    height: number,
    highContrast: boolean,
  ): void {
    const { context } = this;
    const scale = clamp(Math.min(width, height) * 0.17, 82, 142);
    const markerWidth = species === "needlePike" ? scale * 1.36 : scale * 0.96;
    const markerHeight = species === "needlePike" ? scale * 0.68 : scale * 0.9;
    const left = point.x - markerWidth / 2;
    const top = point.y - markerHeight / 2;
    const corner = Math.max(12, scale * 0.15);

    context.save();
    context.strokeStyle = highContrast ? "#fff6d8" : "#ff7b21";
    context.lineWidth = highContrast ? 4 : 3;
    context.beginPath();
    context.moveTo(left + corner, top);
    context.lineTo(left, top);
    context.lineTo(left, top + corner);
    context.moveTo(left + markerWidth - corner, top);
    context.lineTo(left + markerWidth, top);
    context.lineTo(left + markerWidth, top + corner);
    context.moveTo(left, top + markerHeight - corner);
    context.lineTo(left, top + markerHeight);
    context.lineTo(left + corner, top + markerHeight);
    context.moveTo(left + markerWidth, top + markerHeight - corner);
    context.lineTo(left + markerWidth, top + markerHeight);
    context.lineTo(left + markerWidth - corner, top + markerHeight);
    context.stroke();

    const label = "TARGET";
    context.font = "900 11px system-ui, sans-serif";
    const labelWidth = context.measureText(label).width + 18;
    const labelX = point.x - labelWidth / 2;
    const guideRight = clamp(width * 0.04, 18, 42) + clamp(width * 0.26, 250, 330);
    const guideBottom = clamp(height * 0.075, 22, 68) + clamp(height * 0.12, 78, 96);
    const overlapsGuide = labelX < guideRight && labelX + labelWidth > 0 && top - 22 < guideBottom + 6;
    const labelY = overlapsGuide ? top + markerHeight + 2 : top - 22;
    context.fillStyle = highContrast ? "#fff6d8" : "#ff7b21";
    context.fillRect(labelX, labelY, labelWidth, 20);
    context.fillStyle = "#04121d";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, point.x, labelY + 10);
    context.restore();
  }

  private drawFishingTargetGuide(
    species: FishSpecies,
    width: number,
    height: number,
    highContrast: boolean,
  ): void {
    const { context } = this;
    const fish = FISH[species];
    const [column, row] = fish.atlasCell;
    const cardX = clamp(width * 0.04, 18, 42);
    const cardY = clamp(height * 0.075, 22, 68);
    const cardWidth = clamp(width * 0.26, 250, 330);
    const cardHeight = clamp(height * 0.12, 78, 96);
    const portraitSize = cardHeight - 18;
    const portraitX = cardX + 10;
    const portraitY = cardY + 9;

    context.save();
    context.fillStyle = "rgba(4, 18, 29, 0.9)";
    context.fillRect(cardX, cardY, cardWidth, cardHeight);
    context.fillStyle = highContrast ? "#fff6d8" : "#ff7b21";
    context.fillRect(cardX, cardY, 5, cardHeight);
    context.strokeStyle = highContrast ? "#fff6d8" : "rgba(245, 231, 200, 0.5)";
    context.lineWidth = highContrast ? 2 : 1;
    context.strokeRect(cardX + 0.5, cardY + 0.5, cardWidth - 1, cardHeight - 1);
    context.fillStyle = "rgba(255, 255, 255, 0.06)";
    context.fillRect(portraitX, portraitY, portraitSize, portraitSize);

    const previewWidth = species === "needlePike" ? portraitSize * 1.08 : portraitSize * 0.86;
    const previewHeight = species === "needlePike" ? portraitSize * 0.55 : portraitSize * 0.86;
    this.drawFishCell(
      column,
      row,
      portraitX + portraitSize / 2,
      portraitY + portraitSize / 2,
      previewWidth,
      previewHeight,
    );

    const textX = portraitX + portraitSize + 14;
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    context.fillStyle = highContrast ? "#fff6d8" : "#ff7b21";
    context.font = "800 10px system-ui, sans-serif";
    context.fillText("CATCH THIS FISH", textX, cardY + cardHeight * 0.31);
    context.fillStyle = "#f5e7c8";
    context.font = "900 16px system-ui, sans-serif";
    context.fillText(fishShortName(species), textX, cardY + cardHeight * 0.56);
    context.fillStyle = "#b8c8c3";
    context.font = "700 11px system-ui, sans-serif";
    context.fillText(fish.shape.toUpperCase(), textX, cardY + cardHeight * 0.77);
    context.restore();
  }

  private drawFishCell(column: number, row: number, x: number, y: number, width: number, height: number): void {
    const art = this.art;
    if (!art) return;
    const sourceWidth = art.fish.width / 3;
    const sourceHeight = art.fish.height / 3;
    this.context.drawImage(
      art.fish,
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

  private camera(simulation: Simulation, cinematic: boolean): SideScrollCamera {
    return createSideScrollCamera({
      focusX: simulation.boat.x,
      velocityX: cinematic ? 0 : simulation.boat.speed,
      viewWidth: cinematic ? 0.54 : BALANCE.cameraViewWidth,
      lookAheadTime: 0.24,
    });
  }

  private fishingToScreen(point: WorldPoint, width: number, height: number): WorldPoint {
    return {
      x: point.x * width,
      y: height * 0.08 + point.y * height * 0.88,
    };
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


function fishShortName(species: FishSpecies): string {
  return FISH[species].name.toUpperCase();
}

function isNearScreen(x: number, width: number, margin: number): boolean {
  return x >= -margin && x <= width + margin;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
