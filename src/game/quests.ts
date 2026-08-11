import { BALANCE, FISH, type FishSpecies, type HarborId, type SpotId } from "./balance";

export interface QuestAccessGrant {
  label: string;
  lineTier?: number;
  outerPermit?: boolean;
}

export interface QuestDefinition {
  id: string;
  title: string;
  species: FishSpecies;
  origin: HarborId;
  destination: HarborId;
  spot: SpotId;
  maxQuantity: number;
  accessGrant?: QuestAccessGrant;
}

export interface ResolvedQuestDefinition extends QuestDefinition {
  quantity: number;
  reward: number;
  minimumFreshness: number;
}

/**
 * The first season is deliberately authored rather than generated. Each grant
 * arrives before a later quest needs it, while cargo capacity determines the
 * size of the order that can actually be posted.
 */
export const FIRST_SEASON_QUESTS: readonly QuestDefinition[] = [
  {
    id: "morning-order",
    title: "The Morning Order",
    species: "reedfin",
    origin: "brindle",
    destination: "gloam",
    spot: "sunwardShoal",
    maxQuantity: 1,
  },
  {
    id: "sunward-signatures",
    title: "Sunward Signatures",
    species: "sunPerch",
    origin: "brindle",
    destination: "gloam",
    spot: "sunwardShoal",
    maxQuantity: 1,
  },
  {
    id: "shoal-in-motion",
    title: "The Shoal in Motion",
    species: "silverDart",
    origin: "brindle",
    destination: "gloam",
    spot: "sunwardShoal",
    maxQuantity: 2,
    accessGrant: { label: "Mosswater line kit · tier 1", lineTier: 1 },
  },
  {
    id: "mosswater-sounding",
    title: "Mosswater Sounding",
    species: "needlePike",
    origin: "brindle",
    destination: "gloam",
    spot: "mosswaterPool",
    maxQuantity: 3,
    accessGrant: { label: "Mosswater line kit · tier 2", lineTier: 2 },
  },
  {
    id: "silt-and-shadow",
    title: "Silt and Shadow",
    species: "mossback",
    origin: "brindle",
    destination: "gloam",
    spot: "mosswaterPool",
    maxQuantity: 4,
  },
  {
    id: "lantern-survey",
    title: "Lantern Survey",
    species: "lanternEel",
    origin: "brindle",
    destination: "gloam",
    spot: "mosswaterPool",
    maxQuantity: 6,
    accessGrant: {
      label: "Outer Gloam permit + line tier 3",
      lineTier: 3,
      outerPermit: true,
    },
  },
  {
    id: "beyond-the-beacon",
    title: "Beyond the Beacon",
    species: "gloamGill",
    origin: "brindle",
    destination: "gloam",
    spot: "outerGloam",
    maxQuantity: 8,
    accessGrant: { label: "Deep-water line kit · tier 4", lineTier: 4 },
  },
  {
    id: "violet-wings",
    title: "Violet Wings",
    species: "violetRay",
    origin: "brindle",
    destination: "gloam",
    spot: "outerGloam",
    maxQuantity: 10,
    accessGrant: { label: "Abyssal line kit · tier 5", lineTier: 5 },
  },
];

export function firstSeasonQuest(
  completedContracts: number,
  cargoCapacity: number,
  engineTier = 0,
): ResolvedQuestDefinition | null {
  const quest = FIRST_SEASON_QUESTS[completedContracts];
  if (!quest) return null;
  const quantity = Math.max(1, Math.min(quest.maxQuantity, Math.floor(cargoCapacity)));
  const minimumFreshness = contractFreshnessTarget(quantity, engineTier);
  return {
    ...quest,
    quantity,
    reward: contractReward(quest.species, quantity, minimumFreshness),
    minimumFreshness,
    accessGrant: quest.accessGrant ? { ...quest.accessGrant } : undefined,
  };
}

export function contractFreshnessTarget(quantity: number, engineTier = 0): number {
  const quantityTarget = Math.max(50, 90 - (Math.max(1, Math.floor(quantity)) - 1) * 5);
  const upgradeCap = BALANCE.baseQuestFreshnessCap
    + Math.max(0, Math.floor(engineTier)) * BALANCE.questFreshnessCapPerEngineTier;
  return Math.min(quantityTarget, upgradeCap);
}

export function contractReward(species: FishSpecies, quantity: number, minimumFreshness: number): number {
  const totalSpecimenValue = FISH[species].value * Math.max(1, Math.floor(quantity));
  const freshnessPremium = 1 + Math.max(0, minimumFreshness - 50) / 100;
  return Math.max(5, Math.round(((34 + totalSpecimenValue * 2) * freshnessPremium) / 5) * 5);
}

export function earnedFirstSeasonAccess(completedContracts: number): { lineTier: number; outerPermit: boolean } {
  let lineTier = 0;
  let outerPermit = false;
  for (const quest of FIRST_SEASON_QUESTS.slice(0, Math.max(0, completedContracts))) {
    lineTier = Math.max(lineTier, quest.accessGrant?.lineTier ?? 0);
    outerPermit ||= quest.accessGrant?.outerPermit === true;
  }
  return { lineTier, outerPermit };
}
