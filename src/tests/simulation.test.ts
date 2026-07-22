import { describe, expect, test } from "vitest";
import { createSimulation, updateSimulation } from "../game/simulation";

describe("starter simulation", () => {
  test("is deterministic for the same seed and input", () => {
    const first = createSimulation(42);
    const second = createSimulation(42);
    for (let index = 0; index < 120; index += 1) {
      updateSimulation(first, { x: 1, y: -0.25 }, 1 / 120);
      updateSimulation(second, { x: 1, y: -0.25 }, 1 / 120);
    }
    expect(first.player).toEqual(second.player);
    expect(first.target).toEqual(second.target);
    expect(first.score).toBe(second.score);
  });

  test("keeps the player inside normalized world bounds", () => {
    const simulation = createSimulation();
    updateSimulation(simulation, { x: -1, y: -1 }, 10);
    expect(simulation.player).toEqual({ x: 0.05, y: 0.08 });
  });
});
