export interface SurfaceContactOptions {
  centerX: number;
  waterline: number;
  width: number;
  viewportWidth: number;
  viewportHeight: number;
  elapsed: number;
  reducedMotion: boolean;
  highContrast: boolean;
  seed?: number;
}

export function captureSurfaceLayer(source: HTMLCanvasElement, snapshot: HTMLCanvasElement): HTMLCanvasElement {
  if (snapshot.width !== source.width || snapshot.height !== source.height) {
    snapshot.width = source.width;
    snapshot.height = source.height;
  }
  const context = snapshot.getContext("2d");
  if (!context) return snapshot;
  context.clearRect(0, 0, snapshot.width, snapshot.height);
  context.drawImage(source, 0, 0);
  return snapshot;
}

export function drawWaterContact(
  context: CanvasRenderingContext2D,
  surfaceLayer: HTMLCanvasElement,
  options: SurfaceContactOptions,
): void {
  const phase = options.reducedMotion ? (options.seed ?? 0) : options.elapsed * 1.4 + (options.seed ?? 0);
  const left = options.centerX - options.width / 2;
  const right = options.centerX + options.width / 2;
  const waveHeight = clamp(options.width * 0.012, 1.5, 4.5);

  context.save();
  traceOcclusionPath(context, left, right, options.waterline, options.viewportHeight, waveHeight, phase);
  context.clip();
  context.drawImage(
    surfaceLayer,
    0,
    0,
    surfaceLayer.width,
    surfaceLayer.height,
    0,
    0,
    options.viewportWidth,
    options.viewportHeight,
  );

  const shadowDepth = clamp(options.width * 0.04, 7, 18);
  const shadow = context.createRadialGradient(
    options.centerX,
    options.waterline + shadowDepth * 0.3,
    0,
    options.centerX,
    options.waterline + shadowDepth * 0.3,
    options.width * 0.5,
  );
  shadow.addColorStop(0, "rgba(5, 24, 31, 0.22)");
  shadow.addColorStop(0.58, "rgba(5, 24, 31, 0.1)");
  shadow.addColorStop(1, "rgba(5, 24, 31, 0)");
  context.fillStyle = shadow;
  context.beginPath();
  context.ellipse(
    options.centerX,
    options.waterline + shadowDepth * 0.32,
    options.width * 0.5,
    shadowDepth,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();

  context.save();
  context.lineCap = "round";
  context.strokeStyle = options.highContrast ? "rgba(255, 250, 240, 0.82)" : "rgba(205, 232, 224, 0.62)";
  context.lineWidth = options.highContrast ? 2.1 : 1.35;
  const gap = options.width * 0.055;
  const segments = [
    [0.02, 0.27],
    [0.34, 0.62],
    [0.7, 0.98],
  ] as const;
  for (const [start, end] of segments) {
    const segmentLeft = left + options.width * start + gap * Math.sin(phase * 0.7 + start * 9);
    const segmentRight = left + options.width * end;
    if (segmentRight <= segmentLeft) continue;
    context.beginPath();
    traceContactWave(context, segmentLeft, segmentRight, options.waterline, waveHeight, phase);
    context.stroke();
  }
  context.restore();
}

function traceOcclusionPath(
  context: CanvasRenderingContext2D,
  left: number,
  right: number,
  waterline: number,
  viewportHeight: number,
  amplitude: number,
  phase: number,
): void {
  context.beginPath();
  traceContactWave(context, left, right, waterline, amplitude, phase);
  context.lineTo(right, viewportHeight);
  context.lineTo(left, viewportHeight);
  context.closePath();
}

function traceContactWave(
  context: CanvasRenderingContext2D,
  left: number,
  right: number,
  waterline: number,
  amplitude: number,
  phase: number,
): void {
  const step = Math.max(10, (right - left) / 14);
  for (let x = left; x <= right + step * 0.5; x += step) {
    const normalized = (x - left) / Math.max(1, right - left);
    const edgeFade = Math.sin(Math.PI * Math.min(1, normalized));
    const y = waterline
      + Math.sin(x * 0.035 + phase) * amplitude * 0.58 * edgeFade
      + Math.sin(x * 0.082 - phase * 0.65) * amplitude * 0.25;
    if (x === left) context.moveTo(x, y);
    else context.lineTo(Math.min(x, right), y);
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
