# AGENTS.md

## Purpose

This repository is a new CrazyGames-ready browser game, not a continuation or reskin of Boomerang Birds. Use `/Users/liam/Documents/Crazy Games` only as an architectural reference. Do not copy its gameplay, theme, art, names, economy, balance values, or large implementation modules into this project.

The theme and game design belong in `Docs/Game-Brief.md`. Read and update that brief before implementing theme-specific gameplay or assets.

These instructions apply to the entire repository. If a subdirectory later needs more specific guidance, add a nested `AGENTS.md`; the nearest file takes precedence for files below it.

## Collaboration rules

The goal is to keep `main` playable and make concurrent work easy to combine.

Every repository change, including documentation and configuration updates, must be made on a new short-lived branch and submitted through a pull request. Never commit or push changes directly to `main`.

### Before starting

1. Read this file, `README.md`, and the relevant sections of `Docs/Game-Brief.md`.
2. Run `git status --short` and inspect current changes before editing. Treat every pre-existing change as another person's work.
3. Agree on one owner, a narrow scope, affected files, and an acceptance check for the task. Record this in the issue, task, pull request, or team chat.
4. Create a new short-lived branch from an up-to-date `main` for every change. Use a descriptive name such as `liam/fishing-input` or `codex/save-validation`; do not reuse a branch or work directly on `main`.
5. Check whether someone else owns the same files or system. Coordinate before changing a shared hotspot.

Do not begin a broad refactor as part of an unrelated feature. If the requested work depends on a refactor, separate it into its own agreed task or commit.

### Ownership and shared hotspots

One person or agent owns a task at a time. Ownership is temporary and means that person coordinates changes to the files in scope; it does not prevent review or design input.

Files that commonly affect many systems require explicit coordination before editing:

- `Docs/Game-Brief.md`
- `src/game/Game.ts`
- `src/game/simulation.ts`
- `src/game/input.ts`
- `src/game/renderer.ts`
- `src/styles.css`
- `src/services/saveGame.ts`
- `src/services/platformService.ts`
- `package.json` and `package-lock.json`
- shared asset manifests, balance data, and public types

Prefer adding a focused module over making several people edit a shared coordinator. If two tasks must touch the same hotspot, agree on an edit order or have one owner make the shared change first.

### While working

- Stay within the agreed scope. Flag newly discovered work instead of silently expanding the task.
- Never delete, overwrite, revert, reformat, or stage changes you did not create.
- Do not use `git reset --hard`, `git clean`, forced checkout, broad automated rewrites, or force-push on a shared branch.
- Preserve unrelated working-tree changes. Stage explicit paths or selected hunks; do not use `git add .` in a mixed worktree.
- Keep commits small, buildable, and single-purpose. Use clear subjects such as `feat: add hook steering` or `fix: clamp migrated cargo`.
- Avoid drive-by formatting, renaming, file moves, and dependency upgrades. These create conflicts and should be separate, coordinated tasks.
- Update or add tests with intentional behavior changes. Update the relevant documentation when product, balance, controls, persistence, architecture, or asset requirements change.
- When changing a shared type or public contract, update all consumers in the same commit or coordinate a merge order that keeps the branch buildable.
- Do not hand-edit generated output such as `dist/`, test reports, coverage, or generated image output. Commit runtime assets only when they are intentionally imported and documented.

### Dependencies, assets, and persistence

- Get agreement before adding, removing, or upgrading a dependency. Commit `package.json` and `package-lock.json` together.
- Coordinate asset names, dimensions, format, ownership, and compression before production. Update `Docs/Asset-Manifest.md` with runtime asset changes.
- Treat save schema changes as migrations. Never reuse a persisted field with a different meaning; version, validate, clamp, migrate, and test old or malformed data.
- Keep balance values centralized and document their units and intentional changes in `Docs/Game-Brief.md`.

### Synchronizing and resolving conflicts

- Integrate small changes frequently instead of keeping long-lived branches.
- Before handoff or merge, bring in the latest `main`, resolve conflicts on the task branch, and rerun the required checks.
- Resolve conflicts semantically, not by accepting an entire side. Read both changes and preserve both intents where compatible.
- If a conflict includes another owner's active work, stop and coordinate with that owner rather than guessing.
- Never rewrite history on `main`. Only force-push a personal branch when nobody else is using it, and use `--force-with-lease`.

### Handoff and review

Open a pull request for every change before it can be merged into `main`, regardless of the size or type of the change.

Every handoff or pull request should include:

- Summary: what changed and why.
- Scope: key files or systems changed.
- Verification: exact commands run and their results.
- Manual checks: controls, screens, aspect ratios, or gameplay paths exercised.
- Follow-ups: known limitations, deferred work, or migration concerns.
- Coordination notes: shared files touched and any expected merge order.

Reviewers should focus first on gameplay correctness, determinism, save compatibility, input coverage, accessibility, SDK isolation, and test evidence. The task owner addresses review feedback or explicitly hands ownership to someone else.

Do not mark work complete with uncommitted task changes, unexplained failing checks, unresolved conflict markers, or undocumented follow-up work.

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

Run `npm run check` before finishing code changes. Also run `npm run build` for asset, dependency, configuration, or production-build changes. Run `npm run test:e2e` for UI, input, navigation, accessibility interactions, and complete gameplay-flow changes. If a required check cannot run, report the reason in the handoff; do not imply it passed.

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
