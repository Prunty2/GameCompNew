import { describe, expect, it } from "vitest";
import { gameViewportRect, isAspectRatioMode, needsAspectRatioNotice } from "../services/gameViewport";

describe("optional 16:9 viewport", () => {
  it("keeps the full viewport when requested and leaves 16:9 unchanged", () => {
    expect(gameViewportRect(3440, 1440, "fill")).toEqual({ width: 3440, height: 1440, left: 0, top: 0 });
    expect(gameViewportRect(1920, 1080, "16:9")).toEqual({ width: 1920, height: 1080, left: 0, top: 0 });
  });

  it("centers the game with side bars on ultrawide monitors", () => {
    expect(gameViewportRect(3440, 1440, "16:9")).toEqual({ width: 2560, height: 1440, left: 440, top: 0 });
    expect(gameViewportRect(5120, 1440, "16:9")).toEqual({ width: 2560, height: 1440, left: 1280, top: 0 });
  });

  it("uses top and bottom bars on taller windows without stretching", () => {
    expect(gameViewportRect(1920, 1200, "16:9")).toEqual({ width: 1920, height: 1080, left: 0, top: 60 });
    expect(gameViewportRect(720, 1280, "16:9")).toEqual({ width: 720, height: 405, left: 0, top: 437.5 });
  });

  it("recommends 16:9 for other shapes, allowing small rounding differences", () => {
    expect(needsAspectRatioNotice(1280, 720)).toBe(false);
    expect(needsAspectRatioNotice(1366, 768)).toBe(false);
    expect(needsAspectRatioNotice(1920, 1200)).toBe(true);
    expect(needsAspectRatioNotice(3440, 1440)).toBe(true);
    expect(needsAspectRatioNotice(720, 1280)).toBe(true);
    expect(needsAspectRatioNotice(0, 0)).toBe(false);
    expect(isAspectRatioMode("stretch")).toBe(false);
    expect(isAspectRatioMode(true)).toBe(false);
  });
});
