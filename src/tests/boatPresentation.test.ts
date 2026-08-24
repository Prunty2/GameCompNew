import { describe, expect, test } from "vitest";
import {
  EXPANDED_CARGO_BOAT_TIER,
  usesExpandedCargoBoat,
} from "../game/boatPresentation";

describe("boat presentation", () => {
  test("adds the foredeck crate from cargo tier four", () => {
    expect(EXPANDED_CARGO_BOAT_TIER).toBe(4);
    expect(usesExpandedCargoBoat(3)).toBe(false);
    expect(usesExpandedCargoBoat(4)).toBe(true);
    expect(usesExpandedCargoBoat(7)).toBe(true);
  });
});
