import type { Simulation } from "./simulation";

export class CanvasRenderer {
  private readonly context: CanvasRenderingContext2D;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable.");
    this.context = context;
  }

  render(simulation: Simulation): void {
    this.resize();
    const { context, canvas } = this;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const background = context.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, "#17233d");
    background.addColorStop(1, "#0b1220");
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    context.strokeStyle = "rgba(255, 255, 255, 0.06)";
    context.lineWidth = 1;
    for (let x = 0; x < width; x += 64) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }

    this.circle(simulation.target.x * width, simulation.target.y * height, Math.min(width, height) * 0.035, "#fbbf24");
    this.circle(simulation.player.x * width, simulation.player.y * height, Math.min(width, height) * 0.045, "#67e8f9");
  }

  private circle(x: number, y: number, radius: number, fill: string): void {
    this.context.beginPath();
    this.context.arc(x, y, radius, 0, Math.PI * 2);
    this.context.fillStyle = fill;
    this.context.fill();
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

