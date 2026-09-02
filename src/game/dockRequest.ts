import {
  FISH,
  FISHING_SPOTS,
  WORLD_SPOT_RESIDENTS,
  type FishSpecies,
  type HarborId,
  type WorldId,
} from "./balance";
import { marketQuote } from "./market";
import { cargoCapacity, type Simulation } from "./simulation";

export const DOCK_BUYER_NAME = "Milo";
export const DOCK_REQUEST_MIN_QUANTITY = 2;
export const DOCK_REQUEST_MAX_QUANTITY = 4;
export const DOCK_REQUEST_MIN_MODIFIER = -10;
export const DOCK_REQUEST_MAX_MODIFIER = 25;
export const MAX_FULFILLED_DOCK_REQUESTS = 64;

export interface DockRequest {
  id: string;
  buyerName: typeof DOCK_BUYER_NAME;
  day: number;
  world: WorldId;
  harbor: HarborId;
  species: FishSpecies;
  quantity: number;
  modifierPercent: number;
  marketUnitPrice: number;
  offeredUnitPrice: number;
  payment: number;
  fulfilled: boolean;
}

export interface DockRequestTrade {
  request: DockRequest;
  quantity: number;
  payment: number;
}

export function dockRequestFor(simulation: Simulation): DockRequest | null {
  const harbor = simulation.dockedAt;
  if (!harbor || !isTutorialComplete(simulation.progress.marketTutorialStep)) return null;
  if (harbor !== activeDockRequestHarbor(
    simulation.seed,
    simulation.world,
    simulation.progress.marketDay,
  )) return null;

  const speciesPool = reachableRequestSpecies(simulation);
  const species = speciesPool[seededIndex(
    `${simulation.seed}:${simulation.world}:${harbor}:${simulation.progress.marketDay}:species`,
    speciesPool.length,
  )] ?? speciesPool[0];
  if (!species) return null;

  const quantityMaximum = Math.min(DOCK_REQUEST_MAX_QUANTITY, cargoCapacity(simulation));
  const quantity = DOCK_REQUEST_MIN_QUANTITY + seededIndex(
    `${simulation.seed}:${simulation.world}:${harbor}:${simulation.progress.marketDay}:quantity`,
    quantityMaximum - DOCK_REQUEST_MIN_QUANTITY + 1,
  );
  const modifierPercent = DOCK_REQUEST_MIN_MODIFIER + seededIndex(
    `${simulation.seed}:${simulation.world}:${harbor}:${simulation.progress.marketDay}:modifier`,
    DOCK_REQUEST_MAX_MODIFIER - DOCK_REQUEST_MIN_MODIFIER + 1,
  );
  const marketUnitPrice = marketQuote(
    species,
    harbor,
    simulation.progress.marketDay,
    simulation.seed,
  ).price;
  const offeredUnitPrice = Math.max(1, Math.round(marketUnitPrice * (100 + modifierPercent) / 100));
  const id = dockRequestId(simulation.world, harbor, simulation.progress.marketDay);

  return {
    id,
    buyerName: DOCK_BUYER_NAME,
    day: simulation.progress.marketDay,
    world: simulation.world,
    harbor,
    species,
    quantity,
    modifierPercent,
    marketUnitPrice,
    offeredUnitPrice,
    payment: offeredUnitPrice * quantity,
    fulfilled: simulation.progress.fulfilledDockRequests.includes(id),
  };
}

export function cargoCountForDockRequest(simulation: Simulation, request: DockRequest): number {
  return simulation.cargo.filter((item) => item.species === request.species).length;
}

export function fulfillDockRequest(
  simulation: Simulation,
  expectedRequest: DockRequest,
): DockRequestTrade | null {
  const request = dockRequestFor(simulation);
  if (!request || request.id !== expectedRequest.id || request.fulfilled) return null;
  if (cargoCountForDockRequest(simulation, request) < request.quantity) return null;

  let remaining = request.quantity;
  simulation.cargo = simulation.cargo.filter((item) => {
    if (remaining > 0 && item.species === request.species) {
      remaining -= 1;
      return false;
    }
    return true;
  });
  simulation.progress.money = Math.min(999_999, simulation.progress.money + request.payment);
  simulation.progress.marketSales = Math.min(99_999, simulation.progress.marketSales + 1);
  simulation.progress.marketEarnings = Math.min(
    999_999_999,
    simulation.progress.marketEarnings + request.payment,
  );
  simulation.progress.fulfilledDockRequests = [
    ...simulation.progress.fulfilledDockRequests.filter((id) => id !== request.id),
    request.id,
  ].slice(-MAX_FULFILLED_DOCK_REQUESTS);
  simulation.events.push({
    type: "dock-request-traded",
    buyerName: request.buyerName,
    species: request.species,
    quantity: request.quantity,
    payment: request.payment,
  });

  return { request: { ...request, fulfilled: true }, quantity: request.quantity, payment: request.payment };
}

export function activeDockRequestHarbor(seed: number, world: WorldId, day: number): HarborId {
  const worldOffset = world === "beach" ? 1 : 0;
  return (Math.max(1, Math.floor(day)) + Math.floor(seed) + worldOffset) % 2 === 0
    ? "brindle"
    : "gloam";
}

function reachableRequestSpecies(simulation: Simulation): FishSpecies[] {
  const lineTier = simulation.progress.upgrades.line;
  return FISHING_SPOTS.flatMap((spot) => {
    if (spot.requiredDepthTier[simulation.world] > lineTier) return [];
    return WORLD_SPOT_RESIDENTS[simulation.world][spot.id]
      .filter((species) => FISH[species].depthTier <= lineTier);
  });
}

function dockRequestId(world: WorldId, harbor: HarborId, day: number): string {
  return `${world}:${harbor}:${Math.max(1, Math.floor(day))}`;
}

function isTutorialComplete(step: Simulation["progress"]["marketTutorialStep"]): boolean {
  return step === "complete" || step === "done";
}

function seededIndex(key: string, size: number): number {
  if (size <= 1) return 0;
  let hash = 2_166_136_261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) % size;
}
