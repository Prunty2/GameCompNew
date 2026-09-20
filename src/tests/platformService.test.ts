import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { PlatformService } from "../services/platformService";

describe("platform startup", () => {
  const localStorage = { getItem: vi.fn(), setItem: vi.fn() };
  const append = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("MODE", "test");
    vi.stubGlobal("window", { localStorage });
    vi.stubGlobal("document", { createElement: () => ({}), head: { append } });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    append.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test("desktop never downloads or initializes the online SDK", async () => {
    vi.stubEnv("MODE", "desktop");
    const init = vi.fn();
    window.CrazyGames = { SDK: { init } };
    const platform = new PlatformService();
    await platform.initialize();
    expect(init).not.toHaveBeenCalled();
    expect(append).not.toHaveBeenCalled();
    expect(platform.saveStorage).toBe(localStorage);
  });

  test("a stalled script cannot block local browser startup", async () => {
    const platform = new PlatformService();
    const startup = platform.initialize();
    await vi.advanceTimersByTimeAsync(1_500);
    await startup;
    expect(append).toHaveBeenCalledOnce();
    expect(platform.saveStorage).toBe(localStorage);
  });

  test("a stalled SDK cannot block startup or later replace local saves", async () => {
    let finish!: () => void;
    const data = { getItem: vi.fn(), setItem: vi.fn() };
    window.CrazyGames = { SDK: { init: () => new Promise<void>((resolve) => { finish = resolve; }), data } };
    const platform = new PlatformService();
    const startup = platform.initialize();
    await vi.advanceTimersByTimeAsync(1_500);
    await startup;
    finish();
    await Promise.resolve();
    expect(platform.saveStorage).toBe(localStorage);
  });

  test("a working browser SDK still owns saves and gameplay notifications", async () => {
    const data = { getItem: vi.fn(), setItem: vi.fn() };
    const gameplayStart = vi.fn();
    window.CrazyGames = { SDK: { init: async () => {}, data, game: { gameplayStart } } };
    const platform = new PlatformService();
    await platform.initialize();
    platform.gameplayStart();
    expect(platform.saveStorage).toBe(data);
    expect(gameplayStart).toHaveBeenCalledOnce();
  });
});
