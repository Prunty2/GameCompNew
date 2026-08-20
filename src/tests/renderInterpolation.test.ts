import { describe, expect, test } from "vitest";
import {
  captureRenderMotion,
  interpolateSimulationForRender,
} from "../game/renderInterpolation";
import { createSimulation } from "../game/simulation";

const FIXED_STEP = 1 / 120;

describe("render interpolation", () => {
  test("smooths position and speed between fixed simulation steps without mutating gameplay", () => {
    const simulation = createSimulation();
    const previous = captureRenderMotion(simulation);
    simulation.elapsed += FIXED_STEP;
    simulation.boat.x += 0.0002;
    simulation.boat.speed = 0.024;

    const rendered = interpolateSimulationForRender(simulation, previous, 0.5, FIXED_STEP);

    expect(rendered.elapsed).toBeCloseTo(previous.elapsed + FIXED_STEP / 2);
    expect(rendered.boat.x).toBeCloseTo(previous.boat.x + 0.0001);
    expect(rendered.boat.speed).toBeCloseTo(0.012);
    expect(simulation.boat.x).toBeCloseTo(previous.boat.x + 0.0002);
    expect(simulation.boat.speed).toBe(0.024);
  });

  test("renders teleports directly instead of sweeping across the lake", () => {
    const simulation = createSimulation();
    const previous = captureRenderMotion(simulation);
    simulation.elapsed += FIXED_STEP;
    simulation.boat.x += 0.2;

    expect(interpolateSimulationForRender(simulation, previous, 0.25, FIXED_STEP)).toBe(simulation);
  });
});
