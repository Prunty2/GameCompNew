import { describe, expect, it } from "vitest";
import { createSeagullFlockPlan } from "../game/menuSeagulls";

function sequenceRandom(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length] ?? 0;
}

describe("main-menu seagull flock plans", () => {
  it("creates groups within the requested two-to-five bird range", () => {
    expect(createSeagullFlockPlan(1_280, 720, () => 0).flights).toHaveLength(2);
    expect(createSeagullFlockPlan(1_280, 720, () => 0.999).flights).toHaveLength(5);
  });

  it("varies individual paths, timing, scale, and flap phase within one flock", () => {
    const random = sequenceRandom([0.7, 0.2, 0.4, 0.8, 0.1, 0.65, 0.3, 0.9, 0.55]);
    const plan = createSeagullFlockPlan(1_280, 720, random);
    const serializedPaths = plan.flights.map((flight) => JSON.stringify(flight.keyframes));

    expect(plan.flights.length).toBeGreaterThanOrEqual(2);
    expect(new Set(serializedPaths).size).toBe(plan.flights.length);
    expect(new Set(plan.flights.map((flight) => flight.durationMs)).size).toBeGreaterThan(1);
    expect(new Set(plan.flights.map((flight) => flight.size)).size).toBeGreaterThan(1);
    expect(new Set(plan.flights.map((flight) => flight.flapDelayMs)).size).toBeGreaterThan(1);
  });
});
