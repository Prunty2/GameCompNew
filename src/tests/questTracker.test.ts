import { describe, expect, it } from "vitest";
import { questTrackerView } from "../game/questTracker";
import {
  acceptAvailableContract,
  createSimulation,
  resolveCatch,
} from "../game/simulation";

describe("quest tracker", () => {
  it("stays absent until the player accepts an assignment", () => {
    expect(questTrackerView(createSimulation())).toBeNull();
  });

  it("tracks the accepted contract through catch and delivery stages", () => {
    const simulation = createSimulation();
    expect(acceptAvailableContract(simulation)).toBe(true);

    const accepted = questTrackerView(simulation);
    expect(accepted).toMatchObject({
      title: "The Morning Order",
      completedSteps: 1,
      totalSteps: 3,
    });
    expect(accepted?.steps.map((step) => step.current)).toEqual([false, true, false]);

    expect(resolveCatch(simulation, simulation.activeContract!.species)).toBe(true);
    const caught = questTrackerView(simulation);
    expect(caught?.completedSteps).toBe(2);
    expect(caught?.steps.map((step) => step.current)).toEqual([false, false, true]);
  });

  it("returns to the catch stage when the only target specimen is spoiled", () => {
    const simulation = createSimulation();
    acceptAvailableContract(simulation);
    resolveCatch(simulation, simulation.activeContract!.species);
    simulation.cargo[0]!.freshness = 0;

    const spoiled = questTrackerView(simulation);
    expect(spoiled?.completedSteps).toBe(1);
    expect(spoiled?.steps[1]).toMatchObject({ complete: false, current: true });
    expect(spoiled?.instruction).toContain("catch a fresher");
  });
});
