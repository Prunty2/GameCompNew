# FSHING

FSHING is a single-player, side-on environmental-science fishing market game for desktop and mobile browsers. Pilot a working boat across the lake and unlockable Beach, track species, fish at an upgrade-gated depth, and choose where to sell each catch while preserving freshness.

The MVP vertical slice includes:

- Deterministic fixed-step boat, fishing, market, freshness, weather, and day/night simulation
- An unobstructed lake and unlockable Beach, each with three fishing grounds and nine distinct fish arranged into habitat-specific resident sets
- Habitat-specific resident species and environmental surveys
- Deterministic two-harbor quotes, seven-day price history, and freshness-adjusted fish sales
- Six tiers each of boat/cargo, engine, lamp, and line upgrades; seven visible boat classes
- Cargo release, guided help, and an eight-sale season report
- Keyboard gameplay controls, pointer/touch interface actions, and pause-on-focus-loss
- Mute, volume, high-contrast, and reduced-motion settings
- Version 10 validated persistence with market progress, safe Beach access, and fantasy-to-real species migration, plus a local-safe CrazyGames SDK v3 adapter
- GPT Image 2.0-generated runtime art documented in [`Docs/Asset-Manifest.md`](Docs/Asset-Manifest.md)

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

Product, scope, balance, algorithms, learning design, and acceptance criteria live in [`Docs/Game-Brief.md`](Docs/Game-Brief.md). The assessment-ready design, testing, and reflection portfolio is in [`Docs/Assessment-Report.md`](Docs/Assessment-Report.md).
