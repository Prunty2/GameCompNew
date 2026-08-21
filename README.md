# FSHING

FSHING is a single-player, side-on fishing market game for desktop and mobile browsers. Pilot a working boat across the lake and an unlockable Beach, catch habitat-specific species, and sell them at two harbors whose prices move each day while freshness falls.

The playable game includes:

- Deterministic fixed-step sailing, fishing, freshness, market quotes, and day/night
- A lake and unlockable Beach, each with three fishing grounds and nine real species
- Two harbors with seeded daily quotes, seven-day price history, and freshness-adjusted sales
- Cargo, engine, and line upgrades, plus a rechargeable engine boost
- Outer Gloam permit water and a paid Beach location
- A five-step First Assignment, four-card How to play, credits, and an eight-sale season report
- Keyboard sailing and hook steering, pointer/touch menus, and pause on focus loss
- Mute, volume, high contrast, reduced motion, and remappable controls
- Version 10 validated persistence and a local-safe CrazyGames SDK v3 adapter
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
