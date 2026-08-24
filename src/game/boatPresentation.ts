export const EXPANDED_CARGO_BOAT_TIER = 4;

export function usesExpandedCargoBoat(cargoTier: number): boolean {
  return cargoTier >= EXPANDED_CARGO_BOAT_TIER;
}
