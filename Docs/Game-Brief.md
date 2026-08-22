# FSHING — game brief

This brief is the product source of truth. It describes the playable game in `v0.7.0` (build label `v0.7.0 (PR #111)`), not leftover simulation APIs.

FSHING is a single-player side-on fishing market game for desktop and mobile browsers. The player pilots a working boat across a lake, and later an unlockable Beach, then sells catches at two harbors whose prices move each in-game day.

## Core loop

1. Dock at a harbor and open the **Fish market**.
2. Inspect a discovered species, read today's local quote and its seven-day graph, then **Track** it.
3. Sail to that species' fishing ground. Slow down until the hook cue appears, then drop the line.
4. Steer the hook onto a reachable fish. Hold left click on the water (or touch / the Reel key) while the fish is calm to pull it closer. When it races away, release so it can take line — that is what drops tension. Reeling against a run turns the line red. Landed catches reach the boat at 100% freshness.
5. Freshness falls while the simulation is running. Dock at the harbor that currently pays more and sell every fresh catch of that species.
6. Spend shells on cargo, engine, line, boost, or Beach access. Line upgrades unlock the middle and far-right grounds at world-specific tiers.

A new save starts docked at Brindle Harbor on the lake with Bluegill already discovered. The first run is a four-step **First Assignment** that walks through inspect → track → catch → sell. Each tutorial pill includes a short instruction that changes with the player's current screen. During the catch the title first shows **Let it run**, then switches to **Hold left click** in the first lull, explains that a racing fish slacks the line, and toasts if the player horses a run, never reels a lull, or rests too long. The sale ends that assignment. When the player can afford a dock upgrade, a second tutorial walks through Upgrades.

After eight market sales the game shows a season report, then returns to the same market. Trading does not stop.

```text
Market → Track → Sail → Fish → Reel → Sell while fresh → Upgrade → Market
```

## Screens

| Screen | How it opens | What it contains |
| --- | --- | --- |
| Title | Launch, or Title screen from pause | Wordmark, Play, Settings, Credits, `v0.7.0 (PR #111)` |
| Harbor | Play from a docked start, or docking | Market / Cargo / Upgrades tabs, shell balance, Help, Return to Lake or Beach |
| Market detail | Selecting a discovered listing | Species art, current-harbor price, Track, Sell, 7-day graph |
| Pause | Escape or Pause on the water | Resume, Settings, How to play, Title screen |
| Settings | Title or pause | Mute, volume, high contrast, reduced motion, Controls, Reset save |
| Controls | Settings | Seven remappable actions, Reset defaults |
| Credits | Title | Liam, Saxon, Harrison, David |
| How to play | Harbor Help or pause | Four cards: read the market, track and catch, catch and protect, sell and invest |
| Season report | Eighth market sale | Discoveries, sales, earnings, market day, Continue trading |

There is no field guide, no title How to play button, no on-water money HUD, and no on-screen movement pads.

On-water chrome is the night moon indicator, the boost gauge after unlock, the context action (dock or drop line), toasts, the sale popup, the colour of the fishing line during a fight, and the tutorial pill until it is finished or skipped. A destination badge on the canvas points at the current market, fishing ground, or sell harbor. Screen-reader status repeats that guidance. After the first assignment, that badge is hidden unless a fish is tracked.

Scene changes between title, harbor, and the water use a waterline cover/reveal.

## Worlds

The same two harbors and three fishing-spot IDs exist in both worlds. Reloading always restores the lake, docked at Brindle. World, cargo, boat pose, damage, boost heat, and time of day are not saved.

### Lake

Side-on freshwater chart with Brindle Harbor at the left and Gloam Ferry at the right. Three regions tint the water: Brindle Coast, Mosswater Reach, Violet Gloam.

### Beach

Paid unlock (300 shells) from Upgrades. Travel is immediate and undocks the boat. The Beach reuses lake spot names and layout, and swaps panorama, pier, underwater paintings, fish, and market art.

| Spot id | Display name | x | Lake line | Beach line | Lake residents | Beach residents |
| --- | --- | --- | --- | --- | --- | --- |
| `sunwardShoal` | Sunward Shoal | 0.18 | 0 | 0 | Bluegill, Yellow Perch, Emerald Shiner, White Sucker | Sea Mullet, Yellowfin Bream, Sand Whiting |
| `mosswaterPool` | Mosswater Pool | 0.50 | 1 | 3 | Longnose Gar, Northern Pike, Largemouth Bass, Bowfin | Dusky Flathead, Luderick, Eastern Australian Salmon |
| `outerGloam` | Outer Gloam | 0.82 | 3 | 4 | Lake Trout, Burbot, Lake Sturgeon | Snapper, Yellowtail Kingfish, Mulloway |

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
| Emerald Shiner | Lake | Sunward Shoal | 1 | uncommon | 40 |
| White Sucker | Lake | Sunward Shoal | 2 | uncommon | 58 |
| Longnose Gar | Lake | Mosswater Pool | 1 | uncommon | 46 |
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

Availability sets the baseline number of each resident while fishing: abundant 3, normal 2, scarce 1. The final catchable population is normally tuned to 70% of the viewport-capacity result, accounting for both screen area and rendered fish size; Lake Mosswater Pool uses 100% because its larger silhouettes and layered vegetation otherwise leave the upgraded ground visibly sparse. Larger windows still show more fish after sprites approach their size cap, while compact screens reduce crowding without removing any resident species. Fish use low-discrepancy vertical spacing across their habitat-appropriate depth band rather than collecting on one horizontal shelf. Longnose Gar occupy Mosswater's 0.09–0.16 surface band and remain reachable as soon as the spot unlocks at line tier 1. At Sunward Shoal, Emerald Shiners occupy 0.335–0.405 fishing depth, entirely below the starter line and reachable at line tier 1. White Suckers occupy the deeper 0.465–0.535 bottom band and become reachable at line tier 2. Fish are dimmed and blocked according to their actual swimming position relative to the line limit, so a higher-tier species that swims above the boundary remains fully visible and catchable. Condition names are not shown in the harbor UI.

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
| Landing / exit duration | 1.15 | seconds |
| Critical line tension | 90% | tension threshold |
| Break grace | 0.7 | seconds continuously at critical tension |
| Line strength per tier | +12% | tension resistance |
| Reel speed per tier | +12% | progress while actively reeling; five-tier cap |
| Hook-up opening run | 0.65 | seconds of immediate escape before the first lull |
| Dive duration | 0.85 | seconds |
| Day length | 210 | seconds |
| Night start | 140 | seconds into the day |
| Night fade | 25 | seconds |

Hook depth is `min(0.94, 0.3 + lineTier × 0.125)`. Fish whose current position is below the line limit are visible and dimmed but cannot be hooked. Escape while fishing reels the empty line and returns to sailing; it does not pause.

Hooking a fish begins a deterministic line fight built from fish behaviour, not a generic hold-to-fill meter. Holding the primary mouse button directly on the fishing canvas reels; touch hold and the remappable Reel key remain equivalent accessibility inputs. Every hook-up opens with a smoothly ramped 0.65-second escape run, followed by the first calm reeling window, then cycles through calm lulls, runs, and short thrashes. Reeling during a lull gains ground at modest tension and tires the fish. Reeling against a run loads the line fast. Releasing during a run lets the fish take line, slip farther from the boat, and drop tension. Waiting through a lull barely slacks the line and does not tire the fish. Tired fish stop running and become easier to land. There is no on-water fight HUD. Line tension is shown by the hook line itself: cream when safe, amber as it tightens, red at the 90% critical threshold, and slightly thicker as strain rises. The hooked fish follows a continuous velocity-limited path; it accelerates, turns, rolls, rises, or dives instead of receiving discrete random displacement impulses. Reduced motion holds the fight offset still. Non-colour feedback remains: the tutorial title, toasts, sound, vibration, live-region copy, and the canvas `aria-label`. The hooked fish is drawn over the lower hook so only the eye and line stay visible. There is no separate on-screen Reel button.

Reel power has five purchasable tiers. Each tier multiplies reel progress by another 12%, reaching 1.60× at tier 5 without changing fish stamina, line tension, run timing, or release physics.

During a fight, every non-hooked fish keeps swimming and animating as a clearly visible dark silhouette at 68% opacity. Tracked-fish outlines, chevrons, tutorial hook arrows, and the large species portrait are hidden until the fight ends so the hooked fish remains the sole visual focus. Tension can only rise while the hooked fish is actively running or thrashing; calm reeling cools the line slightly. Keeping tension at or above 90% for 0.7 seconds breaks the line, returns the hook to the top, and leaves the player at the same fishing ground for an immediate retry. It does not remove cargo or money.

The Lake's three Sunward Shoal fish are intentionally forgiving starters. Their weak runs create proportionally low tension, and Bluegill, Yellow Perch, and Emerald Shiner can all be landed with a steady continuous reel even if a new player misses the release cue. Later fish still require deliberate reel-and-release control.

Rarity sets the base meter rates, but each species supplies its own researched timing, movement, and resistance profile. Bluegill kick and glide; Pike and Flathead wait then surge; Bass rises into an acrobatic thrash; Bowfin and Luderick roll; Trout, Snapper, Kingfish, Sturgeon, and Mulloway make increasingly sustained deep or long runs; and Burbot writhes close to the bottom. Line tiers reduce tension gain by 12% per tier as well as extending maximum depth. Giving line has the same slack physics at every tier. A cue-following reference strategy lands beginner fish in roughly 4–5 seconds, most mid-tier fish in 7–16 seconds, Kingfish and Sturgeon in about 21 seconds, and Mulloway in about 27 seconds. After reel progress fills, the existing 1.15-second landing transition completes the catch.

Each species has a deterministic swim gait. Free-swimming targets ease toward their desired horizontal speed and depth with bounded acceleration, so even burst swimmers glide between states instead of changing position or velocity abruptly. The tracked species gets a rarity outline, a hook-guidance cue, and a named specimen portrait while steering, but only when that fish lives at the current site. Those targeting cues hide during a fight. Nothing is highlighted while no fish is tracked. The evidence and species-by-species gameplay translation are recorded in [`Docs/Fish-Behaviour-Research.md`](Fish-Behaviour-Research.md).

## Upgrades

Costs are `base + currentTier × 55` shells.

| Upgrade | Base | Cap | Player-facing effect |
| --- | --- | --- | --- |
| Cargo | 60 | 7 | +1 slot per tier. Start 3, max 10 |
| Engine | 70 | 6 | Faster travel, so less freshness loss |
| Fishing line | 55 | 6 | Deeper hook limit and +12% fight strength per tier. Lake: middle tier 1, far right tier 3. Beach: middle tier 3, far right tier 4 |
| Reel power | 65 | 5 | +12% reel speed per tier; 1.60× at tier 5 |
| Engine boost | 250 | one-time | Hold Boost while moving. Overheats, then cools |
| Beach | 300 | one-time | Unlock travel to the coastal map |

Cargo, Engine, Line depth, and Reel power form a compact vertical stack of full-width equipment rows. Beach and Engine boost remain two compressed feature cards side by side beneath them. The full upgrade menu fits without an internal scrollbar at supported desktop and mobile viewports. Reel power uses a CSS-drawn spool-and-handle pictogram that matches the existing harbor equipment icon treatment without adding another runtime asset.

Boat class names (Skiff through Lakebreaker) exist in balance data and are not shown in the harbor UI. Repair is not sold. The hull starts at 18 damage; reaching 100 damage would rescue to the nearest harbor, charge up to 20 shells, and dump cargo, but nothing in the live loop applies collision damage.

Cargo can be released from an occupied slot. An undo toast restores that catch for a few seconds.

## First Assignment

Saved as `marketTutorialStep`. Skip is always available. The prompt is a top-centre pill: step number, a small **Tutorial** label, a short action title, and a close control. One target at a time gets the amber glow. Lake arrows mark the route while travelling; a hook arrow leads to Bluegill while fishing.

| Step | Prompt |
| --- | --- |
| 1 of 4 | Choose Bluegill |
| 2 of 4 | Track the catch |
| 3 of 4 | Catch a Bluegill at Sunward Shoal; after hook-up the title becomes **Let it run**, then **Hold left click** when the fish first calms |
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
| Interact / reel | E | Dock or drop the line; keyboard fallback for holding and releasing the reel |
| Pause | P | Pause or resume on the water |

Escape always pauses on the water, and always leaves fishing. Occupied rebinds swap. Pointer and touch operate menus, the dock/fish context button, cargo release, and direct hold-to-reel input on the fishing canvas. There are no on-screen movement or Reel buttons.

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
- Line strain uses line thickness, tutorial and toast wording, sound, vibration, and a live-region warning rather than colour alone

The in-fishing “W A S D MOVE HOOK” cue presents all four movement keys in one horizontal row. It is hardcoded and does not follow rebinds.

## Persistence

Save key `gamecomp-new.save`. Schema version **12**. Storage is CrazyGames `sdk.data` when the SDK initializes, otherwise `localStorage`. Malformed JSON becomes a new save.

Saved: money, upgrade tiers, beach/boost unlocks, discovered species, market day/sales/earnings/target, first-assignment and upgrade tutorial steps, season-complete flag, leftover learning counters, and settings (mute, volume, contrast, reduced motion, bindings). Version 12 adds a validated Reel power tier defaulting to zero, ignores the retired `outerUnlocked` field from older saves, and preserves existing line tiers against the current world's spot requirements.

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
| `src/game/fishingMovement.ts` / `fishingBehaviour.ts` / `fishingFight.ts` / `fishingPresentation.ts` / `fishingReeling.ts` | Underwater motion, researched species profiles, deterministic line fights, and camera |
| `src/game/fishingSpotEffects.ts` / `surfaceEffects.ts` / `boatSteam.ts` | Surface presentation |
| `src/game/objectiveIndicator.ts` | Destination badge layout |
| `src/game/quest.ts` | First-assignment and upgrade tutorial presentation |
| `src/game/stem.ts` | Habitat readings and leftover survey/route helpers |
| `src/services/saveGame.ts` | Version 12 validation and migration |
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
- Market lists eleven Lake species or nine Beach species, with undiscovered cards locked
- Quotes differ by harbor and day, and selling pays freshness-adjusted shells
- Line tier gates the Lake middle/right spots at tiers 1/3 and the Beach middle/right spots at tiers 3/4
- Beach unlock swaps coastal fish and art, then travel returns to the lake
- Keyboard sailing, hook steering, pause, mute, high contrast, and reduced motion work
- Reloading keeps money, unlocks, discoveries, tutorial completion, and settings
- Local play still works with the CrazyGames SDK blocked
