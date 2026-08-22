import { describe, expect, test } from "vitest";
import { FISH, type FishSpecies, type HarborId } from "../game/balance";
import {
  MARKET_HISTORY_DAYS,
  MARKET_MAX_DAILY_CHANGE,
  bulkSalePreview,
  marketHistory,
  marketQuote,
  salePreview,
  spotForSpecies,
  worldForSpecies,
} from "../game/market";

const species = Object.keys(FISH) as FishSpecies[];
const harbors: HarborId[] = ["brindle", "gloam"];

describe("fish market", () => {
  test("is deterministic and never moves a quote more than six percent per day", () => {
    for (const fish of species) {
      for (const harbor of harbors) {
        for (let day = 1; day <= 40; day += 1) {
          const quote = marketQuote(fish, harbor, day, 17);
          const repeated = marketQuote(fish, harbor, day, 17);
          expect(repeated).toEqual(quote);
          expect(Math.abs(quote.changePercent)).toBeLessThanOrEqual(MARKET_MAX_DAILY_CHANGE * 100 + 0.001);
        }
      }
    }
  });

  test("keeps a complete labelled seven-day history", () => {
    const history = marketHistory("lakeTrout", "gloam", 12, 7);
    expect(history).toHaveLength(MARKET_HISTORY_DAYS);
    expect(history.map((point) => point.day)).toEqual([6, 7, 8, 9, 10, 11, 12]);
    expect(history.at(-1)?.price).toBe(marketQuote("lakeTrout", "gloam", 12, 7).price);
  });

  test("gives the two harbors distinct species demand", () => {
    const differences = species.filter((fish) => (
      marketQuote(fish, "brindle", 8, 7).price !== marketQuote(fish, "gloam", 8, 7).price
    ));
    expect(differences.length).toBeGreaterThanOrEqual(5);
  });

  test("prices every matching catch at the displayed quote", () => {
    const preview = salePreview([
      { species: "bluegill" },
      { species: "bluegill" },
      { species: "bluegill" },
      { species: "yellowPerch" },
    ], "bluegill", 20);

    expect(preview).toEqual({
      species: "bluegill",
      quantity: 3,
      total: 60,
    });
  });

  test("previews every cargo item at its species quote", () => {
    const cargo = [
      { species: "bluegill" as const },
      { species: "yellowPerch" as const },
      { species: "lakeTrout" as const },
    ];
    const preview = bulkSalePreview(cargo, "brindle", 3, 11);

    expect(preview).toEqual({
      quantity: 3,
      total: marketQuote("bluegill", "brindle", 3, 11).price
        + marketQuote("yellowPerch", "brindle", 3, 11).price
        + marketQuote("lakeTrout", "brindle", 3, 11).price,
    });
  });

  test("maps every species to its real habitat", () => {
    for (const fish of species) expect(spotForSpecies(fish).id).toBeTruthy();
    expect(spotForSpecies("bluegill").id).toBe("sunwardShoal");
    expect(spotForSpecies("lakeSturgeon").id).toBe("outerGloam");
    expect(spotForSpecies("cisco").id).toBe("outerGloam");
    expect(spotForSpecies("seaMullet").id).toBe("sunwardShoal");
    expect(spotForSpecies("largetoothFlounder").id).toBe("sunwardShoal");
    expect(spotForSpecies("longnoseGar").id).toBe("mosswaterPool");
    expect(spotForSpecies("estuaryPerch").id).toBe("mosswaterPool");
    expect(spotForSpecies("mulloway").id).toBe("outerGloam");
    expect(worldForSpecies("bluegill")).toBe("lake");
    expect(worldForSpecies("snapper")).toBe("beach");
  });

  test("prices fish by required depth within each world", () => {
    const byWorld = {
      lake: species.filter((fish) => worldForSpecies(fish) === "lake"),
      beach: species.filter((fish) => worldForSpecies(fish) === "beach"),
    };

    for (const worldSpecies of Object.values(byWorld)) {
      const maxByDepth = new Map<number, number>();
      for (const fish of worldSpecies) {
        const depth = FISH[fish].depthTier;
        maxByDepth.set(depth, Math.max(maxByDepth.get(depth) ?? 0, FISH[fish].value));
      }
      const depths = [...maxByDepth.keys()].sort((a, b) => a - b);
      for (let index = 1; index < depths.length; index += 1) {
        const shallower = depths[index - 1]!;
        const deeper = depths[index]!;
        const shallowMax = maxByDepth.get(shallower) ?? 0;
        const deepMin = Math.min(
          ...worldSpecies.filter((fish) => FISH[fish].depthTier === deeper).map((fish) => FISH[fish].value),
        );
        expect(deepMin).toBeGreaterThan(shallowMax);
      }
    }
  });

  test("gives Beach fish a depth-matched premium over Lake peers", () => {
    const peers: Array<readonly [FishSpecies, FishSpecies]> = [
      ["bluegill", "seaMullet"],
      ["yellowPerch", "yellowfinBream"],
      ["emeraldShiner", "duskyFlathead"],
      ["northernPike", "duskyFlathead"],
      ["largemouthBass", "luderick"],
      ["bowfin", "easternAustralianSalmon"],
      ["lakeTrout", "snapper"],
      ["burbot", "yellowtailKingfish"],
      ["lakeSturgeon", "mulloway"],
    ];

    for (const [lakeFish, beachFish] of peers) {
      expect(FISH[lakeFish].depthTier).toBe(FISH[beachFish].depthTier);
      const premium = FISH[beachFish].value / FISH[lakeFish].value;
      expect(premium).toBeGreaterThanOrEqual(1.15);
      expect(premium).toBeLessThanOrEqual(1.25);
    }

    expect(FISH.bluegill.value).toBe(18);
    expect(FISH.lakeSturgeon.value).toBe(130);
    expect(FISH.seaMullet.value).toBe(22);
    expect(FISH.mulloway.value).toBe(156);
  });
});
