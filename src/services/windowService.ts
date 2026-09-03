import { LogicalSize } from "@tauri-apps/api/dpi";
import { currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";

export const DISPLAY_RESOLUTIONS = [
  { id: "1280x720", width: 1280, height: 720, label: "1280 × 720" },
  { id: "1600x900", width: 1600, height: 900, label: "1600 × 900" },
  { id: "1920x1080", width: 1920, height: 1080, label: "1920 × 1080" },
  { id: "2560x1440", width: 2560, height: 1440, label: "2560 × 1440" },
] as const;

type FixedDisplayResolution = typeof DISPLAY_RESOLUTIONS[number]["id"];

export type DisplayResolution = FixedDisplayResolution | "native";

export interface NativeDisplayMode {
  physicalWidth: number;
  physicalHeight: number;
  logicalWidth: number;
  logicalHeight: number;
}

export interface DisplayResolutionOption {
  id: DisplayResolution;
  width: number;
  height: number;
  label: string;
}

export function displayResolutionOptions(nativeDisplay: NativeDisplayMode | null): DisplayResolutionOption[] {
  const options: DisplayResolutionOption[] = DISPLAY_RESOLUTIONS.map((resolution) => ({ ...resolution }));
  if (nativeDisplay) {
    options.push({
      id: "native",
      width: nativeDisplay.logicalWidth,
      height: nativeDisplay.logicalHeight,
      label: `Native (${nativeDisplay.physicalWidth} × ${nativeDisplay.physicalHeight})`,
    });
  }
  return options;
}

export function isDisplayResolution(value: unknown): value is DisplayResolution {
  return value === "native"
    || (typeof value === "string"
      && DISPLAY_RESOLUTIONS.some((resolution) => resolution.id === value));
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
  private nativeDisplay: NativeDisplayMode | null = null;

  readonly supportsResolution = this.appWindow !== null;
  readonly supportsFullscreen = this.appWindow !== null
    || typeof document.documentElement.requestFullscreen === "function";
  readonly supportsQuit = this.appWindow !== null;

  get displayResolutions(): DisplayResolutionOption[] {
    return displayResolutionOptions(this.nativeDisplay);
  }

  async prepare(): Promise<void> {
    if (!this.appWindow) return;
    try {
      const monitor = await currentMonitor();
      if (!monitor) return;
      const logicalWorkArea = monitor.workArea.size.toLogical(monitor.scaleFactor);
      this.nativeDisplay = {
        physicalWidth: monitor.size.width,
        physicalHeight: monitor.size.height,
        logicalWidth: Math.floor(logicalWorkArea.width),
        logicalHeight: Math.floor(logicalWorkArea.height),
      };
    } catch (error) {
      console.warn("Native display mode could not be read.", error);
    }
  }

  async setResolution(resolution: DisplayResolution): Promise<void> {
    if (!this.appWindow) return;
    const selected = this.displayResolutions.find((candidate) => candidate.id === resolution);
    if (!selected) throw new Error(`Display resolution ${resolution} is unavailable.`);
    await this.appWindow.setSize(new LogicalSize(selected.width, selected.height));
    await this.appWindow.center();
  }

  async setFullscreen(fullscreen: boolean): Promise<void> {
    if (this.appWindow) {
      await this.appWindow.setFullscreen(fullscreen);
      return;
    }
    if (fullscreen) {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    } else if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  }

  async subscribeFullscreenChanges(listener: (fullscreen: boolean) => void): Promise<() => void> {
    if (this.appWindow) {
      const appWindow = this.appWindow;
      let previousFullscreen = await appWindow.isFullscreen();
      return appWindow.onResized(() => {
        void appWindow.isFullscreen().then((fullscreen) => {
          if (fullscreen === previousFullscreen) return;
          previousFullscreen = fullscreen;
          listener(fullscreen);
        }).catch((error) => {
          console.warn("Fullscreen state could not be read.", error);
        });
      });
    }
    const onFullscreenChanged = (): void => listener(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", onFullscreenChanged);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChanged);
  }

  async quit(): Promise<void> {
    await this.appWindow?.close();
  }
}
