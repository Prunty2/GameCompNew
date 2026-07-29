import { describe, expect, test } from "vitest";
import { BALANCE, harborById, spotById } from "../game/balance";
import {
  acceptAvailableContract,
  buyPermit,
  buyUpgrade,
  cargoCapacity,
  createSimulation,
  damageBoat,
  deliverContract,
  getInteractionPrompt,
  interact,
  moveBoatForTesting,
  resolveCatch,
  startFishing,
  undock,
  updateSimulation,
  type InputState,
} from "../game/simulation";

const idle: InputState = {
  travel: 0,
  boost: false,
  brake: false,
  hookX: 0,
  hookY: 0,
};

describe("FSHING side-on simulation", () => {
  test("is deterministic for the same seed, progress, and horizontal input", () => {
    const first = createSimulation(42);
    const second = createSimulation(42);
    undock(first);
    undock(second);
    for (let index = 0; index < 240; index += 1) {
      const input: InputState = {
        ...idle,
        travel: index < 170 ? 1 : -1,
        boost: index > 80 && index < 130,
      };
      updateSimulation(first, input, 1 / 120);
      updateSimulation(second, input, 1 / 120);
    }
    expect(first.boat).toEqual(second.boat);
    expect(first.elapsed).toBe(second.elapsed);
    expect(first.availableContract).toEqual(second.availableContract);

    startFishing(first, "sunwardShoal");
    startFishing(second, "sunwardShoal");
    expect(first.fishing).toEqual(second.fishing);
  });

  test("travels only on the horizontal surface, changes facing, brakes, and respects bounds", () => {
    const simulation = createSimulation();
    undock(simulation);
    const startX = simulation.boat.x;
    for (let index = 0; index < 120; index += 1) {
      updateSimulation(simulation, { ...idle, travel: 1 }, 1 / 120);
    }
    expect(simulation.boat.x).toBeGreaterThan(startX);
    expect(simulation.boat.facing).toBe(1);
    expect(simulation.boat.y).toBeCloseTo(0.61);
    expect(simulation.boat.speed).toBeGreaterThan(0);

    for (let index = 0; index < 60; index += 1) {
      updateSimulation(simulation, { ...idle, brake: true }, 1 / 120);
    }
    expect(Math.abs(simulation.boat.speed)).toBeLessThan(0.001);

    for (let index = 0; index < 100; index += 1) {
      updateSimulation(simulation, { ...idle, travel: -1 }, 1 / 120);
    }
    expect(simulation.boat.facing).toBe(-1);

    simulation.boat.x = 0.95;
    simulation.boat.speed = BALANCE.maxSurfaceSpeed;
    updateSimulation(simulation, idle, 0.1);
    expect(simulation.boat.x).toBeLessThanOrEqual(0.955);
  });

  test("boost accelerates in the facing direction", () => {
    const simulation = createSimulation();
    undock(simulation);
    simulation.boat.facing = -1;
    updateSimulation(simulation, { ...idle, boost: true }, 0.1);
    expect(simulation.boat.speed).toBeLessThan(0);
    expect(simulation.boat.x).toBeLessThan(0.11);
  });

  test("accelerates gradually and respects the reduced maximum speed", () => {
    const simulation = createSimulation();
    undock(simulation);
    updateSimulation(simulation, { ...idle, travel: 1 }, 0.1);
    expect(simulation.boat.speed).toBeCloseTo(BALANCE.horizontalThrust * 0.1);
    expect(simulation.boat.speed).toBeLessThan(BALANCE.maxSurfaceSpeed);

    for (let index = 0; index < 60; index += 1) {
      updateSimulation(simulation, { ...idle, travel: 1 }, 1 / 60);
    }
    expect(simulation.boat.speed).toBeLessThan(BALANCE.maxSurfaceSpeed);

    for (let index = 0; index < 120; index += 1) {
      updateSimulation(simulation, { ...idle, travel: 1 }, 1 / 60);
    }
    expect(simulation.boat.speed).toBe(BALANCE.maxSurfaceSpeed);
  });

  test("completes the tutorial contract and buys the first upgrade", () => {
    const simulation = createSimulation();
    expect(acceptAvailableContract(simulation)).toBe(true);
    undock(simulation);
    moveBoatForTesting(simulation, spotById("sunwardShoal"));
    expect(getInteractionPrompt(simulation)?.label).toContain("Drop line");
    expect(startFishing(simulation, "sunwardShoal")).toBe(true);
    expect(resolveCatch(simulation, "reedfin")).toBe(true);
    expect(simulation.cargo[0]?.freshness).toBe(100);

    moveBoatForTesting(simulation, harborById("gloam"));
    expect(getInteractionPrompt(simulation)?.label).toContain("Gloam Ferry");
    interact(simulation);
    expect(deliverContract(simulation)).toBe(90);
    expect(simulation.progress.completedContracts).toBe(1);
    expect(simulation.progress.money).toBe(90);
    expect(buyUpgrade(simulation, "cargo")).toBe(true);
    expect(cargoCapacity(simulation)).toBe(2);
    expect(simulation.progress.money).toBe(30);
  });

  test("catches a fish when the steered hook reaches its side-view silhouette", () => {
    const simulation = createSimulation(9);
    acceptAvailableContract(simulation);
    undock(simulation);
    expect(startFishing(simulation, "sunwardShoal")).toBe(true);
    const target = simulation.fishing?.targets[0];
    if (!simulation.fishing || !target) throw new Error("Expected a fishing target.");
    simulation.fishing.hook = { x: target.x, y: target.y };
    updateSimulation(simulation, idle, 0);
    expect(simulation.mode).toBe("cruising");
    expect(simulation.cargo).toEqual([{ species: "reedfin", freshness: 100 }]);
  });

  test("ages cargo and rejects a spoiled tutorial delivery", () => {
    const simulation = createSimulation();
    acceptAvailableContract(simulation);
    resolveCatch(simulation, "reedfin");
    undock(simulation);
    for (let index = 0; index < 1_100; index += 1) updateSimulation(simulation, idle, 0.1);
    expect(simulation.cargo[0]?.freshness).toBeLessThan(35);
    moveBoatForTesting(simulation, harborById("gloam"));
    interact(simulation);
    expect(deliverContract(simulation)).toBeNull();
  });

  test("enforces cargo capacity and gates only the Outer Gloam fishing ground", () => {
    const simulation = createSimulation();
    expect(resolveCatch(simulation, "needlePike")).toBe(true);
    expect(resolveCatch(simulation, "reedfin")).toBe(false);
    expect(startFishing(simulation, "outerGloam")).toBe(false);

    simulation.progress.money = BALANCE.permitCost;
    expect(buyPermit(simulation)).toBe(true);
    simulation.cargo = [];
    expect(startFishing(simulation, "outerGloam")).toBe(true);

    const unlockedTravel = createSimulation();
    undock(unlockedTravel);
    unlockedTravel.boat.x = 0.7;
    for (let index = 0; index < 240; index += 1) {
      updateSimulation(unlockedTravel, { ...idle, travel: 1 }, 1 / 120);
    }
    expect(unlockedTravel.boat.x).toBeGreaterThan(0.76);
  });

  test("rescues at critical damage without making progress unrecoverable", () => {
    const simulation = createSimulation(1, { money: 12 });
    undock(simulation);
    resolveCatch(simulation, "reedfin");
    damageBoat(simulation, 100);
    expect(simulation.dockedAt).not.toBeNull();
    expect(simulation.cargo).toEqual([]);
    expect(simulation.progress.money).toBe(0);
    expect(simulation.boat.damage).toBeLessThan(100);
    expect(simulation.events.some((event) => event.type === "rescued")).toBe(true);
  });
});
