import { clamp, createRandom, type RandomSource } from "./math";
import {
  BALANCE,
  FISH,
  FISHING_SPOTS,
  HARBORS,
  ROCKS,
  SURFACE_Y,
  harborById,
  spotById,
  type FishSpecies,
  type HarborId,
  type SpotId,
  type UpgradeId,
  type WorldPoint,
} from "./balance";

export interface InputState {
  travel: number;
  boost: boolean;
  brake: boolean;
  hookX: number;
  hookY: number;
}

export interface BoatState extends WorldPoint {
  facing: -1 | 1;
  speed: number;
  damage: number;
  collisionCooldown: number;
}

export interface CargoItem {
  species: FishSpecies;
  freshness: number;
}

export interface Contract {
  id: string;
  title: string;
  species: FishSpecies;
  origin: HarborId;
  destination: HarborId;
  spot: SpotId;
  reward: number;
  minimumFreshness: number;
}

export interface ProgressState {
  money: number;
  upgrades: Record<UpgradeId, number>;
  outerUnlocked: boolean;
  completedContracts: number;
}

export interface FishingTarget extends WorldPoint {
  species: FishSpecies;
  direction: -1 | 1;
  speed: number;
}

export interface FishingState {
  spot: SpotId;
  hook: WorldPoint;
  targets: FishingTarget[];
}

export type SimulationEvent =
  | { type: "caught"; species: FishSpecies }
  | { type: "collision"; damage: number }
  | { type: "delivered"; payment: number }
  | { type: "docked"; harbor: HarborId }
  | { type: "full-cargo" }
  | { type: "locked-region" }
  | { type: "rescued"; harbor: HarborId; cost: number }
  | { type: "upgrade"; upgrade: UpgradeId }
  | { type: "permit" };

export interface Simulation {
  boat: BoatState;
  cargo: CargoItem[];
  activeContract: Contract | null;
  availableContract: Contract | null;
  dockedAt: HarborId | null;
  mode: "cruising" | "fishing";
  fishing: FishingState | null;
  elapsed: number;
  random: RandomSource;
  progress: ProgressState;
  events: SimulationEvent[];
}

export interface InteractionPrompt {
  kind: "harbor" | "fishing";
  label: string;
  enabled: boolean;
  harbor?: HarborId;
  spot?: SpotId;
  reason?: string;
}

const BOAT_RADIUS = 0.019;
const FISHING_HOOK_SPEED = 0.48;
const FISHING_CATCH_RADIUS = 0.058;

export function createSimulation(seed = 1, progress?: Partial<ProgressState>): Simulation {
  const resolvedProgress: ProgressState = {
    money: clampInteger(progress?.money, 0, 999_999),
    upgrades: {
      cargo: clampInteger(progress?.upgrades?.cargo, 0, BALANCE.maxUpgradeTier),
      engine: clampInteger(progress?.upgrades?.engine, 0, BALANCE.maxUpgradeTier),
      lamp: clampInteger(progress?.upgrades?.lamp, 0, BALANCE.maxUpgradeTier),
    },
    outerUnlocked: progress?.outerUnlocked === true,
    completedContracts: clampInteger(progress?.completedContracts, 0, 99_999),
  };
  const simulation: Simulation = {
    boat: {
      x: 0.11,
      y: SURFACE_Y,
      facing: 1,
      speed: 0,
      damage: 18,
      collisionCooldown: 0,
    },
    cargo: [],
    activeContract: null,
    availableContract: null,
    dockedAt: "brindle",
    mode: "cruising",
    fishing: null,
    elapsed: 22,
    random: createRandom(seed),
    progress: resolvedProgress,
    events: [],
  };
  simulation.availableContract = createAvailableContract(simulation, "brindle");
  return simulation;
}

export function updateSimulation(simulation: Simulation, input: InputState, dt: number): void {
  const safeDt = clamp(dt, 0, 0.1);
  simulation.elapsed += safeDt;
  ageCargo(simulation, safeDt);

  if (simulation.mode === "fishing") {
    updateFishing(simulation, input, safeDt);
    return;
  }
  if (simulation.dockedAt) return;

  const { boat } = simulation;
  boat.collisionCooldown = Math.max(0, boat.collisionCooldown - safeDt);
  const travel = Math.sign(clamp(input.travel, -1, 1));
  if (travel !== 0) boat.facing = travel as -1 | 1;

  if (input.brake) {
    boat.speed = moveToward(boat.speed, 0, BALANCE.brakeStrength * safeDt);
  } else if (input.boost) {
    const boostDirection = travel === 0 ? boat.facing : travel;
    boat.speed += boostDirection * BALANCE.engineBoostThrust * safeDt;
  } else if (travel !== 0) {
    boat.speed += travel * BALANCE.horizontalThrust * safeDt;
  } else {
    boat.speed *= Math.max(0, 1 - BALANCE.waterDrag * safeDt);
  }

  const engineMultiplier = 1 + simulation.progress.upgrades.engine * 0.16;
  const maximumSpeed = BALANCE.maxSurfaceSpeed * engineMultiplier;
  boat.speed = clamp(boat.speed, -maximumSpeed, maximumSpeed);
  if (Math.abs(boat.speed) > 0.004) boat.facing = boat.speed < 0 ? -1 : 1;

  const previousX = boat.x;
  boat.x = clamp(boat.x + boat.speed * safeDt, 0.045, 0.955);
  boat.y = SURFACE_Y;
  if (boat.x === 0.045 || boat.x === 0.955) boat.speed *= 0.2;
  resolveRockCrossing(simulation, previousX);
}

export function interact(simulation: Simulation): InteractionPrompt | null {
  const prompt = getInteractionPrompt(simulation);
  if (!prompt?.enabled) return prompt;
  if (prompt.kind === "harbor" && prompt.harbor) {
    simulation.boat.speed = 0;
    simulation.dockedAt = prompt.harbor;
    simulation.events.push({ type: "docked", harbor: prompt.harbor });
  } else if (prompt.kind === "fishing" && prompt.spot) {
    startFishing(simulation, prompt.spot);
  }
  return prompt;
}

export function getInteractionPrompt(simulation: Simulation): InteractionPrompt | null {
  if (simulation.mode === "fishing" || simulation.dockedAt) return null;

  const harbor = nearestHorizontal(simulation.boat.x, HARBORS, BALANCE.dockRadius);
  if (harbor) {
    const enabled = Math.abs(simulation.boat.speed) <= BALANCE.interactionMaxSpeed;
    return {
      kind: "harbor",
      harbor: harbor.id,
      label: enabled ? `Dock · ${harbor.name}` : `Brake for ${harbor.name}`,
      enabled,
      reason: enabled ? undefined : "Too fast to dock",
    };
  }

  const spot = nearestHorizontal(simulation.boat.x, FISHING_SPOTS, BALANCE.fishingRadius);
  if (!spot) return null;
  if (spot.requiresPermit && !simulation.progress.outerUnlocked) {
    return { kind: "fishing", spot: spot.id, label: "Permit required · Outer Gloam", enabled: false, reason: "Permit required" };
  }
  if (simulation.cargo.length >= cargoCapacity(simulation)) {
    return { kind: "fishing", spot: spot.id, label: "Cargo hold full", enabled: false, reason: "Cargo hold full" };
  }
  const enabled = Math.abs(simulation.boat.speed) <= BALANCE.interactionMaxSpeed;
  return {
    kind: "fishing",
    spot: spot.id,
    label: enabled ? `Drop line · ${spot.name}` : `Brake beneath ${spot.name}`,
    enabled,
    reason: enabled ? undefined : "Too fast to fish",
  };
}

export function startFishing(simulation: Simulation, spotId: SpotId): boolean {
  const spot = spotById(spotId);
  if (spot.requiresPermit && !simulation.progress.outerUnlocked) {
    pushEventOnce(simulation, { type: "locked-region" });
    return false;
  }
  if (simulation.cargo.length >= cargoCapacity(simulation)) {
    pushEventOnce(simulation, { type: "full-cargo" });
    return false;
  }

  const species: FishSpecies[] = [spot.species, ...(["reedfin", "needlePike", "gloamGill"] as const)
    .filter((candidate) => candidate !== spot.species)];
  simulation.boat.speed = 0;
  simulation.mode = "fishing";
  simulation.fishing = {
    spot: spotId,
    hook: { x: 0.5, y: 0.08 },
    targets: species.map((fishSpecies, index) => ({
      species: fishSpecies,
      x: 0.2 + index * 0.3,
      y: 0.34 + simulation.random.next() * 0.48,
      direction: index % 2 === 0 ? 1 : -1,
      speed: 0.045 + simulation.random.next() * 0.035,
    })),
  };
  return true;
}

export function leaveFishing(simulation: Simulation): void {
  simulation.mode = "cruising";
  simulation.fishing = null;
}

export function resolveCatch(simulation: Simulation, species: FishSpecies): boolean {
  if (simulation.cargo.length >= cargoCapacity(simulation)) {
    pushEventOnce(simulation, { type: "full-cargo" });
    return false;
  }
  simulation.cargo.push({ species, freshness: 100 });
  simulation.events.push({ type: "caught", species });
  leaveFishing(simulation);
  return true;
}

export function acceptAvailableContract(simulation: Simulation): boolean {
  if (!simulation.availableContract || simulation.activeContract) return false;
  if (simulation.dockedAt !== simulation.availableContract.origin) return false;
  simulation.activeContract = simulation.availableContract;
  simulation.availableContract = null;
  return true;
}

export function deliverContract(simulation: Simulation): number | null {
  const contract = simulation.activeContract;
  if (!contract || simulation.dockedAt !== contract.destination) return null;
  const cargoIndex = simulation.cargo.findIndex(
    (item) => item.species === contract.species && item.freshness >= contract.minimumFreshness,
  );
  if (cargoIndex < 0) return null;
  const item = simulation.cargo[cargoIndex];
  if (!item) return null;
  const freshnessRange = Math.max(1, 100 - contract.minimumFreshness);
  const freshnessFactor = clamp((item.freshness - contract.minimumFreshness) / freshnessRange, 0, 1);
  const payment = Math.floor(contract.reward * (0.45 + freshnessFactor * 0.55));
  simulation.cargo.splice(cargoIndex, 1);
  simulation.progress.money += payment;
  simulation.progress.completedContracts += 1;
  simulation.activeContract = null;
  simulation.availableContract = createAvailableContract(simulation, contract.destination);
  simulation.events.push({ type: "delivered", payment });
  return payment;
}

export function undock(simulation: Simulation): void {
  if (!simulation.dockedAt) return;
  const harbor = harborById(simulation.dockedAt);
  simulation.boat.facing = harbor.id === "brindle" ? 1 : -1;
  simulation.boat.x = harbor.id === "brindle" ? 0.11 : 0.89;
  simulation.boat.y = SURFACE_Y;
  simulation.boat.speed = 0;
  simulation.dockedAt = null;
}

export function buyUpgrade(simulation: Simulation, upgrade: UpgradeId): boolean {
  const tier = simulation.progress.upgrades[upgrade];
  const cost = upgradeCost(upgrade, tier);
  if (tier >= BALANCE.maxUpgradeTier || simulation.progress.money < cost || !simulation.dockedAt) return false;
  simulation.progress.money -= cost;
  simulation.progress.upgrades[upgrade] += 1;
  simulation.events.push({ type: "upgrade", upgrade });
  return true;
}

export function buyPermit(simulation: Simulation): boolean {
  if (!simulation.dockedAt || simulation.progress.outerUnlocked || simulation.progress.money < BALANCE.permitCost) return false;
  simulation.progress.money -= BALANCE.permitCost;
  simulation.progress.outerUnlocked = true;
  simulation.events.push({ type: "permit" });
  return true;
}

export function repairBoat(simulation: Simulation): number {
  if (!simulation.dockedAt || simulation.boat.damage <= 0) return 0;
  const quoted = repairCost(simulation);
  const paid = Math.min(simulation.progress.money, quoted);
  const repaired = Math.min(simulation.boat.damage, paid * BALANCE.repairDamagePerShell);
  simulation.progress.money -= paid;
  simulation.boat.damage -= repaired;
  return paid;
}

export function discardCargo(simulation: Simulation, index: number): boolean {
  if (!simulation.dockedAt || index < 0 || index >= simulation.cargo.length) return false;
  simulation.cargo.splice(index, 1);
  return true;
}

export function damageBoat(simulation: Simulation, amount: number): void {
  simulation.boat.damage = clamp(simulation.boat.damage + Math.max(0, amount), 0, 100);
  if (simulation.boat.damage >= 100) rescue(simulation);
}

export function cargoCapacity(simulation: Simulation): number {
  return 1 + simulation.progress.upgrades.cargo;
}

export function upgradeCost(upgrade: UpgradeId, tier: number): number {
  return BALANCE.upgradeCosts[upgrade] + Math.max(0, tier) * 55;
}

export function repairCost(simulation: Simulation): number {
  return Math.ceil(simulation.boat.damage / BALANCE.repairDamagePerShell);
}

export function isNight(simulation: Simulation): boolean {
  return simulation.elapsed % BALANCE.dayLength >= BALANCE.nightStart;
}

export function dayProgress(simulation: Simulation): number {
  return (simulation.elapsed % BALANCE.dayLength) / BALANCE.dayLength;
}

export function fogIntensity(simulation: Simulation): number {
  const phase = (simulation.elapsed % BALANCE.fogLength) / BALANCE.fogLength;
  return Math.max(0, Math.sin((phase - 0.18) * Math.PI * 2)) * 0.72;
}

export function objective(simulation: Simulation): { point: WorldPoint; label: string } {
  const contract = simulation.activeContract;
  if (!contract) {
    const harbor = harborById(simulation.availableContract?.origin ?? simulation.dockedAt ?? "brindle");
    return { point: harbor, label: harbor.name };
  }
  if (simulation.cargo.some((item) => item.species === contract.species)) {
    const harbor = harborById(contract.destination);
    return { point: harbor, label: harbor.name };
  }
  const spot = spotById(contract.spot);
  return { point: spot, label: spot.name };
}

export function tutorialPrompt(simulation: Simulation): string | null {
  const totalUpgradeTiers = Object.values(simulation.progress.upgrades).reduce((sum, tier) => sum + tier, 0);
  if (simulation.progress.completedContracts > 0) {
    return totalUpgradeTiers === 0 ? "Spend the payment on one boat upgrade." : null;
  }
  if (!simulation.activeContract) return "Take The Morning Order from the contract board.";
  if (simulation.mode === "fishing") return "Guide the hook into the round Reedfin. Match the silhouette.";
  if (!simulation.cargo.some((item) => item.species === simulation.activeContract?.species)) {
    return "Hold right for Sunward Shoal. Brake under its hanging marker.";
  }
  return "The catch is losing freshness. Head right for Gloam Ferry.";
}

export function consumeEvents(simulation: Simulation): SimulationEvent[] {
  return simulation.events.splice(0, simulation.events.length);
}

export function moveBoatForTesting(simulation: Simulation, point: WorldPoint): void {
  simulation.dockedAt = null;
  simulation.boat.x = point.x;
  simulation.boat.y = SURFACE_Y;
  simulation.boat.speed = 0;
}

function updateFishing(simulation: Simulation, input: InputState, dt: number): void {
  const fishing = simulation.fishing;
  if (!fishing) return;
  fishing.hook.x = clamp(fishing.hook.x + input.hookX * FISHING_HOOK_SPEED * dt, 0.07, 0.93);
  fishing.hook.y = clamp(fishing.hook.y + input.hookY * FISHING_HOOK_SPEED * dt, 0.07, 0.93);
  for (const target of fishing.targets) {
    target.x += target.speed * target.direction * dt;
    if (target.x < 0.1 || target.x > 0.9) {
      target.x = clamp(target.x, 0.1, 0.9);
      target.direction = target.direction === 1 ? -1 : 1;
    }
    if (distance(fishing.hook, target) <= FISHING_CATCH_RADIUS) {
      resolveCatch(simulation, target.species);
      return;
    }
  }
}

function ageCargo(simulation: Simulation, dt: number): void {
  const freshnessLoss = (100 / BALANCE.freshnessLifetime) * dt;
  for (const item of simulation.cargo) item.freshness = Math.max(0, item.freshness - freshnessLoss);
}

function resolveRockCrossing(simulation: Simulation, previousX: number): void {
  const { boat } = simulation;
  if (boat.collisionCooldown > 0 || Math.abs(boat.speed) <= BALANCE.interactionMaxSpeed) return;
  for (const rock of ROCKS) {
    const radius = BOAT_RADIUS + rock.radius;
    const isInside = Math.abs(boat.x - rock.x) <= radius;
    const crossed = (previousX - rock.x) * (boat.x - rock.x) <= 0;
    if (!isInside && !crossed) continue;
    const impactSpeed = Math.abs(boat.speed);
    const damage = Math.ceil(BALANCE.collisionBaseDamage + BALANCE.collisionSpeedDamage * impactSpeed);
    boat.speed *= 0.42;
    boat.collisionCooldown = 1.2;
    simulation.events.push({ type: "collision", damage });
    damageBoat(simulation, damage);
    return;
  }
}

function rescue(simulation: Simulation): void {
  const harbor = [...HARBORS].sort(
    (first, second) => Math.abs(simulation.boat.x - first.x) - Math.abs(simulation.boat.x - second.x),
  )[0];
  if (!harbor) return;
  const cost = Math.min(20, simulation.progress.money);
  simulation.progress.money -= cost;
  simulation.boat.x = harbor.id === "brindle" ? 0.11 : 0.89;
  simulation.boat.y = SURFACE_Y;
  simulation.boat.speed = 0;
  simulation.boat.facing = harbor.id === "brindle" ? 1 : -1;
  simulation.boat.damage = Math.max(0, simulation.boat.damage - 55);
  simulation.cargo = [];
  simulation.mode = "cruising";
  simulation.fishing = null;
  simulation.dockedAt = harbor.id;
  simulation.events.push({ type: "rescued", harbor: harbor.id, cost });
}

function createAvailableContract(simulation: Simulation, origin: HarborId): Contract {
  if (simulation.progress.completedContracts === 0) {
    return {
      id: "morning-order",
      title: "The Morning Order",
      species: "reedfin",
      origin: "brindle",
      destination: "gloam",
      spot: "sunwardShoal",
      reward: 90,
      minimumFreshness: 35,
    };
  }
  const destination: HarborId = origin === "brindle" ? "gloam" : "brindle";
  const availableSpecies: FishSpecies[] = simulation.progress.outerUnlocked
    ? ["reedfin", "needlePike", "gloamGill"]
    : ["reedfin", "needlePike"];
  const species = availableSpecies[simulation.progress.completedContracts % availableSpecies.length] ?? "reedfin";
  const spot: Record<FishSpecies, SpotId> = {
    reedfin: "sunwardShoal",
    needlePike: "needleRun",
    gloamGill: "outerGloam",
  };
  return {
    id: `route-${simulation.progress.completedContracts + 1}`,
    title: species === "gloamGill" ? "A Light in Deep Water" : "Harbor Trade",
    species,
    origin,
    destination,
    spot: spot[species],
    reward: FISH[species].value * 2 + 34,
    minimumFreshness: 28 + (simulation.progress.completedContracts % 3) * 8,
  };
}

function nearestHorizontal<T extends WorldPoint>(x: number, choices: readonly T[], radius: number): T | null {
  const nearest = [...choices].sort((first, second) => Math.abs(x - first.x) - Math.abs(x - second.x))[0];
  return nearest && Math.abs(x - nearest.x) <= radius ? nearest : null;
}

function distance(first: WorldPoint, second: WorldPoint): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function moveToward(value: number, target: number, amount: number): number {
  if (value < target) return Math.min(target, value + amount);
  if (value > target) return Math.max(target, value - amount);
  return target;
}

function clampInteger(value: unknown, minimum: number, maximum: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.floor(clamp(value, minimum, maximum))
    : minimum;
}

function pushEventOnce(simulation: Simulation, event: SimulationEvent): void {
  if (!simulation.events.some((existing) => existing.type === event.type)) simulation.events.push(event);
}
