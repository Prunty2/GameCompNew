import { describe, expect, test } from "vitest";
import { FISH, type FishSpecies } from "../game/balance";
import { fishingSpeciesMotion } from "../game/fishingMovement";

describe("species-specific fishing movement", () => {
  test("gives every species a distinct deterministic motion signature", () => {
    const species = Object.keys(FISH) as FishSpecies[];
    const signatures = species.map((fish) => {
      const samples = [0, 0.7, 1.9, 3.4].map((elapsed) => fishingSpeciesMotion(fish, elapsed, 1.2));
      return JSON.stringify(samples.map((sample) => [
        sample.horizontalMultiplier.toFixed(4),
        sample.heading,
        sample.depthOffset.toFixed(4),
        sample.pitch.toFixed(4),
        sample.flex.toFixed(4),
      ]));
    });

    expect(new Set(signatures).size).toBe(species.length);
  });

  test("gives schooling shiners irregular bursts and stop-before-turn direction changes", () => {
    const times = Array.from({ length: 600 }, (_, index) => index * 0.05);
    const emeraldShiner = times.map((elapsed) => fishingSpeciesMotion("emeraldShiner", elapsed, 0.7));
    const intervalsBetweenPeaks: number[] = [];
    let previousPeak = -1;

    emeraldShiner.forEach((motion, index) => {
      if (motion.horizontalMultiplier < 1.8) return;
      if (previousPeak >= 0 && index - previousPeak > 3) intervalsBetweenPeaks.push(index - previousPeak);
      previousPeak = index;
    });

    expect(Math.min(...emeraldShiner.map((motion) => motion.horizontalMultiplier))).toBeLessThan(0.1);
    expect(Math.max(...emeraldShiner.map((motion) => motion.horizontalMultiplier))).toBeGreaterThan(1.8);
    expect(new Set(emeraldShiner.map((motion) => motion.heading))).toEqual(new Set([-1, 1]));
    expect(new Set(intervalsBetweenPeaks).size).toBeGreaterThan(1);
    const headingChanges = emeraldShiner.flatMap((motion, index) => (
      index > 0 && emeraldShiner[index - 1]?.heading !== motion.heading ? [index] : []
    ));
    expect(headingChanges.length).toBeGreaterThan(0);
    expect(headingChanges.every((index) => emeraldShiner[index]!.horizontalMultiplier < 0.12)).toBe(true);
  });

  test("keeps pseudo-random movement deterministic for a given species and phase", () => {
    const first = fishingSpeciesMotion("lakeTrout", 12.345, 4.2);
    const second = fishingSpeciesMotion("lakeTrout", 12.345, 4.2);

    expect(first).toEqual(second);
  });

  test("separates schooling, ambush, ribbon-fin, and benthic behavior", () => {
    const times = Array.from({ length: 80 }, (_, index) => index * 0.1);
    const range = (species: FishSpecies, key: "horizontalMultiplier" | "depthOffset") => {
      const values = times.map((elapsed) => fishingSpeciesMotion(species, elapsed, 0.7)[key]);
      return Math.max(...values) - Math.min(...values);
    };

    expect(range("emeraldShiner", "horizontalMultiplier")).toBeGreaterThan(range("largemouthBass", "horizontalMultiplier"));
    expect(range("bowfin", "depthOffset")).toBeGreaterThan(range("northernPike", "depthOffset"));
    expect(range("burbot", "depthOffset")).toBeLessThan(range("bluegill", "depthOffset"));
  });

  test("makes northern pike wait before rare explosive strikes", () => {
    const motions = Array.from({ length: 1200 }, (_, index) => fishingSpeciesMotion("northernPike", index * 0.05, 0.7));
    expect(motions.filter((motion) => motion.horizontalMultiplier < 0.25).length).toBeGreaterThan(700);
    expect(Math.max(...motions.map((motion) => motion.horizontalMultiplier))).toBeGreaterThan(2.4);
  });
});
