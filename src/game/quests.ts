import type { FishSpecies, HarborId, SpotId } from "./balance";

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
  reward: number;
  minimumFreshness: number;
  accessGrant?: QuestAccessGrant;
}

/**
 * The first season is deliberately authored rather than generated. Each grant
 * arrives before a later quest needs it, so discretionary spending cannot
 * strand the player outside the next ecosystem.
 */
export const FIRST_SEASON_QUESTS: readonly QuestDefinition[] = [
  {
    id: "morning-order",
    title: "The Morning Order",
    species: "reedfin",
    origin: "brindle",
    destination: "gloam",
    spot: "sunwardShoal",
    reward: 90,
    minimumFreshness: 35,
    accessGrant: { label: "Mosswater line kit · tier 1", lineTier: 1 },
  },
  {
    id: "sunward-signatures",
    title: "Sunward Signatures",
    species: "sunPerch",
    origin: "brindle",
    destination: "gloam",
    spot: "sunwardShoal",
    reward: 105,
    minimumFreshness: 40,
  },
  {
    id: "shoal-in-motion",
    title: "The Shoal in Motion",
    species: "silverDart",
    origin: "brindle",
    destination: "gloam",
    spot: "sunwardShoal",
    reward: 120,
    minimumFreshness: 44,
    accessGrant: { label: "Mosswater line kit · tier 2", lineTier: 2 },
  },
  {
    id: "mosswater-sounding",
    title: "Mosswater Sounding",
    species: "needlePike",
    origin: "brindle",
    destination: "gloam",
    spot: "mosswaterPool",
    reward: 150,
    minimumFreshness: 42,
  },
  {
    id: "silt-and-shadow",
    title: "Silt and Shadow",
    species: "mossback",
    origin: "brindle",
    destination: "gloam",
    spot: "mosswaterPool",
    reward: 190,
    minimumFreshness: 46,
  },
  {
    id: "lantern-survey",
    title: "Lantern Survey",
    species: "lanternEel",
    origin: "brindle",
    destination: "gloam",
    spot: "mosswaterPool",
    reward: 220,
    minimumFreshness: 48,
    accessGrant: {
      label: "Outer Gloam permit + line tier 3",
      lineTier: 3,
      outerPermit: true,
    },
  },
  {
    id: "beyond-the-ferry",
    title: "Beyond the Ferry",
    species: "gloamGill",
    origin: "brindle",
    destination: "gloam",
    spot: "outerGloam",
    reward: 280,
    minimumFreshness: 50,
    accessGrant: { label: "Deep-water line kit · tier 4", lineTier: 4 },
  },
  {
    id: "violet-wings",
    title: "Violet Wings",
    species: "violetRay",
    origin: "brindle",
    destination: "gloam",
    spot: "outerGloam",
    reward: 360,
    minimumFreshness: 54,
    accessGrant: { label: "Abyssal line kit · tier 5", lineTier: 5 },
  },
];

export function firstSeasonQuest(completedContracts: number): QuestDefinition | null {
  const quest = FIRST_SEASON_QUESTS[completedContracts];
  return quest ? { ...quest, accessGrant: quest.accessGrant ? { ...quest.accessGrant } : undefined } : null;
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
