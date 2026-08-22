import { describe, expect, test } from "vitest";
import {
  fishingFightBehaviour,
  fishingFightCue,
  fishingStruggleIntensity,
  stepFishingFight,
} from "../game/fishingFight";

const freshFight = {
  progress: 0,
  tension: 0.2,
  stamina: 1,
  criticalSeconds: 0,
};

function samplePose(species: "bluegill" | "lakeSturgeon", stamina = 1): ReturnType<typeof fishingFightBehaviour>[] {
  return Array.from({ length: 80 }, (_, index) => fishingFightBehaviour(species, index * 0.1, stamina));
}

describe("fishing fight", () => {
  test("cycles deterministically through calm, run, and thrash", () => {
    const samples = samplePose("bluegill");
    const repeated = samplePose("bluegill");
    expect(samples).toEqual(repeated);
    expect(samples.some((pose) => pose.kind === "calm")).toBe(true);
    expect(samples.some((pose) => pose.kind === "run")).toBe(true);
    expect(samples.some((pose) => pose.kind === "thrash")).toBe(true);
    expect(Math.max(...samples.map((pose) => pose.intensity))).toBeGreaterThan(0.7);
    expect(fishingStruggleIntensity("bluegill", 0, 1)).toBe(fishingFightBehaviour("bluegill", 0, 1).intensity);
  });

  test("tired fish stop racing away and stay in a lull", () => {
    const tired = samplePose("bluegill", 0.12);
    expect(tired.every((pose) => pose.kind === "calm")).toBe(true);
  });

  test("reeling in a lull gains ground without dumping the line", () => {
    const calmAge = samplePose("bluegill").findIndex((pose) => pose.kind === "calm") * 0.1;
    const pulling = stepFishingFight("bluegill", freshFight, true, calmAge, 0, 0.1);
    expect(pulling.behaviour).toBe("calm");
    expect(pulling.progress).toBeGreaterThan(freshFight.progress);
    expect(pulling.tension).toBeGreaterThan(freshFight.tension);
    expect(pulling.stamina).toBeLessThan(freshFight.stamina);
  });

  test("giving line during a run slacks tension because the fish races away", () => {
    const runAge = samplePose("bluegill").findIndex((pose) => pose.kind === "run") * 0.1;
    const loaded = { ...freshFight, tension: 0.82, progress: 0.4 };
    const givingLine = stepFishingFight("bluegill", loaded, false, runAge, 0, 0.1);
    const restingCalm = stepFishingFight("bluegill", loaded, false, 0, 0, 0.1);
    expect(givingLine.behaviour).toBe("run");
    expect(givingLine.tension).toBeLessThan(loaded.tension);
    expect(givingLine.tension).toBeLessThan(restingCalm.tension);
    expect(givingLine.progress).toBeLessThan(restingCalm.progress);
  });

  test("horsing a running fish loads the line faster than reeling a lull", () => {
    const runAge = samplePose("bluegill").findIndex((pose) => pose.kind === "run") * 0.1;
    const horsing = stepFishingFight("bluegill", freshFight, true, runAge, 0, 0.1);
    const lull = stepFishingFight("bluegill", freshFight, true, 0, 0, 0.1);
    expect(horsing.behaviour).toBe("run");
    expect(horsing.tension).toBeGreaterThan(lull.tension);
    expect(horsing.progress).toBeLessThan(lull.progress);
  });

  test("higher line tiers reduce tension gain", () => {
    const runAge = samplePose("lakeSturgeon").findIndex((pose) => pose.kind === "run") * 0.1;
    const basic = stepFishingFight("lakeSturgeon", freshFight, true, runAge, 0, 0.1);
    const upgraded = stepFishingFight("lakeSturgeon", freshFight, true, runAge, 6, 0.1);
    expect(upgraded.tension).toBeLessThan(basic.tension);
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
    for (let index = 0; index < 120 && !broken; index += 1) {
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
      0,
      0,
      0.1,
    );
    expect(recovered.criticalSeconds).toBe(0);
    expect(recovered.broken).toBe(false);
  });

  test("passive waiting cannot tire a fish through a lull", () => {
    const waiting = stepFishingFight("bluegill", { ...freshFight, stamina: 0.5 }, false, 0, 0, 0.1);
    expect(waiting.behaviour).toBe("calm");
    expect(waiting.progress).toBe(0);
    expect(waiting.stamina).toBeGreaterThan(0.5);
  });

  test("maps fight behaviour onto reel, run, and resume cues", () => {
    expect(fishingFightCue({ tension: 0.2, progress: 0, landingAt: null, behaviour: "calm" })).toBe("reel");
    expect(fishingFightCue({ tension: 0.3, progress: 0.2, landingAt: null, behaviour: "run" })).toBe("release");
    expect(fishingFightCue({ tension: 0.5, progress: 0.2, landingAt: null, behaviour: "thrash" })).toBe("release");
    expect(fishingFightCue({ tension: 0.8, progress: 0.2, landingAt: null, behaviour: "calm" })).toBe("release");
    expect(fishingFightCue({ tension: 0.96, progress: 0.4, landingAt: null, behaviour: "calm" })).toBe("critical");
    expect(fishingFightCue({ tension: 0.3, progress: 0.4, landingAt: null, behaviour: "calm" })).toBe("resume");
    expect(fishingFightCue({ tension: 0.2, progress: 1, landingAt: 12, behaviour: "calm" })).toBe("landed");
  });
});
