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

  test("mixes faster cruising with irregular bursts and agile turns", () => {
    const times = Array.from({ length: 600 }, (_, index) => index * 0.05);
    const silverDart = times.map((elapsed) => fishingSpeciesMotion("silverDart", elapsed, 0.7));
    const intervalsBetweenPeaks: number[] = [];
    let previousPeak = -1;

    silverDart.forEach((motion, index) => {
      if (motion.horizontalMultiplier < 2.1) return;
      if (previousPeak >= 0 && index - previousPeak > 3) intervalsBetweenPeaks.push(index - previousPeak);
      previousPeak = index;
    });

    expect(Math.min(...silverDart.map((motion) => motion.horizontalMultiplier))).toBeGreaterThan(0.7);
    expect(Math.max(...silverDart.map((motion) => motion.horizontalMultiplier))).toBeGreaterThan(2.4);
    expect(new Set(silverDart.map((motion) => motion.heading))).toEqual(new Set([-1, 1]));
    expect(new Set(intervalsBetweenPeaks).size).toBeGreaterThan(1);
  });

  test("keeps pseudo-random movement deterministic for a given species and phase", () => {
    const first = fishingSpeciesMotion("gloamGill", 12.345, 4.2);
    const second = fishingSpeciesMotion("gloamGill", 12.345, 4.2);

    expect(first).toEqual(second);
  });

  test("separates darting, heavy, serpentine, and gliding behavior", () => {
    const times = Array.from({ length: 80 }, (_, index) => index * 0.1);
    const range = (species: FishSpecies, key: "horizontalMultiplier" | "depthOffset") => {
      const values = times.map((elapsed) => fishingSpeciesMotion(species, elapsed, 0.7)[key]);
      return Math.max(...values) - Math.min(...values);
    };

    expect(range("silverDart", "horizontalMultiplier")).toBeGreaterThan(range("mossback", "horizontalMultiplier"));
    expect(range("lanternEel", "depthOffset")).toBeGreaterThan(range("needlePike", "depthOffset"));
    expect(range("violetRay", "depthOffset")).toBeGreaterThan(range("reedfin", "depthOffset"));
  });
});
