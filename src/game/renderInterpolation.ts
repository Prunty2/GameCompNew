import { clamp } from "./math";
import type { BoatState, Simulation } from "./simulation";

export interface RenderMotionSnapshot {
  elapsed: number;
  boat: BoatState;
}

export function captureRenderMotion(simulation: Simulation): RenderMotionSnapshot {
  return {
    elapsed: simulation.elapsed,
    boat: { ...simulation.boat },
  };
}

export function interpolateSimulationForRender(
  simulation: Simulation,
  previous: RenderMotionSnapshot,
  alpha: number,
  fixedStep: number,
): Simulation {
  const blend = clamp(alpha, 0, 1);
  const elapsedDelta = simulation.elapsed - previous.elapsed;
  const continuousStep = elapsedDelta >= 0 && elapsedDelta <= fixedStep * 1.01;
  const maximumExpectedTravel = Math.max(
    Math.abs(previous.boat.speed),
    Math.abs(simulation.boat.speed),
  ) * fixedStep * 1.5 + 1e-6;
  const continuousPosition = Math.abs(simulation.boat.x - previous.boat.x) <= maximumExpectedTravel;

  if (!continuousStep || !continuousPosition) return simulation;

  return {
    ...simulation,
    elapsed: interpolate(previous.elapsed, simulation.elapsed, blend),
    boat: {
      ...simulation.boat,
      x: interpolate(previous.boat.x, simulation.boat.x, blend),
      y: interpolate(previous.boat.y, simulation.boat.y, blend),
      speed: interpolate(previous.boat.speed, simulation.boat.speed, blend),
    },
  };
}

function interpolate(start: number, end: number, alpha: number): number {
  return start + (end - start) * alpha;
}
