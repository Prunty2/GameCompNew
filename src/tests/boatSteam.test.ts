import { describe, expect, it } from "vitest";
import { boatSteamPuffs } from "../game/boatSteam";

describe("boat steam", () => {
  it("keeps its creation cadence independent of boat speed", () => {
    const idlePuffs = boatSteamPuffs(12.5, 0, 0, false);
    const fullSpeedPuffs = boatSteamPuffs(12.5, 1, 1, false);

    expect(fullSpeedPuffs.map((puff) => puff.radius)).toEqual(idlePuffs.map((puff) => puff.radius));
  });

  it("trails behind forward movement", () => {
    const puffs = boatSteamPuffs(12.5, 1, 1, false);

    expect(puffs.some((puff) => puff.x < -0.1)).toBe(true);
    expect(puffs.every((puff) => puff.x < 0.02)).toBe(true);
  });

  it("trails behind reverse movement", () => {
    const puffs = boatSteamPuffs(12.5, 1, -1, false);

    expect(puffs.some((puff) => puff.x > 0.1)).toBe(true);
    expect(puffs.every((puff) => puff.x > -0.02)).toBe(true);
  });

  it("keeps reduced-motion steam compact", () => {
    const fullMotion = boatSteamPuffs(12.5, 1, 1, false);
    const reducedMotion = boatSteamPuffs(12.5, 1, 1, true);
    const fullExtent = Math.max(...fullMotion.map((puff) => Math.abs(puff.x)));
    const reducedExtent = Math.max(...reducedMotion.map((puff) => Math.abs(puff.x)));

    expect(reducedExtent).toBeLessThan(fullExtent * 0.4);
  });

  it("spreads large moving puffs across a long plume", () => {
    const puffs = boatSteamPuffs(12.5, 1, 1, false);

    expect(Math.min(...puffs.map((puff) => puff.x))).toBeLessThan(-0.35);
    expect(Math.min(...puffs.map((puff) => puff.y))).toBeLessThan(-0.3);
    expect(Math.max(...puffs.map((puff) => puff.radius))).toBeGreaterThan(0.12);
  });
});
