# FSHING — Game Design Document

## Project summary

**FSHING** is a single-player, side-on 2D delivery and fishing game for web browsers. The player pilots a small boat along a horizontally scrolling lake between settlements built at opposite shores. Towns request particular fish, so the player must travel to fishing grounds, drop and steer a hook through the water beneath the boat, then return before the cargo spoils.

The lake is inviting during the day but becomes disturbing after dark. Darkness reduces visibility, hazardous conditions damage the boat, and unsettling events make nighttime journeys increasingly dangerous. Money from successful deliveries buys more cargo space, greater speed, stronger lights, and access to new regions.

The game has no conventional ending. Its repeating loop continues indefinitely, while completing every delivery tier, unlocking every region, and purchasing every upgrade provides a clear state of mastery.

## Design pillars

1. **Deliveries drive every decision.** Fishing, route choice, upgrades, and risk management exist to support requested deliveries.
2. **Simple to start, satisfying to master.** Side-scrolling boat momentum and direct hook steering should feel immediately understandable but reward precision.
3. **A cozy lake with a disturbing underside.** Daytime is calm and illustrated; nighttime steadily becomes threatening and genuinely frightening.
4. **Short objectives inside a continuous game.** Individual deliveries provide quick goals suitable for a browser session while progression persists between visits.
5. **Small, polished scope.** A compact lake with meaningful routes is preferable to a large, empty world.

## Inspiration and originality

### Inspiration

The main inspiration is *Dredge*, particularly its fishing journeys, boat progression, and contrast between calm daytime travel and dangerous nights.

### Points of originality

FSHING is not intended to reproduce Dredge in 2D. Its distinct focus is a repeatable delivery economy:

- Town requests are the primary objective rather than narrative exploration.
- Fish freshness makes route planning and boat speed central to success.
- The fishing interaction involves directly steering a hook toward visible fish.
- Its compact lake and short delivery contracts are designed for drop-in browser play.
- Progress comes from opening efficient delivery routes and mastering acceleration, braking, and hazard timing along a side-on lake.
- Horror is delivered through 2D visibility, sound, environmental changes, and lake hazards rather than a large story campaign.

## Audience and platform

- **Platform:** Desktop and mobile web, distributed as a static CrazyGames HTML5 build.
- **Genre:** Side-scrolling delivery, fishing, and light survival game.
- **Mode:** Single-player.
- **Audience:** Players who enjoy accessible vehicle handling, collection, upgrades, and atmospheric horror.
- **Content tone:** Cozy during the day. Night sequences may become genuinely disturbing, but should avoid graphic violence and remain suitable for a broad browser-game audience.
- **Session pattern:** Continuous saved game with delivery-sized objectives that can usually be completed in approximately 3–8 minutes.

## Core gameplay loop

1. Visit a harbor and choose a requested fish delivery.
2. Review the destination, reward, required fish, and freshness requirements.
3. Pilot the boat to an appropriate fishing area.
4. Cast a hook and steer it toward the requested fish while avoiding unwanted catches and obstacles.
5. Store the catch in limited cargo space; freshness begins decreasing.
6. Choose a safe or fast route to the delivery harbor.
7. Navigate storms, darkness, and other lake dangers that can damage the boat or delay the delivery.
8. Deliver fresh fish to earn money.
9. Purchase upgrades and unlock access to more dangerous regions with rarer fish and better rewards.
10. Accept another delivery and repeat.

Failed or poor deliveries should cost time and potential income, but should not erase the player's entire save. The player should always have a low-risk way to recover.

## World structure

The game takes place along one connected side-on lake route divided into regions. The camera follows the boat horizontally while layered shore, sky, water, docks, and hazards establish depth without 3D. The initial release should prioritize a dense, readable route rather than a physically long empty map.

### Region progression

- **Starting waters:** Calm, bright, forgiving routes, common fish, and short deliveries.
- **Outer lake:** Longer routes, changing weather, stronger currents, and more valuable fish.
- **Dark waters:** Poor visibility, disturbing events, severe hazards, rare fish, and the highest-paying contracts.

Regions are unlocked through purchased permits or boat upgrades. Locked boundaries must be communicated naturally through gates, hazardous water, harbor authorities, or equipment requirements rather than invisible walls alone.

### Harbors

Each harbor acts as a compact service point. A harbor may provide:

- Available delivery contracts
- Fish delivery and payment
- Boat upgrades
- Repairs
- Region permits
- Brief NPC dialogue

The first release should reuse a consistent harbor interface rather than build fully explorable towns.

## Delivery system

Deliveries are the main source of income and direction.

Each contract defines:

- Requested fish species and quantity
- Destination harbor
- Base payment
- Minimum acceptable freshness
- Optional bonus conditions
- Recommended region or fishing ground

The contract screen must show enough information for the player to make a route decision. Early contracts request common fish in nearby waters. Later contracts combine rarer catches, distant destinations, difficult conditions, and tighter freshness expectations.

Fresh deliveries pay the full reward. Lower freshness reduces the payment. Fully spoiled fish cannot complete a contract, but may be discarded or sold for a negligible amount. Exact freshness rates and rewards must be centralized in balance data and tested before release.

To keep the repeating game playable after all authored contract tiers are complete, the game may generate contracts from validated combinations of unlocked fish, regions, quantities, and destinations.

## Fishing system

Fishing is an active supporting mechanic rather than the entire game.

1. The player reaches a marked fishing area and slows or stops the boat.
2. Available fish silhouettes or movement cues appear beneath the water.
3. The player drops the line from the boat into the water directly below.
4. The camera cuts below the surface while the hook descends through a bounded side-view fishing space.
5. The player steers the hook toward a fish while avoiding weeds, debris, or unwanted species.
6. Contact with a valid fish catches it and uses available cargo capacity.

Fish should have recognizable silhouettes and movement patterns so catches do not depend on color alone. Rarer fish can move faster, hide deeper, or require improved fishing equipment. For the minimum viable release, the hook interaction should remain short and use steering rather than a separate tension or reeling system.

## Boat handling

The boat uses direct horizontal side-scrolling movement:

- Hold left or right to apply thrust in that direction
- Releasing thrust allows short, readable momentum before water drag slows the boat
- Brake reduces speed quickly without instantly snapping the boat to a stop
- The boat faces its current travel direction and uses restrained bob and tilt so motion remains calm and readable
- Boat movement stays on the open horizontal surface without fixed collision obstacles

The handling should feel smooth, measured, and forgiving rather than physically realistic. Acceleration builds gradually, direction changes retain readable momentum, and the lower cruising speed gives the player time to plan without a complicated turning arc.

### Controls

**Keyboard**

- A/D or Left/Right Arrow: thrust left or right
- S or Down Arrow: brake
- W or Up Arrow: short engine boost in the current facing direction
- Space or E: interact, dock, or cast
- Escape or P: pause

**Pointer and touch**

- On-screen left, right, and brake controls during navigation
- Tap prominent interaction buttons to dock, accept contracts, and cast
- Drag or virtual-stick input to steer the hook while fishing

All essential actions must work without hover. Touch targets must be large enough for mobile play, and the interface must respect display safe areas.

Keyboard actions can be rebound from the Controls submenu within Settings. Bindings persist with the rest of the validated settings; assigning an occupied key swaps the two actions, and Escape remains an always-available pause fallback.

The How to play menu presents the core loop as four step-by-step field-note cards. Previous and Next controls move through one card at a time, with the main Back action kept separate below the card navigation.

## Hazards, damage, and night

### Environmental hazards

Dangerous lake conditions provide the main delivery pressure alongside freshness. Hazards may include:

- Wreckage and narrow passages
- Strong currents that alter the boat's path
- Rain, fog, and storms that reduce control or visibility
- Floating debris
- Disturbing nighttime entities or false navigation cues

Dangerous conditions can damage the boat. Damage can reduce maximum speed or handling and creates a repair cost at harbor. At critical damage, the player is rescued and returned to the nearest harbor, losing some cargo freshness and money rather than losing the full save.

### Night and visibility

Night reduces the visible area around the boat and makes hazards harder to read. It should feel dangerous because information becomes unreliable, not simply because the screen becomes uniformly black.

The player can purchase progressively stronger lights. Light upgrades may improve range, width, clarity in fog, or resistance to disturbing effects. Lights are permanent upgrades in the initial scope; a fuel system should only be added if testing shows that night needs another meaningful decision.

Night horror may use:

- Shapes briefly moving beyond the light
- Buoys or landmarks appearing where they should not be
- Distant lights that lead away from safe routes
- Water and radio sounds that intensify in darkness
- Momentary visual distortion after impacts or close encounters
- Unidentified wakes approaching the boat

Horror events must not obscure essential UI, create unavoidable damage, or rely exclusively on sudden loud sounds.

## Economy and progression

Money is earned primarily from completed deliveries and spent on permanent improvements.

### Core upgrade paths

- **Cargo capacity:** Carry more requested fish and combine deliveries efficiently.
- **Engine speed:** Reach fishing areas and destinations before fish spoil.
- **Lights:** See hazards and resist nighttime visibility penalties.
- **Region access:** Purchase permits or equipment needed to enter new waters.

Repair costs provide a money sink and reinforce careful navigation. Prices should rise by upgrade tier without requiring excessive repetition. The player should regularly face a useful decision between upgrading carrying capacity, improving travel time, or entering a more profitable region.

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
- Harbor piers extend inward from their shoreline edge and visually connect to land instead of floating as isolated platforms
- Warm harbor lights contrasted against cool lake colors
- Clear daytime navigation landmarks
- Night palettes that preserve gameplay readability while hiding distant threats
- Subtle wake, rain, fog, current, and light-cone effects
- Disturbing imagery used sparingly so it remains effective

The visual design must communicate fish type, hazards, freshness, damage, and interactable locations through shape, animation, icons, and text—not color alone.

### Technical art constraints

- Render the horizontally scrolling side-on lake, parallax layers, and moving game objects with Canvas 2D.
- Use HTML/CSS overlays for contracts, shops, dialogue, settings, tutorials, and touch controls.
- Design around responsive landscape play, while retaining a functional mobile layout.
- Explicitly import runtime assets so source and authoring files do not enter the production build.
- Prefer reusable layered sprites and procedural effects over large frame-by-frame animations.

## Audio design

Audio should support both comfort and unease:

- Quiet, low engine thrum with only a restrained pitch and volume increase at top speed
- Water, wake, rain, wind, docking, collision, and fishing feedback
- Warm harbor ambience
- Sparse daytime music
- Reduced or altered music at night
- Directional-feeling threat cues represented through stereo where available
- Subtle sounds beyond the visible area

Moment-to-moment feedback should remain restrained but immediate. Boat speed and boost affect the engine tone, button and control presses have a short physical response, casting and catches use distinct cues, and impacts combine sound, haptics where available, a brief flash, and reduced-motion-aware camera shake. Mute and volume apply to all generated feedback.

The game must include a mute control and save its setting. Important dangers must also have visible feedback. Audio should pause or reduce appropriately when the game loses focus.

## Interface and onboarding

The first playable minutes should teach systems through one short delivery:

1. Apply horizontal thrust, brake, and dock at the starting harbor.
2. Accept a nearby request for one common fish.
3. Follow a marked route to a fishing area.
4. Cast and steer the hook into the requested fish.
5. Observe the freshness indicator.
6. Return and deliver the fish.
7. Spend the reward toward the first upgrade.

Tutorial prompts should disappear after the action is successfully performed and remain available from a help menu. The title screen places its menu on the right, leads with one unmistakable start action, and provides secondary How to play and Settings actions while keeping the lake as the visual focus. The harbor screen presents the current delivery as a three-step job route (catch, freshness, destination) before cargo or upgrades, with plain-language guidance about the immediate next action. Navigation has no permanent status bar: world markers, a directional arrow, contextual actions, and short messages carry the active objective. Cargo details, freshness, damage, money, and upgrades are reviewed at harbor. Keyboard players can pause with Escape or their configured pause key; the navigation view has no permanent pause button.

Menu presentation follows shipped adventure-game conventions rather than general web-app patterns. The lake remains visible behind overlays; each screen has one dominant action; job information uses a physical dispatch-ticket treatment; and cargo, upgrades, settings, and help are subordinate rows or pages rather than equal-weight cards. Orange is reserved for the current or available action, while completed and informational states stay neutral. All menu screens share the same squared dockside frame, condensed display typography, visible focus treatment, and restrained horizontal transitions.

## Persistence

The game automatically saves stable progression, including:

- Money
- Purchased upgrade tiers
- Unlocked regions
- Active or available contract state where appropriate
- Tutorial completion
- Settings such as mute, high contrast, and reduced motion
- Keyboard control bindings

Save data is versioned, validated, clamped, and migrated. CrazyGames data storage is used when available, with local storage as a development fallback. Temporary simulation details should not be saved if restoring them could produce an invalid or unfair game state.

## Accessibility and browser requirements

- Keyboard, pointer, and touch support
- Pause when focus is lost
- Mute and volume controls
- Reduced-motion option
- High-contrast option
- Non-color indicators for fish, damage, freshness, and hazards
- Legible scalable text and large touch targets
- No critical information communicated only through audio
- Local play remains functional when the CrazyGames SDK is unavailable
- CrazyGames loading and gameplay lifecycle events are sent through `PlatformService`

## Scope

### Minimum viable game

- One connected lake containing two harbors and two regions
- Responsive side-scrolling boat movement
- Docking and harbor interfaces
- Delivery contracts and freshness
- One complete steer-the-hook fishing interaction
- At least three visually distinct fish
- Cargo, speed, and light upgrades
- Region unlocking
- Day/night cycle with reduced nighttime visibility
- At least one changing lake condition
- Boat damage, repair, and rescue
- Brief tutorial and lightweight dialogue
- Persistent progression and settings
- Keyboard, pointer, and touch controls
- CrazyGames SDK integration
- Unit and browser tests for the complete gameplay loop

### Stretch goals

- Third lake region and additional harbor
- More fish behaviors and fishing obstacles
- Procedurally assembled repeatable contracts
- Currents, fog, and severe storms
- More elaborate nighttime entities and false landmarks
- Additional upgrade tiers
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

## Team organisation

All team members contribute to game design and testing. Each feature should still have one clear owner.

| Team member | Primary responsibilities |
| --- | --- |
| Liam | Lead programming, technical design, integration, builds, and test coordination |
| David | Audio direction, sound production, gameplay design, and playtesting |
| Harrison | Lightweight dialogue, tutorial wording, atmosphere, gameplay design, and playtesting |
| Saxon | Visual direction, UI and asset production, gameplay design, and visual QA |

Liam owns final integration decisions where systems overlap. Saxon defines asset specifications with Liam before production. David and Harrison should deliver audio and text in small, testable batches rather than waiting for the final week.

## Eight-week production plan

The two-month schedule requires an eight-week plan. The minimum viable game takes priority over stretch goals.

### Week 1 — Pre-production and handling prototype

- Lock this GDD and visual references.
- Prototype horizontal thrust, facing, braking, collision, and side-follow camera behavior.
- Define normalized units and initial balance data.
- Produce temporary boat, lake, harbor, hazard, and UI assets.
- Establish the regular build and playtest routine.

**Milestone:** The boat is enjoyable to control around a small test lake.

### Week 2 — World and harbor loop

- Build the first lake region, two harbors, docking, and collision boundaries.
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

### Week 5 — Night, hazards, and progression

- Implement day/night transitions and visibility.
- Add boat damage, rescue, and one dangerous weather condition.
- Add purchasable lights and region access.
- Introduce nighttime visual and audio horror effects.

**Milestone:** Night changes route decisions and the second region is unlockable.

### Week 6 — Content and presentation

- Replace priority placeholder art and audio.
- Add later delivery tiers, higher upgrade levels, and second-region fish.
- Add brief character dialogue and contextual tutorial text.
- Balance rewards, freshness, damage, repair costs, and travel times.

**Milestone:** All minimum viable content is present from a new save through maximum progression.

### Week 7 — Testing and fixing

- Run structured playtests with new players.
- Fix progression blockers, input problems, collision issues, and save errors.
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
- Hold at least one team playtest and task review each week.
- Record bugs with reproduction steps, expected behavior, severity, and owner.
- Prioritize blockers, save corruption, input failures, and unreadable gameplay before cosmetic issues.
- Stop adding minimum-viable features after Week 6 and stop adding all features after Week 7 begins.
- Preserve deterministic simulation and keep gameplay rules independent from rendering and browser APIs.

## Testing strategy

### Automated model tests

- Boat thrust, braking, horizontal speed limits, facing, and damage
- Collision outcomes at different speeds
- Fish freshness over deterministic simulation time
- Contract validation and payment calculations
- Cargo limits
- Upgrade prices, effects, and maximum tiers
- Region unlocking
- Save validation, migration, and clamping
- Deterministic fishing behavior where gameplay randomness is used

### Browser tests

- Start from a new save
- Complete the tutorial delivery
- Catch and deliver a fish
- Purchase and retain an upgrade after reload
- Recover from critical boat damage
- Navigate menus with keyboard and pointer
- Verify touch controls at a mobile viewport
- Pause safely on focus loss
- Run locally when the CrazyGames SDK is blocked

### Playtesting questions

- Is horizontal boat travel enjoyable within the first minute?
- Can players tell where to obtain the requested fish?
- Do freshness and hazards create interesting route decisions without feeling unfair?
- Can players understand why a delivery lost value or failed?
- Is nighttime frightening while remaining readable and avoidable?
- Does each upgrade create a noticeable improvement?
- Is progression satisfying without excessive grinding?

## Success criteria

The release is successful when:

- A new player can complete the tutorial delivery without verbal help.
- The delivery loop remains understandable after returning to the game later.
- Boat handling is responsive on keyboard and touch.
- Night changes player behavior and creates tension without unavoidable failure.
- Progress survives refreshes and invalid save data fails safely.
- Every core upgrade and region can be reached without excessive repetition.
- The game builds as a static CrazyGames-ready bundle and remains playable without the SDK during local development.

## MVP vertical slice implementation contract

This slice proves the complete accept–fish–deliver–upgrade loop through a true side-on 2D game. It replaces the earlier top-down implementation direction completely.

### Player journey

1. Start at **Brindle Harbor** on the left shore and accept **The Morning Order**, requesting one Reedfin for **Gloam Ferry** on the far right.
2. Hold right to leave the dock. The camera follows the boat while distant shoreline and near reeds move at different rates.
3. Brake beneath the hanging Sunward Shoal marker and drop the line.
4. Enter a side-view underwater cutaway, steer the hook down and sideways, and catch the round Reedfin by silhouette.
5. Return to the surface, watch freshness fall, and cross the lake through changing conditions.
6. Dock at Gloam Ferry, complete the delivery, and buy one cargo, engine, or lamp upgrade.
7. Continue with seeded repeatable contracts and purchase the permit required to fish in Outer Gloam.

The tutorial is action-based and a new player should complete the first delivery in roughly two to four minutes.

### Slice content

- One continuous horizontal lake route with Brindle Harbor at the left edge and Gloam Ferry at the right edge.
- A side-follow camera with generated panoramic scenery, layered parallax, a readable waterline, and underwater cutaway fishing.
- Three fishing grounds and three side-profile fish: round **Reedfin**, long **Needle Pike**, and fork-tailed **Gloam Gill**.
- Authored tutorial contract followed by seeded repeatable contracts selected from unlocked fish.
- Cargo freshness, payment scaling, limited capacity, upgrades, repair, critical-damage rescue, fog, and day/night pressure.
- Direct left/right/brake keyboard and touch travel controls plus direct two-axis hook steering.
- Quiet title, harbor, contract, pause, settings, help, contextual prompt, and result overlays using a completely new image-generated visual system.

### Initial balance

All durations use simulation seconds; horizontal positions use normalized world distance; speeds use normalized world units per second.

| Value | Initial setting |
| --- | --- |
| Horizontal thrust | 0.055 units/s² |
| Engine boost thrust | 0.085 units/s² |
| Base maximum surface speed | 0.08 units/s |
| Brake strength | 0.72 units/s² |
| Passive water drag | 0.62 per second |
| Camera view width | 0.59 world units |
| Critical rescue threshold | 100 damage |
| Freshness lifetime | 150 seconds |
| Tutorial minimum freshness | 35% |
| Tutorial reward | 90 shells |
| Cargo capacity | 1 fish, then 2 at tier 1 |
| Cargo upgrade | 60 shells |
| Engine upgrade | 70 shells; +16% maximum speed |
| Lamp upgrade | 70 shells; +24% night visibility |
| Outer Gloam permit | 85 shells |
| Repair price | 1 shell per 2 damage, rounded up |
| Full day/night cycle | 210 seconds; final 70 seconds are night |
| Fog cycle | 48 seconds; readable warning precedes dense fog |

Delivery payment scales linearly from 45% of the base reward at the minimum freshness to 100% at full freshness. Spoiled fish cannot complete a contract. Rescue returns the boat to the nearest harbor, empties cargo, repairs 55 damage, and deducts at most 20 shells so the save cannot become unrecoverable.

### Runtime art manifest

Every authored visual asset in this slice is generated with GPT Image 2.0. No programmatically generated bitmap, SVG, or placeholder UI asset is permitted. HTML and CSS may arrange, crop, scale, label, and provide accessible states. Canvas may key generated sprite backgrounds at runtime and draw transient simulation effects and non-color gameplay indicators.

| Asset | Runtime purpose |
| --- | --- |
| `fshing-wordmark.png` | Restrained title-screen identity |
| `lake-chart.png` | Side-on panoramic sky, distant shore, waterline, and lake atmosphere |
| `player-boat.png` | Player vessel in strict side profile on a chroma-key matte |
| `harbor-pier.png` | Long weathered side-view harbor pier that extends from either shoreline |
| `fish-atlas.png` | Side-profile Reedfin, Needle Pike, Gloam Gill, and hook sprites on a chroma-key matte |
| `world-atlas.png` | Side-view buoy, fishing marker, fog, night-wake, and retained legacy sprites on a chroma-key matte |
| `ui-panel.png` | Minimal full-bleed dark menu and harbor surface |
| `ui-button.png` | Minimal full-bleed primary action surface |
| `ui-icons.png` | Cargo, freshness, hull, time, shells, objective, engine, lamp, permit, repair, sound, and pause pictograms |

Generated files are explicitly imported from `src/assets/`. Prompts and generation settings are recorded in `Docs/Asset-Manifest.md`; authoring intermediates remain outside the production bundle.

### Slice acceptance tests

- The same seed and inputs produce the same horizontal boat, contract, fish, weather, and day/night state.
- A fresh save can travel from the left harbor to a fishing ground, catch the correct fish below the surface, reach the right harbor, deliver it, and purchase an upgrade.
- Camera tracking, left/right facing, braking, and off-screen objective indication are readable at desktop and mobile landscape sizes.
- Wrong fish, full cargo, spoiled cargo, repair, rescue, and a locked fishing ground have readable outcomes.
- Progression and accessibility settings survive reload; malformed save data is validated and clamped.
- Keyboard, pointer, and touch controls can travel, interact, fish, pause, and navigate overlays.
- Focus loss pauses simulation and reports the gameplay lifecycle stop through `PlatformService`.
- The local game remains playable when the CrazyGames SDK is blocked.
