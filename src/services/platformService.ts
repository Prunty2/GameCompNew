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

export class PlatformService {
  private sdk: CrazyGamesSdk | null = null;
  saveStorage: SaveStorage = window.localStorage;

  async initialize(): Promise<void> {
    const sdk = window.CrazyGames?.SDK;
    if (!sdk) return;
    try {
      await sdk.init();
      this.sdk = sdk;
      if (sdk.data) this.saveStorage = sdk.data;
    } catch (error) {
      console.warn("CrazyGames SDK unavailable; using local adapters.", error);
    }
  }

  loadingStart(): void { this.sdk?.game?.loadingStart?.(); }
  loadingStop(): void { this.sdk?.game?.loadingStop?.(); }
  gameplayStart(): void { this.sdk?.game?.gameplayStart?.(); }
  gameplayStop(): void { this.sdk?.game?.gameplayStop?.(); }
}

