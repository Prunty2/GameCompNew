# FSHING — Game Design Document

## Project summary

**FSHING** is a single-player, side-on environmental-science fishing and delivery game for web browsers. The player pilots a research boat along a horizontally scrolling lake, targets requested fish in distinct ecosystems, fishes at the appropriate depth, and completes deliveries shaped by speed, time, freshness, and population data.

The lake is inviting during the day but becomes difficult after dark. Darkness and fog reduce visibility without placing fixed obstacles in the boat's path. Successful deliveries fund larger boat classes, greater speed, stronger lights, deeper sampling lines, and access to three visually and scientifically distinct regions. Fishing lowers a species population; releasing catches and allowing time for recovery makes sustainability a playable system rather than a paragraph of exposition.

After eight completed research deliveries, the player receives a season report summarising species discoveries, completed crossings, conservation work, and lake health. The loop remains playable afterward, while discovering all nine species, unlocking every region, and purchasing every upgrade provides longer-term mastery.

## Design pillars

1. **Fishing without interruption.** Activating a fishing ground drops the line immediately, with the requested species identified in the underwater view.
2. **Travel time affects the voyage.** Engine upgrades shorten crossings and help preserve catch freshness without interrupting play with a separate route-choice screen.
3. **Ecology reacts to the player.** Catching, releasing, protection thresholds, natural recovery, and ecosystem bonuses make population management meaningful.
4. **Simple to start, satisfying to master.** Boat momentum and direct hook steering are immediate, while deeper lines, species knowledge, and efficient travel provide mastery.
5. **A broad lake with purposeful stops.** Three widely separated living fishing grounds, two harbors, three ecosystems, and six depth bands make the enlarged route readable without filling the waterline with signposts.
6. **Accessible evidence.** Shapes, numbers, labels, icons, and text repeat every important colour signal.

## Inspiration and originality

### Inspiration

*Dredge* informed the broad contrast between calm travel and risky darkness. *Cat Goes Fishing* was examined as a competitor because its clear equipment, exploration, species-discovery, and catalogue progression are easy to understand. FSHING retains only those abstract genre patterns and transforms them into an original environmental-science loop. No names, fish designs, dialogue, interface layouts, balance values, art, code, map, or behaviours were copied.

For the engine boost, mechanical research found that DREDGE's Haste is held for a temporary speed increase, builds engine heat while active, and dissipates heat after release; overheating damages an engine slot. Player timing tests estimate its immediate gain at roughly one third. FSHING adopts only the readable hold–heat–recover rhythm and approximate speed feel, replacing damage and panic with a forgiving cooling lockout suited to a short educational browser game.

### Points of originality

FSHING is not intended to reproduce Dredge in 2D. Its distinct focus is a repeatable delivery economy:

- Town requests are the primary objective rather than narrative exploration.
- Fish freshness makes boat speed and efficient travel central to success.
- The fishing interaction involves directly steering a hook toward visible fish.
- Its compact lake and short delivery contracts are designed for drop-in browser play.
- Progress comes from opening efficient delivery routes and mastering acceleration, momentum, and travel timing along a side-on lake.
- Horror is delivered through 2D visibility, sound, and environmental changes rather than a large story campaign.
- Habitat-specific resident sets, population simulation, travel-time feedback, and a season evaluation distinguish the learning purpose from either inspiration.

## Audience and platform

- **Platform:** Desktop and mobile web, distributed as a static CrazyGames HTML5 build.
- **Genre:** Side-scrolling delivery, fishing, and light survival game.
- **Mode:** Single-player.
- **Audience:** Year 7–10 students and casual players who enjoy accessible vehicle handling, collection, upgrades, and learning through short decisions.
- **STEM purpose:** Practise interpreting environmental measurements, matching adaptations to habitats, reasoning about population sustainability, and applying distance–speed–time relationships.
- **Content tone:** Cozy during the day. Night sequences may become genuinely disturbing, but should avoid graphic violence and remain suitable for a broad browser-game audience.
- **Session pattern:** Continuous saved game with delivery-sized objectives that can usually be completed in approximately 3–8 minutes.

## Core gameplay loop

1. Visit a harbor and accept a requested fish delivery.
2. Pilot toward one of three fishing grounds, first discovered through faint shoal movement beneath the surface.
3. Drop the line directly and steer the hook toward the requested resident species.
4. Store the catch; freshness falls and the species population decreases.
5. Begin the express crossing automatically when the contract catch is secured.
6. Cross the open lake through darkness and fog without fixed collision obstacles while freshness falls with time.
7. Deliver the fish and compare the catch-to-harbor freshness estimate with the actual result.
8. Release unneeded catches, monitor populations, and purchase boat, engine, lamp, or line upgrades.
9. Review season discoveries, conservation results, and lake health, then repeat.

Failed or poor deliveries should cost time and potential income, but should not erase the player's entire save. The player should always have a low-risk way to recover.

## STEM learning design

### Learning outcomes

After a complete research season, the target player should be able to:

1. Connect species availability and depth to the lake's distinct fishing-ground habitats.
2. Recognise fish through visible silhouettes and movement patterns rather than colour alone.
3. Observe how travel time and engine speed affect catch freshness.
4. Explain why a faster journey can preserve more freshness.
5. Predict how repeated harvesting, release, protection thresholds, and recovery affect a population.
6. Use estimated-versus-actual freshness feedback to revise a travel decision.

Fishing begins immediately when the player activates an available ground; there is no blocking species quiz. The requested specimen note and target marker guide the catch, while habitat-specific resident sets and population consequences keep the environmental-science context inside play. The season report retains discoveries, crossings, conservation, and lake-health results so progress is visible over time.

### Learning loop and feedback

```mermaid
flowchart LR
  A["Accept research delivery"] --> B["Follow shoal activity"]
  B --> C["Drop the line"]
  C --> D["Target the requested resident"]
  D --> F["Fish within unlocked depth"]
  F --> G["Population decreases and freshness starts"]
  G --> H["Begin catch-to-harbor crossing"]
  H --> I["Cross the open lake"]
  I --> J["Compare predicted and actual freshness"]
  J --> K["Deliver or release"]
  K --> L["Upgrade and review progress"]
  L --> A
```

Feedback uses three levels:

- **Immediate:** requested-species marker, catch feedback, and objective guidance.
- **After a crossing:** predicted versus actual freshness, payment, and healthy-ecosystem bonus.
- **Across the season:** species discoveries, completed crossings, population health, conservation score, and a reflection prompt.

### Computational thinking

- **Decomposition:** travel, fishing, population, contract, weather, rendering, input, persistence, and platform integration are separate responsibilities.
- **Pattern recognition:** each fishing ground has a stable resident set, allowing players to learn species silhouettes, movement patterns, and depth bands through repeated play.
- **Abstraction:** normalized horizontal position represents an 18 km lake; six line tiers represent depth bands; populations are bounded 0–100 indices.
- **Algorithms:** fixed-step movement, seeded target movement, clamped save migration, route estimation, catch depletion, delivery recovery, and contract selection are deterministic.
- **Evaluation:** automated tests compare expected states; in-game freshness estimates and delivery results let the player evaluate their travel model.

### Core pseudocode

```text
CATCH(species)
  IF cargo is full THEN reject catch
  IF population[species] ≤ 15 THEN protect species and reject catch
  cargo.add(species, freshness = 100)
  depletion ← 7 + (species.depthTier × 2)
  population[species] ← MAX(0, population[species] - depletion)
```

```text
START_CROSSING(contract, engineTier)
  distanceKm ← ABS(destinationHarborX - catchSiteX) × 18
  engineFactor ← 1 + (engineTier × 0.11)
  travelSpeed ← 0.05 × 1.12 × engineFactor × 18
  travelTime ← distanceKm ÷ travelSpeed
  predictedFreshness ← 100 - (travelTime × 0.667)
```

```text
DELIVER(catch)
  payment ← baseReward × freshnessFactor
  IF at least 7 species have population ≥ 55 THEN payment ← payment + 12
  FOR EACH species
    population[species] ← MIN(100, population[species] + slowRecoveryByDepth)
  ENDFOR
  show predictedFreshness versus actualFreshness
```

## World structure

The game takes place along one connected side-on lake route divided into regions. The camera follows the boat horizontally while layered shore, sky, water, docks, and landmarks establish depth without 3D. The full lake should span at least three landscape view widths, making a cross-lake delivery feel like a journey while keeping each stretch anchored by a harbor, fishing ground, boundary, or visible landmark.

### Region progression

- **Brindle Coast:** Warm blue-green water, calm weather, common surface fish, and short deliveries.
- **Mosswater Reach:** Green water, heavier vegetation, deeper fish, changing weather, and stronger currents.
- **Violet Gloam:** Cold violet water, poor visibility, disturbing events, and the rarest deep fish.

The connected surface route remains navigable, but each region has a distinct color treatment, named fishing ground, and fish population. Region tints use a low-opacity overlay and a wide feathered blend around each boundary, so travelling changes the atmosphere gradually without an obvious full-screen color switch. Deeper fishing layers are unlocked through line-depth upgrades, while the outermost ground also requires a harbor permit. Locked depth is shown directly in the fishing view rather than enforced by an unexplained invisible boundary.

### Harbors

Each harbor acts as a compact service point. A harbor may provide:

- Available delivery contracts
- Fish delivery and payment
- Boat upgrades
- Region permits
- Brief NPC dialogue

The first release should reuse a consistent harbor interface rather than build fully explorable towns. Docking changes the full-screen setting behind that interface: Brindle Harbor uses a practical working-pier painting, while Gloam Ferry uses a sparse outer-lake landing. Each dock has matched daytime and nighttime plates, blended from the same night intensity as the sailing panorama so the harbor never contradicts the lake's current time of day. The same waterline transition used for major scene changes covers both entering and leaving a dock, so the lake and dock paintings never snap directly between one another. Reduced-motion mode still swaps the setting immediately.

The harbor interface opens on Delivery and separates Cargo and Dock services into focused submenus. One compact dark translucent dock panel creates a clear hierarchy of location and shells, category tabs, selected content, and secondary navigation. These sections share the same left and right edges. On a fresh save, a compact Survey → Catch → Deliver primer precedes the first guided assignment; this introduces the complete game loop without exposing later dock systems. After onboarding, every submenu omits the repeated objective panel and harbor subtitle so its functional content begins directly below the tabs. Delivery makes the job ticket the immediate visual focus: its job name is centred, its three sequential route steps are large enough to use the available space, the shell payment is explicitly labelled Reward, and active travel guidance uses the same dark panel language rather than a light legacy callout. Cargo uses a ten-slot game inventory: three slots are unlocked on a fresh save, caught fish occupy slots with freshness and release controls, and the other seven use a dedicated transparent cream-and-orange padlock pictogram. Selecting a locked slot gives it the shared restrained mechanical wobble, then opens Dock Services and focuses its tab; neutral borders and focus rings keep amber reserved for primary state. The same roughly half-degree hover/click response applies consistently to enabled buttons across the harbor, main, settings, controls, and pause menus, while reduced-motion settings suppress it. Dock Services presents one clearly separated full-width row per cargo, engine, lamp, line-depth, and permit option without an additional heading panel. Each row uses an icon plate, concise effect copy, a live level meter, and a shell-price purchase control calculated from the real balance model; Repair hull is not offered. Only one harbor function is visible at a time, the selected submenu keeps keyboard focus, and each submenu must fit supported desktop, portrait, and short-landscape viewports without page scrolling. Switching submenus leaves the title block, tab bar, and footer fixed while only the inner content changes. Tabs, service types, shell costs, and help actions use the shared transparent pictogram atlas with short visible labels; each pictogram is centred within an equal sprite cell. Repeated explanatory sentences are removed when the icon and local heading already communicate the action. The background remains recognisable beneath a darker overlay and light blur.

## Delivery system

Deliveries are the main source of income and direction.

While travelling, a high-contrast edge badge uses a thick directional arrow plus the destination name so the next harbor or fishing ground remains unmistakable against every panorama. The badge points down when its destination is visible and left or right when it lies beyond the viewport; reduced-motion mode keeps the emphasis static.

Each contract defines:

- Requested fish species and quantity
- Destination harbor
- Base payment
- Minimum acceptable freshness
- Optional bonus conditions
- Recommended region or fishing ground

The contract screen must show enough information for the player to judge the destination and freshness requirement before travelling. Early contracts request common fish in nearby waters. Later contracts combine rarer catches, distant destinations, difficult conditions, and tighter freshness expectations.

Fresh deliveries pay the full reward. Lower freshness reduces the payment. Fully spoiled fish cannot complete a contract. Any unneeded catch can be released at harbor, reversing that catch's modelled population cost and adding to the player’s conservation score. Exact freshness rates and rewards are centralized in balance data and covered by deterministic tests.

To keep the repeating game playable after all authored contract tiers are complete, the game may generate contracts from validated combinations of unlocked fish, regions, quantities, and destinations.

## Fishing system

Fishing is an active supporting mechanic rather than the entire game.

1. The player notices faint fish movement beneath the lake and steers toward the fishing ground.
2. A population-aware school is always faintly discoverable; there is no permanent buoy, nameplate, or surface ring.
3. As the boat approaches, a restrained polarized-water lens clarifies the shoal without turning the lake into a transparent aquarium.
4. At three times the interaction distance, a compact hook-and-arc cue becomes clearly visible and strengthens as the boat approaches the fishing ground. It stays anchored to the ground's world position instead of following the boat; once the boat enters interaction range, its accessible interaction label supplies the site name and any permit, line-depth, speed, or cargo restriction without putting persistent text over the lake.
5. The player drops the line from the boat into the water directly below.
6. The camera eases downward through the same painted waterline used while sailing, then settles with the waterline near the upper third so the boat and shoreline remain present above the underwater play space. Reduced-motion mode shows the settled framing immediately.
7. The player steers the hook toward a fish while avoiding weeds, debris, or unwanted species.
8. Contact with a valid fish hooks it, freezes steering, and starts a short automatic reel toward the boat.
9. The fish follows the rising hook on a taut line with a restrained struggle while the camera eases back toward the sailing waterline. The underwater environment crossfades into the sailing water throughout the lift, so both the framing and water artwork reach their surface state before the fish enters cargo. Reduced-motion mode removes the struggle and shows the final framing immediately while keeping the hooked and secured states readable.

The surface cue combines two information layers. The always-present shoal uses restrained but readable contrast and moves slowly enough to remain discoverable with reduced motion enabled. Its visible fish count follows the primary species population in broad steps, so a depleted ground remains discoverable but visibly quieter. Proximity clearly strengthens the silhouettes, adds a soft vertical lens of clearer water, and reveals subtle caustic and orbit trails. The hook cue becomes clearly visible at three times the real interaction radius, then strengthens toward the site, while the interaction itself remains limited to that radius. High-contrast mode strengthens silhouette edges and the hook arc; all restriction details remain available as accessible text and focus feedback rather than colour alone.

Fish should have recognizable silhouettes and movement patterns so catches do not depend on color alone. During fishing, a compact unboxed specimen note shows only the requested fish sprite and its name. A clean silhouette-following outline and a small chevron identify the matching fish in the water; the chevron preserves a non-color cue while the outline color communicates rarity: common warm ivory, uncommon sea-glass green, rare amber, and legendary restrained violet. Rarer fish can move faster, hide deeper, or require improved fishing equipment. For the minimum viable release, reeling is a short automatic payoff rather than a separate tension minigame. This makes a catch feel physical without adding another input rule or distracting from evidence-based targeting.

The underwater presentation is assembled from independent layers. Each fishing site has its own full-screen environment painting, while fish, hook, line, target outline, a sparse four-float line boundary, and labels remain separate movable or procedural layers. There is no vertical depth meter; the boundary alone communicates the current line limit. Species movement changes the actual simulation path as well as the sprite pose: Reedfin cruise in loose waves, Sun Perch make short climbing darts, Silver Dart accelerate in sharp bursts, Needle Pike hold long level glides, Mossback drift slowly, Lantern Eel weave vertically, Gloam Gill alternate hovering with short surges, Violet Ray travel in broad arcs, and Abyss Crown remain almost still before rare lunges. Reduced-motion mode removes secondary body flex while preserving gameplay-affecting movement. Sunward Shoal uses warm blue-green shallows, reeds, cream reflected light, and submerged timber; Mosswater Pool uses greener low-visibility water, mossy roots, and silt pockets; Outer Gloam uses cold violet water, rock shelves, sparse pale growth, and poor visibility. This keeps the same fishing interaction readable everywhere without making the three grounds feel like one repeated aquarium.

The lake contains nine readable species across six depth tiers. Surface species are available immediately. Each line-depth upgrade extends the hook into another visible band of water, revealing more valuable fish and eventually the Violet Gloam abyss. Fish below the current line limit remain visible behind a clearly labelled depth boundary so the next upgrade has an understandable benefit.

Each ecosystem has one fishing site, positioned roughly one full landscape view from the next. Each site owns a fixed three-species resident set, and the underwater view spawns two individuals of each resident. This keeps the scene busy without placing cold, deep species in warm shallows. A contract may request any resident at its assigned site; the underwater specimen note and target marker identify that contract species.

| Site | Resident species |
| --- | --- |
| Sunward Shoal | Reedfin, Sun Perch, Silver Dart |
| Mosswater Pool | Needle Pike, Mossback, Lantern Eel |
| Outer Gloam | Gloam Gill, Violet Ray, Abyss Crown |

## Boat handling

The boat uses direct horizontal side-scrolling movement:

- Hold left or right to apply thrust in that direction
- Releasing thrust allows short, readable momentum before water drag slows the boat
- Brake reduces speed quickly without instantly snapping the boat to a stop
- Once purchased, holding boost overclocks the engine to 133% of its current maximum speed while filling an eight-second heat meter. Releasing boost cools the meter over ten seconds. Reaching full heat safely locks boost until the meter cools to 25%, preserving DREDGE's readable risk-and-recovery cadence without copying its engine-damage or panic penalties. While boost is active, the surface camera eases from a 0.30 to 0.354 world-unit view width over a clearly visible pull rather than snapping, so more of the route enters frame and the speed change reads beyond the wake effect. The boat, its steam, wake, and boost trail scale continuously with the live view width, reaching roughly 85% of their normal screen size at the widest view. The camera and boat ease back together after release; reduced-motion mode keeps the normal fixed view width and size.
- The boat faces its current travel direction and uses restrained bob and tilt so motion remains calm and readable
- Boat movement stays on the open horizontal surface without fixed collision obstacles

The lake panorama and every surface effect share one normalized world-space camera projection. The camera owns a clamped, speed-sensitive visible span, damped velocity look-ahead, and restrained follow slack; background crop bounds, harbors, fishing-ground shoals, objectives, weather lighting, and the boat all derive their screen positions from that same projection. This prevents scenery and gameplay objects from drifting at different apparent speeds while letting acceleration, braking, and the boost FOV pull move the boat slightly within the frame before the view settles. Alternating thrust cannot snap the camera between raw direction targets. Reduced-motion mode uses the direct fixed-width camera, and the title retains its wider static view.

The handling should feel smooth, measured, and forgiving rather than physically realistic. Acceleration builds gradually, direction changes retain readable momentum, and the lower cruising speed gives the player time to plan without a complicated turning arc.

### Controls

**Keyboard**

- A/D or Left/Right Arrow: thrust left or right
- W/S: steer the hook vertically while fishing
- Left Shift: hold engine boost after unlocking it
- Space or E: interact, dock, or cast
- Escape or P: pause
- Temporary testing — B: grant the boost unlock for the current run without saving it
- Development builds only — G: jump to the start of the dusk transition; H: jump to full night

**Pointer and touch**

- On-screen left and right controls during navigation
- On-screen hold control for boost after it is unlocked
- Tap prominent interaction buttons to dock, accept contracts, and cast
- Drag or virtual-stick input to steer the hook while fishing

All essential actions must work without hover. Touch targets must be large enough for mobile play, and the interface must respect display safe areas.

Keyboard actions can be rebound from the Controls submenu within Settings. Controls uses the same centered, panel-free lake treatment as its parent, with bindings arranged as a compact two-column input map on wide and landscape screens and one column on narrow portrait screens. Bindings persist with the rest of the validated settings; assigning an occupied key swaps the two actions, and Escape remains an always-available pause fallback.

The How to play menu presents the core loop as four step-by-step field-note cards: accept, travel, catch, and conserve. Previous and Next controls move through one card at a time, with the main Back action kept separate below the card navigation.

The main menu includes a quiet bottom-left build label showing the package version and the pull request number for the current technical build. It remains secondary to the Play and Settings actions and respects display safe areas.

## Open-water travel, damage, and night

### Open-water travel

Surface travel remains open and unobstructed. The boat does not collide with fixed wreckage, debris, warning markers, or invisible world-position hazards while moving between destinations. Route pressure comes from freshness, distance, darkness, and reduced visibility rather than mandatory impacts.

Boat damage, repair, and rescue remain available for authored events and the opening scenario, but ordinary horizontal movement does not add damage. At critical damage, the player is rescued and returned to the nearest harbor, losing some cargo freshness and money rather than losing the full save.

### Night and visibility

Night reduces the visible area around the boat and makes distant landmarks harder to read. It should feel unsettling because information becomes unreliable, not simply because the screen becomes uniformly black.

Halfway through the 25-second dusk transition, a compact icon-only crescent-moon marker slides into the top-left of the gameplay view. It remains visible through the rest of dusk and full night, then clears at morning, making the cause and duration of reduced visibility explicit without resembling another instruction pill. The daytime panorama, boat treatment, and visibility vignette ease into their night appearance across the full transition; they ease back toward daylight during the final 25 seconds before morning. Reduced-motion mode shows the same persistent marker without a perceptible slide.

The player can purchase progressively stronger lights. Light upgrades may improve range, width, clarity in fog, or resistance to disturbing effects. Lights are permanent upgrades in the initial scope; a fuel system should only be added if testing shows that night needs another meaningful decision.

Night horror may use:

- Shapes briefly moving beyond the light
- Buoys or landmarks appearing where they should not be
- Distant lights that lead away from safe routes
- Water and radio sounds that intensify in darkness
- Momentary visual distortion after impacts or close encounters
- Unidentified wakes approaching the boat

Horror events must not obscure essential UI, create damage during ordinary travel, or rely exclusively on sudden loud sounds.

## Economy and progression

Money is earned primarily from completed deliveries and spent on permanent improvements.

### Core upgrade paths

- **Boat and cargo:** The hold starts with 3 slots. Seven cargo tiers unlock one slot each to a maximum of 10; the vessel grows through named classes, from the starter skiff to a lakebreaker.
- **Engine speed:** Reach fishing areas and destinations before fish spoil.
- **Engine boost:** A one-time 300-shell overclock unlock adds a temporary 33% speed increase governed by heat and passive cooling.
- **Lights:** See landmarks and resist nighttime visibility penalties.
- **Line depth:** Reach progressively deeper fish and new underwater color zones.
- **Region access:** Purchase permits or equipment needed to enter new waters.

Cargo has seven tiers to match its seven locked inventory slots; engine, lights, and line depth have six tiers. Repair costs support the opening scenario and any authored damage events. Prices rise by upgrade tier without requiring excessive repetition. The player should regularly face a useful decision between building a larger boat, improving travel time, strengthening night visibility, or reaching a deeper and more profitable fishing world.

The game is considered content-complete when the player has unlocked every region and purchased the maximum tier of every upgrade. Play can continue afterward through repeatable or generated deliveries.

## Story and characters

Story is intentionally light. It provides atmosphere and introduces systems without interrupting the repeatable delivery loop.

The player arrives at a run-down lakeside harbor with a damaged boat and is offered local delivery work. A small group of recurring harbor characters can introduce repairs, upgrades, contracts, and increasingly strange conditions on the lake.

Recommended functional roles are:

- **Harbor master:** Introduces contracts and new regions.
- **Shipwright:** Repairs the boat and sells cargo or engine upgrades.
- **Merchant:** Manages payments, specialty contracts, or lights.
- **Researcher or fisher:** Introduces unfamiliar fish and warns about the dark waters.

Dialogue should be brief, skippable, and presented in small text panels. The earlier multi-part story, named cast, aquarium, and million-dollar escape objective are outside the initial scope.

## Visual design

### Direction

The game uses a cozy illustrated 2D style with unsettling nighttime transformations.

- Side-profile boats with readable hull, cabin, cargo, lamp, and facing direction
- Layered side-view sky, distant shoreline, near reeds, waterline, docks, and underwater space
- Fishing preserves the sailing panorama above a high waterline, then reveals site-specific painted underwater environments beneath it
- Harbor piers extend inward from their shoreline edge and visually connect to land instead of floating as isolated platforms
- Warm harbor lights contrasted against cool lake colors
- Large, soft white steam clouds rise from the tugboat stack and stretch into a longer trail with speed; at full speed, seeded downwash and turbulence keep the plume lower and loosely animated. Emitted puffs retain world orientation while the hull turns, and damped exhaust velocity prevents alternating thrust from snapping or mirroring the whole trail. Eight painted sprite variations rotate deterministically so the plume stays organic without reading as dark pollution smoke
- Clear daytime navigation landmarks
- Night palettes that preserve gameplay readability while hiding distant threats
- Subtle wake, rain, fog, current, and light-cone effects
- Disturbing imagery used sparingly so it remains effective

The visual design must communicate fish type, freshness, damage, navigation landmarks, and interactable locations through shape, animation, icons, and text—not color alone.

### Technical art constraints

- Render the horizontally scrolling side-on lake, parallax layers, and moving game objects with Canvas 2D.
- Use HTML/CSS overlays for contracts, shops, dialogue, settings, tutorials, and touch controls.
- Design around responsive landscape play, while retaining a functional mobile layout.
- Explicitly import runtime assets so source and authoring files do not enter the production build.
- Prefer reusable layered sprites and procedural effects over large frame-by-frame animations.

## Audio design

The implemented vertical slice uses original procedural Web Audio rather than external sound files:

| Cue | Implementation | Purpose | Equivalent non-audio feedback |
| --- | --- | --- | --- |
| Engine | Filtered triangle oscillator; pitch and gain follow speed | Communicate acceleration without a loud loop | Boat motion and wake state |
| UI and cast | Short sine sweep; filtered noise plus descending tone | Confirm an input and line drop | Focus/pressed state and visible hook |
| Catch, delivery, upgrade | Distinct rising triangle/sine patterns | Separate three positive outcomes | Named toast, flash, result panel, and changed values |
| Impact and denial | Low sawtooth/noise impact or descending square tone | Signal scripted damage, rescue, or unavailable action | Damage toast, rescue message, denial reason |
| Dock | Two restrained descending triangle tones | Confirm safe arrival | Harbor overlay and dock state |

Optional device vibration mirrors these cue categories. Saved mute and volume settings control the master gain. Audio is never the only signal, and engine audio drops to silence whenever gameplay is paused by an overlay or focus loss.

Future soundscape work may add water, weather, harbor ambience, sparse music, and region-specific atmosphere, while preserving mute, visible warnings, and reduced-motion accessibility.

## Interface and onboarding

The first playable minutes should teach systems through one short delivery:

1. Apply horizontal thrust and dock at the starting harbor.
2. Accept a nearby request for one common fish.
3. Follow a marked route to a fishing area.
4. Drop the line and steer the hook into the requested fish.
5. Begin the crossing automatically as freshness starts.
6. Return, compare predicted with actual freshness, deliver, and buy the first upgrade.

Tutorial prompts should disappear after the action is successfully performed and remain available from a help menu. The title screen uses a zoomed-out, full-bleed lake view with no panel behind its controls. A large wordmark sits slightly above center, followed by one unmistakable Play action and a quieter Settings action; no other content appears on the title screen. The pause menu echoes that simple title composition over the current lake view with a distinctly smaller wordmark, one dominant Resume action, and compact secondary buttons for settings, help, and the title screen. Settings follows the same centered, panel-free composition over the blurred lake: a compact wordmark and heading sit above a two-column instrument grid, while Controls and the amber Done action span the full width. Narrow portrait screens collapse the grid to one column. Opening Settings from the title preserves the title's zoomed-out lake framing while the dimming blur eases in and the controls settle into place; closing lifts the Settings controls away before the title actions settle back into the cleared lake. Returning from Settings to pause preserves the blurred backdrop and uses the same restrained handoff instead of replaying Pause's full off-screen drop. Its Controls submenu keeps that same camera and backdrop. Opening pause quickly blurs the gameplay lake before the menu drops in from above; resuming reverses that sequence before simulation restarts. Only starting from the title and returning to the title use the reusable 280 ms waterline wipe; pause, resume, harbor, and subordinate overlay changes use their own restrained treatments or switch directly. The wipe's translucent deep-teal halves have softly faded moving edges and blur the lake behind them before a thin amber sonar line reveals the destination. It blocks input and simulation while active. Reduced-motion mode removes the wipe, staged movement, and delay. How to play remains available from the harbor and pause menus. The first harbor visit reveals systems in three stages: the player first sees only a guided delivery ticket and must accept it before leaving; accepting the job reveals cargo and freshness information; completing that first delivery reveals upgrades and repairs. Later harbor visits present the current delivery as a three-step job route before cargo or upgrades, with plain-language guidance about the immediate next action. Navigation has no permanent status bar: world markers, a directional arrow, contextual actions, and short messages carry the active objective. Directional objective markers stay fully visible until the final approach, then fade smoothly and clear only when the destination enters interaction range. Cargo details, freshness, damage, money, and upgrades are reviewed in the harbor; aggregate lake health appears in the season report. Keyboard players can pause with Escape or their configured pause key; the navigation view has no permanent pause button.

Menu presentation follows familiar shipped game conventions rather than general web-app patterns. Title, pause, and settings form a panel-free family whose wordmarks and actions float directly over the lake. Other screens keep one dominant action; job information uses a physical dispatch-ticket treatment; and cargo, upgrades, settings, and help are subordinate rows or pages rather than equal-weight cards. Warm amber is reserved for the current or available action, while completed and informational states stay neutral. Deep teal, soft sea-glass, warm ivory, and restrained coral form the shared palette. Remaining interior menu screens use the same softly rounded dockside frame, readable display typography, visible focus treatment, and restrained transitions.

## Persistence

The game automatically saves stable progression, including:

- Money
- Purchased upgrade tiers
- Unlocked regions
- Permanent engine-boost unlock
- Boat, engine, lamp, and line-depth upgrade tiers
- Fish population values and discovered species
- Crossings started, conservation score, and season-completion state
- Settings such as mute, high contrast, and reduced motion
- Keyboard control bindings

Save data is versioned, validated, clamped, and migrated. CrazyGames data storage is used when available, with local storage as a development fallback. Temporary simulation details should not be saved if restoring them could produce an invalid or unfair game state.

## Accessibility and browser requirements

- Keyboard, pointer, and touch support
- Pause when focus is lost
- Mute and volume controls
- Reduced-motion option
- High-contrast option
- Non-color indicators for fish, damage, freshness, and navigation landmarks
- Legible scalable text and large touch targets
- No critical information communicated only through audio
- Local play remains functional when the CrazyGames SDK is unavailable
- CrazyGames loading and gameplay lifecycle events are sent through `PlatformService`

## Scope

### Implemented vertical slice

- One connected lake containing two harbors and three regions
- Responsive side-scrolling boat movement
- Docking and harbor interfaces
- Delivery contracts and freshness
- One complete steer-the-hook fishing interaction
- Nine visually distinct fish across six depth bands
- Cargo, speed, and light upgrades
- Region and depth unlocking
- Habitat-specific resident sets and population ecology
- Automatic express crossings with travel-time and freshness feedback
- Fish populations, protection, release, recovery, and ecosystem bonuses
- End-of-season mastery report with discovery and lake-health results
- Day/night cycle with reduced nighttime visibility
- At least one changing lake condition
- Boat damage, repair, and rescue
- Brief tutorial and lightweight dialogue
- Persistent progression and settings
- Keyboard, pointer, and touch controls
- CrazyGames SDK integration
- Unit and browser tests for the complete gameplay loop

### Future stretch goals

- More fish behaviors and fishing obstacles
- Procedurally assembled repeatable contracts
- Currents, fog, and severe storms
- More elaborate nighttime entities and false landmarks
- Optional contract bonuses and chained deliveries
- Expanded ambient dialogue

### Explicitly out of scope for the initial release

- 3D graphics or a game engine
- Large explorable towns
- Aquarium or complete fish museum
- Long narrative campaign
- One-million-dollar victory condition
- Combat
- Multiplayer
- Complex inventory grid
- Fishing-line tension simulation
- Large open world

## Submission ownership

This document is the planning record for **Saxon Rigg-Smith's individual Assessment 3 submission**.

| Submission owner | Recorded responsibilities |
| --- | --- |
| Saxon Rigg-Smith | Game concept, STEM design, interface and visual direction, asset specifications, implementation integration, testing, evaluation, and final submission |

Any contribution by another person must be added here with the exact asset, code, feedback, or testing work they supplied before the portfolio is submitted. The current submission does not attribute project ownership to an unverified team.

## Eight-week production plan

The two-month schedule requires an eight-week plan. The minimum viable game takes priority over stretch goals.

### Week 1 — Pre-production and handling prototype

- Lock this GDD and visual references.
- Prototype horizontal thrust, facing, braking, open-water bounds, and side-follow camera behavior.
- Define normalized units and initial balance data.
- Produce temporary boat, lake, harbor, landmark, and UI assets.
- Establish the regular build and playtest routine.

**Milestone:** The boat is enjoyable to control around a small test lake.

### Week 2 — World and harbor loop

- Build the first lake region, two harbors, docking, and world boundaries.
- Implement harbor interaction and contract interface shells.
- Establish minimal contextual prompts and responsive touch controls.
- Define the daytime visual and audio baseline.

**Milestone:** The player can travel reliably between two functional harbors.

### Week 3 — Fishing and cargo

- Implement fishing spots, casting, hook steering, and catching.
- Add three fish types with distinct silhouettes or movement.
- Implement cargo capacity and cargo UI.
- Test the full input scheme with keyboard, pointer, and touch.

**Milestone:** The player can catch a requested fish and carry it back to harbor.

### Week 4 — Deliveries and economy

- Implement contract generation or authored contract data.
- Add fish freshness, delivery validation, rewards, and failure states.
- Implement money, repairs, and first cargo and speed upgrades.
- Create the tutorial delivery.

**Milestone:** The complete accept–fish–deliver–upgrade loop is playable.

### Week 5 — Night, weather, and progression

- Implement day/night transitions and visibility.
- Add boat damage, rescue, and one dangerous weather condition.
- Add purchasable lights and region access.
- Introduce nighttime visual and audio horror effects.

**Milestone:** Night changes travel decisions and the second region is unlockable.

### Week 6 — Content and presentation

- Replace priority placeholder art and audio.
- Add later delivery tiers, higher upgrade levels, and second-region fish.
- Add brief character dialogue and contextual tutorial text.
- Balance rewards, freshness, damage, repair costs, and travel times.

**Milestone:** All minimum viable content is present from a new save through maximum progression.

### Week 7 — Testing and fixing

- Run structured playtests with new players.
- Fix progression blockers, input problems, movement issues, and save errors.
- Test mobile layouts, different aspect ratios, focus loss, SDK absence, and corrupted saves.
- Complete accessibility settings and feedback.
- Freeze new features at the end of the week.

**Milestone:** The full game can be completed without developer intervention.

### Week 8 — Submission build

- Run typechecking, unit tests, browser tests, and production builds.
- Optimize asset sizes and runtime performance.
- Complete CrazyGames SDK lifecycle and storage verification.
- Perform final balance and usability passes.
- Prepare screenshots, description, controls, credits, and the final static bundle.

**Milestone:** A tested, upload-ready CrazyGames build and supporting submission material.

## Workflow and project execution

- Keep the main branch playable and integrate small changes frequently.
- Assign one owner and a clear acceptance test to each task.
- Use placeholder assets early, then replace them according to agreed dimensions and naming.
- Hold at least one stakeholder playtest and task review each week.
- Record bugs with reproduction steps, expected behavior, severity, and owner.
- Prioritize blockers, save corruption, input failures, and unreadable gameplay before cosmetic issues.
- Stop adding minimum-viable features after Week 6 and stop adding all features after Week 7 begins.
- Preserve deterministic simulation and keep gameplay rules independent from rendering and browser APIs.

## Testing strategy

### Automated model tests

- Boat thrust, braking, horizontal speed limits, facing, and damage
- Unobstructed travel across former fixed-hazard positions
- Fish freshness over deterministic simulation time
- Contract validation and payment calculations
- Cargo limits
- Upgrade prices, effects, and maximum tiers
- Region unlocking
- Survey correctness, explanation target, discovery, and accuracy
- Population depletion, release recovery, protection, and delivery recovery
- Automatic crossing start, travel estimates, and speed multipliers
- Season-completion threshold and mastery statistics
- Save validation, migration, and clamping
- Deterministic fishing behavior where gameplay randomness is used

### Browser tests

- Start from a new save
- Complete the tutorial delivery
- Enter fishing directly without a blocking quiz
- Catch the requested fish and continue directly into the catch-to-harbor crossing
- Catch and deliver a fish
- View freshness estimate-versus-result feedback and the season report
- Purchase and retain an upgrade after reload
- Recover from critical boat damage
- Navigate menus with keyboard and pointer
- Verify touch controls at a mobile viewport
- Pause safely on focus loss
- Run locally when the CrazyGames SDK is blocked

### Playtesting questions

- Is horizontal boat travel enjoyable within the first minute?
- Can players tell where to obtain the requested fish?
- Can players identify the requested fish quickly after dropping the line?
- Does removing the quiz make repeated fishing feel faster without making the target unclear?
- Do freshness and travel time create understandable travel decisions?
- Can players explain the speed–time–freshness relationship after one crossing?
- Do population labels change fishing or release decisions?
- Can players understand why a delivery lost value or failed?
- Is nighttime frightening while remaining readable and avoidable?
- Does each upgrade create a noticeable improvement?
- Is progression satisfying without excessive grinding?

## Success criteria

The release is successful when:

- A new player can complete the tutorial delivery without verbal help.
- A player can identify the requested fish without relying on colour alone.
- Travel-time feedback and population consequences are visible within the delivery loop.
- The delivery loop remains understandable after returning to the game later.
- Boat handling is responsive on keyboard and touch.
- Night changes player behavior and creates tension without unavoidable failure.
- Progress survives refreshes and invalid save data fails safely.
- Every core upgrade and region can be reached without excessive repetition.
- The game builds as a static CrazyGames-ready bundle and remains playable without the SDK during local development.

## MVP vertical slice implementation contract

This slice proves the complete accept–fish–deliver–upgrade loop through a true side-on 2D game. It replaces the earlier top-down implementation direction completely.

### Player journey

1. Start at **Brindle Harbor** and accept **The Morning Order**, requesting one Reedfin for **Gloam Ferry**.
2. Follow the faint Sunward Shoal fish activity and slow when the polarized-water lens reveals the school.
3. Drop the line without a blocking quiz, enter the underwater cutaway, and catch the marked Reedfin.
4. As freshness begins, start the crossing from Sunward Shoal to Gloam Ferry automatically without a blocking route-choice screen.
5. Watch freshness and population change while crossing the open lake.
6. Dock at Gloam Ferry, compare predicted with actual freshness, collect the payment, and buy a boat, engine, lamp, or line-depth upgrade.
7. Continue with seeded contracts, grow the boat through seven classes, protect vulnerable populations, and unlock Outer Gloam.

The tutorial is action-based and a new player should complete the first delivery in roughly two to four minutes.

### Slice content

- One continuous horizontal lake route with Brindle Harbor at the left edge and Gloam Ferry at the right edge.
- A side-follow camera with generated panoramic scenery, layered parallax, a readable waterline, and underwater cutaway fishing.
- Three widely separated, water-connected fishing grounds and nine silhouette-and-color-distinct fish across the Brindle Coast, Mosswater Reach, and Violet Gloam.
- Authored tutorial contract followed by seeded repeatable contracts selected from unlocked fish.
- Cargo freshness, payment scaling, limited capacity, upgrades, repair, critical-damage rescue, fog, and day/night pressure.
- Direct left/right keyboard and touch travel controls plus direct two-axis hook steering.
- Quiet title, harbor, contract, pause, settings, help, contextual prompt, and result overlays using a completely new image-generated visual system.

### Initial balance

All durations use simulation seconds; horizontal positions use normalized world distance; speeds use normalized world units per second.

| Value | Initial setting |
| --- | --- |
| Horizontal thrust | 0.034 units/s² |
| Base maximum surface speed | 0.05 units/s |
| Passive water drag | 0.62 per second |
| Camera view width | 0.30 world units |
| Critical rescue threshold | 100 damage |
| Freshness lifetime | 150 seconds |
| Tutorial minimum freshness | 35% |
| Tutorial reward | 90 shells |
| Healthy-ecosystem bonus | 6 shells for 5 healthy species; 12 for 7 |
| Cargo capacity | 1 fish, then +1 per boat tier up to 7 |
| Boat and cargo upgrade | 60 shells base; six tiers |
| Engine upgrade | 70 shells base; +11% maximum speed per tier; six tiers |
| Engine boost unlock | 300 shells; +33% maximum speed while held |
| Boost heat and recovery | 8 seconds to full heat; 10 seconds to cool from full; recovers from lockout at 25% heat |
| Lamp upgrade | 70 shells base; six tiers |
| Line-depth upgrade | 55 shells base; six tiers unlock progressively deeper water |
| Outer Gloam permit | 85 shells |
| Repair price | 1 shell per 2 damage, rounded up |
| Full day/night cycle | 210 seconds; final 70 seconds are night |
| Night visual fade | 25 seconds into night and 25 seconds before morning |
| Fog cycle | 48 seconds; readable warning precedes dense fog |
| Catch population cost | 7 + (fish depth tier × 2) points |
| Protected threshold | 15 population points |
| Harbor release recovery | Reverses that catch's 7 + (depth tier × 2) point cost |
| Delivery recovery | 1–2 points per species, slower at depth |
| Empty-contract harbor recovery | Up to 8 points per visit, slower at depth, until an unlocked stock is viable |
| Automatic crossing speed multiplier | 1.12 |
| Route distance | Catch site to destination harbor, scaled by 18 km per world unit |
| Route freshness loss | 0.667 percentage points per model minute |
| Research season report | After 8 completed deliveries |

Delivery payment scales linearly from 45% of the base reward at the minimum freshness to 100% at full freshness. Spoiled fish cannot complete a contract. Rescue returns the boat to the nearest harbor, empties cargo, repairs 55 damage, and deducts at most 20 shells so the save cannot become unrecoverable.

### Runtime art manifest

Every authored visual asset in this slice is generated with GPT Image 2.0. No programmatically generated bitmap, SVG, or placeholder UI asset is permitted. HTML and CSS may arrange, crop, scale, label, and provide accessible states. Canvas may key generated sprite backgrounds at runtime and draw transient simulation effects and non-color gameplay indicators.

| Asset | Runtime purpose |
| --- | --- |
| `fshing-wordmark.png` | Restrained title-screen identity |
| `lake-chart.png` | Side-on panoramic sky, distant shore, waterline, and lake atmosphere |
| `player-boat.png` | Player vessel in strict side profile on a chroma-key matte |
| `harbor-pier.png` | Long weathered side-view harbor pier that extends from either shoreline; its fixed footprint uses roughly 36–44 narrow deck-plank divisions so the timber scale remains believable beside the player boat |
| `fish-atlas.png` | Fishing-hook sprite and retained original fish reference cells |
| `fish-atlas-v2.png` | Nine independently generated, silhouette-distinct species in a strict 3 × 3 atlas |
| `surface-fishing-cues.png` | Six faint school-fish poses plus the primary proximity hook cue in a strict 4 × 2 atlas; the secondary disabled cell is unused |
| `polarized-lens.png` | Soft additive clear-water lens and painted caustic trails shown as the boat approaches a fishing ground |
| `world-atlas.png` | Side-view buoy, fog, night-wake, and retained legacy sprites on a chroma-key matte |
| `ui-panel.png` | Minimal full-bleed dark menu and harbor surface |
| `ui-button.png` | Minimal full-bleed primary action surface |
| `ui-icons.png` | Cargo, freshness, hull, time, shells, objective, engine, lamp, line-depth, permit, repair, sound, and pause pictograms |

Generated files are explicitly imported from `src/assets/`. Prompts and generation settings are recorded in `Docs/Asset-Manifest.md`; authoring intermediates remain outside the production bundle.

Surface fishing grounds use two dedicated GPT Image runtime assets: `surface-fishing-cues.png` supplies six coordinated submerged fish poses plus the single primary hook-and-arc pictogram, while `polarized-lens.png` supplies the feathered clear-water and caustic treatment through additive blending. The atlas's secondary disabled hook cell is intentionally unused. Canvas only places, scales, fades, and animates these authored sprites from deterministic state. Population-aware school size, localized clarity, and a proximity-only hook cue distinguish the grounds without a separate landmark atlas. Site names, access requirements, target species, and population condition remain in objective, specimen-note, and accessible interaction text instead of becoming permanent Canvas labels.

### Slice acceptance tests

- The same seed and inputs produce the same horizontal boat, contract, fish, weather, and day/night state.
- A fresh save can travel from the left harbor to a fishing ground, catch the correct fish below the surface, reach the right harbor, deliver it, and purchase an upgrade.
- Camera tracking, left/right facing, braking, and off-screen objective indication are readable at desktop and mobile landscape sizes.
- Wrong fish, full cargo, spoiled cargo, repair, rescue, and a locked fishing ground have readable outcomes.
- Progression and accessibility settings survive reload; malformed save data is validated and clamped.
- Keyboard, pointer, and touch controls can travel, interact, fish, pause, and navigate overlays.
- Focus loss pauses simulation and reports the gameplay lifecycle stop through `PlatformService`.
- The local game remains playable when the CrazyGames SDK is blocked.
