# FSHING

FSHING is a single-player, side-on environmental-science fishing and delivery game for desktop and mobile browsers. Pilot a research boat across three lake ecosystems, target requested species, fish at an upgrade-gated depth, and cross the lake efficiently while preserving catch freshness.

The MVP vertical slice includes:

- Deterministic fixed-step boat, fishing, contract, freshness, weather, and day/night simulation
- An unobstructed lake spanning several camera widths with two harbors, three regions, three widely separated fishing grounds, and nine distinct fish arranged into habitat-specific resident sets
- Habitat-specific resident species and environmental surveys
- Catch-to-harbor distance–speed–time route planning with predicted-versus-actual freshness feedback
- Six tiers each of boat/cargo, engine, lamp, and line upgrades; seven visible boat classes
- Cargo release, guided help, and an eight-delivery season report
- Keyboard, pointer, and touch controls plus pause-on-focus-loss
- Mute, volume, high-contrast, and reduced-motion settings
- Version 8 validated persistence with safe migration and a local-safe CrazyGames SDK v3 adapter
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
