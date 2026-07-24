import { BALANCE, type UpgradeId } from "../game/balance";
import {
  CONTROL_ACTIONS,
  DEFAULT_CONTROL_BINDINGS,
  isBindableCode,
  type ControlBindings,
} from "../game/controls";
import type { ProgressState } from "../game/simulation";
import type { SaveStorage } from "./platformService";

const SAVE_KEY = "gamecomp-new.save";

export interface GameSettings {
  muted: boolean;
  volume: number;
  highContrast: boolean;
  reducedMotion: boolean;
  controls: ControlBindings;
}

export interface SaveData {
  version: 3;
  progress: ProgressState;
  settings: GameSettings;
}

export function defaultSave(): SaveData {
  return {
    version: 3,
    progress: {
      money: 0,
      upgrades: { cargo: 0, engine: 0, lamp: 0 },
      outerUnlocked: false,
      completedContracts: 0,
    },
    settings: {
      muted: false,
      volume: 0.75,
      highContrast: false,
      reducedMotion: false,
      controls: { ...DEFAULT_CONTROL_BINDINGS },
    },
  };
}

export function loadSave(storage: SaveStorage): SaveData {
  try {
    const raw: unknown = JSON.parse(storage.getItem(SAVE_KEY) ?? "null");
    if (!raw || typeof raw !== "object") return defaultSave();
    const candidate = raw as Record<string, unknown>;
    if (candidate.version === 1) return migrateVersionOne(candidate);
    const progress = objectValue(candidate.progress);
    const upgrades = objectValue(progress.upgrades);
    const settings = objectValue(candidate.settings);
    return {
      version: 3,
      progress: {
        money: finiteInteger(progress.money, 0, 999_999),
        upgrades: readUpgrades(upgrades),
        outerUnlocked: progress.outerUnlocked === true,
        completedContracts: finiteInteger(progress.completedContracts, 0, 99_999),
      },
      settings: {
        muted: settings.muted === true,
        volume: finiteNumber(settings.volume, 0, 1, 0.75),
        highContrast: settings.highContrast === true,
        reducedMotion: settings.reducedMotion === true,
        controls: readControlBindings(settings.controls),
      },
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

function migrateVersionOne(candidate: Record<string, unknown>): SaveData {
  const migrated = defaultSave();
  migrated.settings.muted = candidate.muted === true;
  return migrated;
}

function readControlBindings(value: unknown): ControlBindings {
  const candidate = objectValue(value);
  const bindings = {} as ControlBindings;
  const used = new Set<string>();
  for (const action of CONTROL_ACTIONS) {
    const code = candidate[action];
    const preferred = isBindableCode(code) && !used.has(code) ? code : DEFAULT_CONTROL_BINDINGS[action];
    const fallback = CONTROL_ACTIONS
      .map((fallbackAction) => DEFAULT_CONTROL_BINDINGS[fallbackAction])
      .find((fallbackCode) => !used.has(fallbackCode));
    bindings[action] = !used.has(preferred) ? preferred : fallback ?? DEFAULT_CONTROL_BINDINGS[action];
    used.add(bindings[action]);
  }
  return bindings;
}

function readUpgrades(candidate: Record<string, unknown>): Record<UpgradeId, number> {
  return {
    cargo: finiteInteger(candidate.cargo, 0, BALANCE.maxUpgradeTier),
    engine: finiteInteger(candidate.engine, 0, BALANCE.maxUpgradeTier),
    lamp: finiteInteger(candidate.lamp, 0, BALANCE.maxUpgradeTier),
  };
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function finiteInteger(value: unknown, minimum: number, maximum: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(minimum, Math.min(maximum, Math.floor(value)))
    : minimum;
}

function finiteNumber(value: unknown, minimum: number, maximum: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(minimum, Math.min(maximum, value))
    : fallback;
}
