# FSHING — game brief

This brief is the product source of truth. It describes the playable game in `v0.4.3` (build label `v0.4.3 (PR #85)`), not leftover simulation APIs.

FSHING is a single-player side-on fishing market game for desktop and mobile browsers. The player pilots a working boat across a lake, and later an unlockable Beach, then sells catches at two harbors whose prices move each in-game day.

## Core loop

1. Dock at a harbor and open the **Fish market**.
2. Inspect a discovered species, read today's local quote and its seven-day graph, then **Track** it.
3. Sail to that species' fishing ground. Slow down until the hook cue appears, then drop the line.
4. Steer the hook onto a reachable fish. A catch is reeled to the boat at 100% freshness.
5. Freshness falls while the simulation is running. Dock at the harbor that currently pays more and sell every fresh catch of that species.
6. Spend shells on cargo, engine, line, boost, the Outer Gloam permit, or Beach access.

A new save starts docked at Brindle Harbor on the lake with Bluegill already discovered. The first run is a four-step **First Assignment** that walks through inspect → track → catch → sell. The sale ends that assignment. When the player can afford a dock upgrade, a second tutorial walks through Upgrades.

After eight market sales the game shows a season report, then returns to the same market. Trading does not stop.

```text
Market → Track → Sail → Fish → Reel → Sell while fresh → Upgrade → Market
```

## Screens

| Screen | How it opens | What it contains |
| --- | --- | --- |
| Title | Launch, or Title screen from pause | Wordmark, Play, Settings, Credits, `v0.4.3 (PR #85)` |
| Harbor | Play from a docked start, or docking | Market / Cargo / Upgrades tabs, shell balance, Help, Return to Lake or Beach |
| Market detail | Selecting a discovered listing | Species art, current-harbor price, Track, Sell, 7-day graph |
| Pause | Escape or Pause on the water | Resume, Settings, How to play, Title screen |
| Settings | Title or pause | Mute, volume, high contrast, reduced motion, Controls, Reset save |
| Controls | Settings | Seven remappable actions, Reset defaults |
| Credits | Title | Liam, Saxon, Harrison, David |
| How to play | Harbor Help or pause | Four cards: read the market, track and catch, catch and protect, sell and invest |
| Season report | Eighth market sale | Discoveries, sales, earnings, market day, Continue trading |

There is no field guide, no title How to play button, no on-water money HUD, and no on-screen movement pads.

On-water chrome is the night moon indicator, the boost gauge after unlock, the context action (dock or drop line), toasts, the sale popup, and the tutorial pill until it is finished or skipped. A destination badge on the canvas points at the current market, fishing ground, or sell harbor. Screen-reader status repeats that guidance. After the first assignment, that badge is hidden unless a fish is tracked.

Scene changes between title, harbor, and the water use a waterline cover/reveal.

## Worlds

The same two harbors and three fishing-spot IDs exist in both worlds. Reloading always restores the lake, docked at Brindle. World, cargo, boat pose, damage, boost heat, and time of day are not saved.

### Lake

Side-on freshwater chart with Brindle Harbor at the left and Gloam Ferry at the right. Three regions tint the water: Brindle Coast, Mosswater Reach, Violet Gloam.

### Beach

Paid unlock (120 shells) from Upgrades. Travel is immediate and undocks the boat. The Beach reuses lake spot names and layout, and swaps panorama, pier, underwater paintings, fish, and market art.

| Spot id | Display name | x | Line tier | Permit | Lake residents | Beach residents |
| --- | --- | --- | --- | --- | --- | --- |
| `sunwardShoal` | Sunward Shoal | 0.18 | 0 | no | Bluegill, Yellow Perch, Emerald Shiner | Sea Mullet, Yellowfin Bream, Sand Whiting |
| `mosswaterPool` | Mosswater Pool | 0.50 | 1 | no | Northern Pike, Largemouth Bass, Bowfin | Dusky Flathead, Luderick, Eastern Australian Salmon |
| `outerGloam` | Outer Gloam | 0.82 | 3 | yes | Lake Trout, Burbot, Lake Sturgeon | Snapper, Yellowtail Kingfish, Mulloway |

Outer Gloam also requires the Outer permit (85 shells, sold only at Gloam Ferry).

Harbors:

| Id | Name | World x | Undock spawn |
| --- | --- | --- | --- |
| `brindle` | Brindle Harbor | 0.055 | x 0.11, facing right |
| `gloam` | Gloam Ferry | 0.945 | x 0.89, facing left |

Dock and fish interaction radius is 0.027 world units. The boat must be at or below 0.026 speed to dock or drop a line.

## Species and whole-fish values

Depth tier is the primary price driver. Rarity separates fish that share a depth. Beach peers sit about 20% above their lake counterparts.

| Species | World | Spot | Depth | Rarity | Value |
| --- | --- | --- | --- | --- | ---: |
| Bluegill | Lake | Sunward Shoal | 0 | common | 18 |
| Yellow Perch | Lake | Sunward Shoal | 0 | common | 22 |
| Emerald Shiner | Lake | Sunward Shoal | 0 | uncommon | 28 |
| Northern Pike | Lake | Mosswater Pool | 1 | uncommon | 40 |
| Largemouth Bass | Lake | Mosswater Pool | 2 | uncommon | 52 |
| Bowfin | Lake | Mosswater Pool | 2 | rare | 64 |
| Lake Trout | Lake | Outer Gloam | 3 | rare | 80 |
| Burbot | Lake | Outer Gloam | 4 | rare | 100 |
| Lake Sturgeon | Lake | Outer Gloam | 5 | legendary | 130 |
| Sea Mullet | Beach | Sunward Shoal | 0 | common | 22 |
| Yellowfin Bream | Beach | Sunward Shoal | 0 | common | 26 |
| Sand Whiting | Beach | Sunward Shoal | 0 | uncommon | 34 |
| Dusky Flathead | Beach | Mosswater Pool | 1 | uncommon | 48 |
| Luderick | Beach | Mosswater Pool | 2 | uncommon | 62 |
| Eastern Australian Salmon | Beach | Mosswater Pool | 2 | rare | 76 |
| Snapper | Beach | Outer Gloam | 3 | rare | 96 |
| Yellowtail Kingfish | Beach | Outer Gloam | 4 | rare | 120 |
| Mulloway | Beach | Outer Gloam | 5 | legendary | 156 |

Locked market cards stay darkened with a `?` until the species is discovered. Bluegill is always discovered. Catching a species discovers it.

## Market

Each harbor has a seeded daily quote per species. The simulation seed is 7. A market day lasts 210 seconds of simulation time. Quotes never jump more than 6% from the previous day.

Sale payout for one catch:

```text
if freshness <= 0: 0
else: max(1, round(quote × (0.25 + 0.75 × freshness / 100)))
```

Selling a listing sells every fresh catch of that species at the current harbor. Spoiled fish stay in cargo until released.

The detail view shows the **docked harbor's** price, trend, and seven-day graph. Hovering a graph point shows that day's price as a number. It does not list the other harbor. After a tracked catch, on-water guidance points at whichever harbor currently quotes higher.

Hidden market conditions still change quotes, availability, and fog math:

| Condition | Effect |
| --- | --- |
| Clear water | Mostly normal supply |
| Warm shallows | Shallow fish abundant, deep fish scarce |
| Cold current | Deep fish abundant, shallow fish scarce |
| Fog banks | Slight price lift and tighter supply |

Availability sets how many of each resident spawn while fishing: abundant 3, normal 2, scarce 1. Condition names are not shown in the harbor UI.

## Sailing and fishing

Simulation step is `1/120` s. Gameplay RNG is seeded. The boat travels only on the horizontal surface.

| Rule | Value | Unit |
| --- | --- | --- |
| Horizontal thrust | 0.034 | world units / s² |
| Water drag when idle | 0.62 | per second |
| Brake while reversing | 1.15× thrust (1.25× during boost) | multiplier |
| Base max speed | 0.05 | world units / s |
| Engine speed per tier | +11% | tiers 1–5 |
| Engine tier 6 | 1.95× | hard cap |
| Boost speed | 1.35× | while active |
| Boost thrust | 1.75× | while active |
| Boost heat | 8 s to overheat, 10 s to cool, recover at 25% | seconds |
| Camera view width | 0.30 world (1.18× while boosting, unless reduced motion) | world width |
| Freshness lifetime | 150 | seconds from 100% to 0% |
| Catch radius | 0.058 | fishing space |
| Hook speeds | 0.25 horizontal, 0.35 up, 0.25 down | fishing space / s |
| Reel / exit duration | 1.15 | seconds |
| Dive duration | 0.85 | seconds |
| Day length | 210 | seconds |
| Night start | 140 | seconds into the day |
| Night fade | 25 | seconds |

Hook depth is `min(0.94, 0.3 + lineTier × 0.125)`. Fish below the line limit are visible and dimmed but cannot be hooked. Escape while fishing reels the empty line and returns to sailing; it does not pause.

Each species has a deterministic swim gait. The tracked species gets a rarity outline, a hook-guidance cue, and a named specimen in the fishing HUD, but only when that fish lives at the current site. Nothing is highlighted while no fish is tracked.

## Upgrades

Costs are `base + currentTier × 55` shells.

| Upgrade | Base | Cap | Player-facing effect |
| --- | --- | --- | --- |
| Cargo | 60 | 7 | +1 slot per tier. Start 3, max 10 |
| Engine | 70 | 6 | Faster travel, so less freshness loss |
| Line depth | 55 | 6 | Deeper hook limit; Mosswater needs tier 1, Outer Gloam needs tier 3 |
| Engine boost | 300 | one-time | Hold Boost while moving. Overheats, then cools |
| Beach | 120 | one-time | Unlock travel to the coastal map |
| Outer permit | 85 | one-time | Outer Gloam access. Gloam Ferry only |

Cargo, Engine, and Line depth are stacked vertically as compact tier cards. Beach and Engine boost are presented as two larger feature cards side by side beneath them. Each uses a unique generated pictogram matching the rest of the harbor icon set so the destination and ability read distinctly at a glance.

Boat class names (Skiff through Lakebreaker) exist in balance data and are not shown in the harbor UI. Repair is not sold. The hull starts at 18 damage; reaching 100 damage would rescue to the nearest harbor, charge up to 20 shells, and dump cargo, but nothing in the live loop applies collision damage.

Cargo can be released from an occupied slot. An undo toast restores that catch for a few seconds.

## First Assignment

Saved as `marketTutorialStep`. Skip is always available. The prompt is a top-centre pill: step number, a small **Tutorial** label, a short action title, and a close control. One target at a time gets the amber glow. Lake arrows mark the route while travelling; a hook arrow leads to Bluegill while fishing.

| Step | Prompt |
| --- | --- |
| 1 of 4 | Choose Bluegill |
| 2 of 4 | Track the catch |
| 3 of 4 | Catch a Bluegill at Sunward Shoal |
| 4 of 4 | Sell while fresh |

The sale ends the assignment. Older saves with `completedContracts > 0` or leftover `complete` load as `done`.

If the player returns from the Bluegill detail before tracking it, the assignment returns to **Choose Bluegill** so the visible directions always match the available action. Untracking Bluegill before catching it likewise returns the assignment to **Track the catch**.

When the player can afford the cheapest dock upgrade (Line depth at 55 shells), `upgradeTutorialStep` opens a second five-step pill: **Open upgrades**, **Buy line depth**, **Return to lake**, **Sail to Mosswater**, then **Drop the line** at Mosswater Pool. The final three steps demonstrate that line tier 1 unlocks fishing at the middle spot. Closing the pill skips only this lesson. Settings **Reset save** asks for confirmation, clears progress, and stays on Settings.

## Controls

Defaults:

| Action | Key | Use |
| --- | --- | --- |
| Travel left | A | Sail or steer the hook left |
| Travel right | D | Sail or steer the hook right |
| Hook up | W | Steer the hook up |
| Hook down | S | Steer the hook down |
| Boost | Left Shift | Hold while sailing after unlock |
| Interact | E | Dock or drop the line |
| Pause | P | Pause or resume on the water |

Escape always pauses on the water, and always leaves fishing. Occupied rebinds swap. Pointer and touch operate menus, the dock/fish context button, and cargo release. There are no on-screen movement buttons.

Development shortcuts: `B` grants a temporary boost. In `npm run dev`, `G` jumps to dusk and `H` jumps to full night.

## Accessibility

- Mute and volume (synthesized audio only; no bundled music)
- High contrast: stronger shoals and outlines
- Reduced motion: skips decorative pulses, menu/scene motion, boost camera pull, and fish body flex. Gameplay movement remains
- Pause when the window blurs or the tab hides
- Keyboard menus with focus outlines
- Live regions for toasts, sales, tutorial, and navigation
- Fishing canvas `aria-label` includes the site, and the tracked target and rarity when a fish is tracked
- Locked market cards and disabled actions have text, not colour alone

The in-fishing “W A S D MOVE HOOK” cue presents all four movement keys in one horizontal row. It is hardcoded and does not follow rebinds.

## Persistence

Save key `gamecomp-new.save`. Schema version **10**. Storage is CrazyGames `sdk.data` when the SDK initializes, otherwise `localStorage`. Malformed JSON becomes a new save.

Saved: money, upgrade tiers, outer/beach/boost unlocks, discovered species, market day/sales/earnings/target, first-assignment and upgrade tutorial steps, season-complete flag, leftover learning counters, and settings (mute, volume, contrast, reduced motion, bindings).

Not saved: world, cargo, elapsed time, boat pose, damage, boost heat, docked harbor.

Migrations still map retired fantasy ids and clamp every numeric field:

| Retired id | Current species |
| --- | --- |
| `reedfin` | Bluegill |
| `sunPerch` | Yellow Perch |
| `silverDart` | Emerald Shiner |
| `needlePike` | Northern Pike |
| `mossback` | Largemouth Bass |
| `lanternEel` | Bowfin |
| `gloamGill` | Lake Trout |
| `violetRay` | Burbot |
| `abyssCrown` | Lake Sturgeon |

CrazyGames HTML5 SDK v3 is loaded from the page. Local play works if the script fails. Platform calls stay in `PlatformService`.

## Architecture

| Module | Responsibility |
| --- | --- |
| `src/main.ts` | Startup and wiring |
| `src/game/Game.ts` | Lifecycle, overlays, HUD, save, feedback |
| `src/game/simulation.ts` | Fixed-step world state and rules |
| `src/game/balance.ts` | Species, spots, harbors, costs, motion constants |
| `src/game/market.ts` | Quotes, history, sale math |
| `src/game/marketView.ts` | Market HTML |
| `src/game/renderer.ts` | Canvas draw only |
| `src/game/input.ts` / `controls.ts` | Browser input and remapping |
| `src/game/camera.ts` / `panorama.ts` | Surface framing |
| `src/game/fishingMovement.ts` / `fishingPresentation.ts` / `fishingReeling.ts` | Underwater motion and camera |
| `src/game/fishingSpotEffects.ts` / `surfaceEffects.ts` / `boatSteam.ts` | Surface presentation |
| `src/game/objectiveIndicator.ts` | Destination badge layout |
| `src/game/quest.ts` | First-assignment and upgrade tutorial presentation |
| `src/game/stem.ts` | Habitat readings and leftover survey/route helpers |
| `src/services/saveGame.ts` | Version 10 validation and migration |
| `src/services/platformService.ts` | CrazyGames boundary |
| `src/services/feedbackService.ts` | Synthesized audio and optional vibration |

Balance numbers live in `src/game/balance.ts`. Runtime art is listed in [`Asset-Manifest.md`](Asset-Manifest.md).

## Present in code, not in the player-facing game

These still compile and some still have unit tests. The overlays never call them:

- Delivery contracts, accept/deliver, and safe/fast route choice
- Water-survey prediction UI
- Field guide
- Repair purchases
- Boat class names in the harbor
- Fog intensity as a drawn effect
- Market condition names on the board

Do not document or implement against those as live features unless a later change wires them into `Game.ts`.

## Acceptance

A build matches this brief when:

- Title shows Play, Settings, Credits, and `vX.Y.Z (PR #N)`
- A new save can complete First Assignment: inspect Bluegill, track, catch at Sunward Shoal, sell
- Market lists nine species for the current world, with undiscovered cards locked
- Quotes differ by harbor and day, and selling pays freshness-adjusted shells
- Line tier and Outer permit gate Mosswater Pool and Outer Gloam
- Beach unlock swaps coastal fish and art, then travel returns to the lake
- Keyboard sailing, hook steering, pause, mute, high contrast, and reduced motion work
- Reloading keeps money, unlocks, discoveries, tutorial completion, and settings
- Local play still works with the CrazyGames SDK blocked
