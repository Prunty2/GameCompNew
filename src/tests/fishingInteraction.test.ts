import { describe, expect, test } from "vitest";
import type { FishSpecies } from "../game/balance";
import {
  advanceFishingInteraction,
  beginFishingInteraction,
  projectFishingInteraction,
  requestFishingExit,
  type FishingInteraction,
  type FishingInteractionStep,
} from "../game/fishingInteraction";
import { createRandom } from "../game/math";

function begin(seed = 9, lineTier = 0): FishingInteraction {
  return beginFishingInteraction({
    spot: "sunwardShoal",
    objectiveSpecies: "bluegill",
    lineTier,
    random: createRandom(seed),
  });
}

function steerToSpecies(
  interaction: FishingInteraction,
  species: FishSpecies,
): void {
  for (let step = 0; step < 1_500; step += 1) {
    const scene = projectFishingInteraction(interaction, false);
    if (scene.phase === "reeling") return;
    const target = scene.fish.find((candidate) => candidate.species === species);
    if (!target) throw new Error(`Expected ${species} in the Fishing interaction.`);
    const horizontallyAligned = Math.abs(target.point.x - scene.hook.x) < 0.012;
    advanceFishingInteraction(interaction, {
      hookX: Math.sign(target.point.x - scene.hook.x),
      hookY: horizontallyAligned ? Math.sign(target.point.y - scene.hook.y) : 0,
    }, 1 / 120);
  }
  throw new Error(`Failed to hook ${species}.`);
}

function advanceUntilComplete(interaction: FishingInteraction): FishingInteractionStep {
  for (let step = 0; step < 20; step += 1) {
    const result = advanceFishingInteraction(interaction, { hookX: 0, hookY: 0 }, 0.1);
    if (result.status === "complete") return result;
  }
  throw new Error("Fishing interaction did not complete.");
}

describe("Fishing interaction", () => {
  test("is deterministic and projects one coherent steering scene", () => {
    const first = begin(12);
    const second = begin(12);

    expect(projectFishingInteraction(first, false)).toEqual(projectFishingInteraction(second, false));
    advanceFishingInteraction(first, { hookX: 1, hookY: 1 }, 0.1);
    advanceFishingInteraction(second, { hookX: 1, hookY: 1 }, 0.1);

    const scene = projectFishingInteraction(first, false);
    expect(scene).toEqual(projectFishingInteraction(second, false));
    expect(scene).toMatchObject({
      spot: "sunwardShoal",
      objectiveSpecies: "bluegill",
      phase: "steering",
      controls: { canSteer: true, canLeave: true },
    });
    expect(scene.fish).toHaveLength(6);
    expect(new Set(scene.fish.map((fish) => fish.species))).toEqual(
      new Set(["bluegill", "yellowPerch", "emeraldShiner"]),
    );
  });

  test("owns the hook, reel, fade, and caught outcome", () => {
    const interaction = begin();
    steerToSpecies(interaction, "bluegill");

    const reelStart = projectFishingInteraction(interaction, false);
    expect(reelStart.phase).toBe("reeling");
    expect(reelStart.controls).toEqual({ canSteer: false, canLeave: false });
    expect(reelStart.hookedFish?.species).toBe("bluegill");
    expect(requestFishingExit(interaction, false)).toEqual({ accepted: false });

    advanceFishingInteraction(interaction, { hookX: 0, hookY: 0 }, 0.5);
    const reelMiddle = projectFishingInteraction(interaction, false);
    expect(reelMiddle.transition.surfaceProgress).toBeGreaterThan(0);
    expect(reelMiddle.transition.schoolOpacity).toBeLessThan(1);
    expect(reelMiddle.transition.schoolOpacity + reelMiddle.transition.surfaceProgress).toBeCloseTo(1);
    expect(Math.abs(reelMiddle.hookedFish?.wriggle ?? 0)).toBeGreaterThan(0);

    expect(advanceUntilComplete(interaction)).toEqual({
      status: "complete",
      outcome: { kind: "caught", species: "bluegill" },
    });
  });

  test("owns animated and reduced-motion exits", () => {
    const animated = begin();
    for (let step = 0; step < 9; step += 1) {
      advanceFishingInteraction(animated, { hookX: 0, hookY: 0 }, 0.1);
    }
    expect(projectFishingInteraction(animated, false).transition.diveProgress).toBeGreaterThan(0.99);
    expect(requestFishingExit(animated, false)).toEqual({
      accepted: true,
      step: { status: "active" },
    });
    advanceFishingInteraction(animated, { hookX: 1, hookY: 1 }, 0.5);
    const exitScene = projectFishingInteraction(animated, false);
    expect(exitScene.phase).toBe("exiting");
    expect(exitScene.controls.canSteer).toBe(false);
    expect(exitScene.transition.surfaceProgress).toBeGreaterThan(0);
    expect(advanceUntilComplete(animated)).toEqual({
      status: "complete",
      outcome: { kind: "left" },
    });

    const reduced = begin();
    const reducedScene = projectFishingInteraction(reduced, true);
    expect(reducedScene.transition.diveProgress).toBe(1);
    expect(reducedScene.fish.every((fish) => (
      fish.pose.animationFrame === 0
      && fish.pose.rotation === 0
      && fish.pose.scaleX === 1
      && fish.pose.scaleY === 1
    ))).toBe(true);
    expect(requestFishingExit(reduced, true)).toEqual({
      accepted: true,
      step: { status: "complete", outcome: { kind: "left" } },
    });
  });

  test("keeps deeper residents visible but unreachable until the line tier allows them", () => {
    const shallow = beginFishingInteraction({
      spot: "mosswaterPool",
      objectiveSpecies: "largemouthBass",
      lineTier: 1,
      random: createRandom(12),
    });
    const shallowScene = projectFishingInteraction(shallow, false);
    expect(shallowScene.maximumDepth).toBeCloseTo(0.425);
    expect(shallowScene.fish.find((fish) => fish.species === "largemouthBass")?.reachable).toBe(false);

    const deep = beginFishingInteraction({
      spot: "mosswaterPool",
      objectiveSpecies: "largemouthBass",
      lineTier: 2,
      random: createRandom(12),
    });
    expect(projectFishingInteraction(deep, false).fish.find(
      (fish) => fish.species === "largemouthBass",
    )?.reachable).toBe(true);
  });
});
