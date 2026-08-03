import tackleAtlasUrl from "../assets/fish-atlas.png";
import fishAtlasUrl from "../assets/fish-atlas-v2.png";
import harborPierUrl from "../assets/harbor-pier.png";
import lakeChartUrl from "../assets/lake-chart.png";
import playerBoatUrl from "../assets/player-boat.png";
import worldAtlasUrl from "../assets/world-atlas.png";
import {
  BALANCE,
  FISH,
  FISHING_SPOTS,
  HAZARDS,
  HARBORS,
  regionAt,
  regionById,
  type FishSpecies,
  type WorldPoint,
} from "./balance";
import { calculatePanoramaLayout } from "./panorama";
import { fogIntensity, isNight, maxFishingDepth, objective, type Simulation } from "./simulation";
import { populationLabel } from "./stem";

export interface RenderSettings {
  highContrast: boolean;
  reducedMotion: boolean;
  cinematic: boolean;
}

interface LoadedArt {
  lake: HTMLImageElement;
  pier: HTMLImageElement;
  boat: HTMLCanvasElement;
  fish: HTMLCanvasElement;
  tackle: HTMLCanvasElement;
  world: HTMLCanvasElement;
}

export class CanvasRenderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly artReady: Promise<void>;
  private art: LoadedArt | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable.");
    this.context = context;
    this.artReady = Promise.all([
      loadImage(lakeChartUrl),
      loadImage(harborPierUrl),
      loadImage(playerBoatUrl),
      loadImage(fishAtlasUrl),
      loadImage(tackleAtlasUrl),
      loadImage(worldAtlasUrl),
    ]).then(([lake, pier, boat, fish, tackle, world]) => {
      this.art = {
        lake,
        pier,
        boat: keyMagenta(boat, true),
        fish: keyMagenta(fish, false),
        tackle: keyMagenta(tackle, false),
        world: keyMagenta(world, false),
      };
    });
  }

  ready(): Promise<void> {
    return this.artReady;
  }

  render(simulation: Simulation, settings: RenderSettings): void {
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
    const cameraX = this.cameraX(simulation);
    const waterline = this.drawPanorama(art.lake, cameraX, width, height, settings.cinematic);
    const region = regionAt(simulation.boat.x);

    context.save();
    context.globalAlpha = settings.highContrast ? 0.08 : 0.16;
    context.fillStyle = region.surfaceTint;
    context.fillRect(0, 0, width, height);
    context.restore();

    context.save();
    context.globalAlpha = 0.2;
    context.strokeStyle = settings.highContrast ? "#fffaf0" : "#c8e4df";
    context.lineWidth = settings.highContrast ? 2 : 1;
    const waveOffset = settings.reducedMotion ? 0 : (simulation.elapsed * 22) % 42;
    for (let y = waterline + 18; y < height; y += 34) {
      context.beginPath();
      for (let x = -50; x <= width + 50; x += 42) {
        const waveY = y + Math.sin((x + waveOffset) * 0.045 + y * 0.02) * 3;
        if (x === -50) context.moveTo(x, waveY);
        else context.lineTo(x, waveY);
      }
      context.stroke();
    }
    context.restore();

    if (settings.cinematic) return;

    context.save();
    context.fillStyle = "rgba(8, 31, 40, 0.78)";
    context.fillRect(20, height * 0.16, 176, 34);
    context.fillStyle = "#f7f1e3";
    context.font = "800 11px system-ui, sans-serif";
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText(region.name.toUpperCase(), 34, height * 0.16 + 17);
    context.fillStyle = region.surfaceTint;
    context.fillRect(20, height * 0.16, 5, 34);
    context.restore();

    for (const harbor of HARBORS) {
      const x = this.worldToScreenX(harbor.x, cameraX, width);
      if (!isNearScreen(x, width, 540)) continue;
      this.drawHarborPier(x, waterline, harbor.id === "gloam");
    }

    for (const spot of FISHING_SPOTS) {
      const x = this.worldToScreenX(spot.x, cameraX, width);
      if (!isNearScreen(x, width, 140)) continue;
      const permitLocked = spot.requiresPermit && !simulation.progress.outerUnlocked;
      const depthLocked = spot.requiredDepthTier > simulation.progress.upgrades.line;
      const locked = permitLocked || depthLocked;
      const pulse = settings.reducedMotion ? 1 : 1 + Math.sin(simulation.elapsed * 3.2 + spot.x * 10) * 0.025;
      context.save();
      context.globalAlpha = locked ? 0.48 : 0.96;
      this.drawWorldCell(0, 1, x, waterline - 38, 96 * pulse, 96 * pulse);
      context.strokeStyle = locked ? "#d6dacb" : "#e8a44d";
      context.lineWidth = locked ? 2 : 4;
      context.beginPath();
      context.moveTo(x, waterline - 66);
      context.lineTo(x, waterline + 2);
      context.stroke();
      context.beginPath();
      context.ellipse(x, waterline + 2, 34, 8, 0, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = "rgba(8, 31, 40, 0.9)";
      context.fillRect(x - 65, waterline - 104, 130, 26);
      context.fillStyle = locked ? "#d6dacb" : "#f7f1e3";
      context.font = "800 11px system-ui, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(spot.name.toUpperCase(), x, waterline - 91);
      const population = simulation.progress.populations[spot.species];
      context.fillStyle = locked ? "#c9cec4" : population >= 40 ? "#b8e3c5" : "#ffd27a";
      context.font = "800 9px system-ui, sans-serif";
      context.fillText(`${FISH[spot.species].name.toUpperCase()} · ${populationLabel(population).toUpperCase()}`, x, waterline - 75);
      if (depthLocked) {
        context.fillStyle = "#e8a44d";
        context.fillRect(x + 46, waterline - 112, 25, 18);
        context.fillStyle = "#0b2630";
        context.font = "900 10px system-ui, sans-serif";
        context.fillText(`T${spot.requiredDepthTier}`, x + 58, waterline - 103);
      }
      context.restore();
    }

    for (const hazard of HAZARDS) {
      const x = this.worldToScreenX(hazard.x, cameraX, width);
      if (!isNearScreen(x, width, 110)) continue;
      const alreadyCrossed = simulation.triggeredHazards.includes(hazard.id);
      context.save();
      context.globalAlpha = alreadyCrossed ? 0.38 : 0.95;
      context.fillStyle = "#f4cb65";
      context.strokeStyle = settings.highContrast ? "#ffffff" : "#532f2a";
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(x, waterline - 49);
      context.lineTo(x - 20, waterline - 12);
      context.lineTo(x + 20, waterline - 12);
      context.closePath();
      context.fill();
      context.stroke();
      context.fillStyle = "#532f2a";
      context.font = "900 18px system-ui, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("!", x, waterline - 25);
      context.strokeStyle = "#f4cb65";
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(x, waterline - 12);
      context.lineTo(x, waterline + 7);
      context.stroke();
      context.beginPath();
      context.ellipse(x, waterline + 7, 22, 6, 0, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = "rgba(8, 31, 40, 0.9)";
      context.fillRect(x - 54, waterline + 18, 108, 22);
      context.fillStyle = "#fff4d2";
      context.font = "800 9px system-ui, sans-serif";
      context.fillText(hazard.name.toUpperCase(), x, waterline + 29);
      context.restore();
    }

    this.drawObjective(simulation, cameraX, width, height);
    this.drawBoat(simulation, cameraX, width, waterline, settings);
    this.drawWeather(simulation, cameraX, width, height, settings);

  }

  private drawHarborPier(x: number, waterline: number, fromRightShore: boolean): void {
    const art = this.art;
    if (!art) return;
    const pierWidth = clamp(this.canvas.clientHeight * 0.56, 320, 520);
    const pierHeight = pierWidth * (art.pier.naturalHeight / art.pier.naturalWidth);
    const deckTop = waterline - 32;
    const drawY = deckTop - pierHeight * 0.43;
    const outboardOverlap = 24;

    this.context.save();
    if (fromRightShore) {
      this.context.translate(x - outboardOverlap, 0);
      this.context.scale(-1, 1);
      this.context.drawImage(art.pier, -pierWidth, drawY, pierWidth, pierHeight);
    } else {
      this.context.drawImage(art.pier, x + outboardOverlap - pierWidth, drawY, pierWidth, pierHeight);
    }
    this.context.restore();
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
    cameraX: number,
    width: number,
    height: number,
    cinematic: boolean,
  ): number {
    const viewWidth = cinematic ? 0.54 : BALANCE.cameraViewWidth * 1.4;
    const layout = calculatePanoramaLayout({
      imageWidth: image.naturalWidth,
      imageHeight: image.naturalHeight,
      cameraX,
      viewWidth,
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
    cameraX: number,
    width: number,
    waterline: number,
    settings: RenderSettings,
  ): void {
    const art = this.art;
    if (!art) return;
    const { context } = this;
    const x = this.worldToScreenX(simulation.boat.x, cameraX, width);
    const boatScale = 1 + simulation.progress.upgrades.cargo * 0.055;
    const boatWidth = clamp(this.canvas.clientHeight * 0.37 * boatScale, 150, 360);
    const boatHeight = boatWidth * (art.boat.height / art.boat.width);
    const speedRatio = Math.min(1, Math.abs(simulation.boat.speed) / BALANCE.maxSurfaceSpeed);
    const bob = settings.reducedMotion ? 0 : Math.sin(simulation.elapsed * (2 + speedRatio)) * (1.1 + speedRatio * 0.8);
    const tilt = settings.reducedMotion ? 0 : clamp(simulation.boat.speed * 0.16, -0.02, 0.02);

    context.save();
    context.translate(x, waterline + bob);
    context.scale(simulation.boat.facing, 1);
    context.rotate(tilt);
    context.drawImage(art.boat, -boatWidth / 2, -boatHeight * 0.86, boatWidth, boatHeight);
    context.restore();

    if (Math.abs(simulation.boat.speed) > 0.018) {
      const wakeDirection = simulation.boat.speed > 0 ? -1 : 1;
      context.save();
      context.globalAlpha = 0.34 + speedRatio * 0.28;
      context.strokeStyle = settings.highContrast ? "#ffffff" : "#d9ede3";
      context.lineWidth = 1.5 + speedRatio;
      for (let index = 0; index < 3; index += 1) {
        const length = 26 + index * 18 + Math.abs(simulation.boat.speed) * 130;
        context.beginPath();
        context.moveTo(x + wakeDirection * boatWidth * 0.34, waterline + 4 + index * 6);
        context.quadraticCurveTo(
          x + wakeDirection * (boatWidth * 0.34 + length * 0.52),
          waterline + 2 + index * 8,
          x + wakeDirection * (boatWidth * 0.34 + length),
          waterline + 7 + index * 10,
        );
        context.stroke();
      }
      if (speedRatio > 0.65 && !settings.reducedMotion) {
        context.globalAlpha = (speedRatio - 0.55) * 0.72;
        for (let index = 0; index < 4; index += 1) {
          const sprayX = x - wakeDirection * boatWidth * 0.28 + Math.sin(simulation.elapsed * 17 + index) * 8;
          const sprayY = waterline - 2 - ((simulation.elapsed * 52 + index * 13) % 22);
          context.fillStyle = settings.highContrast ? "#ffffff" : "#d9ede3";
          context.fillRect(sprayX, sprayY, 2 + speedRatio * 2, 2 + speedRatio * 2);
        }
      }
      context.restore();
    }
  }

  private drawObjective(simulation: Simulation, cameraX: number, width: number, height: number): void {
    const goal = objective(simulation);
    const x = this.worldToScreenX(goal.point.x, cameraX, width);
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
    cameraX: number,
    width: number,
    height: number,
    settings: RenderSettings,
  ): void {
    const fog = fogIntensity(simulation);
    if (fog > 0.05) {
      this.context.save();
      this.context.globalAlpha = fog * (settings.highContrast ? 0.18 : 0.34);
      const drift = settings.reducedMotion ? 0 : Math.sin(simulation.elapsed * 0.12) * width * 0.08;
      this.context.filter = "blur(22px)";
      this.context.fillStyle = settings.highContrast ? "#f7f1e3" : "#cbd7cf";
      this.context.beginPath();
      this.context.ellipse(width * 0.22 + drift, height * 0.46, width * 0.3, height * 0.045, -0.02, 0, Math.PI * 2);
      this.context.ellipse(width * 0.76 + drift, height * 0.61, width * 0.28, height * 0.052, 0.03, 0, Math.PI * 2);
      this.context.fill();
      this.context.restore();
    }

    if (!isNight(simulation)) return;
    const boatX = this.worldToScreenX(simulation.boat.x, cameraX, width);
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
    this.context.fillStyle = vignette;
    this.context.fillRect(0, 0, width, height);

    const threatPhase = settings.reducedMotion ? 0.5 : (Math.sin(simulation.elapsed * 0.43) + 1) / 2;
    this.context.save();
    this.context.globalAlpha = 0.06 + threatPhase * 0.08;
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

  private cameraX(simulation: Simulation): number {
    const halfView = BALANCE.cameraViewWidth / 2;
    const lookAhead = simulation.boat.speed * 0.24;
    return clamp(simulation.boat.x + lookAhead, halfView, 1 - halfView);
  }

  private worldToScreenX(worldX: number, cameraX: number, width: number): number {
    const left = cameraX - BALANCE.cameraViewWidth / 2;
    return ((worldX - left) / BALANCE.cameraViewWidth) * width;
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
