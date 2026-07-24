# FSHING

FSHING is a single-player, side-on 2D fishing delivery game for desktop and mobile browsers. Pilot a weathered boat along one horizontally scrolling lake between Brindle Harbor and Gloam Ferry, drop a hook through a playable underwater cutaway, and deliver the requested catch before it spoils. Fog, rocks, hull damage, and night visibility make speed a risk.

The MVP vertical slice includes:

- Deterministic fixed-step horizontal boat, fishing, contract, freshness, hazard, weather, and day/night simulation
- One connected lake, two harbors, three fish, three fishing grounds, repeatable contracts, upgrades, repair, rescue, and permit progression
- Keyboard, pointer, and touch controls plus pause-on-focus-loss
- Mute, volume, high-contrast, and reduced-motion settings
- Versioned validated persistence with a local-safe CrazyGames SDK v3 adapter
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

Product, scope, balance, and slice acceptance criteria live in [`Docs/Game-Brief.md`](Docs/Game-Brief.md).
