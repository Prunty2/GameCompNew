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
      version: 3,
      progress: {
        money: 999_999,
        upgrades: { cargo: 2, engine: 0, lamp: 1 },
        outerUnlocked: false,
        completedContracts: 0,
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
    expect(migrated.version).toBe(3);
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
