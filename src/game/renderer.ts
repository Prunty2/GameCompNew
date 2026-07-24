import fishAtlasUrl from "../assets/fish-atlas.png";
import lakeChartUrl from "../assets/lake-chart.png";
import playerBoatUrl from "../assets/player-boat.png";
import worldAtlasUrl from "../assets/world-atlas.png";
import {
  BALANCE,
  FISHING_SPOTS,
  HARBORS,
  ROCKS,
  type FishSpecies,
  type WorldPoint,
} from "./balance";
import { fogIntensity, isNight, objective, type Simulation } from "./simulation";

export interface RenderSettings {
  highContrast: boolean;
  reducedMotion: boolean;
  cinematic: boolean;
}

interface LoadedArt {
  lake: HTMLImageElement;
  boat: HTMLCanvasElement;
  fish: HTMLCanvasElement;
  world: HTMLCanvasElement;
}

export class CanvasRenderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly artReady: Promise<void>;
  private art: LoadedArt | null = null;
  private collisionFlashUntil = 0;
  private collisionStartedAt = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable.");
    this.context = context;
    this.artReady = Promise.all([
      loadImage(lakeChartUrl),
      loadImage(playerBoatUrl),
      loadImage(fishAtlasUrl),
      loadImage(worldAtlasUrl),
    ]).then(([lake, boat, fish, world]) => {
      this.art = {
        lake,
        boat: keyMagenta(boat, true),
        fish: keyMagenta(fish, false),
        world: keyMagenta(world, false),
      };
    });
  }

  ready(): Promise<void> {
    return this.artReady;
  }

  flashCollision(): void {
    this.collisionStartedAt = performance.now();
    this.collisionFlashUntil = this.collisionStartedAt + 360;
  }

  render(simulation: Simulation, settings: RenderSettings): void {
    this.resize();
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.context.clearRect(0, 0, width, height);
    if (!this.art) {
      this.context.fillStyle = "#071b2a";
      this.context.fillRect(0, 0, width, height);
      return;
    }
    this.context.save();
    const now = performance.now();
    if (!settings.reducedMotion && now < this.collisionFlashUntil) {
      const remaining = (this.collisionFlashUntil - now) / (this.collisionFlashUntil - this.collisionStartedAt);
      const shake = Math.sin(now * 0.19) * remaining * 9;
      this.context.translate(shake, Math.cos(now * 0.23) * remaining * 4);
    }
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
    const waterline = this.drawPanorama(art.lake, cameraX, width, height);

    context.save();
    context.globalAlpha = 0.2;
    context.strokeStyle = settings.highContrast ? "#fff6d8" : "#c8e4df";
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

    for (const harbor of HARBORS) {
      const x = this.worldToScreenX(harbor.x, cameraX, width);
      if (!isNearScreen(x, width, 180)) continue;
      context.save();
      if (harbor.id === "gloam") {
        context.translate(x, 0);
        context.scale(-1, 1);
        this.drawWorldCell(0, 0, 0, waterline - 40, 180, 180);
      } else {
        this.drawWorldCell(0, 0, x, waterline - 40, 180, 180);
      }
      context.restore();
    }

    for (const spot of FISHING_SPOTS) {
      const x = this.worldToScreenX(spot.x, cameraX, width);
      if (!isNearScreen(x, width, 140)) continue;
      const locked = spot.requiresPermit && !simulation.progress.outerUnlocked;
      const pulse = settings.reducedMotion ? 1 : 1 + Math.sin(simulation.elapsed * 3.2 + spot.x * 10) * 0.025;
      context.save();
      context.globalAlpha = locked ? 0.35 : 0.92;
      this.drawWorldCell(0, 1, x, waterline - 58, 142 * pulse, 142 * pulse);
      context.restore();
      context.fillStyle = locked ? "#f2e6c7" : "#ff7b21";
      context.fillRect(x - 2, waterline - 114, 4, locked ? 12 : 20);
    }

    for (const rock of ROCKS) {
      const x = this.worldToScreenX(rock.x, cameraX, width);
      if (!isNearScreen(x, width, 110)) continue;
      const size = 104 + rock.radius * 600;
      this.drawWorldCell(1, 0, x, waterline - 14, size, size);
      if (settings.highContrast) {
        context.strokeStyle = "#fff6d8";
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(x - size * 0.26, waterline + 2);
        context.lineTo(x + size * 0.28, waterline + 2);
        context.stroke();
      }
    }

    this.drawObjective(simulation, cameraX, width, height);
    this.drawBoat(simulation, cameraX, width, waterline, settings);
    this.drawWeather(simulation, cameraX, width, height, settings);

    if (performance.now() < this.collisionFlashUntil) {
      context.fillStyle = "rgba(255, 112, 27, 0.22)";
      context.fillRect(0, 0, width, height);
    }
  }

  private renderFishing(simulation: Simulation, settings: RenderSettings, width: number, height: number): void {
    const fishing = simulation.fishing;
    if (!fishing) return;
    const { context } = this;
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, settings.highContrast ? "#317c89" : "#1a6675");
    gradient.addColorStop(0.15, "#0e5060");
    gradient.addColorStop(1, "#041a2a");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.fillStyle = "#d9d4ba";
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
    this.drawWorldCell(1, 0, width * 0.12, height * 0.91, 220, 170);
    this.drawWorldCell(1, 0, width * 0.86, height * 0.95, 290, 210);
    this.drawWorldCell(2, 1, width * 0.7, height * 0.86, 260, 150);
    context.restore();

    for (const target of fishing.targets) {
      const point = this.fishingToScreen(target, width, height);
      this.drawFish(target.species, point, target.direction, width, height, settings.highContrast);
    }

    const hook = this.fishingToScreen(fishing.hook, width, height);
    context.strokeStyle = settings.highContrast ? "#ffffff" : "#f4e2b9";
    context.lineWidth = settings.highContrast ? 3 : 2;
    context.beginPath();
    context.moveTo(width * 0.5, 0);
    context.lineTo(hook.x, hook.y);
    context.stroke();
    this.drawFishCell(1, 1, hook.x, hook.y, 72, 72);
    context.strokeStyle = "#ff7b21";
    context.lineWidth = 2;
    context.strokeRect(hook.x - 20, hook.y - 20, 40, 40);

    const species = FISHING_SPOTS.find((spot) => spot.id === fishing.spot)?.species;
    if (species) {
      context.fillStyle = "rgba(4, 18, 29, 0.78)";
      context.fillRect(20, 82, 188, 38);
      context.fillStyle = "#f5e7c8";
      context.font = "800 13px system-ui, sans-serif";
      context.textBaseline = "middle";
      context.fillText(`TARGET  ${fishShortName(species)}`, 34, 101);
    }
  }

  private drawPanorama(image: HTMLImageElement, cameraX: number, width: number, height: number): number {
    const viewFraction = 0.59;
    let sourceWidth = image.naturalWidth * viewFraction;
    let sourceHeight = image.naturalHeight;
    const targetAspect = width / height;
    if (sourceWidth / sourceHeight < targetAspect) {
      sourceHeight = sourceWidth / targetAspect;
    } else {
      sourceWidth = sourceHeight * targetAspect;
    }
    const maxSourceX = image.naturalWidth - sourceWidth;
    const sourceX = clamp(cameraX * image.naturalWidth - sourceWidth / 2, 0, maxSourceX);
    const sourceY = Math.max(0, (image.naturalHeight - sourceHeight) * 0.42);
    this.context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
    const authoredWaterline = image.naturalHeight * 0.61;
    return clamp(((authoredWaterline - sourceY) / sourceHeight) * height, height * 0.54, height * 0.88);
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
    const boatWidth = clamp(this.canvas.clientHeight * 0.37, 150, 270);
    const boatHeight = boatWidth * (art.boat.height / art.boat.width);
    const speedRatio = Math.min(1, Math.abs(simulation.boat.speed) / BALANCE.maxSurfaceSpeed);
    const bob = settings.reducedMotion ? 0 : Math.sin(simulation.elapsed * (2.4 + speedRatio * 1.4)) * (2.2 + speedRatio * 1.7);
    const tilt = settings.reducedMotion ? 0 : clamp(simulation.boat.speed * 0.24, -0.036, 0.036);

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
    context.fillStyle = "#ff7b21";
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
      this.context.globalAlpha = fog * (settings.highContrast ? 0.2 : 0.46);
      const drift = settings.reducedMotion ? 0 : Math.sin(simulation.elapsed * 0.12) * width * 0.08;
      this.drawWorldCell(1, 1, width * 0.22 + drift, height * 0.46, width * 0.56, height * 0.28);
      this.drawWorldCell(1, 1, width * 0.76 + drift, height * 0.62, width * 0.48, height * 0.25);
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
    const cells: Record<FishSpecies, [number, number]> = {
      reedfin: [0, 0],
      needlePike: [1, 0],
      gloamGill: [0, 1],
    };
    const [column, row] = cells[species];
    const scale = clamp(Math.min(width, height) * 0.17, 82, 142);
    const fishWidth = species === "needlePike" ? scale * 1.45 : scale;
    const fishHeight = species === "needlePike" ? scale * 0.74 : scale;
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

  private drawFishCell(column: number, row: number, x: number, y: number, width: number, height: number): void {
    const art = this.art;
    if (!art) return;
    const sourceWidth = art.fish.width / 2;
    const sourceHeight = art.fish.height / 2;
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
  return { reedfin: "REEDFIN", needlePike: "NEEDLE PIKE", gloamGill: "GLOAM GILL" }[species];
}

function isNearScreen(x: number, width: number, margin: number): boolean {
  return x >= -margin && x <= width + margin;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
