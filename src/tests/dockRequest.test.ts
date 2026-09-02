import { describe, expect, test } from "vitest";
import {
  DOCK_REQUEST_MAX_MODIFIER,
  DOCK_REQUEST_MAX_QUANTITY,
  DOCK_REQUEST_MIN_MODIFIER,
  DOCK_REQUEST_MIN_QUANTITY,
  activeDockRequestHarbor,
  cargoCountForDockRequest,
  dockRequestFor,
  fulfillDockRequest,
} from "../game/dockRequest";
import { createSimulation } from "../game/simulation";

describe("dockside fish requests", () => {
  test("offers one deterministic, reachable request at one harbor each market day", () => {
    const simulation = createSimulation(7, { marketTutorialStep: "done" });
    const request = dockRequestFor(simulation);

    expect(activeDockRequestHarbor(7, "lake", 1)).toBe("brindle");
    expect(request).not.toBeNull();
    expect(request?.quantity).toBeGreaterThanOrEqual(DOCK_REQUEST_MIN_QUANTITY);
    expect(request?.quantity).toBeLessThanOrEqual(3);
    expect(request?.modifierPercent).toBeGreaterThanOrEqual(DOCK_REQUEST_MIN_MODIFIER);
    expect(request?.modifierPercent).toBeLessThanOrEqual(DOCK_REQUEST_MAX_MODIFIER);
    expect(request?.offeredUnitPrice).toBe(Math.max(
      1,
      Math.round(request!.marketUnitPrice * (100 + request!.modifierPercent) / 100),
    ));
    expect(request?.payment).toBe(request!.offeredUnitPrice * request!.quantity);

    simulation.dockedAt = "gloam";
    expect(dockRequestFor(simulation)).toBeNull();
    simulation.progress.marketDay = 2;
    expect(dockRequestFor(simulation)?.harbor).toBe("gloam");
  });

  test("quantity scales up to four without exceeding current cargo capacity", () => {
    for (let day = 1; day <= 80; day += 1) {
      const simulation = createSimulation(7, {
        marketDay: day,
        marketTutorialStep: "done",
        upgrades: { cargo: 4, engine: 0, lamp: 0, line: 6, reel: 0 },
      });
      simulation.dockedAt = activeDockRequestHarbor(7, "lake", day);
      const request = dockRequestFor(simulation);
      expect(request?.quantity).toBeGreaterThanOrEqual(DOCK_REQUEST_MIN_QUANTITY);
      expect(request?.quantity).toBeLessThanOrEqual(DOCK_REQUEST_MAX_QUANTITY);
    }
  });

  test("trades exactly the requested fish once and records the payout", () => {
    const simulation = createSimulation(7, { marketTutorialStep: "done" });
    const request = dockRequestFor(simulation)!;
    simulation.cargo = [
      ...Array.from({ length: request.quantity + 1 }, () => ({ species: request.species })),
      { species: request.species === "bluegill" ? "yellowPerch" as const : "bluegill" as const },
    ];
    const startingMoney = simulation.progress.money;

    expect(cargoCountForDockRequest(simulation, request)).toBe(request.quantity + 1);
    const trade = fulfillDockRequest(simulation, request);

    expect(trade).toEqual(expect.objectContaining({ quantity: request.quantity, payment: request.payment }));
    expect(simulation.progress.money).toBe(startingMoney + request.payment);
    expect(cargoCountForDockRequest(simulation, request)).toBe(1);
    expect(simulation.progress.fulfilledDockRequests).toContain(request.id);
    expect(simulation.events.at(-1)).toEqual(expect.objectContaining({
      type: "dock-request-traded",
      quantity: request.quantity,
      payment: request.payment,
    }));
    expect(fulfillDockRequest(simulation, request)).toBeNull();
  });

  test("stays out of the first assignment and rejects incomplete cargo", () => {
    const tutorialSimulation = createSimulation(7);
    expect(dockRequestFor(tutorialSimulation)).toBeNull();

    const simulation = createSimulation(7, { marketTutorialStep: "done" });
    const request = dockRequestFor(simulation)!;
    simulation.cargo = Array.from(
      { length: request.quantity - 1 },
      () => ({ species: request.species }),
    );
    expect(fulfillDockRequest(simulation, request)).toBeNull();
    expect(simulation.progress.fulfilledDockRequests).toEqual([]);
  });
});
