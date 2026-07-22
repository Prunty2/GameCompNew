import { clamp, createRandom, type RandomSource } from "./math";

export interface Point {
  x: number;
  y: number;
}

export interface InputState {
  x: number;
  y: number;
}

export interface Simulation {
  player: Point;
  target: Point;
  score: number;
  elapsed: number;
  random: RandomSource;
}

const PLAYER_SPEED = 0.48;
const COLLECTION_RADIUS = 0.075;

export function createSimulation(seed = 1): Simulation {
  const random = createRandom(seed);
  return {
    player: { x: 0.5, y: 0.72 },
    target: randomTarget(random),
    score: 0,
    elapsed: 0,
    random,
  };
}

export function updateSimulation(simulation: Simulation, input: InputState, dt: number): void {
  const magnitude = Math.hypot(input.x, input.y) || 1;
  const scale = magnitude > 1 ? 1 / magnitude : 1;
  simulation.player.x = clamp(simulation.player.x + input.x * scale * PLAYER_SPEED * dt, 0.05, 0.95);
  simulation.player.y = clamp(simulation.player.y + input.y * scale * PLAYER_SPEED * dt, 0.08, 0.92);
  simulation.elapsed += dt;

  if (Math.hypot(simulation.player.x - simulation.target.x, simulation.player.y - simulation.target.y) <= COLLECTION_RADIUS) {
    simulation.score += 1;
    simulation.target = randomTarget(simulation.random);
  }
}

function randomTarget(random: RandomSource): Point {
  return {
    x: 0.12 + random.next() * 0.76,
    y: 0.16 + random.next() * 0.62,
  };
}

