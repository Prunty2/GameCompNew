export interface SurfaceContactOptions {
  centerX: number;
  waterline: number;
  width: number;
  depth: number;
  tint: string;
  elapsed: number;
  reducedMotion: boolean;
  highContrast: boolean;
  seed?: number;
}

export function drawContactShadow(
  context: CanvasRenderingContext2D,
  options: SurfaceContactOptions,
): void {
  const phase = options.reducedMotion ? 0 : options.elapsed * 0.85 + (options.seed ?? 0);
  const drift = Math.sin(phase) * options.width * 0.015;
  const gradient = context.createRadialGradient(
    options.centerX + drift,
    options.waterline + options.depth * 0.35,
    0,
    options.centerX + drift,
    options.waterline + options.depth * 0.35,
    options.width * 0.52,
  );
  gradient.addColorStop(0, "rgba(5, 24, 31, 0.3)");
  gradient.addColorStop(0.58, "rgba(5, 24, 31, 0.15)");
  gradient.addColorStop(1, "rgba(5, 24, 31, 0)");

  context.save();
  context.fillStyle = gradient;
  context.beginPath();
  context.ellipse(
    options.centerX + drift,
    options.waterline + options.depth * 0.38,
    options.width * 0.52,
    options.depth,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();
}

export function drawWaterContact(
  context: CanvasRenderingContext2D,
  options: SurfaceContactOptions,
): void {
  const phase = options.reducedMotion ? (options.seed ?? 0) : options.elapsed * 1.4 + (options.seed ?? 0);
  const left = options.centerX - options.width / 2;
  const right = options.centerX + options.width / 2;
  const waveHeight = Math.max(1.5, options.depth * 0.22);
  const wash = context.createLinearGradient(0, options.waterline - waveHeight, 0, options.waterline + options.depth);
  wash.addColorStop(0, "rgba(88, 151, 156, 0.08)");
  wash.addColorStop(0.3, colorWithAlpha(options.tint, options.highContrast ? 0.38 : 0.5));
  wash.addColorStop(1, colorWithAlpha(options.tint, 0));

  context.save();
  context.beginPath();
  traceContactWave(context, left, right, options.waterline, waveHeight, phase);
  context.lineTo(right, options.waterline + options.depth);
  context.lineTo(left, options.waterline + options.depth);
  context.closePath();
  context.fillStyle = wash;
  context.fill();

  context.lineCap = "round";
  context.strokeStyle = options.highContrast ? "rgba(255, 250, 240, 0.78)" : "rgba(205, 232, 224, 0.56)";
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

  context.globalAlpha = options.highContrast ? 0.5 : 0.28;
  context.strokeStyle = options.highContrast ? "#fffaf0" : "#b9ddd6";
  context.lineWidth = 1;
  context.beginPath();
  traceContactWave(
    context,
    left + options.width * 0.12,
    right - options.width * 0.08,
    options.waterline + options.depth * 0.55,
    waveHeight * 0.65,
    phase + 1.8,
  );
  context.stroke();
  context.restore();
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

function colorWithAlpha(color: string, alpha: number): string {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color);
  if (!match) return `rgba(63, 126, 132, ${alpha})`;
  return `rgba(${Number.parseInt(match[1] ?? "3f", 16)}, ${Number.parseInt(match[2] ?? "7e", 16)}, ${Number.parseInt(match[3] ?? "84", 16)}, ${alpha})`;
}
