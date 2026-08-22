import { describe, expect, test } from "vitest";
import { fishingFightCue, fishingStruggleIntensity, stepFishingFight } from "../game/fishingFight";

const freshFight = {
  progress: 0,
  tension: 0.2,
  stamina: 1,
  criticalSeconds: 0,
};

describe("fishing fight", () => {
  test("produces deterministic struggle bursts with calm windows", () => {
    const samples = Array.from({ length: 80 }, (_, index) => (
      fishingStruggleIntensity("bluegill", index * 0.1, 1)
    ));
    const repeated = Array.from({ length: 80 }, (_, index) => (
      fishingStruggleIntensity("bluegill", index * 0.1, 1)
    ));
    expect(samples).toEqual(repeated);
    expect(Math.max(...samples)).toBeGreaterThan(0.8);
    expect(Math.min(...samples)).toBeCloseTo(0.08);
  });

  test("reeling gains ground and tension while resting safely lowers tension", () => {
    const pulling = stepFishingFight("bluegill", freshFight, true, 0.5, 0, 0.1);
    expect(pulling.progress).toBeGreaterThan(freshFight.progress);
    expect(pulling.tension).toBeGreaterThan(freshFight.tension);
    expect(pulling.stamina).toBeLessThan(freshFight.stamina);

    const resting = stepFishingFight("bluegill", pulling, false, 0.6, 0, 0.1);
    expect(resting.progress).toBeLessThan(pulling.progress);
    expect(resting.tension).toBeLessThan(pulling.tension);
    expect(resting.stamina).toBeGreaterThan(pulling.stamina);
  });

  test("higher line tiers reduce tension gain", () => {
    const basic = stepFishingFight("lakeSturgeon", freshFight, true, 0.4, 0, 0.1);
    const upgraded = stepFishingFight("lakeSturgeon", freshFight, true, 0.4, 6, 0.1);
    expect(upgraded.tension).toBeLessThan(basic.tension);
    expect(upgraded.progress).toBeCloseTo(basic.progress);
  });

  test("rarer fish pull harder and reel more slowly", () => {
    const sampleFight = (species: "bluegill" | "lakeSturgeon"): { tension: number; progress: number } => (
      Array.from({ length: 100 }, (_, index) => (
        stepFishingFight(species, freshFight, true, index * 0.1, 0, 0.1)
      )).reduce(
        (total, step) => ({
          tension: total.tension + step.tension - freshFight.tension,
          progress: total.progress + step.progress,
        }),
        { tension: 0, progress: 0 },
      )
    );
    const common = sampleFight("bluegill");
    const legendary = sampleFight("lakeSturgeon");
    expect(legendary.tension).toBeGreaterThan(common.tension);
    expect(legendary.progress).toBeLessThan(common.progress);
  });

  test("continuous unchecked reeling eventually breaks the line", () => {
    let fight = freshFight;
    let broken = false;
    for (let index = 0; index < 100 && !broken; index += 1) {
      const next = stepFishingFight("bluegill", fight, true, index * 0.1, 0, 0.1);
      fight = next;
      broken = next.broken;
    }
    expect(broken).toBe(true);
  });

  test("requires one continuous critical-tension window to break", () => {
    const recovered = stepFishingFight(
      "bluegill",
      { ...freshFight, tension: 0.5, criticalSeconds: 0.6 },
      false,
      1,
      0,
      0.1,
    );
    expect(recovered.criticalSeconds).toBe(0);
    expect(recovered.broken).toBe(false);
  });

  test("passive waiting cannot tire a fish", () => {
    const waiting = stepFishingFight("bluegill", { ...freshFight, stamina: 0.5 }, false, 1, 0, 0.1);
    expect(waiting.progress).toBe(0);
    expect(waiting.stamina).toBeGreaterThan(0.5);
  });

  test("maps fight meters onto reel, rest, and resume cues", () => {
    expect(fishingFightCue({ tension: 0.2, struggle: 0.1, progress: 0, landingAt: null })).toBe("reel");
    expect(fishingFightCue({ tension: 0.8, struggle: 0.1, progress: 0.2, landingAt: null })).toBe("release");
    expect(fishingFightCue({ tension: 0.5, struggle: 0.7, progress: 0.2, landingAt: null })).toBe("release");
    expect(fishingFightCue({ tension: 0.2, struggle: 0.7, progress: 0, landingAt: null })).toBe("reel");
    expect(fishingFightCue({ tension: 0.96, struggle: 0.2, progress: 0.4, landingAt: null })).toBe("critical");
    expect(fishingFightCue({ tension: 0.3, struggle: 0.1, progress: 0.4, landingAt: null })).toBe("resume");
    expect(fishingFightCue({ tension: 0.2, struggle: 0.1, progress: 1, landingAt: 12 })).toBe("landed");
  });
});
