import { describe, expect, test } from "vitest";
import { DEFAULT_CONTROL_BINDINGS } from "../game/controls";
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
        outerUnlocked: "retired legacy field",
        completedContracts: Number.NaN,
      },
      settings: {
        muted: true,
        volume: 12,
        musicVolume: -4,
        highContrast: true,
        reducedMotion: "yes",
        controls: { left: "ArrowLeft", right: "ArrowLeft", action: "Tab" },
      },
    }));
    expect(loadSave(storage)).toEqual({
      version: 15,
      progress: {
        money: 999_999,
        upgrades: { cargo: 7, engine: 0, lamp: 1, line: 0, reel: 0 },
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
        upgradeTutorialStep: "done",
        seasonCompleted: false,
      },
      settings: {
        muted: true,
        volume: 1,
        musicVolume: 0,
        highContrast: true,
        reducedMotion: false,
        resolution: "1280x720",
        fullscreen: false,
        controls: { ...DEFAULT_CONTROL_BINDINGS, left: "ArrowLeft" },
      },
    });
  });

  test("migrates the starter version without carrying theme-neutral score", () => {
    const storage = memoryStorage(JSON.stringify({ version: 1, highScore: 400, muted: true }));
    const migrated = loadSave(storage);
    expect(migrated.progress.money).toBe(0);
    expect(migrated.settings.muted).toBe(true);
    expect(migrated.version).toBe(15);
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
    expect(migrated.version).toBe(15);
    expect(migrated.progress.upgrades).toEqual({ cargo: 2, engine: 1, lamp: 2, line: 0, reel: 0 });
    expect("outerUnlocked" in migrated.progress).toBe(false);
    expect(migrated.progress.money).toBe(140);
    expect(migrated.progress.marketTutorialStep).toBe("done");
  });

  test("closes leftover sale-complete tutorial steps on load", () => {
    const baseline = defaultSave();
    const storage = memoryStorage(JSON.stringify({
      version: 12,
      progress: { ...baseline.progress, marketTutorialStep: "complete", marketSales: 1 },
      settings: baseline.settings,
    }));
    expect(loadSave(storage).progress.marketTutorialStep).toBe("done");
  });

  test("validates display settings and supplies defaults to older saves", () => {
    const baseline = defaultSave();
    const storage = memoryStorage(JSON.stringify({
      version: 14,
      progress: baseline.progress,
      settings: {
        ...baseline.settings,
        resolution: "3840x2160",
        fullscreen: "yes",
      },
    }));
    const loaded = loadSave(storage);
    expect(loaded.version).toBe(15);
    expect(loaded.settings.resolution).toBe("1280x720");
    expect(loaded.settings.fullscreen).toBe(false);

    const validStorage = memoryStorage();
    baseline.settings.resolution = "1920x1080";
    baseline.settings.fullscreen = true;
    saveGame(validStorage, baseline);
    expect(loadSave(validStorage).settings).toEqual(baseline.settings);
  });

  test("migrates removed boost and brake bindings to the W and S hook defaults", () => {
    const baseline = defaultSave();
    const storage = memoryStorage(JSON.stringify({
      version: 5,
      progress: baseline.progress,
      settings: {
        ...baseline.settings,
        controls: {
          left: "KeyA",
          right: "KeyD",
          brake: "KeyS",
          boost: "KeyW",
          action: "KeyE",
          pause: "KeyP",
        },
      },
    }));

    const migrated = loadSave(storage);
    expect(migrated.version).toBe(15);
    expect(migrated.settings.controls).toEqual(DEFAULT_CONTROL_BINDINGS);
  });

  test("validates learning records and species discovery while ignoring removed ecology data", () => {
    const storage = memoryStorage(JSON.stringify({
      version: 5,
      progress: {
        money: 20,
        upgrades: {},
        populations: { bluegill: -5, yellowPerch: "broken", lakeSturgeon: 900, inventedFish: 1 },
        discovered: ["bluegill", "bluegill", "inventedFish", 42],
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
    expect("populations" in loaded.progress).toBe(false);
    expect(loaded.progress.discovered).toEqual(["bluegill"]);
    expect(loaded.progress.learning).toEqual({
      surveysCompleted: 12,
      correctPredictions: 0,
      routePlans: 3,
    });
    expect(loaded.progress.seasonCompleted).toBe(true);
  });

  test("migrates discovered fantasy fish ids to their real species replacements", () => {
    const baseline = defaultSave();
    const storage = memoryStorage(JSON.stringify({
      version: 8,
      progress: {
        ...baseline.progress,
        discovered: ["reedfin", "lanternEel", "abyssCrown", "inventedFish"],
      },
      settings: baseline.settings,
    }));

    expect(loadSave(storage).progress.discovered).toEqual(["bluegill", "bowfin", "lakeSturgeon"]);
  });

  test("round trips valid saves", () => {
    const storage = memoryStorage();
    const save = defaultSave();
    save.progress.money = 92;
    save.progress.upgrades.engine = 1;
    save.progress.discovered = ["bluegill", "whiteSucker"];
    save.progress.upgrades.reel = 5;
    save.settings.reducedMotion = true;
    save.settings.musicVolume = 0.35;
    saveGame(storage, save);
    expect(loadSave(storage)).toEqual(save);
  });

  test("migrates the former music toggle to a volume level", () => {
    const baseline = defaultSave();
    const storage = memoryStorage(JSON.stringify({
      version: 12,
      progress: baseline.progress,
      settings: {
        muted: false,
        volume: 0.4,
        musicEnabled: false,
        highContrast: false,
        reducedMotion: false,
        controls: baseline.settings.controls,
      },
    }));

    const migrated = loadSave(storage);
    expect(migrated.version).toBe(15);
    expect(migrated.settings.musicVolume).toBe(0);
  });
});
