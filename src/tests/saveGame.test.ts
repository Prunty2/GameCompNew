import { describe, expect, test } from "vitest";
import { DEFAULT_CONTROL_BINDINGS } from "../game/controls";
import { defaultPopulations } from "../game/stem";
import { defaultSave, loadSave, saveGame } from "../services/saveGame";
import type { SaveStorage } from "../services/platformService";

function memoryStorage(initial: string | null = null): SaveStorage {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key, next) => { value = next; },
  };
}

describe("versioned save data", () => {
  test("falls back safely for invalid data", () => {
    expect(loadSave(memoryStorage("not-json"))).toEqual(defaultSave());
  });

  test("clamps untrusted progression and settings", () => {
    const storage = memoryStorage(JSON.stringify({
      version: 2,
      progress: {
        money: 99_999_999,
        upgrades: { cargo: 99, engine: -7, lamp: 1.8 },
        outerUnlocked: "yes",
        completedContracts: Number.NaN,
      },
      settings: {
        muted: true,
        volume: 12,
        highContrast: true,
        reducedMotion: "yes",
        controls: { left: "ArrowLeft", right: "ArrowLeft", action: "Tab" },
      },
    }));
    expect(loadSave(storage)).toEqual({
      version: 5,
      progress: {
        money: 999_999,
        upgrades: { cargo: 6, engine: 0, lamp: 1, line: 0 },
        outerUnlocked: false,
        completedContracts: 0,
        populations: defaultPopulations(),
        discovered: [],
        learning: {
          surveysCompleted: 0,
          correctPredictions: 0,
          routePlans: 0,
          conservationScore: 0,
        },
        seasonCompleted: false,
      },
      settings: {
        muted: true,
        volume: 1,
        highContrast: true,
        reducedMotion: false,
        controls: { ...DEFAULT_CONTROL_BINDINGS, left: "ArrowLeft" },
      },
    });
  });

  test("migrates the starter version without carrying theme-neutral score", () => {
    const storage = memoryStorage(JSON.stringify({ version: 1, highScore: 400, muted: true }));
    const migrated = loadSave(storage);
    expect(migrated.progress.money).toBe(0);
    expect(migrated.settings.muted).toBe(true);
    expect(migrated.version).toBe(5);
  });

  test("adds a safe line-depth default to older saves", () => {
    const storage = memoryStorage(JSON.stringify({
      version: 3,
      progress: {
        money: 140,
        upgrades: { cargo: 2, engine: 1, lamp: 2 },
        outerUnlocked: true,
        completedContracts: 4,
      },
      settings: defaultSave().settings,
    }));
    const migrated = loadSave(storage);
    expect(migrated.version).toBe(5);
    expect(migrated.progress.upgrades).toEqual({ cargo: 2, engine: 1, lamp: 2, line: 0 });
    expect(migrated.progress.money).toBe(140);
    expect(migrated.progress.populations).toEqual(defaultPopulations());
  });

  test("validates learning records, species discovery, and populations", () => {
    const storage = memoryStorage(JSON.stringify({
      version: 5,
      progress: {
        money: 20,
        upgrades: {},
        populations: { reedfin: -5, sunPerch: "broken", abyssCrown: 900, inventedFish: 1 },
        discovered: ["reedfin", "reedfin", "inventedFish", 42],
        learning: {
          surveysCompleted: 12.8,
          correctPredictions: -2,
          routePlans: 3,
          conservationScore: Number.POSITIVE_INFINITY,
        },
        seasonCompleted: true,
      },
      settings: defaultSave().settings,
    }));
    const loaded = loadSave(storage);
    expect(loaded.progress.populations.reedfin).toBe(0);
    expect(loaded.progress.populations.abyssCrown).toBe(100);
    expect(loaded.progress.populations.sunPerch).toBe(100);
    expect(loaded.progress.discovered).toEqual(["reedfin"]);
    expect(loaded.progress.learning).toEqual({
      surveysCompleted: 12,
      correctPredictions: 0,
      routePlans: 3,
      conservationScore: 0,
    });
    expect(loaded.progress.seasonCompleted).toBe(true);
  });

  test("round trips valid saves", () => {
    const storage = memoryStorage();
    const save = defaultSave();
    save.progress.money = 92;
    save.progress.upgrades.engine = 1;
    save.settings.reducedMotion = true;
    saveGame(storage, save);
    expect(loadSave(storage)).toEqual(save);
  });
});
