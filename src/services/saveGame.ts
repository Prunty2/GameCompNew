import { BALANCE, FISH, upgradeTierCap, type FishSpecies } from "../game/balance";
import {
  CONTROL_ACTIONS,
  DEFAULT_CONTROL_BINDINGS,
  isBindableCode,
  type ControlBindings,
} from "../game/controls";
import type { MarketTutorialStep, ProgressState, UpgradeProgress, UpgradeTutorialStep } from "../game/simulation";
import type { SaveStorage } from "./platformService";

const SAVE_KEY = "gamecomp-new.save";

export interface GameSettings {
  muted: boolean;
  volume: number;
  musicVolume: number;
  highContrast: boolean;
  reducedMotion: boolean;
  controls: ControlBindings;
}

export interface SaveData {
  version: 14;
  progress: ProgressState;
  settings: GameSettings;
}

export function defaultSave(): SaveData {
  return {
    version: 14,
    progress: {
      money: 0,
      upgrades: { cargo: 0, engine: 0, lamp: 0, line: 0, reel: 0 },
      beachUnlocked: false,
      boostUnlocked: false,
      completedContracts: 0,
      discovered: ["bluegill"],
      learning: {
        surveysCompleted: 0,
        correctPredictions: 0,
        routePlans: 0,
      },
      marketDay: 1,
      marketSales: 0,
      marketEarnings: 0,
      marketTarget: null,
      marketTutorialStep: "inspect",
      upgradeTutorialStep: "locked",
      seasonCompleted: false,
    },
    settings: {
      muted: false,
      volume: 0.75,
      musicVolume: 0.75,
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
    const learning = objectValue(progress.learning);
    const settings = objectValue(candidate.settings);
    return {
      version: 14,
      progress: {
        money: finiteInteger(progress.money, 0, 999_999),
        upgrades: readUpgrades(upgrades),
        beachUnlocked: progress.beachUnlocked === true,
        boostUnlocked: progress.boostUnlocked === true,
        completedContracts: finiteInteger(progress.completedContracts, 0, 99_999),
        discovered: ensureStartingSpecies(readDiscovered(progress.discovered)),
        learning: {
          surveysCompleted: finiteInteger(learning.surveysCompleted, 0, 99_999),
          correctPredictions: finiteInteger(learning.correctPredictions, 0, 99_999),
          routePlans: finiteInteger(learning.routePlans, 0, 99_999),
        },
        marketDay: finiteInteger(progress.marketDay, 1, 99_999),
        marketSales: finiteInteger(progress.marketSales, 0, 99_999),
        marketEarnings: finiteInteger(progress.marketEarnings, 0, 999_999_999),
        marketTarget: readMarketTarget(progress.marketTarget),
        marketTutorialStep: readTutorialStep(
          progress.marketTutorialStep,
          finiteInteger(progress.completedContracts, 0, 99_999),
        ),
        upgradeTutorialStep: readUpgradeTutorialStep(progress),
        seasonCompleted: progress.seasonCompleted === true,
      },
      settings: {
        muted: settings.muted === true,
        volume: finiteNumber(settings.volume, 0, 1, 0.75),
        musicVolume: finiteNumber(
          settings.musicVolume,
          0,
          1,
          settings.musicEnabled === false ? 0 : 0.75,
        ),
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

function readUpgrades(candidate: Record<string, unknown>): UpgradeProgress {
  return {
    cargo: finiteInteger(candidate.cargo, 0, upgradeTierCap("cargo")),
    engine: finiteInteger(candidate.engine, 0, BALANCE.maxUpgradeTier),
    lamp: finiteInteger(candidate.lamp, 0, BALANCE.maxUpgradeTier),
    line: finiteInteger(candidate.line, 0, BALANCE.maxUpgradeTier),
    reel: finiteInteger(candidate.reel, 0, BALANCE.maxReelTier),
  };
}

function readDiscovered(value: unknown): FishSpecies[] {
  if (!Array.isArray(value)) return [];
  const renamedSpecies: Record<string, FishSpecies> = {
    reedfin: "bluegill",
    sunPerch: "yellowPerch",
    silverDart: "emeraldShiner",
    needlePike: "northernPike",
    mossback: "largemouthBass",
    lanternEel: "bowfin",
    gloamGill: "lakeTrout",
    violetRay: "burbot",
    abyssCrown: "lakeSturgeon",
  };
  const discovered = value.flatMap((species): FishSpecies[] => {
    if (typeof species !== "string") return [];
    if (species in FISH) return [species as FishSpecies];
    const migrated = renamedSpecies[species];
    return migrated ? [migrated] : [];
  });
  return [...new Set(discovered)];
}

function ensureStartingSpecies(discovered: FishSpecies[]): FishSpecies[] {
  return discovered.includes("bluegill") ? discovered : ["bluegill", ...discovered];
}

function readMarketTarget(value: unknown): FishSpecies | null {
  return typeof value === "string" && value in FISH ? value as FishSpecies : null;
}

function readTutorialStep(value: unknown, legacyDeliveries: number): MarketTutorialStep {
  if (value === "complete" || value === "done") return "done";
  if (
    value === "inspect"
    || value === "track"
    || value === "catch"
    || value === "sell"
  ) return value;
  return legacyDeliveries > 0 ? "done" : "inspect";
}

function readUpgradeTutorialStep(progress: Record<string, unknown>): UpgradeTutorialStep {
  const value = progress.upgradeTutorialStep;
  if (value === "locked" || value === "open-services" || value === "buy" || value === "done") return value;
  const upgrades = objectValue(progress.upgrades);
  const purchased = finiteInteger(upgrades.cargo, 0, 99) > 0
    || finiteInteger(upgrades.engine, 0, 99) > 0
    || finiteInteger(upgrades.lamp, 0, 99) > 0
    || finiteInteger(upgrades.line, 0, 99) > 0
    || finiteInteger(upgrades.reel, 0, 99) > 0
    || progress.boostUnlocked === true
    || progress.beachUnlocked === true;
  return purchased ? "done" : "locked";
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
