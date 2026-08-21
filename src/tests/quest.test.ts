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
    expect(questHookTargetIndex(simulation)).toBeGreaterThanOrEqual(0);
  });

  test("leads a fresh catch to the stronger harbor and the Sell button", () => {
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

  test("starts an upgrade walkthrough when the player can afford Dock Services", () => {
    const simulation = createSimulation();
    skipMarketTutorial(simulation);
    expect(questPresentation(simulation, harborView).hidden).toBe(true);

    simulation.progress.money = 55;
    syncUpgradeTutorial(simulation);
    const open = questPresentation(simulation, harborView);
    expect(open).toMatchObject({
      hidden: false,
      heading: "Tutorial",
      title: "Open services",
      index: 1,
      uiTargetSelector: '[data-action="harbor-section"][data-harbor-section="services"]',
    });

    const buy = questPresentation(simulation, { ...harborView, harborSection: "services" });
    expect(buy).toMatchObject({
      title: "Buy line depth",
      index: 2,
      uiTargetSelector: '[data-action="buy-upgrade"][data-upgrade="line"]',
    });

    expect(buyUpgrade(simulation, "line")).toBe(true);
    expect(questPresentation(simulation, { ...harborView, harborSection: "services" })).toMatchObject({
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
