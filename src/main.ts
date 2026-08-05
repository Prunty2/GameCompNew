import "./styles.css";
import "./harbor.css";
import { Game } from "./game/Game";
import { PlatformService } from "./services/platformService";
import { loadSave } from "./services/saveGame";

async function bootstrap(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
  const uiRoot = document.querySelector<HTMLElement>("#ui-root");
  if (!canvas || !uiRoot) throw new Error("The game shell is missing required elements.");

  uiRoot.innerHTML = `<div class="loading" role="status">Loading game…</div>`;
  const platform = new PlatformService();
  await platform.initialize();
  platform.loadingStart();

  const game = new Game(canvas, uiRoot, platform, loadSave(platform.saveStorage));
  await game.prepare();
  platform.loadingStop();
  game.start();
}

void bootstrap().catch((error: unknown) => {
  console.error(error);
  const uiRoot = document.querySelector<HTMLElement>("#ui-root");
  if (uiRoot) uiRoot.innerHTML = `<div class="loading" role="alert">FSHING could not load. Refresh to try again.</div>`;
});
