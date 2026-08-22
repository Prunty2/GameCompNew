import { describe, expect, test } from "vitest";
import {
  containedSpriteSize,
  fishAtlasCellAspect,
  fishSpriteDestination,
} from "../game/fishSpriteLayout";

describe("fish sprite layout", () => {
  test("reads square cells from the 768 × 576 habitat sheets", () => {
    expect(fishAtlasCellAspect(768, 576)).toBeCloseTo(1);
  });

  test("reads the wider cells from the 768 × 512 Outer Gloam sheet", () => {
    expect(fishAtlasCellAspect(768, 512)).toBeCloseTo(1.125);
  });

  test("reads the White Sucker cells from its single-row sheet", () => {
    expect(fishAtlasCellAspect(768, 192, 1)).toBeCloseTo(1);
  });

  test("keeps destination aspect equal to the atlas cell", () => {
    expect(fishSpriteDestination(100, 1)).toEqual({ fishWidth: 100, fishHeight: 100 });
    const gloam = fishSpriteDestination(100, 1.125);
    expect(gloam.fishWidth).toBe(100);
    expect(gloam.fishHeight).toBeCloseTo(100 / 1.125);
  });

  test("fits an undistorted sprite inside the fishing guide box", () => {
    const square = containedSpriteSize(160, 92.8, 1);
    expect(square.width).toBeCloseTo(92.8);
    expect(square.height).toBeCloseTo(92.8);

    const gloam = containedSpriteSize(160, 92.8, 1.125);
    expect(gloam.height).toBeCloseTo(92.8);
    expect(gloam.width).toBeCloseTo(92.8 * 1.125);
  });
});
