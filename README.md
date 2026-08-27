# FSHING

FSHING is a single-player, side-on fishing market game for desktop and mobile browsers. Pilot a working boat across the lake, an unlockable Beach, and an offshore Oil Rig, catch habitat-specific species, and sell them at two harbors whose prices move each day.

The playable game includes:

- Deterministic fixed-step sailing, research-backed species movement and reel-and-release line fights, market quotes, and day/night
- A lake with twelve real species, an unlockable Beach with eleven, and an Oil Rig with six more across one spillwater and one clean-bluewater ground
- Two harbors with seeded daily quotes, seven-day price history, and full-quote sales
- Cargo, engine, line, and five-tier reel-power upgrades, plus a rechargeable engine boost
- World-specific line-tier gates, a paid Beach location, and a live Oil Rig route from Departures
- A five-step First Assignment, four-card How to play, and credits
- Keyboard sailing and hook steering, keyboard/pointer/touch reeling, and pause on focus loss
- Quiet looping title-screen music, mute, separate music and sound-effects volume, high contrast, reduced motion, and remappable controls
- Version 14 validated persistence and a local-safe CrazyGames SDK v3 adapter
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
