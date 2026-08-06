import { describe, expect, test } from "vitest";
import {
  BALANCE,
  FISHING_SPOTS,
  SPOT_RESIDENTS,
  boatClassAt,
  harborById,
  spotById,
} from "../game/balance";
import {
  acceptAvailableContract,
  buyPermit,
  buyUpgrade,
  cargoCapacity,
  chooseRoute,
  createSimulation,
  damageBoat,
  deliverContract,
  getInteractionPrompt,
  interact,
  learningAccuracy,
  maxFishingDepth,
  moveBoatForTesting,
  recordSurvey,
  releaseCargo,
  resolveCatch,
  startFishing,
  undock,
  updateSimulation,
  type InputState,
} from "../game/simulation";
import { defaultPopulations, estimateRoute } from "../game/stem";

const idle: InputState = {
  travel: 0,
  hookX: 0,
  hookY: 0,
};

describe("FSHING side-on simulation", () => {
  test("spans at least three landscape view widths", () => {
    const harborSpan = harborById("gloam").x - harborById("brindle").x;
    expect(harborSpan / BALANCE.cameraViewWidth).toBeGreaterThanOrEqual(2.9);
    expect(BALANCE.dockRadius).toBeLessThan(BALANCE.cameraViewWidth / 10);
  });

  test("is deterministic for the same seed, progress, and horizontal input", () => {
    const first = createSimulation(42);
    const second = createSimulation(42);
    undock(first);
    undock(second);
    for (let index = 0; index < 240; index += 1) {
      const input: InputState = { ...idle, travel: index < 170 ? 1 : -1 };
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

  test("travels only on the horizontal surface, changes facing, coasts, and respects bounds", () => {
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

    const speedBeforeCoasting = simulation.boat.speed;
    for (let index = 0; index < 60; index += 1) updateSimulation(simulation, idle, 1 / 120);
    expect(simulation.boat.speed).toBeLessThan(speedBeforeCoasting);
    expect(simulation.boat.speed).toBeGreaterThan(0);

    for (let index = 0; index < 240; index += 1) {
      updateSimulation(simulation, { ...idle, travel: -1 }, 1 / 120);
    }
    expect(simulation.boat.facing).toBe(-1);

    simulation.boat.x = 0.95;
    simulation.boat.speed = BALANCE.maxSurfaceSpeed;
    updateSimulation(simulation, idle, 0.1);
    expect(simulation.boat.x).toBeLessThanOrEqual(0.955);
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
    expect(chooseRoute(simulation, "safe")).toBe(true);

    moveBoatForTesting(simulation, harborById("gloam"));
    expect(getInteractionPrompt(simulation)?.label).toContain("Gloam Ferry");
    interact(simulation);
    expect(deliverContract(simulation)).toBe(102);
    expect(simulation.progress.completedContracts).toBe(1);
    expect(simulation.progress.money).toBe(102);
    expect(buyUpgrade(simulation, "cargo")).toBe(true);
    expect(cargoCapacity(simulation)).toBe(4);
    expect(simulation.progress.money).toBe(42);
    expect(simulation.lastDeliveryResult?.populationBonus).toBe(12);
  });

  test("starts a delivery when accepting a contract for an existing catch", () => {
    const simulation = createSimulation();
    expect(resolveCatch(simulation, "reedfin")).toBe(true);
    expect(acceptAvailableContract(simulation)).toBe(true);
    expect(simulation.routeChoice).toBe("fast");

    undock(simulation);
    moveBoatForTesting(simulation, harborById("gloam"));
    interact(simulation);

    expect(deliverContract(simulation)).not.toBeNull();
    expect(simulation.progress.completedContracts).toBe(1);
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

  test("enforces cargo capacity and gates deep permit water", () => {
    const simulation = createSimulation();
    expect(resolveCatch(simulation, "needlePike")).toBe(true);
    expect(resolveCatch(simulation, "reedfin")).toBe(true);
    expect(resolveCatch(simulation, "sunPerch")).toBe(true);
    expect(resolveCatch(simulation, "silverDart")).toBe(false);
    expect(startFishing(simulation, "outerGloam")).toBe(false);

    simulation.progress.money = BALANCE.permitCost;
    expect(buyPermit(simulation)).toBe(true);
    simulation.cargo = [];
    expect(startFishing(simulation, "outerGloam")).toBe(false);
    simulation.progress.upgrades.line = 3;
    expect(startFishing(simulation, "outerGloam")).toBe(true);

    const unlockedTravel = createSimulation();
    undock(unlockedTravel);
    unlockedTravel.boat.x = 0.7;
    for (let index = 0; index < 240; index += 1) {
      updateSimulation(unlockedTravel, { ...idle, travel: 1 }, 1 / 120);
    }
    expect(unlockedTravel.boat.x).toBeGreaterThan(0.76);
  });

  test("fills each fishing site with habitat residents and unlocks depth by line tier", () => {
    const simulation = createSimulation(12);
    undock(simulation);
    expect(startFishing(simulation, "silverBay")).toBe(true);
    expect(simulation.fishing?.targets).toHaveLength(SPOT_RESIDENTS.silverBay.length * 2);
    expect(new Set(simulation.fishing?.targets.map((target) => target.species))).toEqual(
      new Set(SPOT_RESIDENTS.silverBay),
    );
    expect(maxFishingDepth(simulation)).toBeCloseTo(0.3);

    const deepTarget = simulation.fishing?.targets.find((target) => target.species === "needlePike");
    expect(deepTarget?.y).toBeGreaterThan(maxFishingDepth(simulation));
    simulation.progress.upgrades.line = 5;
    expect(maxFishingDepth(simulation)).toBeGreaterThanOrEqual(deepTarget?.y ?? 1);
  });

  test("supports ten cargo slots across seven cargo upgrades", () => {
    const simulation = createSimulation(1, { money: 10_000 });
    expect(cargoCapacity(simulation)).toBe(3);
    for (let tier = 0; tier < BALANCE.maxCargoTier; tier += 1) {
      expect(buyUpgrade(simulation, "cargo")).toBe(true);
    }
    expect(simulation.progress.upgrades.cargo).toBe(7);
    expect(cargoCapacity(simulation)).toBe(10);
    expect(boatClassAt(simulation.progress.upgrades.cargo)).toBe("Lakebreaker");
    expect(buyUpgrade(simulation, "cargo")).toBe(false);
    expect(FISHING_SPOTS).toHaveLength(6);
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

  test("records evidence-based survey predictions and discoveries", () => {
    const simulation = createSimulation();
    const incorrect = recordSurvey(simulation, "silverBay", "mossback");
    expect(incorrect.correct).toBe(false);
    expect(incorrect.expected).toBe("silverDart");
    expect(incorrect.explanation).toContain("18°C");
    expect(simulation.progress.discovered).toContain("silverDart");

    const correct = recordSurvey(simulation, "sunwardShoal", "reedfin");
    expect(correct.correct).toBe(true);
    const contractTarget = recordSurvey(simulation, "sunwardShoal", "sunPerch", "sunPerch");
    expect(contractTarget.correct).toBe(true);
    expect(contractTarget.expected).toBe("sunPerch");
    expect(simulation.progress.learning.surveysCompleted).toBe(3);
    expect(simulation.progress.learning.correctPredictions).toBe(2);
    expect(learningAccuracy(simulation)).toBe(67);
  });

  test("depletes populations, restores released catches, and protects rare stocks", () => {
    const simulation = createSimulation();
    expect(resolveCatch(simulation, "reedfin")).toBe(true);
    expect(simulation.progress.populations.reedfin).toBe(93);
    expect(simulation.progress.discovered).toContain("reedfin");

    expect(releaseCargo(simulation, 0)).toBe(true);
    expect(simulation.progress.populations.reedfin).toBe(100);
    expect(simulation.progress.learning.conservationScore).toBe(7);

    simulation.progress.populations.reedfin = 15;
    expect(resolveCatch(simulation, "reedfin")).toBe(false);
    expect(simulation.cargo).toHaveLength(0);
    expect(simulation.events.some((event) => event.type === "population-protected")).toBe(true);
  });

  test("makes route estimates explicit and keeps surface crossings unobstructed", () => {
    const safe = createSimulation();
    const fast = createSimulation();
    if (!safe.availableContract) throw new Error("Expected a contract.");
    const estimate = estimateRoute(safe.availableContract, 0);
    expect(estimate.distanceKm).toBeGreaterThan(10);
    expect(estimate.fastMinutes).toBeLessThan(estimate.safeMinutes);
    expect(estimate.fastArrivalFreshness).toBeGreaterThan(estimate.safeArrivalFreshness);

    acceptAvailableContract(safe);
    acceptAvailableContract(fast);
    expect(chooseRoute(safe, "safe")).toBe(false);
    expect(resolveCatch(safe, "reedfin")).toBe(true);
    expect(resolveCatch(fast, "reedfin")).toBe(true);
    expect(chooseRoute(safe, "safe")).toBe(true);
    expect(chooseRoute(fast, "fast")).toBe(true);
    undock(safe);
    undock(fast);
    safe.boat.x = 0.429;
    fast.boat.x = 0.429;
    safe.boat.speed = 0.04;
    fast.boat.speed = 0.04;
    const safeDamage = safe.boat.damage;
    const fastDamage = fast.boat.damage;
    updateSimulation(safe, idle, 0.1);
    updateSimulation(fast, idle, 0.1);
    expect(safe.boat.x).toBeGreaterThan(0.43);
    expect(fast.boat.x).toBeGreaterThan(0.43);
    expect(safe.boat.damage).toBe(safeDamage);
    expect(fast.boat.damage).toBe(fastDamage);
    expect(safe.progress.learning.routePlans).toBe(1);
  });

  test("finishes the research season after eight completed deliveries", () => {
    const simulation = createSimulation(4, { completedContracts: 7 });
    const contract = simulation.availableContract;
    if (!contract) throw new Error("Expected a season contract.");
    expect(acceptAvailableContract(simulation)).toBe(true);
    expect(resolveCatch(simulation, contract.species)).toBe(true);
    expect(chooseRoute(simulation, "safe")).toBe(true);
    undock(simulation);
    moveBoatForTesting(simulation, harborById(contract.destination));
    interact(simulation);
    expect(deliverContract(simulation)).not.toBeNull();
    expect(simulation.progress.seasonCompleted).toBe(true);
    expect(simulation.events.some((event) => event.type === "season-complete")).toBe(true);
  });

  test("withholds protected contracts and restores a viable stock through harbor recovery", () => {
    const populations = defaultPopulations();
    for (const species of Object.keys(populations) as Array<keyof typeof populations>) {
      populations[species] = 0;
    }
    const simulation = createSimulation(3, { populations });
    expect(simulation.availableContract).toBeNull();

    for (let visit = 0; visit < 2; visit += 1) {
      undock(simulation);
      moveBoatForTesting(simulation, harborById("brindle"));
      interact(simulation);
    }

    expect(simulation.progress.populations.reedfin).toBe(16);
    expect(simulation.availableContract?.species).toBe("reedfin");
  });
});
