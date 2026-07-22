import { describe, expect, test } from "vitest";
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

  test("clamps untrusted numeric values", () => {
    const storage = memoryStorage(JSON.stringify({ highScore: 99_999_999, muted: true }));
    expect(loadSave(storage)).toEqual({ version: 1, highScore: 999_999, muted: true });
  });

  test("round trips valid saves", () => {
    const storage = memoryStorage();
    const save = { ...defaultSave(), highScore: 12 };
    saveGame(storage, save);
    expect(loadSave(storage)).toEqual(save);
  });
});
