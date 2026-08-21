import { clamp, createRandom, type RandomSource } from "./math";
import { fishingSpeciesMotion } from "./fishingMovement";
import { FISHING_REEL_DURATION } from "./fishingReeling";
import {
  BALANCE,
  FISH,
  FISHING_SPOTS,
  HARBORS,
  SURFACE_Y,
  WORLD_SPOT_RESIDENTS,
  engineSpeedMultiplier,
  harborById,
  primarySpeciesForSpot,
  residentsForSpot,
  spotById,
  upgradeTierCap,
  type FishSpecies,
  type HarborId,
  type SpotId,
  type UpgradeId,
  type WorldId,
  type WorldPoint,
} from "./balance";
import {
  estimateRoute,
  evaluateSurvey,
  type SurveyResult,
} from "./stem";
import {
  bulkSalePreview,
  marketCondition,
  marketQuote,
  residentCountForMarket,
  salePreview,
  spotForSpecies,
  strongerHarborFor,
} from "./market";

export interface InputState {
  travel: number;
  boost: boolean;
  hookX: number;
  hookY: number;
}

export interface BoatState extends WorldPoint {
  facing: -1 | 1;
  speed: number;
  damage: number;
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
  quantity: number;
  reward: number;
  reducedReward: number;
  minimumFreshness: number;
}

export type RouteChoice = "safe" | "fast";

export interface LearningProgress {
  surveysCompleted: number;
  correctPredictions: number;
  routePlans: number;
}

export interface ProgressState {
  money: number;
  upgrades: Record<UpgradeId, number>;
  outerUnlocked: boolean;
  beachUnlocked: boolean;
  boostUnlocked: boolean;
  completedContracts: number;
  discovered: FishSpecies[];
  learning: LearningProgress;
  marketDay: number;
  marketSales: number;
  marketEarnings: number;
  marketTarget: FishSpecies | null;
  marketTutorialStep: MarketTutorialStep;
  seasonCompleted: boolean;
}

export type MarketTutorialStep = "inspect" | "track" | "catch" | "sell" | "complete" | "done";

export interface MarketSaleResult {
  species: FishSpecies;
  harbor: HarborId;
  quantity: number;
  averageFreshness: number;
  quote: number;
  freshnessLoss: number;
  payment: number;
}

export interface MarketBulkSaleResult {
  harbor: HarborId;
  quantity: number;
  payment: number;
}

export interface FishingTarget extends WorldPoint {
  species: FishSpecies;
  direction: -1 | 1;
  speed: number;
  homeY: number;
  phase: number;
}

export interface FishingState {
  spot: SpotId;
  startedAt: number;
  hook: WorldPoint;
  targets: FishingTarget[];
  reeling: FishingReelState | null;
  exitingAt: number | null;
}

export interface FishingReelState {
  species: FishSpecies;
  targetIndex: number;
  hookedAt: number;
  direction: -1 | 1;
}

export interface DeliveryResult {
  payment: number;
  metFreshnessRequirement: boolean;
  route: RouteChoice;
  predictedFreshness: number;
  actualFreshness: number;
  travelSeconds: number;
}

export type SimulationEvent =
  | { type: "caught"; species: FishSpecies }
  | { type: "delivered"; payment: number }
  | { type: "sold"; result: Pick<MarketSaleResult, "quantity" | "payment"> }
  | { type: "market-day"; day: number }
  | { type: "docked"; harbor: HarborId }
  | { type: "full-cargo" }
  | { type: "locked-region" }
  | { type: "depth-locked"; tier: number }
  | { type: "rescued"; harbor: HarborId; cost: number }
  | { type: "upgrade"; upgrade: UpgradeId }
  | { type: "permit" }
  | { type: "beach-unlocked" }
  | { type: "boost-unlocked"; temporary: boolean }
  | { type: "released"; species: FishSpecies }
  | { type: "season-complete" };

export interface Simulation {
  boat: BoatState;
  cargo: CargoItem[];
  activeContract: Contract | null;
  availableContract: Contract | null;
  dockedAt: HarborId | null;
  mode: "cruising" | "fishing";
  fishing: FishingState | null;
  elapsed: number;
  seed: number;
  random: RandomSource;
  progress: ProgressState;
  world: WorldId;
  events: SimulationEvent[];
  routeChoice: RouteChoice | null;
  deliveryStartedAt: number | null;
  lastDeliveryResult: DeliveryResult | null;
  lastMarketSale: MarketSaleResult | null;
  boost: {
    heat: number;
    active: boolean;
    overheated: boolean;
    temporaryUnlocked: boolean;
  };
}

export interface InteractionPrompt {
  kind: "harbor" | "fishing";
  label: string;
  enabled: boolean;
  harbor?: HarborId;
  spot?: SpotId;
  reason?: string;
}

export interface NavigationGuidance {
  point: WorldPoint;
  label: string;
  kicker: "MARKET AT" | "FISH AT" | "SELL AT" | "MANAGE CARGO" | "UPGRADE AT";
  instruction: string;
}

const FISHING_CATCH_RADIUS = 0.058;
const SEASON_SALES = 8;

export function createSimulation(seed = 1, progress?: Partial<ProgressState>): Simulation {
  const discovered: FishSpecies[] = Array.isArray(progress?.discovered)
    ? progress.discovered.filter((species): species is FishSpecies => species in FISH)
    : ["bluegill"];
  if (!discovered.includes("bluegill")) discovered.unshift("bluegill");
  const resolvedProgress: ProgressState = {
    money: clampInteger(progress?.money, 0, 999_999),
    upgrades: {
      cargo: clampInteger(progress?.upgrades?.cargo, 0, upgradeTierCap("cargo")),
      engine: clampInteger(progress?.upgrades?.engine, 0, BALANCE.maxUpgradeTier),
      lamp: clampInteger(progress?.upgrades?.lamp, 0, BALANCE.maxUpgradeTier),
      line: clampInteger(progress?.upgrades?.line, 0, BALANCE.maxUpgradeTier),
    },
    outerUnlocked: progress?.outerUnlocked === true,
    beachUnlocked: progress?.beachUnlocked === true,
    boostUnlocked: progress?.boostUnlocked === true,
    completedContracts: clampInteger(progress?.completedContracts, 0, 99_999),
    discovered: [...new Set(discovered)],
    learning: {
      surveysCompleted: clampInteger(progress?.learning?.surveysCompleted, 0, 99_999),
      correctPredictions: clampInteger(progress?.learning?.correctPredictions, 0, 99_999),
      routePlans: clampInteger(progress?.learning?.routePlans, 0, 99_999),
    },
    marketDay: clampInteger(progress?.marketDay ?? 1, 1, 99_999),
    marketSales: clampInteger(progress?.marketSales, 0, 99_999),
    marketEarnings: clampInteger(progress?.marketEarnings, 0, 999_999_999),
    marketTarget: progress?.marketTarget && progress.marketTarget in FISH
      ? progress.marketTarget
      : null,
    marketTutorialStep: isMarketTutorialStep(progress?.marketTutorialStep)
      ? progress.marketTutorialStep
      : progress?.completedContracts && progress.completedContracts > 0
        ? "done"
        : "inspect",
    seasonCompleted: progress?.seasonCompleted === true,
  };
  const simulation: Simulation = {
    boat: {
      x: 0.11,
      y: SURFACE_Y,
      facing: 1,
      speed: 0,
      damage: 18,
    },
    cargo: [],
    activeContract: null,
    availableContract: null,
    dockedAt: "brindle",
    mode: "cruising",
    fishing: null,
    elapsed: 22,
    seed,
    random: createRandom(seed),
    progress: resolvedProgress,
    world: "lake",
    events: [],
    routeChoice: null,
    deliveryStartedAt: null,
    lastDeliveryResult: null,
    lastMarketSale: null,
    boost: {
      heat: 0,
      active: false,
      overheated: false,
      temporaryUnlocked: false,
    },
  };
  return simulation;
}

export function updateSimulation(simulation: Simulation, input: InputState, dt: number): void {
  const safeDt = clamp(dt, 0, 0.1);
  const previousDayPhase = Math.floor(simulation.elapsed / BALANCE.dayLength);
  simulation.elapsed += safeDt;
  const nextDayPhase = Math.floor(simulation.elapsed / BALANCE.dayLength);
  if (nextDayPhase > previousDayPhase) {
    simulation.progress.marketDay += nextDayPhase - previousDayPhase;
    simulation.events.push({ type: "market-day", day: simulation.progress.marketDay });
  }
  ageCargo(simulation, safeDt);

  if (simulation.mode === "fishing") {
    coolBoost(simulation, safeDt);
    updateFishing(simulation, input, safeDt);
    return;
  }
  if (simulation.dockedAt) {
    coolBoost(simulation, safeDt);
    return;
  }

  const { boat } = simulation;
  const travel = Math.sign(clamp(input.travel, -1, 1));
  updateBoost(simulation, input.boost && travel !== 0, safeDt);

  if (travel !== 0) {
    const thrustMultiplier = simulation.boost.active ? BALANCE.boostThrustMultiplier : 1;
    const isBraking = boat.speed !== 0 && Math.sign(boat.speed) !== travel;
    const brakeMultiplier = isBraking
      ? simulation.boost.active
        ? BALANCE.boostBrakeMultiplier
        : BALANCE.normalBrakeMultiplier
      : 1;
    boat.speed += travel * BALANCE.horizontalThrust * thrustMultiplier * brakeMultiplier * safeDt;
  } else {
    boat.speed *= Math.max(0, 1 - BALANCE.waterDrag * safeDt);
  }

  const engineMultiplier = engineSpeedMultiplier(simulation.progress.upgrades.engine);
  const routeMultiplier = simulation.routeChoice === "fast"
    ? BALANCE.fastRouteSpeedMultiplier
    : simulation.routeChoice === "safe"
      ? BALANCE.safeRouteSpeedMultiplier
      : 1;
  const boostMultiplier = simulation.boost.active ? BALANCE.boostSpeedMultiplier : 1;
  const maximumSpeed = BALANCE.maxSurfaceSpeed * engineMultiplier * routeMultiplier * boostMultiplier;
  boat.speed = clamp(boat.speed, -maximumSpeed, maximumSpeed);
  if (Math.abs(boat.speed) > 0.004) boat.facing = boat.speed < 0 ? -1 : 1;

  boat.x = clamp(boat.x + boat.speed * safeDt, 0.045, 0.955);
  boat.y = SURFACE_Y;
  if (boat.x === 0.045 || boat.x === 0.955) boat.speed *= 0.2;
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
  if (spot.requiredDepthTier > simulation.progress.upgrades.line) {
    return {
      kind: "fishing",
      spot: spot.id,
      label: `Line tier ${spot.requiredDepthTier} required · ${spot.name}`,
      enabled: false,
      reason: `Upgrade line depth to tier ${spot.requiredDepthTier}`,
    };
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
  if (spot.requiredDepthTier > simulation.progress.upgrades.line) {
    pushEventOnce(simulation, { type: "depth-locked", tier: spot.requiredDepthTier });
    return false;
  }
  if (simulation.cargo.length >= cargoCapacity(simulation)) {
    pushEventOnce(simulation, { type: "full-cargo" });
    return false;
  }

  const residents = residentsForSpot(simulation.world, spotId);
  simulation.boat.speed = 0;
  simulation.mode = "fishing";
  simulation.fishing = {
    spot: spotId,
    startedAt: simulation.elapsed,
    hook: { x: 0.5, y: 0.08 },
    reeling: null,
    exitingAt: null,
    targets: residents.flatMap((fishSpecies, residentIndex) => (
      Array.from(
        { length: residentCountForMarket(fishSpecies, simulation.progress.marketDay, simulation.seed) },
        (_, schoolIndex) => {
          const fish = FISH[fishSpecies];
          const index = residentIndex * 2 + schoolIndex;
          const homeY = Math.min(0.92, 0.19 + fish.depthTier * 0.135 + simulation.random.next() * 0.05);
          return {
            species: fishSpecies,
            x: 0.12 + ((index * 0.153) % 0.76),
            y: homeY,
            direction: index % 2 === 0 ? 1 : -1,
            speed: 0.048 + fish.depthTier * 0.0075 + simulation.random.next() * 0.032,
            homeY,
            phase: (index * 1.73 + fish.depthTier * 0.61) % (Math.PI * 2),
          };
        },
      )
    )),
  };
  return true;
}

export function leaveFishing(simulation: Simulation): void {
  simulation.mode = "cruising";
  simulation.fishing = null;
}

export function beginFishingExit(simulation: Simulation): boolean {
  if (simulation.mode !== "fishing" || !simulation.fishing || simulation.fishing.reeling) return false;
  simulation.fishing.exitingAt ??= simulation.elapsed;
  return true;
}

export function resolveCatch(simulation: Simulation, species: FishSpecies): boolean {
  if (simulation.cargo.length >= cargoCapacity(simulation)) {
    pushEventOnce(simulation, { type: "full-cargo" });
    return false;
  }
  simulation.cargo.push({ species, freshness: 100 });
  discoverSpecies(simulation, species);
  if (
    simulation.progress.marketTutorialStep === "catch"
    && simulation.progress.marketTarget === species
  ) {
    simulation.progress.marketTutorialStep = "sell";
  }
  simulation.events.push({ type: "caught", species });
  leaveFishing(simulation);
  return true;
}

export function inspectMarketSpecies(simulation: Simulation, species: FishSpecies): void {
  discoverSpecies(simulation, species);
  if (simulation.progress.marketTutorialStep === "inspect" && species === "bluegill") {
    simulation.progress.marketTutorialStep = "track";
  }
}

export function trackMarketSpecies(simulation: Simulation, species: FishSpecies): boolean {
  const worldSpecies = Object.values(WORLD_SPOT_RESIDENTS[simulation.world]).flat();
  if (!simulation.progress.discovered.includes(species) || !worldSpecies.includes(species)) return false;
  if (simulation.progress.marketTarget === species) {
    simulation.progress.marketTarget = null;
    return true;
  }
  simulation.progress.marketTarget = species;
  if (simulation.progress.marketTutorialStep === "track" && species === "bluegill") {
    simulation.progress.marketTutorialStep = "catch";
  }
  return true;
}

export function sellSpeciesAtMarket(
  simulation: Simulation,
  species: FishSpecies,
): MarketSaleResult | null {
  const harbor = simulation.dockedAt;
  if (!harbor) return null;
  const quote = marketQuote(species, harbor, simulation.progress.marketDay, simulation.seed);
  const preview = salePreview(simulation.cargo, species, quote.price);
  if (preview.quantity === 0) return null;
  simulation.cargo = simulation.cargo.filter(
    (item) => item.species !== species || item.freshness <= 0,
  );
  const result: MarketSaleResult = {
    species,
    harbor,
    quantity: preview.quantity,
    averageFreshness: preview.averageFreshness,
    quote: quote.price,
    freshnessLoss: preview.freshnessLoss,
    payment: preview.total,
  };
  simulation.progress.money += result.payment;
  simulation.progress.marketSales += 1;
  simulation.progress.marketEarnings += result.payment;
  simulation.lastMarketSale = result;
  if (
    simulation.progress.marketTutorialStep === "sell"
    && simulation.progress.marketTarget === species
  ) {
    simulation.progress.marketTutorialStep = "complete";
  }
  simulation.events.push({ type: "sold", result });
  if (!simulation.progress.seasonCompleted && simulation.progress.marketSales >= SEASON_SALES) {
    simulation.progress.seasonCompleted = true;
    simulation.events.push({ type: "season-complete" });
  }
  return result;
}

export function sellAllFishAtMarket(simulation: Simulation): MarketBulkSaleResult | null {
  const harbor = simulation.dockedAt;
  if (!harbor) return null;
  const preview = bulkSalePreview(
    simulation.cargo,
    harbor,
    simulation.progress.marketDay,
    simulation.seed,
  );
  if (preview.quantity === 0) return null;
  const soldTarget = simulation.progress.marketTarget !== null
    && simulation.cargo.some((item) => (
      item.species === simulation.progress.marketTarget && item.freshness > 0
    ));
  simulation.cargo = simulation.cargo.filter((item) => item.freshness <= 0);
  const result: MarketBulkSaleResult = {
    harbor,
    quantity: preview.quantity,
    payment: preview.total,
  };
  simulation.progress.money += result.payment;
  simulation.progress.marketSales += 1;
  simulation.progress.marketEarnings += result.payment;
  if (simulation.progress.marketTutorialStep === "sell" && soldTarget) {
    simulation.progress.marketTutorialStep = "complete";
  }
  simulation.events.push({ type: "sold", result });
  if (!simulation.progress.seasonCompleted && simulation.progress.marketSales >= SEASON_SALES) {
    simulation.progress.seasonCompleted = true;
    simulation.events.push({ type: "season-complete" });
  }
  return result;
}

export function finishMarketTutorial(simulation: Simulation): void {
  simulation.progress.marketTutorialStep = "done";
}

export function skipMarketTutorial(simulation: Simulation): void {
  simulation.progress.marketTutorialStep = "done";
}

export function acceptAvailableContract(simulation: Simulation): boolean {
  if (!simulation.availableContract || simulation.activeContract) return false;
  if (simulation.dockedAt !== simulation.availableContract.origin) return false;
  simulation.activeContract = simulation.availableContract;
  simulation.availableContract = null;
  simulation.routeChoice = null;
  simulation.deliveryStartedAt = null;
  simulation.lastDeliveryResult = null;
  if (hasRequiredCatchCount(simulation, simulation.activeContract)) {
    chooseRoute(simulation, "fast");
  }
  return true;
}

export function deliverContract(simulation: Simulation): number | null {
  const contract = simulation.activeContract;
  if (!contract || !simulation.routeChoice || simulation.dockedAt !== contract.destination) return null;
  const selectedCargo = matchingCargo(simulation, contract).slice(0, contract.quantity);
  if (selectedCargo.length < contract.quantity) return null;
  const metFreshnessRequirement = selectedCargo.every(
    ({ item }) => item.freshness >= contract.minimumFreshness,
  );
  const payment = metFreshnessRequirement ? contract.reward : contract.reducedReward;
  const travelSeconds = Math.max(0, simulation.elapsed - (simulation.deliveryStartedAt ?? simulation.elapsed));
  const predictedFreshness = predictedFreshnessForRoute(simulation.routeChoice ?? "safe", contract, simulation.progress.upgrades.engine);
  const actualFreshness = selectedCargo.reduce((sum, { item }) => sum + item.freshness, 0) / selectedCargo.length;
  for (const { index } of [...selectedCargo].sort((first, second) => second.index - first.index)) {
    simulation.cargo.splice(index, 1);
  }
  simulation.progress.money += payment;
  simulation.progress.completedContracts += 1;
  simulation.lastDeliveryResult = {
    payment,
    metFreshnessRequirement,
    route: simulation.routeChoice ?? "safe",
    predictedFreshness,
    actualFreshness: Math.round(actualFreshness),
    travelSeconds: Math.round(travelSeconds),
  };
  simulation.activeContract = null;
  simulation.routeChoice = null;
  simulation.deliveryStartedAt = null;
  simulation.availableContract = createAvailableContract(simulation, contract.destination);
  simulation.events.push({ type: "delivered", payment });
  if (!simulation.progress.seasonCompleted && simulation.progress.completedContracts >= SEASON_SALES) {
    simulation.progress.seasonCompleted = true;
    simulation.events.push({ type: "season-complete" });
  }
  return payment;
}

export function chooseRoute(simulation: Simulation, choice: RouteChoice): boolean {
  const contract = simulation.activeContract;
  if (!contract || simulation.routeChoice) return false;
  if (!hasRequiredCatchCount(simulation, contract)) return false;
  simulation.routeChoice = choice;
  simulation.deliveryStartedAt = simulation.elapsed;
  simulation.progress.learning.routePlans += 1;
  return true;
}

export function recordSurvey(
  simulation: Simulation,
  spotId: SpotId,
  prediction: FishSpecies,
  researchTarget?: FishSpecies,
): SurveyResult {
  const result = evaluateSurvey(spotId, prediction, researchTarget, simulation.world);
  simulation.progress.learning.surveysCompleted += 1;
  if (result.correct) simulation.progress.learning.correctPredictions += 1;
  discoverSpecies(simulation, result.expected);
  return result;
}

export function undock(simulation: Simulation): boolean {
  if (!simulation.dockedAt) return false;
  const harbor = harborById(simulation.dockedAt);
  simulation.boat.facing = harbor.id === "brindle" ? 1 : -1;
  simulation.boat.x = harbor.id === "brindle" ? 0.11 : 0.89;
  simulation.boat.y = SURFACE_Y;
  simulation.boat.speed = 0;
  simulation.dockedAt = null;
  return true;
}

export function buyUpgrade(simulation: Simulation, upgrade: UpgradeId): boolean {
  const tier = simulation.progress.upgrades[upgrade];
  const cost = upgradeCost(upgrade, tier);
  if (tier >= upgradeTierCap(upgrade) || simulation.progress.money < cost || !simulation.dockedAt) return false;
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

export function buyBeachAccess(simulation: Simulation): boolean {
  if (!simulation.dockedAt || simulation.progress.beachUnlocked || simulation.progress.money < BALANCE.beachAccessCost) return false;
  simulation.progress.money -= BALANCE.beachAccessCost;
  simulation.progress.beachUnlocked = true;
  simulation.events.push({ type: "beach-unlocked" });
  return true;
}

export function travelToWorld(simulation: Simulation, world: WorldId): boolean {
  if (!simulation.dockedAt || simulation.world === world || simulation.activeContract) return false;
  if (world === "beach" && !simulation.progress.beachUnlocked) return false;
  simulation.world = world;
  const worldSpecies = Object.values(WORLD_SPOT_RESIDENTS[world]).flat();
  if (simulation.progress.marketTarget && !worldSpecies.includes(simulation.progress.marketTarget)) {
    simulation.progress.marketTarget = null;
  }
  return undock(simulation);
}

export function buyBoost(simulation: Simulation): boolean {
  if (!simulation.dockedAt || simulation.progress.boostUnlocked || simulation.progress.money < BALANCE.boostUnlockCost) return false;
  simulation.progress.money -= BALANCE.boostUnlockCost;
  simulation.progress.boostUnlocked = true;
  simulation.events.push({ type: "boost-unlocked", temporary: false });
  return true;
}

export function unlockBoostForTesting(simulation: Simulation): boolean {
  if (simulation.progress.boostUnlocked || simulation.boost.temporaryUnlocked) return false;
  simulation.boost.temporaryUnlocked = true;
  simulation.events.push({ type: "boost-unlocked", temporary: true });
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

export function releaseCargo(simulation: Simulation, index: number): boolean {
  if (!simulation.dockedAt || index < 0 || index >= simulation.cargo.length) return false;
  const item = simulation.cargo[index];
  if (!item) return false;
  simulation.cargo.splice(index, 1);
  simulation.events.push({ type: "released", species: item.species });
  return true;
}

export function restoreCargo(simulation: Simulation, item: CargoItem, index: number): boolean {
  if (!simulation.dockedAt || simulation.cargo.length >= cargoCapacity(simulation)) return false;
  const restoredIndex = Math.max(0, Math.min(Math.trunc(index), simulation.cargo.length));
  simulation.cargo.splice(restoredIndex, 0, { ...item });
  return true;
}

/** @deprecated Use releaseCargo for the harbor cargo action. */
export const discardCargo = releaseCargo;

export function damageBoat(simulation: Simulation, amount: number): void {
  simulation.boat.damage = clamp(simulation.boat.damage + Math.max(0, amount), 0, 100);
  if (simulation.boat.damage >= 100) rescue(simulation);
}

export function learningAccuracy(simulation: Simulation): number {
  const { surveysCompleted, correctPredictions } = simulation.progress.learning;
  return surveysCompleted === 0 ? 0 : Math.round((correctPredictions / surveysCompleted) * 100);
}

export function cargoCapacity(simulation: Simulation): number {
  return Math.min(BALANCE.maxCargoSlots, BALANCE.baseCargoSlots + simulation.progress.upgrades.cargo);
}

export function maxFishingDepth(simulation: Simulation): number {
  return Math.min(0.94, 0.3 + simulation.progress.upgrades.line * 0.125);
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

export function shouldShowNightIndicator(simulation: Simulation): boolean {
  const phase = simulation.elapsed % BALANCE.dayLength;
  return phase >= BALANCE.nightStart + BALANCE.nightFadeLength / 2;
}

export function nightVisualIntensity(simulation: Simulation): number {
  const phase = simulation.elapsed % BALANCE.dayLength;
  if (phase < BALANCE.nightStart) return 0;
  const fadeIn = clamp((phase - BALANCE.nightStart) / BALANCE.nightFadeLength, 0, 1);
  const fadeOut = clamp((BALANCE.dayLength - phase) / BALANCE.nightFadeLength, 0, 1);
  const linearIntensity = Math.min(fadeIn, fadeOut);
  return linearIntensity * linearIntensity * (3 - 2 * linearIntensity);
}

export function dayProgress(simulation: Simulation): number {
  return (simulation.elapsed % BALANCE.dayLength) / BALANCE.dayLength;
}

export function fogIntensity(simulation: Simulation): number {
  const phase = (simulation.elapsed % BALANCE.fogLength) / BALANCE.fogLength;
  const condition = marketCondition(simulation.progress.marketDay, simulation.seed);
  return Math.min(0.9, Math.max(0, Math.sin((phase - 0.18) * Math.PI * 2)) * 0.72 * condition.fogMultiplier);
}

export function navigationGuidance(simulation: Simulation): NavigationGuidance | null {
  const target = simulation.progress.marketTarget;
  const tutorialActive = simulation.progress.marketTutorialStep !== "done";
  if (!target && !tutorialActive) return null;

  if (simulation.cargo.length >= cargoCapacity(simulation)) {
    const harbor = closestHarbor(simulation);
    return {
      point: harbor,
      label: harbor.name,
      kicker: "MANAGE CARGO",
      instruction: harborInstruction(simulation, harbor, "sell or release a catch to make room"),
    };
  }

  if (!target) {
    const harbor = closestHarbor(simulation);
    return {
      point: harbor,
      label: harbor.name,
      kicker: "MARKET AT",
      instruction: harborInstruction(simulation, harbor, "choose a fish to track on the market board"),
    };
  }

  const fish = FISH[target];
  const sellableCatch = simulation.cargo.some(
    (item) => item.species === target && item.freshness > 0,
  );
  if (sellableCatch) {
    const harbor = strongerHarborFor(target, simulation.progress.marketDay, simulation.seed);
    const quote = marketQuote(target, harbor.id, simulation.progress.marketDay, simulation.seed);
    return {
      point: harbor,
      label: harbor.name,
      kicker: "SELL AT",
      instruction: harborInstruction(
        simulation,
        harbor,
        `review the ${fish.name} sale at ${quote.price} shells before freshness`,
      ),
    };
  }

  const spot = spotForSpecies(target);
  const prompt = getInteractionPrompt(simulation);
  const instruction = prompt?.kind === "fishing" && prompt.spot === spot.id
    ? prompt.enabled
      ? `Drop the line at ${spot.name} and catch a ${fish.name}.`
      : prompt.reason === "Too fast to fish"
        ? `Slow beneath ${spot.name}, then drop the line to catch a ${fish.name}.`
        : `${prompt.reason ?? "Fishing is unavailable"} at ${spot.name}.`
    : `Head ${horizontalDirection(simulation.boat.x, spot.x)} to ${spot.name}, then catch a ${fish.name}.`;
  return {
    point: spot,
    label: spot.name,
    kicker: "FISH AT",
    instruction,
  };
}

export function tutorialPrompt(simulation: Simulation): string | null {
  if (simulation.progress.marketTutorialStep === "done") return null;
  if (simulation.mode === "fishing" && simulation.fishing) {
    if (simulation.fishing.reeling) {
      return `Reeling the ${FISH[simulation.fishing.reeling.species].name} to the boat.`;
    }
    if (simulation.fishing.exitingAt !== null) return "Reeling in the line and returning to the surface.";
    const spot = spotById(simulation.fishing.spot);
    const target = simulation.progress.marketTarget
      && residentsForSpot(simulation.world, spot.id).includes(simulation.progress.marketTarget)
      ? simulation.progress.marketTarget
      : primarySpeciesForSpot(simulation.world, spot.id);
    return `Guide the hook toward the ${FISH[target].name}.`;
  }
  if (simulation.progress.marketTutorialStep === "inspect") return "Select Bluegill on the market board.";
  if (simulation.progress.marketTutorialStep === "track") return "Read the Bluegill details, then track it.";
  if (simulation.progress.marketTutorialStep === "complete") return "First sale complete. Close the assignment when you are ready.";
  return navigationGuidance(simulation)?.instruction ?? null;
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

function updateBoost(simulation: Simulation, requested: boolean, dt: number): void {
  const unlocked = simulation.progress.boostUnlocked || simulation.boost.temporaryUnlocked;
  simulation.boost.active = unlocked && requested && !simulation.boost.overheated;
  if (!simulation.boost.active) {
    coolBoost(simulation, dt);
    return;
  }

  simulation.boost.heat = clamp(simulation.boost.heat + dt / BALANCE.boostHeatSeconds, 0, 1);
  if (simulation.boost.heat >= 1 - Number.EPSILON * 16) {
    simulation.boost.heat = 1;
    simulation.boost.active = false;
    simulation.boost.overheated = true;
  }
}

function coolBoost(simulation: Simulation, dt: number): void {
  simulation.boost.active = false;
  simulation.boost.heat = clamp(simulation.boost.heat - dt / BALANCE.boostCoolingSeconds, 0, 1);
  if (simulation.boost.overheated && simulation.boost.heat <= BALANCE.boostRecoveryThreshold + Number.EPSILON * 16) {
    simulation.boost.overheated = false;
  }
}

function updateFishing(simulation: Simulation, input: InputState, dt: number): void {
  const fishing = simulation.fishing;
  if (!fishing) return;
  if (fishing.exitingAt !== null) {
    if (simulation.elapsed - fishing.exitingAt >= FISHING_REEL_DURATION) leaveFishing(simulation);
    return;
  }
  if (fishing.reeling) {
    if (simulation.elapsed - fishing.reeling.hookedAt >= FISHING_REEL_DURATION) {
      resolveCatch(simulation, fishing.reeling.species);
    }
    return;
  }
  const verticalSpeed = input.hookY < 0 ? BALANCE.fishingHookUpSpeed : BALANCE.fishingHookDownSpeed;
  fishing.hook.x = clamp(fishing.hook.x + input.hookX * BALANCE.fishingHookHorizontalSpeed * dt, 0.07, 0.93);
  fishing.hook.y = clamp(fishing.hook.y + input.hookY * verticalSpeed * dt, 0.07, maxFishingDepth(simulation));
  for (const [targetIndex, target] of fishing.targets.entries()) {
    const motion = fishingSpeciesMotion(target.species, simulation.elapsed, target.phase);
    target.x += target.speed * motion.horizontalMultiplier * target.direction * motion.heading * dt;
    target.y = clamp(target.homeY + motion.depthOffset, 0.1, 0.92);
    if (target.x < 0.1 || target.x > 0.9) {
      target.x = clamp(target.x, 0.1, 0.9);
      target.direction = target.direction === 1 ? -1 : 1;
    }
    const reachable = FISH[target.species].depthTier <= simulation.progress.upgrades.line;
    if (reachable && distance(fishing.hook, target) <= FISHING_CATCH_RADIUS) {
      fishing.reeling = {
        species: target.species,
        targetIndex,
        hookedAt: simulation.elapsed,
        direction: multiplyDirection(target.direction, motion.heading),
      };
      return;
    }
  }
}

function multiplyDirection(first: -1 | 1, second: -1 | 1): -1 | 1 {
  return first === second ? 1 : -1;
}

function ageCargo(simulation: Simulation, dt: number): void {
  const freshnessLoss = (100 / BALANCE.freshnessLifetime) * dt;
  for (const item of simulation.cargo) item.freshness = Math.max(0, item.freshness - freshnessLoss);
}

function discoverSpecies(simulation: Simulation, species: FishSpecies): void {
  if (!simulation.progress.discovered.includes(species)) simulation.progress.discovered.push(species);
}

function predictedFreshnessForRoute(choice: RouteChoice, contract: Contract, engineTier: number): number {
  const estimate = estimateRoute(contract, engineTier);
  return choice === "fast" ? estimate.fastArrivalFreshness : estimate.safeArrivalFreshness;
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

function createAvailableContract(simulation: Simulation, origin: HarborId): Contract | null {
  if (simulation.progress.completedContracts === 0 && simulation.world === "lake") {
    const minimumFreshness = attainableFreshnessTarget(
      "sunwardShoal",
      "gloam",
      1,
      BALANCE.contractFreshnessMinimum,
      simulation.progress.upgrades.engine,
    );
    return {
      id: "morning-order",
      title: "The Morning Order",
      species: "bluegill",
      origin: "brindle",
      destination: "gloam",
      spot: "sunwardShoal",
      quantity: 1,
      ...calculateContractPayouts("bluegill", 1, minimumFreshness),
      minimumFreshness,
    };
  }
  const destination: HarborId = origin === "brindle" ? "gloam" : "brindle";
  const spotForSpecies: Record<FishSpecies, SpotId> = {
    bluegill: "sunwardShoal",
    yellowPerch: "sunwardShoal",
    emeraldShiner: "sunwardShoal",
    northernPike: "mosswaterPool",
    largemouthBass: "mosswaterPool",
    bowfin: "mosswaterPool",
    lakeTrout: "outerGloam",
    burbot: "outerGloam",
    lakeSturgeon: "outerGloam",
    seaMullet: "sunwardShoal",
    yellowfinBream: "sunwardShoal",
    sandWhiting: "sunwardShoal",
    duskyFlathead: "mosswaterPool",
    luderick: "mosswaterPool",
    easternAustralianSalmon: "mosswaterPool",
    snapper: "outerGloam",
    yellowtailKingfish: "outerGloam",
    mulloway: "outerGloam",
  };
  const worldSpecies = Object.values(WORLD_SPOT_RESIDENTS[simulation.world]).flat();
  const availableSpecies = worldSpecies.filter((candidate) => {
    const fish = FISH[candidate];
    const spot = spotById(spotForSpecies[candidate]);
    return fish.depthTier <= simulation.progress.upgrades.line
      && (!spot.requiresPermit || simulation.progress.outerUnlocked);
  });
  if (availableSpecies.length === 0) return null;
  const species = availableSpecies[simulation.progress.completedContracts % availableSpecies.length];
  if (!species) return null;
  const quantity = Math.min(cargoCapacity(simulation), 1 + (simulation.progress.completedContracts % 3));
  const desiredFreshness = Math.min(
    BALANCE.contractFreshnessMaximum,
    BALANCE.contractFreshnessMinimum
      + (simulation.progress.completedContracts % 4) * BALANCE.contractFreshnessStep,
  );
  const minimumFreshness = attainableFreshnessTarget(
    spotForSpecies[species],
    destination,
    quantity,
    desiredFreshness,
    simulation.progress.upgrades.engine,
  );
  return {
    id: `route-${simulation.progress.completedContracts + 1}`,
    title: FISH[species].depthTier >= 3 ? "A Light in Deep Water" : "Harbor Trade",
    species,
    origin,
    destination,
    spot: spotForSpecies[species],
    quantity,
    ...calculateContractPayouts(species, quantity, minimumFreshness),
    minimumFreshness,
  };
}

function attainableFreshnessTarget(
  spot: SpotId,
  destination: HarborId,
  quantity: number,
  desiredFreshness: number,
  engineTier: number,
): number {
  const fastArrivalFreshness = estimateRoute({ spot, destination }, engineTier).fastArrivalFreshness;
  const safetyMargin = BALANCE.contractRouteSafetyMargin
    + Math.max(0, quantity - 1) * BALANCE.contractAdditionalFishSafetyMargin;
  const attainableTarget = Math.floor(
    (fastArrivalFreshness - safetyMargin) / BALANCE.contractFreshnessStep,
  ) * BALANCE.contractFreshnessStep;
  return Math.max(
    BALANCE.contractFreshnessStep,
    Math.min(desiredFreshness, attainableTarget),
  );
}

function hasRequiredCatchCount(simulation: Simulation, contract: Contract): boolean {
  return matchingCargo(simulation, contract).length >= contract.quantity;
}

function matchingCargo(
  simulation: Simulation,
  contract: Contract,
): Array<{ index: number; item: CargoItem }> {
  return simulation.cargo
    .map((item, index) => ({ index, item }))
    .filter(({ item }) => item.species === contract.species && item.freshness > 0)
    .sort((first, second) => second.item.freshness - first.item.freshness);
}

export function calculateContractPayouts(
  species: FishSpecies,
  quantity: number,
  minimumFreshness: number,
): Pick<Contract, "reward" | "reducedReward"> {
  const scaledValue = (FISH[species].value + 25) * quantity * (1 + minimumFreshness / 100);
  const reward = Math.max(5, Math.round(scaledValue / 5) * 5);
  return {
    reward,
    reducedReward: Math.max(1, Math.round(reward * 0.25)),
  };
}

function closestHarbor(simulation: Simulation): (typeof HARBORS)[number] {
  return HARBORS.reduce((closest, harbor) => (
    Math.abs(simulation.boat.x - harbor.x) < Math.abs(simulation.boat.x - closest.x) ? harbor : closest
  ));
}

function horizontalDirection(fromX: number, toX: number): "left" | "right" {
  return toX < fromX ? "left" : "right";
}

function harborInstruction(
  simulation: Simulation,
  harbor: (typeof HARBORS)[number],
  action: string,
): string {
  const prompt = getInteractionPrompt(simulation);
  if (prompt?.kind === "harbor" && prompt.harbor === harbor.id) {
    return prompt.enabled
      ? `Dock at ${harbor.name} and ${action}.`
      : `Slow down to dock at ${harbor.name}, then ${action}.`;
  }
  return `Head ${horizontalDirection(simulation.boat.x, harbor.x)} to ${harbor.name} and ${action}.`;
}

function nearestHorizontal<T extends WorldPoint>(x: number, choices: readonly T[], radius: number): T | null {
  const nearest = [...choices].sort((first, second) => Math.abs(x - first.x) - Math.abs(x - second.x))[0];
  return nearest && Math.abs(x - nearest.x) <= radius ? nearest : null;
}

function distance(first: WorldPoint, second: WorldPoint): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function clampInteger(value: unknown, minimum: number, maximum: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.floor(clamp(value, minimum, maximum))
    : minimum;
}

function isMarketTutorialStep(value: unknown): value is MarketTutorialStep {
  return value === "inspect"
    || value === "track"
    || value === "catch"
    || value === "sell"
    || value === "complete"
    || value === "done";
}

function pushEventOnce(simulation: Simulation, event: SimulationEvent): void {
  if (!simulation.events.some((existing) => existing.type === event.type)) simulation.events.push(event);
}
