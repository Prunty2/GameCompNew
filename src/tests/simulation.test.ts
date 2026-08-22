import { describe, expect, test } from "vitest";
import {
  BALANCE,
  BEACH_SPOT_RESIDENTS,
  FISH,
  FISHING_SPOTS,
  SPOT_RESIDENTS,
  boatClassAt,
  engineSpeedMultiplier,
  harborById,
  hookVerticalSpeedMultiplier,
  reelSpeedMultiplier,
  regionSurfaceTintAt,
  spotById,
  type FishSpecies,
} from "../game/balance";
import {
  FISHING_LOSS_DEPTH_TOLERANCE,
  FISHING_LOSS_SWIM_DURATION,
} from "../game/fishingReeling";
import {
  buyBeachAccess,
  beginFishingExit,
  buyBoost,
  buyUpgrade,
  cargoCapacity,
  closeMarketSpeciesDetail,
  consumeEvents,
  createSimulation,
  damageBoat,
  getInteractionPrompt,
  inspectMarketSpecies,
  interact,
  isFishingTargetReachable,
  learningAccuracy,
  maxFishingDepth,
  moveBoatForTesting,
  navigationGuidance,
  nightVisualIntensity,
  recordSurvey,
  releaseCargo,
  restoreCargo,
  resolveCatch,
  sellAllFishAtMarket,
  sellSpeciesAtMarket,
  shouldShowNightIndicator,
  skipMarketTutorial,
  startFishing,
  syncUpgradeTutorial,
  trackMarketSpecies,
  tutorialPrompt,
  travelToWorld,
  undock,
  unlockBoostForTesting,
  updateSimulation,
  type InputState,
} from "../game/simulation";
import { marketAvailability, marketQuote, strongerHarborFor } from "../game/market";
import {
  BEACH_SUNWARD_POPULATION_BONUS,
  DEFAULT_POPULATION_DENSITY_MULTIPLIER,
  MOSSWATER_POPULATION_DENSITY_MULTIPLIER,
  responsiveResidentCount,
} from "../game/fishingPopulation";

const idle: InputState = {
  travel: 0,
  boost: false,
  hookX: 0,
  hookY: 0,
  actionHeld: false,
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
      "whiteSucker",
      "longnoseGar",
      "northernPike",
      "largemouthBass",
      "bowfin",
      "cisco",
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

  test("sends full cargo to an actionable next step", () => {
    const full = createSimulation();
    trackMarketSpecies(full, "bluegill");
    undock(full);
    full.cargo = [
      { species: "yellowPerch" },
      { species: "emeraldShiner" },
      { species: "northernPike" },
    ];
    expect(navigationGuidance(full)).toMatchObject({ kicker: "MANAGE CARGO", label: "Brindle Harbor" });
    expect(navigationGuidance(full)?.instruction).toContain("sell or release a catch");
  });

  test("uses the nearest harbor when the first assignment is active and no species is tracked", () => {
    const simulation = createSimulation();
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
      { species: "yellowPerch" },
      { species: "emeraldShiner" },
      { species: "northernPike" },
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

  test("supports five reel-power upgrades with a capped sixty-percent speed increase", () => {
    const simulation = createSimulation(1, { money: 10_000 });
    expect(reelSpeedMultiplier(0)).toBe(1);
    for (let tier = 0; tier < BALANCE.maxReelTier; tier += 1) {
      expect(buyUpgrade(simulation, "reel")).toBe(true);
    }
    expect(simulation.progress.upgrades.reel).toBe(5);
    expect(reelSpeedMultiplier(simulation.progress.upgrades.reel)).toBeCloseTo(1.6);
    expect(reelSpeedMultiplier(99)).toBeCloseTo(1.6);
    expect(hookVerticalSpeedMultiplier(simulation.progress.upgrades.reel)).toBeCloseTo(1.25);
    expect(hookVerticalSpeedMultiplier(99)).toBeCloseTo(1.25);
    expect(buyUpgrade(simulation, "reel")).toBe(false);
  });

  test("unlocks boost for 250 shells and applies a temporary 35% speed increase", () => {
    expect(BALANCE.boostUnlockCost).toBe(250);
    const simulation = createSimulation(1, { money: BALANCE.boostUnlockCost });
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
    expect(simulation.cargo[0]).toEqual({ species: "bluegill" });
    expect(simulation.progress.marketTutorialStep).toBe("sell");

    const harbor = strongerHarborFor("bluegill", simulation.progress.marketDay, simulation.seed);
    moveBoatForTesting(simulation, harbor);
    expect(getInteractionPrompt(simulation)?.label).toContain(harbor.name);
    interact(simulation);
    const result = sellSpeciesAtMarket(simulation, "bluegill");
    expect(result?.payment).toBeGreaterThan(0);
    expect(simulation.progress.marketTutorialStep).toBe("done");
    expect(simulation.progress.upgradeTutorialStep).toBe("locked");
    expect(simulation.progress.marketSales).toBe(1);
    expect(simulation.progress.marketEarnings).toBe(result?.payment);
    expect(simulation.cargo).toEqual([]);
  });

  test("moves the first assignment backward with reversed market actions", () => {
    const simulation = createSimulation();
    inspectMarketSpecies(simulation, "bluegill");
    closeMarketSpeciesDetail(simulation, "bluegill");
    expect(simulation.progress.marketTutorialStep).toBe("inspect");

    inspectMarketSpecies(simulation, "bluegill");
    expect(trackMarketSpecies(simulation, "bluegill")).toBe(true);
    expect(trackMarketSpecies(simulation, "bluegill")).toBe(true);
    expect(simulation.progress.marketTutorialStep).toBe("track");
  });

  test("opens the upgrade tutorial once the player can afford a dock upgrade", () => {
    const simulation = createSimulation();
    skipMarketTutorial(simulation);
    expect(simulation.progress.upgradeTutorialStep).toBe("locked");
    simulation.progress.money = 55;
    syncUpgradeTutorial(simulation);
    expect(simulation.progress.upgradeTutorialStep).toBe("open-services");
    expect(navigationGuidance(simulation)).toMatchObject({ kicker: "UPGRADE AT", label: "Brindle Harbor" });
    expect(buyUpgrade(simulation, "line")).toBe(true);
    expect(simulation.progress.upgradeTutorialStep).toBe("buy");
    expect(navigationGuidance(simulation)).toMatchObject({ kicker: "FISH AT", label: "Mosswater Pool" });
    undock(simulation);
    moveBoatForTesting(simulation, spotById("mosswaterPool"));
    expect(startFishing(simulation, "mosswaterPool")).toBe(true);
    expect(simulation.progress.upgradeTutorialStep).toBe("done");
    expect(navigationGuidance(simulation)?.kicker).not.toBe("UPGRADE AT");
  });

  test("catches a fish when the steered hook reaches its side-view silhouette", () => {
    const simulation = createSimulation(9);
    undock(simulation);
    expect(startFishing(simulation, "sunwardShoal")).toBe(true);
    expect(tutorialPrompt(simulation)).toBe("Steer the hook onto a reachable fish.");
    const target = simulation.fishing?.targets[0];
    if (!simulation.fishing || !target) throw new Error("Expected a fishing target.");
    simulation.fishing.hook = { x: target.x, y: target.y };
    updateSimulation(simulation, idle, 0);
    expect(simulation.mode).toBe("fishing");
    expect(simulation.fishing?.reeling).toMatchObject({ species: "bluegill" });
    expect(tutorialPrompt(simulation)).toContain("Release left click or Reel");
    expect(tutorialPrompt(simulation)).toContain("racing away");
    expect(simulation.cargo).toEqual([]);
    const hookedTargetIndex = simulation.fishing.reeling?.targetIndex;
    const backgroundTargetIndex = simulation.fishing.targets.findIndex((_, index) => index !== hookedTargetIndex);
    const backgroundBefore = simulation.fishing.targets[backgroundTargetIndex];
    if (!backgroundBefore) throw new Error("Expected a non-hooked background fish.");
    const backgroundStart = { x: backgroundBefore.x, y: backgroundBefore.y };
    updateSimulation(simulation, idle, 0.1);
    const backgroundAfter = simulation.fishing?.targets[backgroundTargetIndex];
    expect(backgroundAfter).toBeDefined();
    expect(backgroundAfter?.x).not.toBe(backgroundStart.x);
    expect(backgroundAfter?.y).not.toBe(backgroundStart.y);
    for (let index = 0; index < 180 && simulation.mode === "fishing"; index += 1) {
      const fight = simulation.fishing?.reeling;
      const holding = fight !== undefined
        && fight !== null
        && fight.behaviour !== "run"
        && fight.tension < 0.72;
      updateSimulation(simulation, { ...idle, actionHeld: holding }, 0.1);
    }
    expect(simulation.mode).toBe("cruising");
    expect(simulation.cargo).toEqual([{ species: "bluegill" }]);
  });

  test("breaks immediately, lets the fish escape, then retracts the bare line", () => {
    const simulation = createSimulation(9);
    expect(startFishing(simulation, "sunwardShoal")).toBe(true);
    const target = simulation.fishing?.targets[0];
    if (!simulation.fishing || !target) throw new Error("Expected a fishing target.");
    simulation.fishing.hook = { x: target.x, y: target.y };
    updateSimulation(simulation, idle, 0);
    const fight = simulation.fishing.reeling;
    if (!fight) throw new Error("Expected a hooked fish.");
    fight.progress = 0.9;
    fight.tension = BALANCE.fishingCriticalTension;

    updateSimulation(simulation, { ...idle, actionHeld: true }, 0);

    expect(simulation.mode).toBe("fishing");
    expect(simulation.fishing?.reeling?.lostAt).toBe(simulation.elapsed);
    expect(consumeEvents(simulation)).toContainEqual({ type: "line-broke", species: "bluegill" });
    expect(simulation.cargo).toEqual([]);
    const lossStartedAt = simulation.elapsed;
    const returnDistance = Math.abs(target.y - target.homeY);
    expect(returnDistance).toBeGreaterThan(FISHING_LOSS_DEPTH_TOLERANCE);

    for (let elapsed = 0; elapsed < FISHING_LOSS_SWIM_DURATION; elapsed += 0.1) {
      updateSimulation(simulation, idle, Math.min(0.1, FISHING_LOSS_SWIM_DURATION - elapsed));
    }
    expect(simulation.fishing?.reeling).not.toBeNull();

    for (let index = 0; index < 200 && simulation.fishing?.reeling; index += 1) {
      updateSimulation(simulation, idle, 0.1);
    }
    expect(simulation.fishing?.reeling).toBeNull();
    expect(simulation.fishing?.hook).toEqual({ x: 0.5, y: 0.08 });
    expect(Math.abs(target.y - target.homeY)).toBeLessThanOrEqual(FISHING_LOSS_DEPTH_TOLERANCE);
    const minimumNormalSpeedReturn = Math.max(0, returnDistance - FISHING_LOSS_DEPTH_TOLERANCE) / 0.1;
    expect(simulation.elapsed - lossStartedAt).toBeGreaterThanOrEqual(minimumNormalSpeedReturn);

    const resumedAt = { x: target.x, y: target.y };
    updateSimulation(simulation, idle, 0.1);
    expect(Math.hypot(target.x - resumedAt.x, target.y - resumedAt.y)).toBeLessThan(0.02);
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
    expect(BALANCE.fishingHookHorizontalSpeed).toBe(0.2125);
    expect(BALANCE.fishingHookUpSpeed).toBe(0.35);
    expect(BALANCE.fishingHookDownSpeed).toBe(0.25);
  });

  test("increases only vertical hook navigation by five percent per reel tier", () => {
    const base = createSimulation(9);
    const upgraded = createSimulation(9);
    upgraded.progress.upgrades.reel = 4;
    expect(startFishing(base, "sunwardShoal")).toBe(true);
    expect(startFishing(upgraded, "sunwardShoal")).toBe(true);
    const baseStart = { ...base.fishing!.hook };
    const upgradedStart = { ...upgraded.fishing!.hook };

    updateSimulation(base, { ...idle, hookX: 1, hookY: 1 }, 0.1);
    updateSimulation(upgraded, { ...idle, hookX: 1, hookY: 1 }, 0.1);

    const multiplier = 1 + 4 * 0.05;
    expect(upgraded.fishing!.hook.y - upgradedStart.y).toBeCloseTo(
      (base.fishing!.hook.y - baseStart.y) * multiplier,
    );
    expect(upgraded.fishing!.hook.x - upgradedStart.x).toBeCloseTo(
      base.fishing!.hook.x - baseStart.x,
    );
  });

  test("enforces cargo capacity and gates deep water with the fishing line", () => {
    const simulation = createSimulation();
    expect(resolveCatch(simulation, "northernPike")).toBe(true);
    expect(resolveCatch(simulation, "bluegill")).toBe(true);
    expect(resolveCatch(simulation, "yellowPerch")).toBe(true);
    expect(resolveCatch(simulation, "emeraldShiner")).toBe(false);
    expect(startFishing(simulation, "outerGloam")).toBe(false);
    expect(consumeEvents(simulation)).toContainEqual({ type: "depth-locked", tier: 3 });

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

  test("uses higher fishing-line gates for the Beach middle and far-right spots", () => {
    const simulation = createSimulation(1, { money: BALANCE.beachAccessCost });
    expect(buyBeachAccess(simulation)).toBe(true);
    expect(travelToWorld(simulation, "beach")).toBe(true);

    simulation.progress.upgrades.line = 2;
    expect(startFishing(simulation, "mosswaterPool")).toBe(false);
    expect(consumeEvents(simulation)).toContainEqual({ type: "depth-locked", tier: 3 });

    simulation.progress.upgrades.line = 3;
    expect(startFishing(simulation, "mosswaterPool")).toBe(true);
    simulation.mode = "cruising";
    simulation.fishing = null;
    expect(startFishing(simulation, "outerGloam")).toBe(false);
    expect(consumeEvents(simulation)).toContainEqual({ type: "depth-locked", tier: 4 });

    simulation.progress.upgrades.line = 4;
    expect(startFishing(simulation, "outerGloam")).toBe(true);
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

    simulation.progress.upgrades.line = 5;
    expect(maxFishingDepth(simulation)).toBeCloseTo(0.925);
  });

  test("increases the deterministic catchable population for larger fishing viewports", () => {
    const compact = createSimulation(12);
    const reference = createSimulation(12);
    const large = createSimulation(12);
    compact.progress.upgrades.line = 1;
    reference.progress.upgrades.line = 1;
    large.progress.upgrades.line = 1;

    expect(startFishing(compact, "mosswaterPool", { width: 390, height: 844 })).toBe(true);
    expect(startFishing(reference, "mosswaterPool", { width: 1280, height: 720 })).toBe(true);
    expect(startFishing(large, "mosswaterPool", { width: 2560, height: 1440 })).toBe(true);

    const compactTargets = compact.fishing?.targets ?? [];
    const referenceTargets = reference.fishing?.targets ?? [];
    const largeTargets = large.fishing?.targets ?? [];
    expect(compactTargets.length).toBeLessThanOrEqual(referenceTargets.length);
    expect(largeTargets.length).toBeGreaterThan(referenceTargets.length);
    expect(new Set(largeTargets.map((target) => target.species))).toEqual(
      new Set(SPOT_RESIDENTS.mosswaterPool),
    );

    const repeated = createSimulation(12);
    repeated.progress.upgrades.line = 1;
    startFishing(repeated, "mosswaterPool", { width: 2560, height: 1440 });
    expect(repeated.fishing?.targets).toEqual(largeTargets);
  });

  test("applies the thirty-percent fish-density reduction", () => {
    expect(responsiveResidentCount(10, { width: 1280, height: 720 })).toBe(7);
  });

  test("reduces Mosswater's population multiplier by thirty percent", () => {
    expect(MOSSWATER_POPULATION_DENSITY_MULTIPLIER).toBe(0.7);
    expect(responsiveResidentCount(10, { width: 1280, height: 720 }, 1)).toBe(10);
    expect(responsiveResidentCount(
      10,
      { width: 1280, height: 720 },
      MOSSWATER_POPULATION_DENSITY_MULTIPLIER,
    )).toBe(7);
  });

  test("adds a stable two-fish bonus across Beach Sunward's smallest schools", () => {
    expect(BEACH_SUNWARD_POPULATION_BONUS).toBe(2);
    expect(DEFAULT_POPULATION_DENSITY_MULTIPLIER).toBe(0.7);
    const availabilityCounts = { abundant: 3, normal: 2, scarce: 1 } as const;
    const scenarios = [
      { seed: 12, marketDay: 0, viewport: { width: 960, height: 540 } },
      { seed: 18, marketDay: 3, viewport: { width: 1280, height: 720 } },
      { seed: 27, marketDay: 8, viewport: { width: 2560, height: 1440 } },
    ];

    for (const { seed, marketDay, viewport } of scenarios) {
      const simulation = createSimulation(seed);
      simulation.world = "beach";
      simulation.progress.marketDay = marketDay;
      expect(startFishing(simulation, "sunwardShoal", viewport)).toBe(true);

      const defaultCounts = BEACH_SPOT_RESIDENTS.sunwardShoal.map((species) => responsiveResidentCount(
        availabilityCounts[marketAvailability(species, marketDay, seed)],
        viewport,
        DEFAULT_POPULATION_DENSITY_MULTIPLIER,
      ));
      const actualCounts = BEACH_SPOT_RESIDENTS.sunwardShoal.map((species) => (
        simulation.fishing?.targets.filter((target) => target.species === species).length ?? 0
      ));
      const increments = actualCounts.map((count, index) => count - defaultCounts[index]);

      expect(actualCounts.reduce((total, count) => total + count, 0)).toBe(
        defaultCounts.reduce((total, count) => total + count, 0) + BEACH_SUNWARD_POPULATION_BONUS,
      );
      expect(increments.sort()).toEqual([0, 0, 1, 1]);
    }
  });

  test("uses actual swimming depth for Mosswater reachability", () => {
    const simulation = createSimulation(12);
    simulation.progress.upgrades.line = 1;
    expect(startFishing(simulation, "mosswaterPool")).toBe(true);
    const bass = simulation.fishing?.targets.find((target) => target.species === "largemouthBass");
    expect(bass).toBeDefined();
    expect(FISH.largemouthBass.depthTier).toBe(2);
    bass!.x = 0.5;
    bass!.y = maxFishingDepth(simulation) - 0.01;
    bass!.homeY = bass!.y;
    simulation.fishing!.hook = { x: bass!.x, y: bass!.y };

    expect(isFishingTargetReachable(simulation, bass!)).toBe(true);
    updateSimulation(simulation, idle, 0);
    expect(simulation.fishing?.reeling?.species).toBe("largemouthBass");
  });

  test("keeps Longnose Gar in Mosswater's surface band", () => {
    const simulation = createSimulation(12);
    simulation.progress.upgrades.line = 1;
    expect(startFishing(simulation, "mosswaterPool", { width: 2048, height: 1152 })).toBe(true);
    const gar = simulation.fishing?.targets.filter((target) => target.species === "longnoseGar") ?? [];

    expect(gar.length).toBeGreaterThan(0);
    expect(Math.min(...gar.map((target) => target.homeY))).toBeGreaterThanOrEqual(0.09);
    expect(Math.max(...gar.map((target) => target.homeY))).toBeLessThanOrEqual(0.16);
    expect(gar.every((target) => isFishingTargetReachable(simulation, target))).toBe(true);
  });

  test("steps Outer Gloam residents through the diagrammed depth bands", () => {
    const simulation = createSimulation(12);
    simulation.progress.upgrades.line = 3;
    expect(startFishing(simulation, "outerGloam", { width: 2048, height: 1152 })).toBe(true);
    const cisco = simulation.fishing?.targets.filter((target) => target.species === "cisco") ?? [];
    const lakeTrout = simulation.fishing?.targets.filter((target) => target.species === "lakeTrout") ?? [];
    const burbot = simulation.fishing?.targets.filter((target) => target.species === "burbot") ?? [];
    const lakeSturgeon = simulation.fishing?.targets.filter((target) => target.species === "lakeSturgeon") ?? [];

    expect(cisco.length).toBeGreaterThan(0);
    expect(lakeTrout.length).toBeGreaterThan(0);
    expect(burbot.length).toBeGreaterThan(0);
    expect(lakeSturgeon.length).toBeGreaterThan(0);
    expect(Math.min(...cisco.map((target) => target.homeY))).toBeGreaterThanOrEqual(0.1);
    expect(Math.max(...cisco.map((target) => target.homeY))).toBeLessThanOrEqual(0.18);
    expect(Math.min(...lakeTrout.map((target) => target.homeY))).toBeGreaterThanOrEqual(0.25);
    expect(Math.max(...lakeTrout.map((target) => target.homeY))).toBeLessThanOrEqual(0.39);
    expect(Math.min(...burbot.map((target) => target.homeY))).toBeGreaterThanOrEqual(0.5);
    expect(Math.max(...burbot.map((target) => target.homeY))).toBeLessThanOrEqual(0.6);
    expect(Math.min(...lakeSturgeon.map((target) => target.homeY))).toBeGreaterThan(0.675);
    expect([...cisco, ...lakeTrout, ...burbot].every((target) => (
      isFishingTargetReachable(simulation, target)
    ))).toBe(true);
    expect(lakeSturgeon.every((target) => !isFishingTargetReachable(simulation, target))).toBe(true);
  });

  test("steps Beach Outer Gloam residents through the diagrammed depth bands", () => {
    const simulation = createSimulation(12);
    simulation.world = "beach";
    simulation.progress.upgrades.line = 4;
    expect(startFishing(simulation, "outerGloam", { width: 2048, height: 1152 })).toBe(true);
    const snapper = simulation.fishing?.targets.filter((target) => target.species === "snapper") ?? [];
    const kingfish = simulation.fishing?.targets.filter((target) => (
      target.species === "yellowtailKingfish"
    )) ?? [];
    const mulloway = simulation.fishing?.targets.filter((target) => target.species === "mulloway") ?? [];

    expect(snapper.length).toBeGreaterThan(0);
    expect(kingfish.length).toBeGreaterThan(0);
    expect(mulloway.length).toBeGreaterThan(0);
    expect(Math.min(...snapper.map((target) => target.homeY))).toBeGreaterThanOrEqual(0.16);
    expect(Math.max(...snapper.map((target) => target.homeY))).toBeLessThanOrEqual(0.28);
    expect(Math.min(...kingfish.map((target) => target.homeY))).toBeGreaterThanOrEqual(0.46);
    expect(Math.max(...kingfish.map((target) => target.homeY))).toBeLessThanOrEqual(0.58);
    expect([...snapper, ...kingfish].every((target) => isFishingTargetReachable(simulation, target))).toBe(true);
    expect(Math.max(...mulloway.map((target) => target.homeY))).toBeGreaterThan(maxFishingDepth(simulation));
  });

  test("orders Beach Sunward residents vertically by value and keeps Flounder ultra-low", () => {
    const simulation = createSimulation(12);
    simulation.world = "beach";
    expect(startFishing(simulation, "sunwardShoal", { width: 2048, height: 1152 })).toBe(true);
    const targetsFor = (species: FishSpecies) => (
      simulation.fishing?.targets.filter((target) => target.species === species) ?? []
    );
    const mullet = targetsFor("seaMullet");
    const bream = targetsFor("yellowfinBream");
    const whiting = targetsFor("sandWhiting");
    const flounder = targetsFor("largetoothFlounder");

    expect([mullet, bream, whiting, flounder].every((targets) => targets.length > 0)).toBe(true);
    expect(Math.min(...mullet.map((target) => target.homeY))).toBeGreaterThanOrEqual(0.1);
    expect(Math.max(...mullet.map((target) => target.homeY))).toBeLessThanOrEqual(0.17);
    expect(Math.min(...bream.map((target) => target.homeY))).toBeGreaterThanOrEqual(0.22);
    expect(Math.max(...bream.map((target) => target.homeY))).toBeLessThanOrEqual(0.29);
    expect(Math.min(...whiting.map((target) => target.homeY))).toBeGreaterThanOrEqual(0.35);
    expect(Math.max(...whiting.map((target) => target.homeY))).toBeLessThanOrEqual(0.42);
    expect(Math.min(...flounder.map((target) => target.homeY))).toBeGreaterThanOrEqual(0.72);
    expect(Math.max(...flounder.map((target) => target.homeY))).toBeLessThanOrEqual(0.79);

    const orderedSpecies = ["seaMullet", "yellowfinBream", "sandWhiting", "largetoothFlounder"] as const;
    for (let index = 1; index < orderedSpecies.length; index += 1) {
      const shallower = targetsFor(orderedSpecies[index - 1]!);
      const deeper = targetsFor(orderedSpecies[index]!);
      expect(FISH[orderedSpecies[index]!].value).toBeGreaterThan(FISH[orderedSpecies[index - 1]!].value);
      expect(Math.min(...deeper.map((target) => target.homeY))).toBeGreaterThan(
        Math.max(...shallower.map((target) => target.homeY)),
      );
    }

    expect([...mullet, ...bream].every((target) => isFishingTargetReachable(simulation, target))).toBe(true);
    expect([...whiting, ...flounder].every((target) => !isFishingTargetReachable(simulation, target))).toBe(true);
    simulation.progress.upgrades.line = 4;
    expect([...mullet, ...bream, ...whiting, ...flounder].every((target) => (
      isFishingTargetReachable(simulation, target)
    ))).toBe(true);
  });

  test("steps Beach Mosswater residents down through the annotated bay bands", () => {
    const simulation = createSimulation(12);
    simulation.world = "beach";
    simulation.progress.upgrades.line = 3;
    expect(startFishing(simulation, "mosswaterPool", { width: 2048, height: 1152 })).toBe(true);
    const luderick = simulation.fishing?.targets.filter((target) => target.species === "luderick") ?? [];
    const salmon = simulation.fishing?.targets.filter((target) => (
      target.species === "easternAustralianSalmon"
    )) ?? [];
    const flathead = simulation.fishing?.targets.filter((target) => target.species === "duskyFlathead") ?? [];
    const perch = simulation.fishing?.targets.filter((target) => target.species === "estuaryPerch") ?? [];

    expect(luderick.length).toBeGreaterThan(0);
    expect(salmon.length).toBeGreaterThan(0);
    expect(flathead.length).toBeGreaterThan(0);
    expect(perch.length).toBeGreaterThan(0);
    expect(Math.min(...luderick.map((target) => target.homeY))).toBeGreaterThanOrEqual(0.14);
    expect(Math.max(...luderick.map((target) => target.homeY))).toBeLessThanOrEqual(0.26);
    expect(Math.min(...salmon.map((target) => target.homeY))).toBeGreaterThanOrEqual(0.34);
    expect(Math.max(...salmon.map((target) => target.homeY))).toBeLessThanOrEqual(0.46);
    expect(Math.min(...flathead.map((target) => target.homeY))).toBeGreaterThanOrEqual(0.53);
    expect(Math.max(...flathead.map((target) => target.homeY))).toBeLessThanOrEqual(0.62);
    expect(Math.min(...perch.map((target) => target.homeY))).toBeGreaterThanOrEqual(0.71);
    expect(Math.max(...perch.map((target) => target.homeY))).toBeLessThanOrEqual(0.77);
    expect([...luderick, ...salmon, ...flathead].every((target) => (
      isFishingTargetReachable(simulation, target)
    ))).toBe(true);
    expect(perch.every((target) => !isFishingTargetReachable(simulation, target))).toBe(true);

    simulation.progress.upgrades.line = 4;
    expect(perch.every((target) => isFishingTargetReachable(simulation, target))).toBe(true);
  });

  test("spreads the Sunward population across shallow and upgrade-preview depths", () => {
    const simulation = createSimulation(12);
    expect(startFishing(simulation, "sunwardShoal", { width: 2048, height: 1152 })).toBe(true);

    const targets = simulation.fishing?.targets ?? [];
    const depths = targets.map((target) => target.homeY);
    expect(Math.min(...depths)).toBeGreaterThanOrEqual(0.1);
    expect(Math.max(...depths)).toBeGreaterThan(maxFishingDepth(simulation));
    expect(Math.max(...depths) - Math.min(...depths)).toBeGreaterThan(0.3);
  });

  test("keeps Emerald Shiners entirely below the starter line limit", () => {
    const simulation = createSimulation(12);
    expect(startFishing(simulation, "sunwardShoal", { width: 2048, height: 1152 })).toBe(true);

    const shiners = simulation.fishing?.targets.filter((target) => target.species === "emeraldShiner") ?? [];
    expect(shiners.length).toBeGreaterThan(0);
    expect(FISH.emeraldShiner.depthTier).toBe(1);
    expect(Math.min(...shiners.map((target) => target.homeY))).toBeGreaterThanOrEqual(0.335);
    expect(Math.max(...shiners.map((target) => target.homeY))).toBeLessThanOrEqual(0.405);
    expect(Math.min(...shiners.map((target) => target.homeY))).toBeGreaterThan(maxFishingDepth(simulation));
  });

  test("places White Suckers in the deeper highlighted band behind line tier two", () => {
    const simulation = createSimulation(12);
    expect(startFishing(simulation, "sunwardShoal", { width: 2048, height: 1152 })).toBe(true);

    const suckers = simulation.fishing?.targets.filter((target) => target.species === "whiteSucker") ?? [];
    expect(suckers.length).toBeGreaterThan(0);
    expect(FISH.whiteSucker.depthTier).toBe(2);
    expect(Math.min(...suckers.map((target) => target.homeY))).toBeGreaterThanOrEqual(0.465);
    expect(Math.max(...suckers.map((target) => target.homeY))).toBeLessThanOrEqual(0.535);
    expect(Math.min(...suckers.map((target) => target.homeY))).toBeGreaterThan(maxFishingDepth(simulation));

    simulation.progress.upgrades.line = 2;
    expect(Math.max(...suckers.map((target) => target.homeY))).toBeLessThanOrEqual(maxFishingDepth(simulation));
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
    expect(BALANCE.beachAccessCost).toBe(300);
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
    expect(tutorialPrompt(simulation)).toBe("Steer the hook onto a reachable fish.");
    simulation.progress.discovered.push("seaMullet");
    expect(trackMarketSpecies(simulation, "seaMullet")).toBe(true);
    expect(tutorialPrompt(simulation)).toContain("Sea Mullet");
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
    const beachSurvey = recordSurvey(simulation, "mosswaterPool", "luderick");
    expect(beachSurvey).toMatchObject({ correct: true, expected: "luderick" });
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

  test("marks the eight-sale milestone without interrupting trading", () => {
    const simulation = createSimulation(4, { marketSales: 7 });
    expect(resolveCatch(simulation, "bluegill")).toBe(true);
    expect(sellSpeciesAtMarket(simulation, "bluegill")).not.toBeNull();
    expect(simulation.progress.seasonCompleted).toBe(true);
    expect(simulation.events.map((event) => event.type)).toEqual(["caught", "sold"]);
  });

  test("sells every fish in one market transaction", () => {
    const simulation = createSimulation(9, { marketSales: 2, marketEarnings: 10 });
    simulation.progress.marketTarget = "yellowPerch";
    simulation.progress.marketTutorialStep = "sell";
    simulation.cargo = [
      { species: "bluegill" },
      { species: "yellowPerch" },
      { species: "lakeTrout" },
    ];
    const moneyBefore = simulation.progress.money;
    const result = sellAllFishAtMarket(simulation);

    expect(result).toMatchObject({ harbor: "brindle", quantity: 3 });
    expect(simulation.progress.money).toBe(moneyBefore + result!.payment);
    expect(simulation.progress.marketSales).toBe(3);
    expect(simulation.progress.marketEarnings).toBe(10 + result!.payment);
    expect(simulation.progress.marketTutorialStep).toBe("done");
    expect(simulation.cargo).toEqual([]);
    expect(simulation.events).toContainEqual({ type: "sold", result });
  });

  test("sells both Northern Pike at the full displayed quote", () => {
    const simulation = createSimulation(7);
    simulation.cargo = [
      { species: "northernPike" },
      { species: "northernPike" },
    ];
    const quote = marketQuote(
      "northernPike",
      "brindle",
      simulation.progress.marketDay,
      simulation.seed,
    );

    const result = sellSpeciesAtMarket(simulation, "northernPike");

    expect(result).toMatchObject({ quantity: 2, quote: quote.price, payment: quote.price * 2 });
    expect(simulation.cargo).toEqual([]);
  });

});
