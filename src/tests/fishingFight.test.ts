import { describe, expect, test } from "vitest";
import {
  FISHING_FIGHT_OPENING_RUN_SECONDS,
  fishingFightBehaviour,
  fishingFightCue,
  fishingStruggleIntensity,
  RESTING_FIGHT_MOTION,
  stepFightMotion,
  stepFishingFight,
} from "../game/fishingFight";
import { FISH, type FishSpecies } from "../game/balance";
import { FISHING_SPECIES_FIGHT_PROFILES } from "../game/fishingBehaviour";

const freshFight = {
  progress: 0,
  tension: 0.2,
  stamina: 1,
  criticalSeconds: 0,
};

function playFight(species: FishSpecies, reelTier = 0): { seconds: number; broken: boolean; maximumTension: number } {
  let meters = { ...freshFight };
  let seconds = 0;
  let maximumTension = meters.tension;
  let broken = false;
  while (seconds < 45 && meters.progress < 1 && !broken) {
    const pose = fishingFightBehaviour(species, seconds, meters.stamina);
    const cue = fishingFightCue({ ...meters, landingAt: null, behaviour: pose.kind, struggle: pose.intensity });
    const next = stepFishingFight(
      species,
      meters,
      cue === "reel" || cue === "resume",
      seconds,
      FISH[species].depthTier,
      1 / 120,
      1,
      reelTier,
    );
    meters = next;
    maximumTension = Math.max(maximumTension, next.tension);
    broken = next.broken;
    seconds += 1 / 120;
  }
  return { seconds, broken, maximumTension };
}

function holdFight(species: FishSpecies): {
  landed: boolean;
  broken: boolean;
  maximumTension: number;
} {
  let meters = { ...freshFight };
  let seconds = 0;
  let maximumTension = meters.tension;
  let broken = false;
  while (seconds < 45 && meters.progress < 1 && !broken) {
    const next = stepFishingFight(
      species,
      meters,
      true,
      seconds,
      FISH[species].depthTier,
      1 / 120,
    );
    meters = next;
    broken = next.broken;
    maximumTension = Math.max(maximumTension, next.tension);
    seconds += 1 / 120;
  }
  return {
    landed: meters.progress >= 1,
    broken,
    maximumTension,
  };
}

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
    expect(Math.max(...samples.map((pose) => pose.intensity))).toBeGreaterThan(0.55);
    expect(fishingStruggleIntensity("bluegill", 0, 1)).toBe(fishingFightBehaviour("bluegill", 0, 1).intensity);
  });

  test("every hooked species immediately begins an escape run", () => {
    for (const species of Object.keys(FISH) as FishSpecies[]) {
      const opening = fishingFightBehaviour(species, 0, 1);
      const stillOpening = fishingFightBehaviour(species, FISHING_FIGHT_OPENING_RUN_SECONDS - 0.01, 1);
      expect(opening.kind, species).toBe("run");
      expect(opening.intensity, species).toBeGreaterThan(0.3);
      expect(stillOpening.kind, species).toBe("run");
    }
  });

  test("tired fish stop racing away and stay in a lull", () => {
    const tired = samplePose("bluegill", 0.12);
    expect(tired.every((pose) => pose.kind === "calm")).toBe(true);
  });

  test("reeling in a lull gains ground and cannot increase tension", () => {
    const calmAge = samplePose("bluegill").findIndex((pose) => pose.kind === "calm") * 0.1;
    const pulling = stepFishingFight("bluegill", freshFight, true, calmAge, 0, 0.1);
    expect(pulling.behaviour).toBe("calm");
    expect(pulling.progress).toBeGreaterThan(freshFight.progress);
    expect(pulling.tension).toBeLessThan(freshFight.tension);
    expect(pulling.stamina).toBeLessThan(freshFight.stamina);
  });

  test("giving line during a run slacks tension because the fish races away", () => {
    const runAge = samplePose("bluegill").findIndex((pose) => pose.kind === "run") * 0.1;
    const calmAge = samplePose("bluegill").findIndex((pose) => pose.kind === "calm") * 0.1;
    const loaded = { ...freshFight, tension: 0.82, progress: 0.4 };
    const givingLine = stepFishingFight("bluegill", loaded, false, runAge, 0, 0.1);
    const restingCalm = stepFishingFight("bluegill", loaded, false, calmAge, 0, 0.1);
    expect(givingLine.behaviour).toBe("run");
    expect(givingLine.tension).toBeLessThan(loaded.tension);
    expect(givingLine.tension).toBeLessThan(restingCalm.tension);
    expect(givingLine.progress).toBeLessThan(restingCalm.progress);
  });

  test("horsing a running fish loads the line faster than reeling a lull", () => {
    const runAge = samplePose("bluegill").findIndex((pose) => pose.kind === "run") * 0.1;
    const calmAge = samplePose("bluegill").findIndex((pose) => pose.kind === "calm") * 0.1;
    const horsing = stepFishingFight("bluegill", freshFight, true, runAge, 0, 0.1);
    const lull = stepFishingFight("bluegill", freshFight, true, calmAge, 0, 0.1);
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

  test("powerful deep fish pull harder and reel more slowly", () => {
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

  test("continuous unchecked reeling can still break the line against a powerful fish", () => {
    let fight = freshFight;
    let broken = false;
    for (let index = 0; index < 450 && !broken; index += 1) {
      const next = stepFishingFight("yellowtailKingfish", fight, true, index * 0.1, 0, 0.1);
      fight = next;
      broken = next.broken;
    }
    expect(broken).toBe(true);
  });

  test("Sunward Shoal starters stay forgiving even with a continuous reel", () => {
    for (const species of ["bluegill", "yellowPerch", "emeraldShiner"] as const) {
      const result = holdFight(species);
      expect(result.landed, species).toBe(true);
      expect(result.broken, species).toBe(false);
      expect(result.maximumTension, species).toBeLessThan(0.62);
    }
  });

  test("five reel-power tiers increase landing speed without adding tension", () => {
    const calmAge = samplePose("lakeSturgeon").findIndex((pose) => pose.kind === "calm") * 0.1;
    const baseStep = stepFishingFight("lakeSturgeon", freshFight, true, calmAge, 3, 0.1, 1, 0);
    const maximumStep = stepFishingFight("lakeSturgeon", freshFight, true, calmAge, 3, 0.1, 1, 5);
    const base = playFight("lakeSturgeon", 0);
    const maximumReel = playFight("lakeSturgeon", 5);
    expect(maximumStep.progress / baseStep.progress).toBeCloseTo(1.6);
    expect(maximumStep.tension).toBeCloseTo(baseStep.tension);
    expect(maximumReel.seconds).toBeLessThan(base.seconds * 0.8);
    expect(maximumReel.maximumTension).toBeCloseTo(base.maximumTension);
    expect(maximumReel.broken).toBe(false);
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
    const calmAge = samplePose("bluegill", 0.5).findIndex((pose) => pose.kind === "calm") * 0.1;
    const waiting = stepFishingFight("bluegill", { ...freshFight, stamina: 0.5 }, false, calmAge, 0, 0.1);
    expect(waiting.behaviour).toBe("calm");
    expect(waiting.progress).toBe(0);
    expect(waiting.stamina).toBeGreaterThan(0.5);
  });

  test("glides through continuous species-specific fight paths without position jumps", () => {
    const runPose = { kind: "run" as const, intensity: 0.9 };
    const dt = 1 / 120;
    let motion = RESTING_FIGHT_MOTION;
    const path: Array<{ x: number; y: number }> = [];
    for (let index = 0; index < 600; index += 1) {
      motion = stepFightMotion("yellowtailKingfish", motion, runPose, index * dt, 1, dt);
      path.push({ x: motion.x, y: motion.y });
    }
    motion = RESTING_FIGHT_MOTION;
    const repeated = [];
    for (let index = 0; index < 600; index += 1) {
      motion = stepFightMotion("yellowtailKingfish", motion, runPose, index * dt, 1, dt);
      repeated.push({ x: motion.x, y: motion.y });
    }
    expect(path).toEqual(repeated);
    expect(Math.max(...path.map((point) => Math.hypot(point.x, point.y)))).toBeGreaterThan(0.08);
    const displacements = path.slice(1).map((point, index) => Math.hypot(
      point.x - path[index]!.x,
      point.y - path[index]!.y,
    ));
    expect(Math.max(...displacements)).toBeLessThanOrEqual(
      FISHING_SPECIES_FIGHT_PROFILES.yellowtailKingfish.maximumSpeed * dt + 0.00001,
    );

    const afterRun = motion;
    const calmed = stepFightMotion(
      "yellowtailKingfish",
      afterRun,
      { kind: "calm", intensity: 0.1 },
      5,
      1,
      dt,
    );
    expect(Math.hypot(calmed.x - afterRun.x, calmed.y - afterRun.y)).toBeLessThan(0.004);
  });

  test("gives every species a researched fight signature", () => {
    const species = Object.keys(FISH) as FishSpecies[];
    const signatures = species.map((fish) => JSON.stringify(FISHING_SPECIES_FIGHT_PROFILES[fish]));
    expect(new Set(signatures).size).toBe(species.length);
    expect(FISHING_SPECIES_FIGHT_PROFILES.northernPike.style).toBe("ambush-surge");
    expect(FISHING_SPECIES_FIGHT_PROFILES.largemouthBass.style).toBe("leaping-thrash");
    expect(FISHING_SPECIES_FIGHT_PROFILES.burbot.style).toBe("bottom-writhe");
    expect(FISHING_SPECIES_FIGHT_PROFILES.yellowtailKingfish.style).toBe("power-dive");
    expect(FISHING_SPECIES_FIGHT_PROFILES.mulloway.style).toBe("long-run");
  });

  test("lands each species in a deliberate browser-game timing band with correct tension play", () => {
    const results = Object.fromEntries(
      (Object.keys(FISH) as FishSpecies[]).map((species) => [species, playFight(species)]),
    ) as Record<FishSpecies, ReturnType<typeof playFight>>;
    expect(Object.values(results).every((result) => !result.broken)).toBe(true);
    expect(Object.values(results).every((result) => result.maximumTension < 0.74)).toBe(true);
    expect(results.bluegill.seconds).toBeGreaterThanOrEqual(3.5);
    expect(results.bluegill.seconds).toBeLessThanOrEqual(5.5);
    expect(results.northernPike.seconds).toBeGreaterThanOrEqual(6);
    expect(results.northernPike.seconds).toBeLessThanOrEqual(9);
    expect(results.bowfin.seconds).toBeGreaterThanOrEqual(9);
    expect(results.bowfin.seconds).toBeLessThanOrEqual(15);
    expect(results.yellowtailKingfish.seconds).toBeGreaterThanOrEqual(18);
    expect(results.yellowtailKingfish.seconds).toBeLessThanOrEqual(24);
    expect(results.lakeSturgeon.seconds).toBeGreaterThanOrEqual(19);
    expect(results.lakeSturgeon.seconds).toBeLessThanOrEqual(24);
    expect(results.mulloway.seconds).toBeGreaterThanOrEqual(24);
    expect(results.mulloway.seconds).toBeLessThanOrEqual(30);
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
