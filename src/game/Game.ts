import { InputController } from "./input";
import { CanvasRenderer } from "./renderer";
import { createSimulation, updateSimulation, type Simulation } from "./simulation";
import type { PlatformService } from "../services/platformService";
import { saveGame, type SaveData } from "../services/saveGame";

const FIXED_STEP = 1 / 120;
const MAX_FRAME = 0.05;

export class Game {
  private readonly renderer: CanvasRenderer;
  private readonly input = new InputController();
  private readonly simulation: Simulation;
  private lastTime = 0;
  private accumulator = 0;
  private lastDisplayedScore = -1;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly uiRoot: HTMLElement,
    private readonly platform: PlatformService,
    private readonly save: SaveData,
  ) {
    this.renderer = new CanvasRenderer(canvas);
    this.simulation = createSimulation(1);
    this.buildUi();
  }

  start(): void {
    this.platform.gameplayStart();
    requestAnimationFrame((time) => this.frame(time));
  }

  private frame(time: number): void {
    const delta = this.lastTime === 0 ? 0 : Math.min(MAX_FRAME, (time - this.lastTime) / 1_000);
    this.lastTime = time;
    this.accumulator += delta;

    while (this.accumulator >= FIXED_STEP) {
      updateSimulation(this.simulation, this.input.read(), FIXED_STEP);
      this.accumulator -= FIXED_STEP;
    }

    if (this.simulation.score !== this.lastDisplayedScore) this.onScoreChanged();
    this.renderer.render(this.simulation);
    requestAnimationFrame((nextTime) => this.frame(nextTime));
  }

  private buildUi(): void {
    this.uiRoot.innerHTML = `
      <header class="hud">
        <div>
          <p class="eyebrow">Theme-neutral starter</p>
          <h1>New Game</h1>
        </div>
        <output class="score" aria-label="Score">0</output>
      </header>
      <p class="instructions">Move with arrow keys or WASD. Collect the gold marker.</p>`;
  }

  private onScoreChanged(): void {
    this.lastDisplayedScore = this.simulation.score;
    const output = this.uiRoot.querySelector<HTMLOutputElement>(".score");
    if (output) output.value = String(this.simulation.score);
    this.save.highScore = Math.max(this.save.highScore, this.simulation.score);
    saveGame(this.platform.saveStorage, this.save);
  }
}

