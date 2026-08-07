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
        sample.depthOffset.toFixed(4),
        sample.pitch.toFixed(4),
        sample.flex.toFixed(4),
      ]));
    });

    expect(new Set(signatures).size).toBe(species.length);
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
