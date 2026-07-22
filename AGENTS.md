# AGENTS.md

## Purpose

This repository is a new CrazyGames-ready browser game, not a continuation or reskin of Boomerang Birds. Use `/Users/liam/Documents/Crazy Games` only as an architectural reference. Do not copy its gameplay, theme, art, names, economy, balance values, or large implementation modules into this project.

The theme and game design belong in `Docs/Game-Brief.md`. Read and update that brief before implementing theme-specific gameplay or assets.

## Tech stack

- TypeScript with strict compiler settings
- Vite for development and static production builds
- HTML5 Canvas 2D for the game world
- HTML/CSS overlays for menus, HUD, and accessible controls
- CrazyGames HTML5 SDK v3 behind a local-safe service adapter
- Versioned and validated persistence
- Vitest for deterministic gameplay/model tests
- Playwright for browser-level smoke and interaction tests

Do not add a game engine, frontend framework, state library, or server dependency without an explicit design need and approval.

## Commands

- `npm install` — install locked dependencies.
- `npm run dev` — start the local Vite server.
- `npm run typecheck` — run strict TypeScript checks.
- `npm test` — run unit tests once.
- `npm run check` — run typechecking and unit tests.
- `npm run build` — verify and create `dist/`.
- `npm run test:e2e` — run Playwright browser tests.

Run `npm run check` before finishing code changes. Also run the build for asset/build changes and Playwright for UI, input, navigation, and complete gameplay-flow changes.

## Architecture

- `src/main.ts` owns startup and dependency wiring only.
- `src/game/Game.ts` coordinates lifecycle and high-level state; keep rules out of this file.
- `src/game/simulation.ts` owns deterministic world state and fixed-step updates.
- `src/game/input.ts` translates browser input into game-level intent.
- `src/game/renderer.ts` draws state but must not change it.
- `src/services/platformService.ts` is the only CrazyGames SDK boundary.
- `src/services/saveGame.ts` owns versioned, validated persistence.
- `src/tests/` contains model and simulation tests; `e2e/` contains user-flow tests.
- `Docs/` is the source of truth for product, balance, and technical decisions.

Split new systems by responsibility as the design becomes concrete. Avoid recreating the oversized all-in-one coordinator, renderer, simulation, or stylesheet modules found in the reference project.

## Game engineering rules

- Use a fixed simulation step and seeded randomness for gameplay-affecting behavior.
- Keep simulation independent of DOM, Canvas, audio, platform APIs, and wall-clock timing.
- Renderer and UI consume state; they do not own gameplay rules.
- Keep balance values centralized and document their units.
- Treat loaded save data as untrusted: version, validate, clamp, and migrate it.
- Keep every CrazyGames SDK call behind `PlatformService`; local play must work without the SDK.
- Explicitly import runtime assets so authoring files do not enter `dist/` accidentally.
- Preserve keyboard, pointer, and touch support plus mute, reduced motion, high contrast, pause-on-focus-loss, and readable non-color feedback as the game grows.

## Code style

Use two-space indentation, double quotes, semicolons, focused typed modules, type-only imports where appropriate, and explicit types at public boundaries. Preserve unrelated changes. Update tests and relevant docs whenever behavior changes intentionally.

