# FSHING — game brief

This brief is the product source of truth. It describes the playable game in `v0.9.0` (build label `v0.9.0 (PR #114)`), not leftover simulation APIs.

FSHING is a single-player side-on fishing market game for desktop and mobile browsers. The player pilots a working boat across a lake, an unlockable Beach, and a working offshore Oil Rig route, then sells catches at two harbors whose prices move each in-game day.

## Core loop

1. Dock at a harbor and open the **Fish market**.
2. Inspect a discovered species, read today's local quote and its seven-day graph, then **Track** it.
3. Sail to that species' fishing ground. Slow down until the hook cue appears, then drop the line.
4. Steer the hook onto a reachable fish. Hold left click on the water (or touch / the Reel key) while the fish is calm to pull it closer. When it races away, release so it can take line — that is what drops tension. Reeling against a run turns the line red. Landed catches are stored in cargo until sold or released.
5. Dock at the harbor that currently pays more and sell every catch of that species for the displayed quote.
6. Spend shells on cargo, engine, line, or boost, unlock Beach, and sail between Lake, Beach, and Oil Rig from the dockside **Departures** board. Line upgrades unlock grounds at world-specific tiers.

A new save starts docked at Brindle Harbor on the lake with Bluegill already discovered. The first run is a four-step **First Assignment** that walks through inspect → track → catch → sell. Each tutorial pill includes a short instruction that changes with the player's current screen. During the catch the title first shows **Let it run**, then switches to **Hold left click** in the first lull, explains that a racing fish slacks the line, and toasts if the player horses a run, never reels a lull, or rests too long. The sale ends that assignment. When the player can afford a dock upgrade, a second tutorial walks through Upgrades.

```text
Market → Track → Sail → Fish → Reel → Sell → Upgrade → Market
```

## Screens

| Screen | How it opens | What it contains |
| --- | --- | --- |
| Title | Launch, or Title screen from pause | Wordmark, Play, Settings, Credits, `v0.9.0 (PR #114)` |
| Harbor | Play from a docked start, or docking | Market / Cargo / Upgrades tabs, shell balance, Help, Return to the current world, and a wooden Departures board for world travel |
| Market detail | Selecting a discovered listing | Species art, current-harbor price, Track, Sell, 7-day graph |
| Pause | Escape or Pause on the water | Resume, Settings, How to play, Title screen |
| Settings | Title or pause | General, Audio, and Controls tabs; accessibility, save, and sound preferences |
| Settings · Audio | Audio tab | Mute plus separate music and sound-effects volume sliders |
| Settings · Controls | Controls tab | Seven remappable actions shown directly, Reset defaults |
| Credits | Title | Liam, Saxon, Harrison, David |
| How to play | Harbor Help or pause | Four cards: read the market, track and catch, manage cargo, sell and invest |
There is no field guide, no title How to play button, no on-water money HUD, and no on-screen movement pads.

On-water chrome is the night moon indicator, the boost gauge after unlock, the context action (dock or drop line), toasts, the sale popup, the colour of the fishing line during a fight, and the tutorial pill until it is finished or skipped. A destination badge on the canvas points at the current market, fishing ground, or sell harbor. Screen-reader status repeats that guidance. After the first assignment, that badge is hidden unless a fish is tracked.

Scene changes between title, harbor, and the water use a waterline cover/reveal.

The shared surface boat is optically seated with 18% of its rendered hull below the active panorama waterline. Bobbing is applied around that seated position so the hull never appears to hover above a calm horizon.

The title sky periodically carries a flock of two to five animated seagulls. Each flock may cross in either direction, while individual birds vary their size, launch delay, flap phase, speed, and curved vertical drift so the formation stays loose and natural. Decorative flights are omitted when reduced motion is enabled, and are cleared and rescheduled when the page loses and regains focus so background tabs cannot accumulate flocks.

## Worlds

All worlds share the two harbor IDs and stable fishing-spot IDs. Lake and Beach expose three grounds; Oil Rig exposes only two. Reloading always restores the lake, docked at Brindle. World, cargo, boat pose, damage, boost heat, and time of day are not saved.

### Lake

Side-on freshwater chart with Brindle Harbor at the left and Gloam Ferry at the right. Three regions tint the water: Brindle Coast, Mosswater Reach, Violet Gloam.

### Beach

Paid unlock (300 shells) from the dockside Departures board. Travel is immediate and undocks the boat. The Beach reuses lake spot names and layout, and swaps panorama, pier, underwater paintings, fish, and market art.

### Oil Rig

Free live route from every other world's Departures board. The wide authored day/night panorama places the fixed platform at the far-left Dogwatch Rig harbor, with the dog safely standing on the lower service deck beneath the main rig, and Beacon Mooring at the far right. The rig does not use the generated shoreline-pier overlay because its service dock is painted into the panorama.

Dogwatch and Beacon dock screens reuse the Oil Rig chart but focus its left and right ends respectively. Surface fishing cues remain subdued over the spill and brighten in the clean bluewater, matching the two underwater scenes. If the unfinished Bluegill tutorial reaches Oil Rig without a tracked target, its card and route marker lead the player to a rig dock and the Lake departure instead of pointing at an unavailable Bluegill listing.

Oil Rig has exactly two fishing grounds:

| Spot id | Display name | x | Line tier | Water | Residents |
| --- | --- | ---: | ---: | --- | --- |
| `sunwardShoal` | Spillwater Slick | 0.18 | 3 | Localized surface oil, fouled pilings, dim green-brown water | Atlantic Spadefish, Sheepshead, Gray Triggerfish |
| `outerGloam` | Bluewater Drop | 0.82 | 4 | Clear offshore blue water beyond the platform | Cobia, Greater Amberjack, Atlantic Mahi-Mahi |

`mosswaterPool` remains a stable internal ID for save and shared-layout compatibility but is inactive in this world. Spillwater residents occupy stepped depth bands: Atlantic Spadefish `0.14–0.24`, Sheepshead `0.41–0.53`, and Gray Triggerfish `0.67–0.76`. Bluewater residents use Atlantic Mahi-Mahi `0.12–0.23`, Cobia `0.42–0.55`, and Greater Amberjack `0.66–0.77`.

| Spot id | Display name | x | Lake line | Beach line | Lake residents | Beach residents |
| --- | --- | --- | --- | --- | --- | --- |
| `sunwardShoal` | Sunward Shoal | 0.18 | 0 | 0 | Bluegill, Yellow Perch, Emerald Shiner, White Sucker | Sea Mullet, Yellowfin Bream, Sand Whiting, Largetooth Flounder |
| `mosswaterPool` | Mosswater Pool | 0.50 | 1 | 3 | Longnose Gar, Northern Pike, Largemouth Bass, Bowfin | Luderick, Eastern Australian Salmon, Dusky Flathead, Estuary Perch |
| `outerGloam` | Outer Gloam | 0.82 | 3 | 4 | Cisco, Lake Trout, Burbot, Lake Sturgeon | Snapper, Yellowtail Kingfish, Mulloway |

At Lake Outer Gloam, the visible depth order is deliberately stepped: Cisco school near the top (`0.10-0.18`), Lake Trout cruise through the upper-middle (`0.25-0.39`), Burbot occupy the lower reachable water (`0.50-0.60`), and Lake Sturgeon remain below the tier-3 line until the line is upgraded further.

At Beach Outer Gloam, Snapper occupy the upper water (`0.16-0.28`), Yellowtail Kingfish cruise through the middle (`0.46-0.58`), and Mulloway retain their deep-water band below the tier-4 line.

At Beach Mosswater Pool, the diagrammed depth order is deliberately stepped: Luderick graze in the upper band (`0.14-0.26`), Eastern Australian Salmon school through open middle water (`0.34-0.46`), Dusky Flathead hold over the lower sand (`0.53-0.62`), and Estuary Perch patrol the deep bottom band (`0.71-0.77`). The ground remains gated at line tier 3; Estuary Perch become reachable at tier 4.

At Beach Sunward Shoal, residents are vertically ordered by whole-fish value: Sea Mullet school nearest the surface (`0.10-0.17`), Yellowfin Bream occupy the next band (`0.22-0.29`), Sand Whiting forage lower over sand (`0.35-0.42`), and Largetooth Flounder remain in the ultra-low bottom band (`0.72-0.79`). The flounder becomes reachable at line tier 4.

Harbors:

| Id | Name | World x | Undock spawn |
| --- | --- | --- | --- |
| `brindle` | Brindle Harbor / Dogwatch Rig at Oil Rig | 0.055 | x 0.11, facing right |
| `gloam` | Gloam Ferry / Beacon Mooring at Oil Rig | 0.945 | x 0.89, facing left |

Dock and fish interaction radius is 0.027 world units. The boat must be at or below 0.026 speed to dock or drop a line.

## Species and whole-fish values

Depth tier is the primary price driver. Rarity separates fish that share a depth. Beach peers sit about 20% above their lake counterparts. Oil Rig's deliberately high-risk/high-value roster spans exactly 90–270 shells in base whole-fish value.

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
| Cisco | Lake | Outer Gloam | 3 | uncommon | 74 |
| Lake Trout | Lake | Outer Gloam | 3 | rare | 80 |
| Burbot | Lake | Outer Gloam | 4 | rare | 100 |
| Lake Sturgeon | Lake | Outer Gloam | 5 | legendary | 130 |
| Sea Mullet | Beach | Sunward Shoal | 0 | common | 22 |
| Yellowfin Bream | Beach | Sunward Shoal | 0 | common | 26 |
| Sand Whiting | Beach | Sunward Shoal | 0 | uncommon | 34 |
| Largetooth Flounder | Beach | Sunward Shoal | 4 | rare | 112 |
| Dusky Flathead | Beach | Mosswater Pool | 1 | uncommon | 48 |
| Luderick | Beach | Mosswater Pool | 2 | uncommon | 62 |
| Eastern Australian Salmon | Beach | Mosswater Pool | 2 | rare | 76 |
| Estuary Perch | Beach | Mosswater Pool | 4 | rare | 108 |
| Snapper | Beach | Outer Gloam | 3 | rare | 96 |
| Yellowtail Kingfish | Beach | Outer Gloam | 4 | rare | 120 |
| Mulloway | Beach | Outer Gloam | 5 | legendary | 156 |
| Atlantic Spadefish | Oil Rig | Spillwater Slick | 2 | common | 90 |
| Sheepshead | Oil Rig | Spillwater Slick | 3 | uncommon | 115 |
| Gray Triggerfish | Oil Rig | Spillwater Slick | 4 | rare | 145 |
| Cobia | Oil Rig | Bluewater Drop | 4 | rare | 170 |
| Greater Amberjack | Oil Rig | Bluewater Drop | 5 | rare | 220 |
| Atlantic Mahi-Mahi | Oil Rig | Bluewater Drop | 6 | legendary | 270 |

Locked market cards stay darkened with a `?` until the species is discovered. Bluegill is always discovered. Catching a species discovers it.

## Market

Each harbor has a seeded daily quote per species. The simulation seed is 7. A market day lasts 210 seconds of simulation time. Quotes never jump more than 6% from the previous day.

Sale payout for one catch:

```text
payout = quote
```

Selling a listing sells every cargo catch of that species at the current harbor. Catches do not decay or become unsellable.

The detail view shows the **docked harbor's** price, trend, and seven-day graph. Hovering a graph point shows that day's price as a number. It does not list the other harbor. After a tracked catch, on-water guidance points at whichever harbor currently quotes higher.

Hidden market conditions still change quotes, availability, and fog math:

| Condition | Effect |
| --- | --- |
| Clear water | Mostly normal supply |
| Warm shallows | Shallow fish abundant, deep fish scarce |
| Cold current | Deep fish abundant, shallow fish scarce |
| Fog banks | Slight price lift and tighter supply |

Availability sets the baseline number of each resident while fishing: abundant 3, normal 2, scarce 1. The final catchable population is normally tuned to 70% of the viewport-capacity result, accounting for both screen area and rendered fish size. Beach Sunward Shoal uses that same 70% calculation, then adds exactly two fish across its two smallest resident schools so the water remains populated without multiplying every species independently. Larger windows still show more fish after sprites approach their size cap, while compact screens reduce crowding without removing any resident species. Fish use low-discrepancy vertical spacing across their habitat-appropriate depth band rather than collecting on one horizontal shelf. Longnose Gar occupy Mosswater's 0.09–0.16 surface band and remain reachable as soon as the spot unlocks at line tier 1. Cisco occupy Lake Outer Gloam's 0.10–0.18 top band, above Lake Trout at 0.25–0.39 and Burbot at 0.50–0.60, while the ground remains gated at line tier 3. At Beach Sunward, Sea Mullet occupy 0.10–0.17, Yellowfin Bream 0.22–0.29, Sand Whiting 0.35–0.42, and Largetooth Flounder 0.72–0.79. At Beach Mosswater, Luderick occupy 0.14–0.26, Eastern Australian Salmon 0.34–0.46, Dusky Flathead 0.53–0.62, and Estuary Perch occupy 0.71–0.77. At Beach Outer Gloam, Snapper occupy 0.16–0.28 and Yellowtail Kingfish occupy 0.46–0.58 while Mulloway remain deep. At Lake Sunward Shoal, Emerald Shiners occupy 0.335–0.405 fishing depth, entirely below the starter line and reachable at line tier 1. White Suckers occupy the deeper 0.465–0.535 bottom band and become reachable at line tier 2. Fish are dimmed and blocked according to their actual swimming position relative to the line limit, so a higher-tier species that swims above the boundary remains fully visible and catchable. Condition names are not shown in the harbor UI.

## Sailing and fishing

Simulation step is `1/120` s. Gameplay RNG is seeded. The boat travels only on the horizontal surface.

| Rule | Value | Unit |
| --- | --- | --- |
| Horizontal thrust | 0.034 | world units / s² |
| Water drag when idle | 0.62 | per second |
| Brake while reversing | 1.15× thrust (1.25× during boost) | multiplier |
| Base max speed | 0.05 | world units / s |
| Engine speed per tier | +15% | tiers 1–6; 1.90× at tier 6 |
| Boost speed | 1.35× | while active |
| Boost thrust | 1.75× | while active |
| Boost heat | 8 s to overheat, 10 s to cool, recover at 25% | seconds |
| Camera view width | 0.30 world (1.18× while boosting, unless reduced motion) | world width |
| Catch radius | 0.058 | fishing space |
| Hook speeds | 0.2125 horizontal, 0.35 up, 0.25 down | fishing space / s |
| Landing / exit duration | 1.15 | seconds |
| Critical line tension | 90% | tension threshold |
| Line strength per tier | +12% | tension resistance |
| Reel stress capacity per tier | +12.5% | tension resistance; five-tier cap |
| Reel speed per tier | +17% | progress while actively reeling; five-tier cap |
| Hook vertical speed per reel tier | +5% | hidden navigation bonus; five-tier cap |
| Hook-up opening run | 0.65 | seconds of immediate escape before the first lull |
| Dive duration | 0.85 | seconds |
| Day length | 210 | seconds |
| Night start | 140 | seconds into the day |
| Night fade | 25 | seconds |

Hook depth is `min(0.94, 0.3 + lineTier × 0.125)`. Fish whose current position is below the line limit are visible and dimmed but cannot be hooked. Escape while fishing reels the empty line and returns to sailing; it does not pause.

Hooking a fish begins a deterministic line fight built from fish behaviour, not a generic hold-to-fill meter. The hook and fish ease from their exact collision positions into the attached pose over 0.24 seconds, avoiding a one-frame snap before the fight motion takes over. Holding the primary mouse button directly on the fishing canvas reels; touch hold and the remappable Reel key remain equivalent accessibility inputs. Every hook-up opens with a smoothly ramped 0.65-second escape run, followed by the first calm reeling window, then cycles through calm lulls, runs, and short thrashes. Reeling during a lull gains ground at modest tension and tires the fish. Reeling against a run loads the line fast. Releasing during a run lets the fish take line, slip farther from the boat, and drop tension. Waiting through a lull barely slacks the line and does not tire the fish. Tired fish stop running and become easier to land. There is no on-water fight HUD. Line tension is shown by the hook line itself: at low tension it hangs in a smooth gravity-led curve with gentle underwater drift, then progressively straightens and thickens as tension rises; it is cream when safe, amber as it tightens, and red at the 90% critical threshold. The hooked fish follows a continuous velocity-limited path; it accelerates, turns, rolls, rises, or dives instead of receiving discrete random displacement impulses. Reduced motion preserves the slack curve but freezes both its drift and the fight offset. Non-colour feedback remains: the tutorial title, toasts, sound, vibration, live-region copy, and the canvas `aria-label`. The hooked fish is drawn over the lower hook so only the eye and line stay visible. There is no separate on-screen Reel button.

Reel power has five purchasable tiers. Each tier adds 12.5% stress capacity and 17% reel speed, reaching 1.625× stress capacity and 1.85× speed at tier 5 without changing fish stamina, run timing, or release physics.

During a fight, every non-hooked fish keeps swimming and animating as a clearly visible dark silhouette at 68% opacity. Tracked-fish outlines, chevrons, tutorial hook arrows, and the large species portrait are hidden until the fight ends so the hooked fish remains the sole visual focus. Tension can only rise while the hooked fish is actively running or thrashing; calm reeling cools the line slightly. Reaching 90% tension breaks the line immediately. The fish visibly swims free from the hook and returns to its habitat depth using its normal species movement speed before ordinary schooling resumes. The bare line retracts quickly with no hook sprite on its end, and a matching top-centre danger pill says **The line snapped!** beside a red X. The player stays at the same fishing ground for an immediate retry; cargo and money are unchanged.

The Lake's three Sunward Shoal fish are intentionally forgiving starters. Their weak runs create proportionally low tension, and Bluegill, Yellow Perch, and Emerald Shiner can all be landed with a steady continuous reel even if a new player misses the release cue. Later fish still require deliberate reel-and-release control.

Rarity sets the base meter rates, but each species supplies its own researched timing, movement, and resistance profile. Bluegill kick and glide; Pike and Flathead wait then surge; Bass rises into an acrobatic thrash; Bowfin and Luderick roll; Estuary Perch hold deep then make short powerful runs; Trout, Snapper, Kingfish, Sturgeon, and Mulloway make increasingly sustained deep or long runs; and Burbot writhes close to the bottom. Line tiers reduce tension gain by 12% per tier as well as extending maximum depth. Giving line has the same slack physics at every tier. A cue-following reference strategy lands beginner fish in roughly 4–5 seconds, most mid-tier fish in 7–16 seconds, Kingfish and Sturgeon in about 21 seconds, and Mulloway in about 27 seconds. After reel progress fills, the existing 1.15-second landing transition completes the catch.

Each species has a deterministic swim gait. Free-swimming targets ease toward their desired horizontal speed and depth with bounded acceleration, so even burst swimmers glide between states instead of changing position or velocity abruptly. The tracked species gets a rarity outline, a hook-guidance cue, and a named specimen portrait while steering, but only when that fish lives at the current site. Those targeting cues hide during a fight. Nothing is highlighted while no fish is tracked. The evidence and species-by-species gameplay translation are recorded in [`Docs/Fish-Behaviour-Research.md`](Fish-Behaviour-Research.md).

## Upgrades

Standard upgrade costs are `base + currentTier × 55` shells. Engine upgrade prices receive a 20% discount from that standard curve and are rounded to the nearest 5 shells: 55, 100, 145, 190, 230, and 275.

| Upgrade | Base | Cap | Player-facing effect |
| --- | --- | --- | --- |
| Cargo | 60 | 7 | +1 slot per tier. Start 3, max 10 |
| Engine | 55 | 6 | +15% travel speed per tier; 1.90× at tier 6 |
| Fishing line | 55 | 6 | Deeper hook limit and +12% fight strength per tier. Lake: middle tier 1, far right tier 3. Beach: middle tier 3, far right tier 4. Oil Rig: spill tier 3, bluewater tier 4 |
| Reel power | 65 | 5 | +12.5% stress capacity and +17% reel speed per tier; 1.625× capacity and 1.85× speed at tier 5 |
| Engine boost | 250 | one-time | Hold Boost while moving. Overheats, then cools |
| Beach | 300 | one-time | Unlock travel to the coastal map from the Departures board |

Cargo, Engine, Line depth, and Reel power form a compact vertical stack of full-width equipment rows. Engine boost remains a compressed feature card beneath them; Beach access and travel live on the separate wooden Departures board. The full upgrade menu fits without an internal scrollbar at supported desktop and mobile viewports. Reel power uses a CSS-drawn spool-and-handle pictogram that matches the existing harbor equipment icon treatment without adding another runtime asset.

The boat gains a second visible cargo crate on its foredeck at cargo tier 4 and keeps that expanded-cargo sprite through tier 7.

Boat class names (Skiff through Lakebreaker) exist in balance data and are not shown in the harbor UI. Repair is not sold. The hull starts at 18 damage; reaching 100 damage would rescue to the nearest harbor, charge up to 20 shells, and dump cargo, but nothing in the live loop applies collision damage.

Cargo can be released from an occupied slot. An undo toast restores that catch for a few seconds.

## First Assignment

Saved as `marketTutorialStep`. Skip is always available. The prompt is a top-centre pill: step number, a small **Tutorial** label, a short action title, and a close control. One target at a time gets the amber glow. Lake arrows mark the route while travelling; a hook arrow leads to Bluegill while fishing.

| Step | Prompt |
| --- | --- |
| 1 of 4 | Choose Bluegill |
| 2 of 4 | Track the catch |
| 3 of 4 | Catch a Bluegill at Sunward Shoal; after hook-up the title becomes **Let it run**, then **Hold left click** when the fish first calms |
| 4 of 4 | Sell the catch |

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

- Mute plus separate saved music and sound-effects volume sliders controlling the title music and synthesized cues. Music plays only in the main-menu flow (the title plus Settings or Credits opened from it), never in the harbor, on the water, while paused, or in Settings opened from pause.
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

Save key `gamecomp-new.save`. Schema version **14**. Storage is CrazyGames `sdk.data` when the SDK initializes, otherwise `localStorage`. Malformed JSON becomes a new save.

Saved: money, upgrade tiers, beach/boost unlocks, discovered species, market day/sales/earnings/target, first-assignment and upgrade tutorial steps, season-complete flag, leftover learning counters, and settings (mute, music volume, sound-effects volume, contrast, reduced motion, bindings). Version 14 replaces the music toggle with a validated volume level; disabled music from version 13 migrates to zero. Version 12 added a validated Reel power tier defaulting to zero, ignored the retired `outerUnlocked` field from older saves, and preserved existing line tiers against the current world's spot requirements.

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
| `src/services/saveGame.ts` | Version 14 validation and migration |
| `src/services/platformService.ts` | CrazyGames boundary |
| `src/services/feedbackService.ts` | Title-screen music, synthesized cues, and optional vibration |
| `src/services/gameMusic.ts` | Title-menu music element, mute/music-volume, and tab-hidden pause |

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
- Market lists twelve Lake, eleven Beach, or six Oil Rig species, with undiscovered cards locked
- Quotes differ by harbor and day, and every catch sells for the displayed quote
- Line tier gates the Lake middle/right spots at tiers 1/3, Beach middle/right spots at tiers 3/4, and Oil Rig spill/bluewater spots at tiers 3/4
- The Departures board unlocks Beach for 300 shells and travels among Lake, Beach, and Oil Rig
- Oil Rig shows the dog on its lower service deck, one spillwater ground, one clean-bluewater ground, six unique animated species, and whole-fish values bounded at 90 and 270 shells
- Keyboard sailing, hook steering, pause, mute, high contrast, and reduced motion work
- Reloading keeps money, unlocks, discoveries, tutorial completion, and settings
- Local play still works with the CrazyGames SDK blocked
