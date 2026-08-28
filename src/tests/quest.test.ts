import { describe, expect, test } from "vitest";
import { harborById, spotById } from "../game/balance";
import {
  chooseQuestArrowSide,
  questFollowArrows,
  questHookTargetIndex,
  questPresentation,
  questUiArrowLayout,
} from "../game/quest";
import {
  buyUpgrade,
  createSimulation,
  inspectMarketSpecies,
  interact,
  moveBoatForTesting,
  resolveCatch,
  skipMarketTutorial,
  startFishing,
  syncUpgradeTutorial,
  trackMarketSpecies,
  travelToWorld,
  undock,
} from "../game/simulation";
import { strongerHarborFor } from "../game/market";

const harborView = {
  started: true,
  overlay: "harbor" as const,
  harborSection: "market" as const,
  marketDetailOpen: false,
};

const playView = {
  started: true,
  overlay: null,
  harborSection: "market" as const,
  marketDetailOpen: false,
};

describe("first-assignment quest prototype", () => {
  test("highlights Bluegill, then Track, on the opening market board", () => {
    const simulation = createSimulation();
    const inspect = questPresentation(simulation, harborView);
    expect(inspect).toMatchObject({
      hidden: false,
      heading: "Tutorial",
      title: "Choose Bluegill",
      index: 1,
      uiTargetSelector: '[data-action="select-market-fish"][data-species="bluegill"]',
      worldFollow: false,
      hookFollow: false,
    });

    inspectMarketSpecies(simulation, "bluegill");
    const track = questPresentation(simulation, { ...harborView, marketDetailOpen: true });
    expect(track).toMatchObject({
      heading: "Tutorial",
      title: "Track catch",
      index: 2,
      uiTargetSelector: '[data-action="track-market-fish"][data-species="bluegill"]',
    });
  });

  test("reopens the Bluegill card when tracking is still required", () => {
    const simulation = createSimulation();
    inspectMarketSpecies(simulation, "bluegill");
    const closed = questPresentation(simulation, harborView);
    expect(closed.uiTargetSelector).toBe('[data-action="select-market-fish"][data-species="bluegill"]');
  });

  test("points the player out of harbor, then along glowing lake arrows", () => {
    const simulation = createSimulation();
    inspectMarketSpecies(simulation, "bluegill");
    expect(trackMarketSpecies(simulation, "bluegill")).toBe(true);

    const leaveDetail = questPresentation(simulation, { ...harborView, marketDetailOpen: true });
    expect(leaveDetail.uiTargetSelector).toBe('[data-action="close-market-fish-detail"]');

    const leaveHarbor = questPresentation(simulation, harborView);
    expect(leaveHarbor.uiTargetSelector).toBe('[data-action="undock"]');

    undock(simulation);
    const travel = questPresentation(simulation, playView);
    expect(travel).toMatchObject({
      heading: "Tutorial",
      title: "Catch Bluegill",
      index: 3,
      worldFollow: true,
      uiTargetSelector: null,
    });
    const arrows = questFollowArrows(simulation);
    expect(arrows.length).toBeGreaterThan(0);
    expect(arrows.every((arrow) => arrow.direction === 1)).toBe(true);
    expect(arrows[0]?.x).toBeGreaterThan(simulation.boat.x + 0.04);
    expect(arrows.at(-1)?.x).toBeLessThan(spotById("sunwardShoal").x);
  });

  test("glows the drop-line control on arrival and follows the hook to Bluegill", () => {
    const simulation = createSimulation();
    inspectMarketSpecies(simulation, "bluegill");
    trackMarketSpecies(simulation, "bluegill");
    undock(simulation);
    moveBoatForTesting(simulation, spotById("sunwardShoal"));

    const arrived = questPresentation(simulation, playView);
    expect(arrived.worldFollow).toBe(false);
    expect(arrived.uiTargetSelector).toBe("#context-action");
    expect(questFollowArrows(simulation)).toEqual([]);

    expect(startFishing(simulation, "sunwardShoal")).toBe(true);
    const fishing = questPresentation(simulation, playView);
    expect(fishing.hookFollow).toBe(true);
    expect(fishing.title).toBe("Catch Bluegill");
    expect(fishing.instruction).toContain("Steer the hook onto Bluegill");
    expect(fishing.instruction).toContain("hold left click");
    const targetIndex = questHookTargetIndex(simulation);
    expect(targetIndex).toBeGreaterThanOrEqual(0);
    if (targetIndex === null) throw new Error("Expected the tutorial to select a Bluegill target");
    const target = simulation.fishing?.targets[targetIndex];
    expect(target).toBeDefined();
    if (!simulation.fishing || !target) throw new Error("Expected a Bluegill fishing target");
    simulation.fishing.reeling = {
      species: target.species,
      targetIndex,
      hookedAt: simulation.elapsed,
      direction: target.direction,
      progress: 0,
      tension: 0.12,
      stamina: 1,
      behaviour: "calm",
      struggle: 0.08,
      motionX: 0,
      motionY: 0,
      motionVx: 0,
      motionVy: 0,
      landingAt: null,
      lostAt: null,
    };
    const hooked = questPresentation(simulation, playView);
    expect(hooked.title).toBe("Hold left click");
    expect(hooked.instruction).toContain("while the fish is calm");

    simulation.fishing.reeling.behaviour = "run";
    simulation.fishing.reeling.struggle = 0.8;
    const running = questPresentation(simulation, playView);
    expect(running.title).toBe("Let it run");
    expect(running.instruction).toContain("racing away");

    simulation.fishing.reeling.tension = 0.94;
    const critical = questPresentation(simulation, playView);
    expect(critical.title).toBe("Release left click");
    expect(critical.instruction).toContain("red and about to snap");
  });

  test("leads a catch to the stronger harbor and the Sell button", () => {
    const simulation = createSimulation();
    inspectMarketSpecies(simulation, "bluegill");
    trackMarketSpecies(simulation, "bluegill");
    undock(simulation);
    expect(resolveCatch(simulation, "bluegill")).toBe(true);

    const travel = questPresentation(simulation, playView);
    expect(travel).toMatchObject({
      heading: "Tutorial",
      title: "Sell catch",
      index: 4,
      worldFollow: true,
    });
    const harbor = strongerHarborFor("bluegill", simulation.progress.marketDay, simulation.seed);
    expect(questFollowArrows(simulation).every((arrow) => (
      arrow.direction === (harbor.x > simulation.boat.x ? 1 : -1)
    ))).toBe(true);

    moveBoatForTesting(simulation, harbor);
    const dock = questPresentation(simulation, playView);
    expect(dock.uiTargetSelector).toBe("#context-action");
    interact(simulation);

    const listing = questPresentation(simulation, {
      ...harborView,
      overlay: "harbor",
    });
    expect(listing.uiTargetSelector).toBe('[data-action="select-market-fish"][data-species="bluegill"]');
    const sell = questPresentation(simulation, { ...harborView, overlay: "harbor", marketDetailOpen: true });
    expect(sell.uiTargetSelector).toBe('[data-action="sell-market-fish"][data-species="bluegill"]');
  });

  test("hides the tutorial after the first sale, including leftover complete steps", () => {
    const simulation = createSimulation();
    simulation.progress.marketTutorialStep = "complete";
    expect(questPresentation(simulation, harborView).hidden).toBe(true);

    simulation.progress.marketTutorialStep = "done";
    expect(questPresentation(simulation, harborView).hidden).toBe(true);
    expect(questFollowArrows(simulation)).toEqual([]);
  });

  test("sends a stray boat back to Brindle before the market lesson", () => {
    const simulation = createSimulation();
    undock(simulation);
    simulation.boat.x = 0.42;
    const stray = questPresentation(simulation, playView);
    expect(stray.worldFollow).toBe(true);
    expect(questFollowArrows(simulation)[0]?.direction).toBe(-1);

    moveBoatForTesting(simulation, harborById("brindle"));
    const dock = questPresentation(simulation, playView);
    expect(dock.uiTargetSelector).toBe("#context-action");
    expect(questFollowArrows(simulation)).toEqual([]);
  });

  test("routes an unfinished Bluegill lesson home from Oil Rig", () => {
    const simulation = createSimulation();
    expect(travelToWorld(simulation, "oil-rig")).toBe(true);

    const underway = questPresentation(simulation, playView);
    expect(underway).toMatchObject({
      title: "Return to Lake",
      worldFollow: true,
      uiTargetSelector: null,
    });
    expect(underway.instruction).toContain("Dogwatch Rig");

    moveBoatForTesting(simulation, harborById("brindle"));
    expect(questPresentation(simulation, playView).uiTargetSelector).toBe("#context-action");
    interact(simulation);

    const docked = questPresentation(simulation, harborView);
    expect(docked.title).toBe("Return to Lake");
    expect(docked.instruction).toContain("Use Departures");
    expect(docked.uiTargetSelector).toBe('[data-action="travel-world"][data-world="lake"]');
  });

  test("hides the assignment while pause and title overlays are open", () => {
    const simulation = createSimulation();
    expect(questPresentation(simulation, { ...harborView, overlay: "pause" }).hidden).toBe(true);
    expect(questPresentation(simulation, { ...harborView, overlay: "title", started: false }).hidden).toBe(true);
  });

  test("places a UI arrow beside the current target without covering it", () => {
    const target = { left: 720, top: 220, width: 160, height: 180 };
    const side = chooseQuestArrowSide(target, { width: 1280, height: 800 });
    expect(side).toBe("left");
    const layout = questUiArrowLayout(target, side);
    expect(layout.left + 56).toBeLessThan(target.left);
    expect(layout.rotation).toBe(0);

    const low = { left: 500, top: 640, width: 80, height: 80 };
    expect(chooseQuestArrowSide(low, { width: 1280, height: 800 })).toBe("above");
    expect(questUiArrowLayout(low, "above").rotation).toBe(90);
  });

  test("starts an upgrade walkthrough when the player can afford Upgrades", () => {
    const simulation = createSimulation();
    skipMarketTutorial(simulation);
    expect(questPresentation(simulation, harborView).hidden).toBe(true);

    simulation.progress.money = 55;
    syncUpgradeTutorial(simulation);
    const open = questPresentation(simulation, harborView);
    expect(open).toMatchObject({
      hidden: false,
      heading: "Tutorial",
      title: "Open upgrades",
      index: 1,
      uiTargetSelector: '[data-action="harbor-section"][data-harbor-section="upgrades"]',
    });

    const buy = questPresentation(simulation, { ...harborView, harborSection: "upgrades" });
    expect(buy).toMatchObject({
      title: "Buy line depth",
      index: 2,
      uiTargetSelector: '[data-action="buy-upgrade"][data-upgrade="line"]',
    });

    expect(buyUpgrade(simulation, "line")).toBe(true);
    expect(questPresentation(simulation, { ...harborView, harborSection: "upgrades" })).toMatchObject({
      title: "Return to lake",
      index: 3,
      totalSteps: 5,
      uiTargetSelector: '[data-action="undock"]',
    });

    undock(simulation);
    expect(questPresentation(simulation, playView)).toMatchObject({
      title: "Sail to Mosswater",
      index: 4,
      totalSteps: 5,
      worldFollow: true,
    });

    moveBoatForTesting(simulation, spotById("mosswaterPool"));
    expect(questPresentation(simulation, playView)).toMatchObject({
      title: "Drop the line",
      index: 5,
      totalSteps: 5,
      uiTargetSelector: "#context-action",
    });

    expect(startFishing(simulation, "mosswaterPool")).toBe(true);
    expect(questPresentation(simulation, playView).hidden).toBe(true);
  });

  test("guides an upgrade run back to harbor from the lake", () => {
    const simulation = createSimulation();
    skipMarketTutorial(simulation);
    simulation.progress.money = 55;
    syncUpgradeTutorial(simulation);
    undock(simulation);
    simulation.boat.x = 0.42;
    const travel = questPresentation(simulation, playView);
    expect(travel).toMatchObject({
      title: "Dock harbor",
      worldFollow: true,
    });
    expect(questFollowArrows(simulation)[0]?.direction).toBe(-1);
  });
});
