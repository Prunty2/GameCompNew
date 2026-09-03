import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";

export const DISPLAY_RESOLUTIONS = [
  { id: "1280x720", width: 1280, height: 720, label: "1280 × 720" },
  { id: "1600x900", width: 1600, height: 900, label: "1600 × 900" },
  { id: "1920x1080", width: 1920, height: 1080, label: "1920 × 1080" },
  { id: "2560x1440", width: 2560, height: 1440, label: "2560 × 1440" },
] as const;

export type DisplayResolution = typeof DISPLAY_RESOLUTIONS[number]["id"];

export function isDisplayResolution(value: unknown): value is DisplayResolution {
  return typeof value === "string"
    && DISPLAY_RESOLUTIONS.some((resolution) => resolution.id === value);
}

export function isResolutionControlDisabled(supportsResolution: boolean, fullscreen: boolean): boolean {
  return !supportsResolution || fullscreen;
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined"
    && Object.prototype.hasOwnProperty.call(window, "__TAURI_INTERNALS__");
}

export class WindowService {
  private readonly appWindow = isTauriRuntime() ? getCurrentWindow() : null;

  readonly supportsResolution = this.appWindow !== null;
  readonly supportsFullscreen = this.appWindow !== null
    || typeof document.documentElement.requestFullscreen === "function";

  async setResolution(resolution: DisplayResolution): Promise<void> {
    if (!this.appWindow) return;
    const selected = DISPLAY_RESOLUTIONS.find((candidate) => candidate.id === resolution);
    if (!selected) return;
    await this.appWindow.setSize(new LogicalSize(selected.width, selected.height));
  }

  async setFullscreen(fullscreen: boolean): Promise<void> {
    if (this.appWindow) {
      await this.appWindow.setSimpleFullscreen(fullscreen);
      return;
    }
    if (fullscreen) {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    } else if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  }
}
