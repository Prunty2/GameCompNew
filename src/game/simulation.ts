import { clamp, createRandom, type RandomSource } from "./math";
import { fishingSpeciesMotion, stepFishingTargetMotion } from "./fishingMovement";
import { fishingHighlightSpecies } from "./fishingPresentation";
import {
  DEFAULT_POPULATION_DENSITY_MULTIPLIER,
  MOSSWATER_POPULATION_DENSITY_MULTIPLIER,
  responsiveResidentCount,
  type FishingViewport,
} from "./fishingPopulation";
import { FISHING_REEL_DURATION } from "./fishingReeling";
import { fishingFightBehaviour, fishingFightCue, RESTING_FIGHT_MOTION, stepFishingFight } from "./fishingFight";
import {
  BALANCE,
  FISH,
  FISHING_SPOTS,
  HARBORS,
  SURFACE_Y,
  WORLD_SPOT_RESIDENTS,
  engineSpeedMultiplier,
  harborById,
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
import { evaluateSurvey, type SurveyResult } from "./stem";
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
  actionHeld: boolean;
}

export interface BoatState extends WorldPoint {
  facing: -1 | 1;
  speed: number;
  damage: number;
}

export interface CargoItem {
  species: FishSpecies;
}

export interface LearningProgress {
  surveysCompleted: number;
  correctPredictions: number;
  routePlans: number;
}

export interface UpgradeProgress extends Record<UpgradeId, number> {
  /** Retained only so older saves containing the removed Lamp tier still round-trip safely. */
  lamp: number;
}

export interface ProgressState {
  money: number;
  upgrades: UpgradeProgress;
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
  upgradeTutorialStep: UpgradeTutorialStep;
  seasonCompleted: boolean;
}

export type MarketTutorialStep = "inspect" | "track" | "catch" | "sell" | "complete" | "done";
export type UpgradeTutorialStep = "locked" | "open-services" | "buy" | "done";

const CORE_UPGRADES: UpgradeId[] = ["line", "cargo", "engine", "reel"];

export interface MarketSaleResult {
  species: FishSpecies;
  harbor: HarborId;
  quantity: number;
  quote: number;
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
  velocityX: number;
  velocityY: number;
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
  progress: number;
  tension: number;
  stamina: number;
  criticalSeconds: number;
  behaviour: "calm" | "run" | "thrash";
  struggle: number;
  motionX: number;
  motionY: number;
  motionVx: number;
  motionVy: number;
  landingAt: number | null;
}

export type SimulationEvent =
  | { type: "caught"; species: FishSpecies }
  | { type: "line-broke"; species: FishSpecies }
  | { type: "sold"; result: Pick<MarketSaleResult, "quantity" | "payment"> }
  | { type: "market-day"; day: number }
  | { type: "docked"; harbor: HarborId }
  | { type: "full-cargo" }
  | { type: "depth-locked"; tier: number }
  | { type: "rescued"; harbor: HarborId; cost: number }
  | { type: "upgrade"; upgrade: UpgradeId }
  | { type: "beach-unlocked" }
  | { type: "boost-unlocked"; temporary: boolean }
  | { type: "released"; species: FishSpecies };

export interface Simulation {
  boat: BoatState;
  cargo: CargoItem[];
  dockedAt: HarborId | null;
  mode: "cruising" | "fishing";
  fishing: FishingState | null;
  elapsed: number;
  seed: number;
  random: RandomSource;
  progress: ProgressState;
  world: WorldId;
  events: SimulationEvent[];
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
const FISHING_DEPTH_BAND_TOP = 0.11;
const FISHING_DEPTH_TIER_STEP = 0.13;
const FISHING_DEPTH_BAND_HEIGHT = 0.17;
const FISHING_HORIZONTAL_DISTRIBUTION_STEP = 0.61803398875;
const FISHING_DEPTH_DISTRIBUTION_STEP = 0.75487766625;
const FISHING_ENTRY_HOOK = { x: 0.5, y: 0.08 } as const;
const FISHING_ENTRY_CLEARANCE = 0.12;
const FISHING_SPECIES_DEPTH_BANDS: Partial<Record<FishSpecies, { top: number; bottom: number }>> = {
  emeraldShiner: { top: 0.335, bottom: 0.405 },
  whiteSucker: { top: 0.465, bottom: 0.535 },
  longnoseGar: { top: 0.09, bottom: 0.16 },
  cisco: { top: 0.1, bottom: 0.18 },
  lakeTrout: { top: 0.25, bottom: 0.39 },
  burbot: { top: 0.5, bottom: 0.6 },
};
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
      reel: clampInteger(progress?.upgrades?.reel, 0, BALANCE.maxReelTier),
    },
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
    upgradeTutorialStep: isUpgradeTutorialStep(progress?.upgradeTutorialStep)
      ? progress.upgradeTutorialStep
      : hasPurchasedProgression(progress)
        ? "done"
        : "locked",
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
    dockedAt: "brindle",
    mode: "cruising",
    fishing: null,
    elapsed: 22,
    seed,
    random: createRandom(seed),
    progress: resolvedProgress,
    world: "lake",
    events: [],
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
  const boostMultiplier = simulation.boost.active ? BALANCE.boostSpeedMultiplier : 1;
  const maximumSpeed = BALANCE.maxSurfaceSpeed * engineMultiplier * boostMultiplier;
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
  const requiredDepthTier = spot.requiredDepthTier[simulation.world];
  if (requiredDepthTier > simulation.progress.upgrades.line) {
    return {
      kind: "fishing",
      spot: spot.id,
      label: `Line tier ${requiredDepthTier} required · ${spot.name}`,
      enabled: false,
      reason: `Upgrade line depth to tier ${requiredDepthTier}`,
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

export function startFishing(
  simulation: Simulation,
  spotId: SpotId,
  viewport: FishingViewport = { width: 1280, height: 720 },
): boolean {
  const spot = spotById(spotId);
  const requiredDepthTier = spot.requiredDepthTier[simulation.world];
  if (requiredDepthTier > simulation.progress.upgrades.line) {
    pushEventOnce(simulation, { type: "depth-locked", tier: requiredDepthTier });
    return false;
  }
  if (simulation.cargo.length >= cargoCapacity(simulation)) {
    pushEventOnce(simulation, { type: "full-cargo" });
    return false;
  }

  const residents = residentsForSpot(simulation.world, spotId);
  const populationDensity = simulation.world === "lake" && spotId === "mosswaterPool"
    ? MOSSWATER_POPULATION_DENSITY_MULTIPLIER
    : DEFAULT_POPULATION_DENSITY_MULTIPLIER;
  simulation.boat.speed = 0;
  simulation.mode = "fishing";
  let targetIndex = 0;
  simulation.fishing = {
    spot: spotId,
    startedAt: simulation.elapsed,
    hook: { ...FISHING_ENTRY_HOOK },
    reeling: null,
    exitingAt: null,
    targets: residents.flatMap((fishSpecies, residentIndex) => (
      Array.from(
        {
          length: responsiveResidentCount(
            residentCountForMarket(fishSpecies, simulation.progress.marketDay, simulation.seed),
            viewport,
            populationDensity,
          ),
        },
        (_, schoolIndex) => {
          const fish = FISH[fishSpecies];
          const index = targetIndex;
          targetIndex += 1;
          const x = 0.08 + (((index + 1) * FISHING_HORIZONTAL_DISTRIBUTION_STEP) % 1) * 0.84;
          const speciesDepthBand = FISHING_SPECIES_DEPTH_BANDS[fishSpecies];
          const depthBandTop = speciesDepthBand?.top
            ?? FISHING_DEPTH_BAND_TOP + fish.depthTier * FISHING_DEPTH_TIER_STEP;
          const depthBandBottom = speciesDepthBand?.bottom
            ?? Math.min(0.92, depthBandTop + FISHING_DEPTH_BAND_HEIGHT);
          const depthRatio = ((index + 1) * FISHING_DEPTH_DISTRIBUTION_STEP) % 1;
          let homeY = depthBandTop + (depthBandBottom - depthBandTop) * depthRatio;
          const entryHorizontalDistance = Math.abs(x - FISHING_ENTRY_HOOK.x);
          if (entryHorizontalDistance < FISHING_ENTRY_CLEARANCE) {
            const entryVerticalClearance = Math.sqrt(
              FISHING_ENTRY_CLEARANCE ** 2 - entryHorizontalDistance ** 2,
            );
            homeY = Math.min(
              depthBandBottom,
              Math.max(homeY, FISHING_ENTRY_HOOK.y + entryVerticalClearance),
            );
          }
          return {
            species: fishSpecies,
            x,
            y: homeY,
            direction: index % 2 === 0 ? 1 : -1,
            speed: 0.048 + fish.depthTier * 0.0075 + simulation.random.next() * 0.032,
            homeY,
            phase: (index * 1.73 + schoolIndex * 0.41 + residentIndex * 0.67 + fish.depthTier * 0.61)
              % (Math.PI * 2),
            velocityX: 0,
            velocityY: 0,
          };
        },
      )
    )),
  };
  if (isLineDepthTutorialExploration(simulation) && spotId === "mosswaterPool") {
    simulation.progress.upgradeTutorialStep = "done";
  }
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
  simulation.cargo.push({ species });
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

export function closeMarketSpeciesDetail(simulation: Simulation, species: FishSpecies): void {
  if (simulation.progress.marketTutorialStep === "track" && species === "bluegill") {
    simulation.progress.marketTutorialStep = "inspect";
  }
}

export function trackMarketSpecies(simulation: Simulation, species: FishSpecies): boolean {
  const worldSpecies = Object.values(WORLD_SPOT_RESIDENTS[simulation.world]).flat();
  if (!simulation.progress.discovered.includes(species) || !worldSpecies.includes(species)) return false;
  if (simulation.progress.marketTarget === species) {
    simulation.progress.marketTarget = null;
    if (simulation.progress.marketTutorialStep === "catch" && species === "bluegill") {
      simulation.progress.marketTutorialStep = "track";
    }
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
  simulation.cargo = simulation.cargo.filter((item) => item.species !== species);
  const result: MarketSaleResult = {
    species,
    harbor,
    quantity: preview.quantity,
    quote: quote.price,
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
    simulation.progress.marketTutorialStep = "done";
    syncUpgradeTutorial(simulation);
  }
  simulation.events.push({ type: "sold", result });
  if (!simulation.progress.seasonCompleted && simulation.progress.marketSales >= SEASON_SALES) {
    simulation.progress.seasonCompleted = true;
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
    && simulation.cargo.some((item) => item.species === simulation.progress.marketTarget);
  simulation.cargo = [];
  const result: MarketBulkSaleResult = {
    harbor,
    quantity: preview.quantity,
    payment: preview.total,
  };
  simulation.progress.money += result.payment;
  simulation.progress.marketSales += 1;
  simulation.progress.marketEarnings += result.payment;
  if (simulation.progress.marketTutorialStep === "sell" && soldTarget) {
    simulation.progress.marketTutorialStep = "done";
    syncUpgradeTutorial(simulation);
  }
  simulation.events.push({ type: "sold", result });
  if (!simulation.progress.seasonCompleted && simulation.progress.marketSales >= SEASON_SALES) {
    simulation.progress.seasonCompleted = true;
  }
  return result;
}

export function finishMarketTutorial(simulation: Simulation): void {
  simulation.progress.marketTutorialStep = "done";
  syncUpgradeTutorial(simulation);
}

export function skipMarketTutorial(simulation: Simulation): void {
  if (!isFirstAssignmentFinished(simulation)) {
    simulation.progress.marketTutorialStep = "done";
    syncUpgradeTutorial(simulation);
    return;
  }
  if (isUpgradeTutorialActive(simulation)) {
    simulation.progress.upgradeTutorialStep = "done";
  }
}

export function syncUpgradeTutorial(simulation: Simulation): void {
  if (simulation.progress.upgradeTutorialStep === "done") return;
  if (!isFirstAssignmentFinished(simulation)) return;
  if (simulation.progress.upgradeTutorialStep === "buy") return;
  if (!cheapestAffordableUpgrade(simulation)) return;
  if (simulation.progress.upgradeTutorialStep === "locked") {
    simulation.progress.upgradeTutorialStep = "open-services";
  }
}

export function noteUpgradePanelOpened(simulation: Simulation): void {
  if (simulation.progress.upgradeTutorialStep === "open-services") {
    simulation.progress.upgradeTutorialStep = "buy";
  }
}

export function cheapestAffordableUpgrade(simulation: Simulation): UpgradeId | null {
  let best: { id: UpgradeId; cost: number } | null = null;
  for (const id of CORE_UPGRADES) {
    const tier = simulation.progress.upgrades[id];
    if (tier >= upgradeTierCap(id)) continue;
    const cost = upgradeCost(id, tier);
    if (simulation.progress.money < cost) continue;
    if (!best || cost < best.cost) best = { id, cost };
  }
  return best?.id ?? null;
}

export function isFirstAssignmentFinished(simulation: Simulation): boolean {
  return simulation.progress.marketTutorialStep === "done"
    || simulation.progress.marketTutorialStep === "complete";
}

export function isUpgradeTutorialActive(simulation: Simulation): boolean {
  return simulation.progress.upgradeTutorialStep === "open-services"
    || simulation.progress.upgradeTutorialStep === "buy";
}

export function isLineDepthTutorialExploration(simulation: Simulation): boolean {
  return simulation.progress.upgradeTutorialStep === "buy"
    && simulation.progress.upgrades.line > 0;
}

function completeUpgradeTutorial(simulation: Simulation, upgrade?: UpgradeId): void {
  if (isUpgradeTutorialActive(simulation)) {
    if (upgrade === "line") {
      simulation.progress.upgradeTutorialStep = "buy";
      return;
    }
    simulation.progress.upgradeTutorialStep = "done";
  }
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
  completeUpgradeTutorial(simulation, upgrade);
  simulation.events.push({ type: "upgrade", upgrade });
  return true;
}

export function buyBeachAccess(simulation: Simulation): boolean {
  if (!simulation.dockedAt || simulation.progress.beachUnlocked || simulation.progress.money < BALANCE.beachAccessCost) return false;
  simulation.progress.money -= BALANCE.beachAccessCost;
  simulation.progress.beachUnlocked = true;
  completeUpgradeTutorial(simulation);
  simulation.events.push({ type: "beach-unlocked" });
  return true;
}

export function travelToWorld(simulation: Simulation, world: WorldId): boolean {
  if (!simulation.dockedAt || simulation.world === world) return false;
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
  completeUpgradeTutorial(simulation);
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

export function isFishingTargetReachable(simulation: Simulation, target: Pick<FishingTarget, "y">): boolean {
  return target.y <= maxFishingDepth(simulation) + Number.EPSILON * 16;
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
  const tutorialActive = simulation.progress.marketTutorialStep !== "done"
    && simulation.progress.marketTutorialStep !== "complete";
  if (!target && !tutorialActive && !isUpgradeTutorialActive(simulation)) return null;

  if (simulation.cargo.length >= cargoCapacity(simulation)) {
    const harbor = closestHarbor(simulation);
    return {
      point: harbor,
      label: harbor.name,
      kicker: "MANAGE CARGO",
      instruction: harborInstruction(simulation, harbor, "sell or release a catch to make room"),
    };
  }

  if (isUpgradeTutorialActive(simulation)) {
    if (isLineDepthTutorialExploration(simulation)) {
      const spot = spotById("mosswaterPool");
      const prompt = getInteractionPrompt(simulation);
      const instruction = prompt?.kind === "fishing" && prompt.spot === spot.id
        ? prompt.enabled
          ? `Drop the line at ${spot.name}.`
          : `Slow beneath ${spot.name}, then drop the line.`
        : `Head ${horizontalDirection(simulation.boat.x, spot.x)} to ${spot.name}; line depth tier 1 can fish there.`;
      return {
        point: spot,
        label: spot.name,
        kicker: "FISH AT",
        instruction,
      };
    }
    const harbor = closestHarbor(simulation);
    return {
      point: harbor,
      label: harbor.name,
      kicker: "UPGRADE AT",
      instruction: harborInstruction(simulation, harbor, "open Upgrades and buy an upgrade"),
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
  const sellableCatch = simulation.cargo.some((item) => item.species === target);
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
        `review the ${fish.name} sale at ${quote.price} shells each`,
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
  if (simulation.progress.marketTutorialStep === "done" || simulation.progress.marketTutorialStep === "complete") return null;
  if (simulation.mode === "fishing" && simulation.fishing) {
    if (simulation.fishing.reeling) {
      const name = FISH[simulation.fishing.reeling.species].name;
      switch (fishingFightCue(simulation.fishing.reeling)) {
        case "landed":
          return `Landing the ${name}.`;
        case "critical":
          return `Release left click or Reel; the ${name}'s line is red and about to snap.`;
        case "release":
          return simulation.fishing.reeling.behaviour === "run"
            ? `Release left click or Reel; the ${name} is racing away and the line will slacken.`
            : `Release left click or Reel; the ${name} is shaking the line.`;
        case "resume":
          return `Hold left click or Reel again to pull in the ${name} while it is calm.`;
        case "reel":
          return `Hold left click or Reel to pull in the ${name} while it is calm; release when it runs.`;
      }
    }
    if (simulation.fishing.exitingAt !== null) return "Reeling in the line and returning to the surface.";
    const target = fishingHighlightSpecies(
      simulation.progress.marketTarget,
      simulation.world,
      simulation.fishing.spot,
    );
    return target
      ? `Guide the hook toward the ${FISH[target].name}.`
      : "Steer the hook onto a reachable fish.";
  }
  if (simulation.progress.marketTutorialStep === "inspect") return "Select Bluegill on the market board.";
  if (simulation.progress.marketTutorialStep === "track") return "Read the Bluegill details, then track it.";
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
  const hookedTargetIndex = fishing.reeling?.targetIndex ?? null;
  for (const [targetIndex, target] of fishing.targets.entries()) {
    if (targetIndex === hookedTargetIndex) continue;
    const movement = stepFishingTargetMotion(target.species, target, simulation.elapsed, target.phase, dt);
    target.x = movement.x;
    target.y = movement.y;
    target.direction = movement.direction;
    target.velocityX = movement.velocityX;
    target.velocityY = movement.velocityY;
  }
  if (fishing.reeling) {
    updateFishingFight(simulation, input, dt);
    return;
  }
  const verticalSpeed = input.hookY < 0 ? BALANCE.fishingHookUpSpeed : BALANCE.fishingHookDownSpeed;
  fishing.hook.x = clamp(fishing.hook.x + input.hookX * BALANCE.fishingHookHorizontalSpeed * dt, 0.07, 0.93);
  fishing.hook.y = clamp(fishing.hook.y + input.hookY * verticalSpeed * dt, 0.07, maxFishingDepth(simulation));
  for (const [targetIndex, target] of fishing.targets.entries()) {
    const reachable = isFishingTargetReachable(simulation, target);
    if (reachable && distance(fishing.hook, target) <= FISHING_CATCH_RADIUS) {
      const opening = fishingFightBehaviour(target.species, 0, 1);
      fishing.reeling = {
        species: target.species,
        targetIndex,
        hookedAt: simulation.elapsed,
        direction: Math.abs(target.velocityX) > 0.001
          ? target.velocityX >= 0 ? 1 : -1
          : multiplyDirection(target.direction, fishingSpeciesMotion(target.species, simulation.elapsed, target.phase).heading),
        progress: 0,
        tension: 0.12,
        stamina: 1,
        criticalSeconds: 0,
        behaviour: opening.kind,
        struggle: opening.intensity,
        motionX: RESTING_FIGHT_MOTION.x,
        motionY: RESTING_FIGHT_MOTION.y,
        motionVx: RESTING_FIGHT_MOTION.vx,
        motionVy: RESTING_FIGHT_MOTION.vy,
        landingAt: null,
      };
      return;
    }
  }
}

function updateFishingFight(simulation: Simulation, input: InputState, dt: number): void {
  const fishing = simulation.fishing;
  const fight = fishing?.reeling;
  if (!fishing || !fight) return;
  if (fight.landingAt !== null) {
    if (simulation.elapsed - fight.landingAt >= FISHING_REEL_DURATION) {
      resolveCatch(simulation, fight.species);
    }
    return;
  }

  const next = stepFishingFight(
    fight.species,
    {
      progress: fight.progress,
      tension: fight.tension,
      stamina: fight.stamina,
      criticalSeconds: fight.criticalSeconds,
      motion: { x: fight.motionX, y: fight.motionY, vx: fight.motionVx, vy: fight.motionVy },
    },
    input.actionHeld,
    simulation.elapsed - fight.hookedAt,
    simulation.progress.upgrades.line,
    dt,
    fight.direction,
    simulation.progress.upgrades.reel,
  );
  fight.progress = next.progress;
  fight.tension = next.tension;
  fight.stamina = next.stamina;
  fight.criticalSeconds = next.criticalSeconds;
  fight.behaviour = next.behaviour;
  fight.struggle = next.struggle;
  fight.motionX = next.motion.x;
  fight.motionY = next.motion.y;
  fight.motionVx = next.motion.vx;
  fight.motionVy = next.motion.vy;
  if (next.broken) {
    const escapedTarget = fishing.targets[fight.targetIndex];
    if (escapedTarget) {
      escapedTarget.x = escapedTarget.direction === 1 ? 0.88 : 0.12;
      escapedTarget.phase += Math.PI / 2;
      escapedTarget.velocityX = 0;
      escapedTarget.velocityY = 0;
    }
    fishing.hook = { x: 0.5, y: 0.08 };
    fishing.reeling = null;
    simulation.events.push({ type: "line-broke", species: fight.species });
    return;
  }
  if (next.landed) fight.landingAt = simulation.elapsed;
}

function multiplyDirection(first: -1 | 1, second: -1 | 1): -1 | 1 {
  return first === second ? 1 : -1;
}

function discoverSpecies(simulation: Simulation, species: FishSpecies): void {
  if (!simulation.progress.discovered.includes(species)) simulation.progress.discovered.push(species);
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

function isUpgradeTutorialStep(value: unknown): value is UpgradeTutorialStep {
  return value === "locked"
    || value === "open-services"
    || value === "buy"
    || value === "done";
}

function hasPurchasedProgression(progress: Partial<ProgressState> | undefined): boolean {
  if (!progress) return false;
  const upgrades = progress.upgrades;
  return (upgrades?.cargo ?? 0) > 0
    || (upgrades?.engine ?? 0) > 0
    || (upgrades?.lamp ?? 0) > 0
    || (upgrades?.line ?? 0) > 0
    || progress.boostUnlocked === true
    || progress.beachUnlocked === true;
}

function pushEventOnce(simulation: Simulation, event: SimulationEvent): void {
  if (!simulation.events.some((existing) => existing.type === event.type)) simulation.events.push(event);
}
