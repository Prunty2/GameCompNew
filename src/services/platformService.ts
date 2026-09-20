export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface CrazyGamesSdk {
  init(): Promise<void>;
  game?: {
    loadingStart?(): void;
    loadingStop?(): void;
    gameplayStart?(): void;
    gameplayStop?(): void;
  };
  data?: SaveStorage;
}

declare global {
  interface Window {
    CrazyGames?: { SDK?: CrazyGamesSdk };
  }
}

const SDK_TIMEOUT_MS = 1_500;

async function loadBrowserSdk(): Promise<void> {
  if (window.CrazyGames?.SDK) return;
  await new Promise<void>((resolve) => {
    const script = document.createElement("script");
    const finish = (): void => {
      clearTimeout(timeout);
      script.onload = null;
      script.onerror = null;
      resolve();
    };
    const timeout = setTimeout(finish, SDK_TIMEOUT_MS);
    script.src = "https://sdk.crazygames.com/crazygames-sdk-v3.js";
    script.async = true;
    script.onload = finish;
    script.onerror = finish;
    document.head.append(script);
  });
}

export class PlatformService {
  private sdk: CrazyGamesSdk | null = null;
  saveStorage: SaveStorage = window.localStorage;

  async initialize(): Promise<void> {
    // Desktop bundles own their save locally and must start without the network.
    if (import.meta.env.MODE === "desktop") return;
    await loadBrowserSdk();
    const sdk = window.CrazyGames?.SDK;
    if (!sdk) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        sdk.init(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error("SDK initialization timed out.")), SDK_TIMEOUT_MS);
        }),
      ]);
      this.sdk = sdk;
      if (sdk.data) this.saveStorage = sdk.data;
    } catch (error) {
      console.warn("CrazyGames SDK unavailable; using local adapters.", error);
    } finally {
      clearTimeout(timeout);
    }
  }

  loadingStart(): void { this.sdk?.game?.loadingStart?.(); }
  loadingStop(): void { this.sdk?.game?.loadingStop?.(); }
  gameplayStart(): void { this.sdk?.game?.gameplayStart?.(); }
  gameplayStop(): void { this.sdk?.game?.gameplayStop?.(); }
}
