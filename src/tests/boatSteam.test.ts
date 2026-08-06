import { describe, expect, it } from "vitest";
import { boatSteamPuffs } from "../game/boatSteam";

describe("boat steam", () => {
  it("creates deterministic puffs from the sprite atlas", () => {
    const first = boatSteamPuffs(4.25, 0.7, 1, false);
    const second = boatSteamPuffs(4.25, 0.7, 1, false);

    expect(first).toEqual(second);
    expect(first).toHaveLength(8);
    expect(first.every((puff) => puff.spriteIndex >= 0 && puff.spriteIndex < 8)).toBe(true);
    expect(new Set(first.map((puff) => puff.spriteIndex)).size).toBeGreaterThan(1);
  });

  it("trails opposite local movement while continuing to rise", () => {
    const forward = boatSteamPuffs(5.2, 1, 1, false);
    const reverse = boatSteamPuffs(5.2, 1, -1, false);

    expect(average(forward.map((puff) => puff.x))).toBeLessThan(0);
    expect(average(reverse.map((puff) => puff.x))).toBeGreaterThan(0);
    expect(forward.every((puff) => puff.y < 0)).toBe(true);
  });

  it("keeps individual clouds compact instead of stretching them across the plume", () => {
    const puffs = boatSteamPuffs(9.7, 1, 1, false);

    expect(puffs.every((puff) => puff.stretchX <= 0.94)).toBe(true);
    expect(puffs.every((puff) => puff.stretchY >= 0.9)).toBe(true);
    expect(puffs.every((puff) => puff.stretchX / puff.stretchY <= 1.05)).toBe(true);
  });

  it("reduces travel and rise when reduced motion is enabled", () => {
    const moving = boatSteamPuffs(7.4, 1, 1, false);
    const reduced = boatSteamPuffs(7.4, 1, 1, true);

    expect(average(reduced.map((puff) => Math.abs(puff.x)))).toBeLessThan(
      average(moving.map((puff) => Math.abs(puff.x))),
    );
    expect(average(reduced.map((puff) => Math.abs(puff.y)))).toBeLessThan(
      average(moving.map((puff) => Math.abs(puff.y))),
    );
  });
});

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
