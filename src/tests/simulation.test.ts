import { describe, expect, test } from "vitest";
import {
  BALANCE,
  BEACH_SPOT_RESIDENTS,
  FISHING_SPOTS,
  SPOT_RESIDENTS,
  boatClassAt,
  engineSpeedMultiplier,
  harborById,
  regionSurfaceTintAt,
  spotById,
} from "../game/balance";
import {
  buyBeachAccess,
  beginFishingExit,
  buyBoost,
  buyPermit,
  buyUpgrade,
  cargoCapacity,
  createSimulation,
  damageBoat,
  getInteractionPrompt,
  inspectMarketSpecies,
  interact,
  learningAccuracy,
  maxFishingDepth,
  moveBoatForTesting,
  navigationGuidance,
  nightVisualIntensity,
  recordSurvey,
  releaseCargo,
  restoreCargo,
  resolveCatch,
  sellSpeciesAtMarket,
  shouldShowNightIndicator,
  startFishing,
  trackMarketSpecies,
  tutorialPrompt,
  travelToWorld,
  undock,
  unlockBoostForTesting,
  updateSimulation,
  type InputState,
} from "../game/simulation";
import { strongerHarborFor } from "../game/market";

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
      "bluegill",
      "yellowPerch",
      "emeraldShiner",
      "northernPike",
      "largemouthBass",
      "bowfin",
      "lakeTrout",
      "burbot",
      "lakeSturgeon",
    ]));
  });

  test("keeps navigation guidance aligned with the player-selected market route", () => {
    const simulation = createSimulation();
    expect(navigationGuidance(simulation)).toMatchObject({ kicker: "MARKET AT", label: "Brindle Harbor" });

    inspectMarketSpecies(simulation, "bluegill");
    expect(trackMarketSpecies(simulation, "bluegill")).toBe(true);
    undock(simulation);
    expect(navigationGuidance(simulation)).toMatchObject({ kicker: "FISH AT", label: "Sunward Shoal" });
    expect(tutorialPrompt(simulation)).toContain("Head right to Sunward Shoal");

    moveBoatForTesting(simulation, spotById("sunwardShoal"));
    expect(tutorialPrompt(simulation)).toBe("Drop the line at Sunward Shoal and catch a Bluegill.");

    simulation.boat.speed = BALANCE.interactionMaxSpeed + 0.001;
    expect(tutorialPrompt(simulation)).toBe("Slow beneath Sunward Shoal, then drop the line to catch a Bluegill.");

    simulation.boat.speed = 0;
    expect(resolveCatch(simulation, "bluegill")).toBe(true);
    const betterHarbor = strongerHarborFor("bluegill", simulation.progress.marketDay, simulation.seed);
    expect(navigationGuidance(simulation)).toMatchObject({ kicker: "SELL AT", label: betterHarbor.name });
    expect(tutorialPrompt(simulation)).toContain(betterHarbor.name);

    moveBoatForTesting(simulation, betterHarbor);
    expect(tutorialPrompt(simulation)).toContain(`Dock at ${betterHarbor.name}`);
  });

  test("sends spoiled and full cargo to an actionable next step", () => {
    const spoiled = createSimulation();
    trackMarketSpecies(spoiled, "bluegill");
    undock(spoiled);
    spoiled.cargo = [{ species: "bluegill", freshness: 0 }];
    expect(navigationGuidance(spoiled)).toMatchObject({ kicker: "FISH AT", label: "Sunward Shoal" });
    expect(navigationGuidance(spoiled)?.instruction).toContain("catch a Bluegill");

    const full = createSimulation();
    trackMarketSpecies(full, "bluegill");
    undock(full);
    full.cargo = [
      { species: "yellowPerch", freshness: 100 },
      { species: "emeraldShiner", freshness: 100 },
      { species: "northernPike", freshness: 100 },
    ];
    expect(navigationGuidance(full)).toMatchObject({ kicker: "MANAGE CARGO", label: "Brindle Harbor" });
    expect(navigationGuidance(full)?.instruction).toContain("sell or release a catch");
  });

  test("uses the nearest harbor when the first assignment is active and no species is tracked", () => {
    const simulation = createSimulation();
    simulation.availableContract = null;
    undock(simulation);
    simulation.boat.x = 0.89;
    expect(navigationGuidance(simulation)).toMatchObject({ kicker: "MARKET AT", label: "Gloam Ferry" });
    expect(navigationGuidance(simulation)?.instruction).toContain("choose a fish to track");
  });

  test("hides navigation guidance after the tutorial unless a fish is tracked", () => {
    const simulation = createSimulation(1, { marketTutorialStep: "done" });
    undock(simulation);
    expect(navigationGuidance(simulation)).toBeNull();

    const full = createSimulation(1, { marketTutorialStep: "done" });
    undock(full);
    full.cargo = [
      { species: "yellowPerch", freshness: 100 },
      { species: "emeraldShiner", freshness: 100 },
      { species: "northernPike", freshness: 100 },
    ];
    expect(navigationGuidance(full)).toBeNull();

    expect(trackMarketSpecies(simulation, "bluegill")).toBe(true);
    expect(navigationGuidance(simulation)).toMatchObject({ kicker: "FISH AT", label: "Sunward Shoal" });
  });

  test("untracks a market species when it is tracked again", () => {
    const simulation = createSimulation(1, {
      marketTutorialStep: "done",
      discovered: ["bluegill", "yellowPerch"],
    });
    expect(trackMarketSpecies(simulation, "bluegill")).toBe(true);
    expect(simulation.progress.marketTarget).toBe("bluegill");
    expect(trackMarketSpecies(simulation, "yellowPerch")).toBe(true);
    expect(simulation.progress.marketTarget).toBe("yellowPerch");
    expect(trackMarketSpecies(simulation, "yellowPerch")).toBe(true);
    expect(simulation.progress.marketTarget).toBeNull();
    undock(simulation);
    expect(navigationGuidance(simulation)).toBeNull();
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

  test("applies 15% stronger braking during normal travel", () => {
    const simulation = createSimulation();
    undock(simulation);
    simulation.boat.speed = 0.04;

    updateSimulation(simulation, { ...idle, travel: -1 }, 0.1);

    expect(BALANCE.normalBrakeMultiplier).toBe(1.15);
    const brakingReduction = BALANCE.horizontalThrust * 1.15 * 0.1;
    expect(simulation.boat.speed).toBeCloseTo(0.04 - brakingReduction);
  });

  test("applies 25% stronger braking while boost is active", () => {
    const simulation = createSimulation();
    unlockBoostForTesting(simulation);
    undock(simulation);
    simulation.boat.speed = 0.04;

    updateSimulation(simulation, { ...idle, travel: -1, boost: true }, 0.1);

    expect(BALANCE.boostBrakeMultiplier).toBe(1.25);
    const brakingReduction = BALANCE.horizontalThrust
      * BALANCE.boostThrustMultiplier
      * 1.25
      * 0.1;
    expect(simulation.boost.active).toBe(true);
    expect(simulation.boat.speed).toBeCloseTo(0.04 - brakingReduction);
  });

  test("gives only the maximum engine tier a stronger speed increase", () => {
    expect(engineSpeedMultiplier(BALANCE.maxUpgradeTier - 1)).toBeCloseTo(1.55);
    expect(engineSpeedMultiplier(BALANCE.maxUpgradeTier)).toBeCloseTo(1.95);

    const simulation = createSimulation();
    simulation.progress.upgrades.engine = BALANCE.maxUpgradeTier;
    undock(simulation);
    for (let index = 0; index < 600; index += 1) {
      updateSimulation(simulation, { ...idle, travel: 1 }, 1 / 120);
    }
    expect(simulation.boat.speed).toBeCloseTo(
      BALANCE.maxSurfaceSpeed * BALANCE.maxEngineSpeedMultiplier,
    );
  });

  test("unlocks boost for 300 shells and applies a temporary 35% speed increase", () => {
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

  test("completes the first market assignment through confirmed actions", () => {
    const simulation = createSimulation();
    expect(simulation.progress.marketTutorialStep).toBe("inspect");
    inspectMarketSpecies(simulation, "bluegill");
    expect(simulation.progress.marketTutorialStep).toBe("track");
    expect(trackMarketSpecies(simulation, "bluegill")).toBe(true);
    expect(simulation.progress.marketTutorialStep).toBe("catch");
    undock(simulation);
    moveBoatForTesting(simulation, spotById("sunwardShoal"));
    expect(getInteractionPrompt(simulation)?.label).toContain("Drop line");
    expect(startFishing(simulation, "sunwardShoal")).toBe(true);
    expect(resolveCatch(simulation, "bluegill")).toBe(true);
    expect(simulation.cargo[0]?.freshness).toBe(100);
    expect(simulation.progress.marketTutorialStep).toBe("sell");

    const harbor = strongerHarborFor("bluegill", simulation.progress.marketDay, simulation.seed);
    moveBoatForTesting(simulation, harbor);
    expect(getInteractionPrompt(simulation)?.label).toContain(harbor.name);
    interact(simulation);
    const result = sellSpeciesAtMarket(simulation, "bluegill");
    expect(result?.payment).toBeGreaterThan(0);
    expect(simulation.progress.marketTutorialStep).toBe("complete");
    expect(simulation.progress.marketSales).toBe(1);
    expect(simulation.progress.marketEarnings).toBe(result?.payment);
    expect(simulation.cargo).toEqual([]);
  });

  test("catches a fish when the steered hook reaches its side-view silhouette", () => {
    const simulation = createSimulation(9);
    undock(simulation);
    expect(startFishing(simulation, "sunwardShoal")).toBe(true);
    const target = simulation.fishing?.targets[0];
    if (!simulation.fishing || !target) throw new Error("Expected a fishing target.");
    simulation.fishing.hook = { x: target.x, y: target.y };
    updateSimulation(simulation, idle, 0);
    expect(simulation.mode).toBe("fishing");
    expect(simulation.fishing?.reeling).toMatchObject({ species: "bluegill" });
    expect(tutorialPrompt(simulation)).toBe("Reeling the Bluegill to the boat.");
    expect(simulation.cargo).toEqual([]);
    for (let index = 0; index < 12; index += 1) updateSimulation(simulation, idle, 0.1);
    expect(simulation.mode).toBe("cruising");
    expect(simulation.cargo).toEqual([{ species: "bluegill", freshness: 100 }]);
  });

  test("keeps fishing active while a manual exit rises to the surface", () => {
    const simulation = createSimulation(9);
    expect(startFishing(simulation, "sunwardShoal")).toBe(true);
    expect(beginFishingExit(simulation)).toBe(true);
    expect(simulation.fishing?.exitingAt).toBe(simulation.elapsed);

    for (let index = 0; index < 11; index += 1) updateSimulation(simulation, idle, 0.1);
    expect(simulation.mode).toBe("fishing");
    expect(simulation.cargo).toEqual([]);

    updateSimulation(simulation, idle, 0.1);
    expect(simulation.mode).toBe("cruising");
    expect(simulation.fishing).toBeNull();
    expect(simulation.cargo).toEqual([]);
  });

  test("moves the fishing hook faster upward than horizontally or downward", () => {
    const simulation = createSimulation(9);
    expect(startFishing(simulation, "sunwardShoal")).toBe(true);
    const startingHook = simulation.fishing?.hook;
    if (!startingHook) throw new Error("Expected a fishing hook.");
    const startX = startingHook.x;
    const startY = startingHook.y;

    updateSimulation(simulation, { ...idle, hookX: 1 }, 0.1);

    expect(simulation.fishing?.hook.x).toBeCloseTo(startX + BALANCE.fishingHookHorizontalSpeed * 0.1);
    expect(simulation.fishing?.hook.y).toBeCloseTo(startY);

    updateSimulation(simulation, { ...idle, hookY: 1 }, 0.1);

    expect(simulation.fishing?.hook.y).toBeCloseTo(startY + BALANCE.fishingHookDownSpeed * 0.1);

    updateSimulation(simulation, { ...idle, hookY: -1 }, 0.1);

    expect(simulation.fishing?.hook.y).toBeCloseTo(
      startY + BALANCE.fishingHookDownSpeed * 0.1 - BALANCE.fishingHookUpSpeed * 0.1,
    );
    expect(BALANCE.fishingHookHorizontalSpeed).toBe(0.25);
    expect(BALANCE.fishingHookUpSpeed).toBe(0.35);
    expect(BALANCE.fishingHookDownSpeed).toBe(0.25);
  });

  test("enforces cargo capacity and gates deep permit water", () => {
    const simulation = createSimulation();
    expect(resolveCatch(simulation, "northernPike")).toBe(true);
    expect(resolveCatch(simulation, "bluegill")).toBe(true);
    expect(resolveCatch(simulation, "yellowPerch")).toBe(true);
    expect(resolveCatch(simulation, "emeraldShiner")).toBe(false);
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
    expect(simulation.fishing?.targets.length).toBeGreaterThanOrEqual(SPOT_RESIDENTS.mosswaterPool.length);
    expect(simulation.fishing?.targets.length).toBeLessThanOrEqual(SPOT_RESIDENTS.mosswaterPool.length * 3);
    expect(new Set(simulation.fishing?.targets.map((target) => target.species))).toEqual(
      new Set(SPOT_RESIDENTS.mosswaterPool),
    );
    expect(maxFishingDepth(simulation)).toBeCloseTo(0.425);

    const deepTarget = simulation.fishing?.targets.find((target) => target.species === "largemouthBass");
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

  test("unlocks Beach permanently and travels there only from a dock", () => {
    const simulation = createSimulation(1, { money: BALANCE.beachAccessCost });
    expect(simulation.world).toBe("lake");
    expect(travelToWorld(simulation, "beach")).toBe(false);
    expect(buyBeachAccess(simulation)).toBe(true);
    expect(simulation.progress.beachUnlocked).toBe(true);
    expect(simulation.progress.money).toBe(0);
    expect(buyBeachAccess(simulation)).toBe(false);
    expect(travelToWorld(simulation, "beach")).toBe(true);
    expect(simulation.world).toBe("beach");
    expect(simulation.dockedAt).toBeNull();
    expect(simulation.progress.marketTarget).toBeNull();

    expect(startFishing(simulation, "sunwardShoal")).toBe(true);
    expect(new Set(simulation.fishing?.targets.map((target) => target.species))).toEqual(
      new Set(BEACH_SPOT_RESIDENTS.sunwardShoal),
    );
    expect(tutorialPrompt(simulation)).toContain("Sea Mullet");
    simulation.progress.discovered.push("seaMullet");
    expect(trackMarketSpecies(simulation, "seaMullet")).toBe(true);
    expect(trackMarketSpecies(simulation, "bluegill")).toBe(false);
    simulation.mode = "cruising";
    simulation.fishing = null;

    moveBoatForTesting(simulation, harborById("brindle"));
    interact(simulation);
    expect(travelToWorld(simulation, "lake")).toBe(true);
    expect(simulation.world).toBe("lake");
  });

  test("rescues at critical damage without making progress unrecoverable", () => {
    const simulation = createSimulation(1, { money: 12 });
    undock(simulation);
    resolveCatch(simulation, "bluegill");
    damageBoat(simulation, 100);
    expect(simulation.dockedAt).not.toBeNull();
    expect(simulation.cargo).toEqual([]);
    expect(simulation.progress.money).toBe(0);
    expect(simulation.boat.damage).toBeLessThan(100);
    expect(simulation.events.some((event) => event.type === "rescued")).toBe(true);
  });

  test("records evidence-based survey predictions and discoveries", () => {
    const simulation = createSimulation();
    const incorrect = recordSurvey(simulation, "mosswaterPool", "bluegill");
    expect(incorrect.correct).toBe(false);
    expect(incorrect.expected).toBe("largemouthBass");
    expect(incorrect.explanation).toContain("19°C");
    expect(simulation.progress.discovered).toContain("largemouthBass");

    const correct = recordSurvey(simulation, "sunwardShoal", "bluegill");
    expect(correct.correct).toBe(true);
    const contractTarget = recordSurvey(simulation, "sunwardShoal", "yellowPerch", "yellowPerch");
    expect(contractTarget.correct).toBe(true);
    expect(contractTarget.expected).toBe("yellowPerch");
    expect(simulation.progress.learning.surveysCompleted).toBe(3);
    expect(simulation.progress.learning.correctPredictions).toBe(2);
    expect(learningAccuracy(simulation)).toBe(67);

    simulation.world = "beach";
    const beachSurvey = recordSurvey(simulation, "mosswaterPool", "duskyFlathead");
    expect(beachSurvey).toMatchObject({ correct: true, expected: "duskyFlathead" });
    expect(beachSurvey.explanation).toContain("sand, seagrass, and shallow reef");
  });

  test("allows repeated catches and releases unneeded cargo", () => {
    const simulation = createSimulation();
    expect(resolveCatch(simulation, "bluegill")).toBe(true);
    expect(simulation.progress.discovered).toContain("bluegill");

    expect(releaseCargo(simulation, 0)).toBe(true);
    expect(simulation.cargo).toHaveLength(0);
    expect(resolveCatch(simulation, "bluegill")).toBe(true);
    expect(simulation.cargo).toHaveLength(1);
  });

  test("restores a released catch to its original cargo position", () => {
    const simulation = createSimulation();
    expect(resolveCatch(simulation, "bluegill")).toBe(true);
    expect(resolveCatch(simulation, "yellowPerch")).toBe(true);
    const released = { ...simulation.cargo[0]! };

    expect(releaseCargo(simulation, 0)).toBe(true);
    expect(restoreCargo(simulation, released, 0)).toBe(true);
    expect(simulation.cargo.map((item) => item.species)).toEqual(["bluegill", "yellowPerch"]);
  });

  test("finishes the research season after eight market sales", () => {
    const simulation = createSimulation(4, { marketSales: 7 });
    expect(resolveCatch(simulation, "bluegill")).toBe(true);
    expect(sellSpeciesAtMarket(simulation, "bluegill")).not.toBeNull();
    expect(simulation.progress.seasonCompleted).toBe(true);
    expect(simulation.events.some((event) => event.type === "season-complete")).toBe(true);
  });

});
