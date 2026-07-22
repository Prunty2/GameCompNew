import type { SaveStorage } from "./platformService";

const SAVE_KEY = "gamecomp-new.save";

export interface SaveData {
  version: 1;
  highScore: number;
  muted: boolean;
}

export function defaultSave(): SaveData {
  return { version: 1, highScore: 0, muted: false };
}

export function loadSave(storage: SaveStorage): SaveData {
  try {
    const raw: unknown = JSON.parse(storage.getItem(SAVE_KEY) ?? "null");
    if (!raw || typeof raw !== "object") return defaultSave();
    const candidate = raw as Record<string, unknown>;
    return {
      version: 1,
      highScore: finiteInteger(candidate.highScore, 0, 999_999),
      muted: candidate.muted === true,
    };
  } catch {
    return defaultSave();
  }
}

export function saveGame(storage: SaveStorage, save: SaveData): void {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (error) {
    console.warn("Progress could not be saved.", error);
  }
}

function finiteInteger(value: unknown, minimum: number, maximum: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(minimum, Math.min(maximum, Math.floor(value)))
    : minimum;
}

