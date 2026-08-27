import {
  FISH,
  FISHING_SPOTS,
  HARBORS,
  WORLD_SPOT_RESIDENTS,
  regionById,
  spotNameForWorld,
  type FishSpecies,
  type HarborId,
  type WorldId,
} from "./balance";
import type { CargoItem } from "./simulation";

export const MARKET_HISTORY_DAYS = 7;
export const MARKET_MAX_DAILY_CHANGE = 0.06;

export type MarketTrend = "rising" | "steady" | "falling";
export type MarketAvailability = "abundant" | "normal" | "scarce";

export interface MarketCondition {
  id: "clear" | "warm" | "cold" | "fog";
  name: string;
  description: string;
  fogMultiplier: number;
}

export interface MarketQuote {
  species: FishSpecies;
  harbor: HarborId;
  day: number;
  price: number;
  previousPrice: number;
  changePercent: number;
  trend: MarketTrend;
  availability: MarketAvailability;
}

export interface MarketHistoryPoint {
  day: number;
  price: number;
}

export interface MarketSalePreview {
  species: FishSpecies;
  quantity: number;
  total: number;
}

export interface MarketBulkSalePreview {
  quantity: number;
  total: number;
}

const CONDITIONS: readonly MarketCondition[] = [
  {
    id: "clear",
    name: "Clear water",
    description: "Stable catches keep most quotes close to their usual value.",
    fogMultiplier: 0.72,
  },
  {
    id: "warm",
    name: "Warm shallows",
    description: "Shallow fish are plentiful. Deep-water fish are harder to find.",
    fogMultiplier: 0.9,
  },
  {
    id: "cold",
    name: "Cold current",
    description: "Deep fish are active. Shallow-water catches are less common.",
    fogMultiplier: 1.05,
  },
  {
    id: "fog",
    name: "Fog banks",
    description: "Slower crossings tighten supply and lift prices across the lake.",
    fogMultiplier: 1.35,
  },
];

const HARBOR_DEMAND: Record<HarborId, Record<FishSpecies, number>> = {
  brindle: {
    bluegill: 0.98,
    yellowPerch: 1.05,
    emeraldShiner: 1.02,
    whiteSucker: 1,
    longnoseGar: 1.03,
    northernPike: 1.06,
    largemouthBass: 0.97,
    bowfin: 1.04,
    cisco: 1.02,
    lakeTrout: 1.08,
    burbot: 0.96,
    lakeSturgeon: 1.06,
    seaMullet: 1.01,
    yellowfinBream: 1.05,
    sandWhiting: 0.98,
    largetoothFlounder: 1.04,
    duskyFlathead: 1.06,
    luderick: 0.97,
    easternAustralianSalmon: 1.04,
    estuaryPerch: 1.07,
    snapper: 1.08,
    yellowtailKingfish: 0.96,
    mulloway: 1.07,
    atlanticSpadefish: 0.98,
    sheepshead: 1.05,
    grayTriggerfish: 1.07,
    cobia: 1.03,
    greaterAmberjack: 0.97,
    atlanticMahiMahi: 1.08,
  },
  gloam: {
    bluegill: 1.07,
    yellowPerch: 0.98,
    emeraldShiner: 1.04,
    whiteSucker: 1.05,
    longnoseGar: 1.08,
    northernPike: 0.97,
    largemouthBass: 1.06,
    bowfin: 1.02,
    cisco: 1.06,
    lakeTrout: 0.96,
    burbot: 1.08,
    lakeSturgeon: 1.02,
    seaMullet: 1.06,
    yellowfinBream: 0.98,
    sandWhiting: 1.04,
    largetoothFlounder: 1.08,
    duskyFlathead: 0.97,
    luderick: 1.06,
    easternAustralianSalmon: 1.02,
    estuaryPerch: 0.98,
    snapper: 0.96,
    yellowtailKingfish: 1.08,
    mulloway: 1.03,
    atlanticSpadefish: 1.06,
    sheepshead: 0.98,
    grayTriggerfish: 1.02,
    cobia: 1.08,
    greaterAmberjack: 1.06,
    atlanticMahiMahi: 0.97,
  },
};

const quoteCache = new Map<string, number>();

export function marketDayFromElapsed(elapsed: number): number {
  return Math.max(1, Math.floor(Math.max(0, elapsed) / 210) + 1);
}

export function marketCondition(day: number, seed: number): MarketCondition {
  const index = Math.floor(hashUnit(`condition:${seed}:${normaliseDay(day)}`) * CONDITIONS.length);
  return CONDITIONS[index] ?? CONDITIONS[0]!;
}

export function marketAvailability(
  species: FishSpecies,
  day: number,
  seed: number,
): MarketAvailability {
  const depth = FISH[species].depthTier;
  const condition = marketCondition(day, seed);
  if (condition.id === "warm") return depth <= 1 ? "abundant" : depth >= 3 ? "scarce" : "normal";
  if (condition.id === "cold") return depth >= 3 ? "abundant" : depth <= 1 ? "scarce" : "normal";
  if (condition.id === "fog") {
    return hashUnit(`availability:${seed}:${day}:${species}`) > 0.58 ? "scarce" : "normal";
  }
  return hashUnit(`availability:${seed}:${day}:${species}`) > 0.84 ? "abundant" : "normal";
}

export function marketQuote(
  species: FishSpecies,
  harbor: HarborId,
  day: number,
  seed: number,
): MarketQuote {
  const currentDay = normaliseDay(day);
  const price = quotePrice(species, harbor, currentDay, seed);
  const previousPrice = quotePrice(species, harbor, currentDay - 1, seed);
  const changePercent = previousPrice === 0 ? 0 : ((price - previousPrice) / previousPrice) * 100;
  return {
    species,
    harbor,
    day: currentDay,
    price,
    previousPrice,
    changePercent,
    trend: changePercent > 1 ? "rising" : changePercent < -1 ? "falling" : "steady",
    availability: marketAvailability(species, currentDay, seed),
  };
}

export function marketHistory(
  species: FishSpecies,
  harbor: HarborId,
  day: number,
  seed: number,
): MarketHistoryPoint[] {
  const currentDay = normaliseDay(day);
  return Array.from({ length: MARKET_HISTORY_DAYS }, (_, index) => {
    const historyDay = currentDay - (MARKET_HISTORY_DAYS - 1 - index);
    return { day: historyDay, price: quotePrice(species, harbor, historyDay, seed) };
  });
}

export function salePreview(
  cargo: readonly CargoItem[],
  species: FishSpecies,
  wholeFishQuote: number,
): MarketSalePreview {
  const catches = cargo.filter((item) => item.species === species);
  return {
    species,
    quantity: catches.length,
    total: wholeFishQuote * catches.length,
  };
}

export function bulkSalePreview(
  cargo: readonly CargoItem[],
  harbor: HarborId,
  day: number,
  seed: number,
): MarketBulkSalePreview {
  return cargo.reduce<MarketBulkSalePreview>((preview, item) => {
    const quote = marketQuote(item.species, harbor, day, seed);
    return {
      quantity: preview.quantity + 1,
      total: preview.total + quote.price,
    };
  }, { quantity: 0, total: 0 });
}

export function spotForSpecies(species: FishSpecies): (typeof FISHING_SPOTS)[number] {
  const spot = FISHING_SPOTS.find((candidate) => (
    Object.values(WORLD_SPOT_RESIDENTS).some((residents) => residents[candidate.id].includes(species))
  ));
  if (!spot) throw new Error(`No fishing ground contains ${species}.`);
  return spot;
}

export function worldForSpecies(species: FishSpecies): WorldId {
  const entry = (Object.entries(WORLD_SPOT_RESIDENTS) as [WorldId, Record<string, readonly FishSpecies[]>][])
    .find(([, residents]) => Object.values(residents).some((residentSpecies) => residentSpecies.includes(species)));
  if (!entry) throw new Error(`No world contains ${species}.`);
  return entry[0];
}

export function marketLocationText(species: FishSpecies): string {
  const spot = spotForSpecies(species);
  const world = worldForSpecies(species);
  if (world === "oil-rig") return `${spotNameForWorld(world, spot.id)}, Oil Rig`;
  return `${spotNameForWorld(world, spot.id)}, ${regionById(spot.region).name}`;
}

export function strongerHarborFor(
  species: FishSpecies,
  day: number,
  seed: number,
): (typeof HARBORS)[number] {
  return HARBORS.reduce((best, harbor) => (
    marketQuote(species, harbor.id, day, seed).price
      > marketQuote(species, best.id, day, seed).price
      ? harbor
      : best
  ));
}

export function residentCountForMarket(
  species: FishSpecies,
  day: number,
  seed: number,
): number {
  const availability = marketAvailability(species, day, seed);
  return availability === "abundant" ? 3 : availability === "scarce" ? 1 : 2;
}

function quotePrice(species: FishSpecies, harbor: HarborId, day: number, seed: number): number {
  const safeDay = Math.max(-30, normaliseDay(day));
  const cacheKey = `${seed}:${harbor}:${species}:${safeDay}`;
  const cached = quoteCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const anchorDay = -30;
  let previous = Math.max(1, Math.round(rawQuoteTarget(species, harbor, anchorDay, seed)));
  quoteCache.set(`${seed}:${harbor}:${species}:${anchorDay}`, previous);
  for (let quoteDay = anchorDay + 1; quoteDay <= safeDay; quoteDay += 1) {
    const dayKey = `${seed}:${harbor}:${species}:${quoteDay}`;
    const existing = quoteCache.get(dayKey);
    if (existing !== undefined) {
      previous = existing;
      continue;
    }
    const target = rawQuoteTarget(species, harbor, quoteDay, seed);
    const maximumStep = Math.max(previous >= 17 ? 1 : 0, Math.floor(previous * MARKET_MAX_DAILY_CHANGE));
    const minimum = previous - maximumStep;
    const maximum = previous + maximumStep;
    previous = Math.max(1, Math.round(Math.max(minimum, Math.min(maximum, target))));
    quoteCache.set(dayKey, previous);
  }
  return previous;
}

function rawQuoteTarget(species: FishSpecies, harbor: HarborId, day: number, seed: number): number {
  const availability = marketAvailability(species, day, seed);
  const scarcityFactor = availability === "scarce" ? 1.075 : availability === "abundant" ? 0.94 : 1;
  const condition = marketCondition(day, seed);
  const weatherFactor = condition.id === "fog" ? 1.035 : 1;
  const dailyDemand = 0.975 + hashUnit(`demand:${seed}:${harbor}:${species}:${day}`) * 0.05;
  const cycle = 1 + Math.sin(day * 0.71 + hashUnit(`${harbor}:${species}`) * Math.PI * 2) * 0.025;
  return FISH[species].value
    * HARBOR_DEMAND[harbor][species]
    * scarcityFactor
    * weatherFactor
    * dailyDemand
    * cycle;
}

function normaliseDay(day: number): number {
  return Number.isFinite(day) ? Math.floor(day) : 1;
}

function hashUnit(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4_294_967_295;
}
