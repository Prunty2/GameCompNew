# FSHING

FSHING is a single-player, side-on fishing market game for desktop and mobile browsers. Pilot a working boat across the lake and an unlockable Beach, catch habitat-specific species, and sell them at two harbors whose prices move each day.

The playable game includes:

- Deterministic fixed-step sailing, research-backed species movement and reel-and-release line fights, market quotes, and day/night
- A lake with twelve real species and an unlockable Beach with eleven, each across three fishing grounds
- Two harbors with seeded daily quotes, seven-day price history, and full-quote sales
- Cargo, engine, line, and five-tier reel-power upgrades, plus a rechargeable engine boost
- Line-tier-gated Outer Gloam water and a paid Beach location
- A five-step First Assignment, four-card How to play, and credits
- Keyboard sailing and hook steering, keyboard/pointer/touch reeling, and pause on focus loss
- Quiet looping scene music, mute, separate music and sound-effects volume, high contrast, reduced motion, and remappable controls
- Version 15 validated persistence, Tauri display settings, and a local-safe CrazyGames SDK v3 adapter
- Generated runtime art documented in [`Docs/Asset-Manifest.md`](Docs/Asset-Manifest.md)

## Run locally

```sh
npm install
npm run dev
```

## Verify

```sh
npm run check
npm run build
npm run test:e2e
```

Product, scope, balance, and acceptance live in [`Docs/Game-Brief.md`](Docs/Game-Brief.md). The design, testing, and reflection portfolio is in [`Docs/Assessment-Report.md`](Docs/Assessment-Report.md).
