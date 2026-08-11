import { describe, expect, test } from "vitest";
import {
  BALANCE,
  FISHING_SPOTS,
  SPOT_RESIDENTS,
  boatClassAt,
  harborById,
  regionSurfaceTintAt,
  spotById,
} from "../game/balance";
import {
  acceptAvailableContract,
  buyBoost,
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
  navigationGuidance,
  nightVisualIntensity,
  recordSurvey,
  releaseCargo,
  resolveCatch,
  shouldShowNightIndicator,
  startFishing,
  tutorialPrompt,
  undock,
  unlockBoostForTesting,
  updateSimulation,
  type InputState,
} from "../game/simulation";
import { estimateRoute } from "../game/stem";

const idle: InputState = {
  travel: 0,
  boost: false,
  hookX: 0,
  hookY: 0,
};

describe("FSHING side-on simulation", () => {
  test("eases night visuals in and out over twenty-five seconds", () => {
    const simulation = createSimulation();
    simulation.elapsed = BALANCE.nightStart;
    expect(nightVisualIntensity(simulation)).toBe(0);
    simulation.elapsed += BALANCE.nightFadeLength / 2;
    expect(nightVisualIntensity(simulation)).toBeCloseTo(0.5);
    simulation.elapsed = BALANCE.nightStart + BALANCE.nightFadeLength;
    expect(nightVisualIntensity(simulation)).toBe(1);
    simulation.elapsed = BALANCE.dayLength - BALANCE.nightFadeLength / 2;
    expect(nightVisualIntensity(simulation)).toBeCloseTo(0.5);
    simulation.elapsed = BALANCE.dayLength;
    expect(nightVisualIntensity(simulation)).toBe(0);
  });

  test("shows the night indicator halfway through dusk until morning", () => {
    const simulation = createSimulation();
    simulation.elapsed = BALANCE.nightStart + BALANCE.nightFadeLength / 2 - 0.01;
    expect(shouldShowNightIndicator(simulation)).toBe(false);
    simulation.elapsed += 0.01;
    expect(shouldShowNightIndicator(simulation)).toBe(true);
    simulation.elapsed = BALANCE.dayLength - 0.01;
    expect(shouldShowNightIndicator(simulation)).toBe(true);
    simulation.elapsed = BALANCE.dayLength;
    expect(shouldShowNightIndicator(simulation)).toBe(false);
  });

  test("spans at least three landscape view widths", () => {
    const harborSpan = harborById("gloam").x - harborById("brindle").x;
    expect(harborSpan / BALANCE.cameraViewWidth).toBeGreaterThanOrEqual(2.9);
    expect(BALANCE.dockRadius).toBeLessThan(BALANCE.cameraViewWidth / 10);
  });

  test("uses three evenly spread fishing spots that cover every species", () => {
    expect(FISHING_SPOTS).toHaveLength(3);
    const gaps = FISHING_SPOTS.slice(1).map((spot, index) => spot.x - FISHING_SPOTS[index]!.x);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(BALANCE.cameraViewWidth);
    expect(new Set(Object.values(SPOT_RESIDENTS).flat())).toEqual(new Set([
      "reedfin",
      "sunPerch",
      "silverDart",
      "needlePike",
      "mossback",
      "lanternEel",
      "gloamGill",
      "violetRay",
      "abyssCrown",
    ]));
  });

  test("keeps navigation guidance aligned with every first-delivery phase", () => {
    const simulation = createSimulation();
    expect(navigationGuidance(simulation)).toMatchObject({ kicker: "JOB AT", label: "Brindle Harbor" });

    expect(acceptAvailableContract(simulation)).toBe(true);
    undock(simulation);
    expect(navigationGuidance(simulation)).toMatchObject({ kicker: "FISH AT", label: "Sunward Shoal" });
    expect(tutorialPrompt(simulation)).toContain("Head right to Sunward Shoal");

    moveBoatForTesting(simulation, spotById("sunwardShoal"));
    expect(tutorialPrompt(simulation)).toBe("Drop the line at Sunward Shoal and catch a Reedfin.");

    simulation.boat.speed = BALANCE.interactionMaxSpeed + 0.001;
    expect(tutorialPrompt(simulation)).toBe("Slow beneath Sunward Shoal, then drop the line to catch a Reedfin.");

    simulation.boat.speed = 0;
    expect(resolveCatch(simulation, "reedfin")).toBe(true);
    expect(navigationGuidance(simulation)).toMatchObject({ kicker: "DELIVER TO", label: "Gloam Ferry" });
    expect(tutorialPrompt(simulation)).toContain("Keep the Reedfin above 35% freshness");

    moveBoatForTesting(simulation, harborById("gloam"));
    expect(tutorialPrompt(simulation)).toBe("Dock at Gloam Ferry and deliver the Reedfin.");
  });

  test("sends spoiled and full-cargo contracts to an actionable next step", () => {
    const spoiled = createSimulation();
    acceptAvailableContract(spoiled);
    undock(spoiled);
    spoiled.cargo = [{ species: "reedfin", freshness: 34 }];
    expect(navigationGuidance(spoiled)).toMatchObject({ kicker: "FISH AT", label: "Sunward Shoal" });
    expect(navigationGuidance(spoiled).instruction).toContain("catch a fresher Reedfin");

    const full = createSimulation();
    acceptAvailableContract(full);
    undock(full);
    full.cargo = [
      { species: "sunPerch", freshness: 100 },
      { species: "silverDart", freshness: 100 },
      { species: "needlePike", freshness: 100 },
    ];
    expect(navigationGuidance(full)).toMatchObject({ kicker: "MANAGE CARGO", label: "Brindle Harbor" });
    expect(navigationGuidance(full).instruction).toContain("release a catch");
  });

  test("uses the nearest harbor and actual travel direction outside the opening route", () => {
    const missingJob = createSimulation();
    missingJob.availableContract = null;
    undock(missingJob);
    missingJob.boat.x = 0.89;
    expect(navigationGuidance(missingJob)).toMatchObject({ kicker: "JOB AT", label: "Gloam Ferry" });

    const laterRoute = createSimulation(1, {
      completedContracts: 1,
      upgrades: { cargo: 1, engine: 0, lamp: 0, line: 0 },
    });
    if (!laterRoute.availableContract) throw new Error("Expected a later contract.");
    laterRoute.availableContract = {
      ...laterRoute.availableContract,
      origin: "gloam",
      destination: "brindle",
    };
    laterRoute.dockedAt = "gloam";
    expect(acceptAvailableContract(laterRoute)).toBe(true);
    undock(laterRoute);
    expect(navigationGuidance(laterRoute).instruction).toContain("Head left to Sunward Shoal");
    laterRoute.cargo = [{ species: laterRoute.activeContract!.species, freshness: 100 }];
    expect(navigationGuidance(laterRoute)).toMatchObject({ kicker: "DELIVER TO", label: "Brindle Harbor" });
    expect(navigationGuidance(laterRoute).instruction).toContain("Head left to Brindle Harbor");
  });

  test("keeps the first-upgrade reminder tied to its harbor", () => {
    const simulation = createSimulation(1, { completedContracts: 1 });
    undock(simulation);

    expect(navigationGuidance(simulation)).toMatchObject({ kicker: "UPGRADE AT", label: "Brindle Harbor" });
    expect(tutorialPrompt(simulation)).toContain("buy one boat upgrade");
  });

  test("blends region surface tints across ecosystem boundaries", () => {
    expect(regionSurfaceTintAt(0.2)).toBe("#2d91a0");
    expect(regionSurfaceTintAt(0.4)).toBe("rgb(62 140 135)");
    expect(regionSurfaceTintAt(0.69)).toBe("rgb(89 108 119)");
    expect(regionSurfaceTintAt(0.9)).toBe("#62527f");
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

  test("unlocks boost for 300 shells and applies a temporary 33% speed increase", () => {
    const simulation = createSimulation(1, { money: 300 });
    expect(buyBoost(simulation)).toBe(true);
    expect(simulation.progress.money).toBe(0);
    expect(simulation.progress.boostUnlocked).toBe(true);
    expect(buyBoost(simulation)).toBe(false);
    undock(simulation);

    for (let index = 0; index < 400; index += 1) {
      updateSimulation(simulation, { ...idle, travel: 1, boost: true }, 1 / 120);
    }
    expect(simulation.boost.active).toBe(true);
    expect(simulation.boat.speed).toBeCloseTo(BALANCE.maxSurfaceSpeed * BALANCE.boostSpeedMultiplier);
  });

  test("locks boost at full heat, cools slowly, and supports a non-persistent test unlock", () => {
    const simulation = createSimulation();
    expect(unlockBoostForTesting(simulation)).toBe(true);
    expect(simulation.progress.boostUnlocked).toBe(false);
    undock(simulation);

    for (let index = 0; index < 80; index += 1) {
      updateSimulation(simulation, { ...idle, travel: 1, boost: true }, 0.1);
    }
    expect(simulation.boost.heat).toBe(1);
    expect(simulation.boost.active).toBe(false);
    expect(simulation.boost.overheated).toBe(true);

    for (let index = 0; index < 74; index += 1) updateSimulation(simulation, idle, 0.1);
    expect(simulation.boost.overheated).toBe(true);
    updateSimulation(simulation, idle, 0.1);
    expect(simulation.boost.heat).toBeCloseTo(BALANCE.boostRecoveryThreshold);
    expect(simulation.boost.overheated).toBe(false);
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
    expect(deliverContract(simulation)).toBe(90);
    expect(simulation.progress.completedContracts).toBe(1);
    expect(simulation.progress.money).toBe(90);
    expect(buyUpgrade(simulation, "cargo")).toBe(true);
    expect(cargoCapacity(simulation)).toBe(4);
    expect(simulation.progress.money).toBe(30);
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
    expect(simulation.mode).toBe("fishing");
    expect(simulation.fishing?.reeling).toMatchObject({ species: "reedfin" });
    expect(tutorialPrompt(simulation)).toBe("Reeling the Reedfin to the boat.");
    expect(simulation.cargo).toEqual([]);
    for (let index = 0; index < 12; index += 1) updateSimulation(simulation, idle, 0.1);
    expect(simulation.mode).toBe("cruising");
    expect(simulation.cargo).toEqual([{ species: "reedfin", freshness: 100 }]);
  });

  test("moves the fishing hook at the slower balanced steering speed", () => {
    const simulation = createSimulation(9);
    expect(startFishing(simulation, "sunwardShoal")).toBe(true);
    const startingHook = simulation.fishing?.hook;
    if (!startingHook) throw new Error("Expected a fishing hook.");
    const startX = startingHook.x;
    const startY = startingHook.y;

    updateSimulation(simulation, { ...idle, hookX: 1, hookY: 1 }, 0.1);

    expect(simulation.fishing?.hook.x).toBeCloseTo(startX + BALANCE.fishingHookSpeed * 0.1);
    expect(simulation.fishing?.hook.y).toBeCloseTo(startY + BALANCE.fishingHookSpeed * 0.1);
    expect(BALANCE.fishingHookSpeed).toBe(0.25);
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
    simulation.progress.upgrades.line = 1;
    expect(startFishing(simulation, "mosswaterPool")).toBe(true);
    expect(simulation.fishing?.targets).toHaveLength(SPOT_RESIDENTS.mosswaterPool.length * 2);
    expect(new Set(simulation.fishing?.targets.map((target) => target.species))).toEqual(
      new Set(SPOT_RESIDENTS.mosswaterPool),
    );
    expect(maxFishingDepth(simulation)).toBeCloseTo(0.425);

    const deepTarget = simulation.fishing?.targets.find((target) => target.species === "mossback");
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
    expect(FISHING_SPOTS).toHaveLength(3);
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
    const incorrect = recordSurvey(simulation, "mosswaterPool", "reedfin");
    expect(incorrect.correct).toBe(false);
    expect(incorrect.expected).toBe("mossback");
    expect(incorrect.explanation).toContain("12°C");
    expect(simulation.progress.discovered).toContain("mossback");

    const correct = recordSurvey(simulation, "sunwardShoal", "reedfin");
    expect(correct.correct).toBe(true);
    const contractTarget = recordSurvey(simulation, "sunwardShoal", "sunPerch", "sunPerch");
    expect(contractTarget.correct).toBe(true);
    expect(contractTarget.expected).toBe("sunPerch");
    expect(simulation.progress.learning.surveysCompleted).toBe(3);
    expect(simulation.progress.learning.correctPredictions).toBe(2);
    expect(learningAccuracy(simulation)).toBe(67);
  });

  test("allows repeated catches and releases unneeded cargo", () => {
    const simulation = createSimulation();
    expect(resolveCatch(simulation, "reedfin")).toBe(true);
    expect(simulation.progress.discovered).toContain("reedfin");

    expect(releaseCargo(simulation, 0)).toBe(true);
    expect(simulation.cargo).toHaveLength(0);
    expect(resolveCatch(simulation, "reedfin")).toBe(true);
    expect(simulation.cargo).toHaveLength(1);
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

});
