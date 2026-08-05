# Fishing Spot Rework — Design QA

## Visual truth and test state

- Primary references: `/Users/liam/.codex/attachments/73a385fd-120f-470c-a96a-1a0de9cc7a82/image-1.png` and `/Users/liam/.codex/attachments/73a385fd-120f-470c-a96a-1a0de9cc7a82/image-2.png`.
- Final implementation capture: `Docs/screenshots/06-fishing-spot-hybrid.jpg`.
- Centered interaction-cue capture: `Docs/screenshots/10-fishing-hook-centered.jpg`.
- Discovery capture: `Docs/screenshots/07-fishing-spot-discovery.jpg`.
- Mobile accessibility capture: `Docs/screenshots/08-fishing-spot-mobile-accessibility.jpg`.
- Full hook-placement comparison: `/Users/liam/.codex/visualizations/2026/08/05/019fd145-e573-7c23-a56c-8ad5c07df804/fishing-spot-hook-above-comparison.jpg`.
- Focused hook, boat, and shoal comparison: `/Users/liam/.codex/visualizations/2026/08/05/019fd145-e573-7c23-a56c-8ad5c07df804/fishing-spot-hook-above-focus.jpg`.
- Desktop viewport: 1380 × 1140 CSS pixels at DPR 1, matching the reference dimensions.
- Mobile viewport: 844 × 390 CSS pixels at DPR 1.
- Desktop state: first contract accepted, boat centered at Sunward Shoal, inside interaction range, normal contrast and motion, tutorial and toast visually dismissed.
- Mobile state: Sunward Shoal in range, normal contrast and motion, touch controls visible.

## Comparison history

1. **P1 — cue occlusion:** the first implementation rendered the shoal before the boat's water-contact pass, which repainted nearby fish and the hook. The boat now renders first and the complete fishing cue renders above its water contact.
2. **P1 — asset fidelity:** the early lens and cue were procedural and visually too geometric. All visible surface fish, hook, arc, and polarized-lens art were replaced with dedicated GPT Image outputs; Canvas now only positions, fades, scales, and animates those sprites.
3. **P2 — scale and density:** an initial generated-asset pass made the fish and hook too large and dispersed. Fish scale, shoal width, hook scale, and depth distribution were tightened to match the compact school in the approved directions.
4. **P2 — discovery readability:** the distant school was too close to invisible. Its minimum visibility was raised while the lens still ramps only on approach and the hook remains exactly hidden outside interaction range.
5. **P1 — hook position and ownership:** the first delivered hybrid placed the hook at sea level and recomputed its horizontal position from the boat. The revised implementation anchors the hook to the fishing ground's projected world position and places it in clear air above the boat, matching Direction A. A browser test moves the boat within the interaction radius and confirms the hook shifts on screen with the ground rather than staying attached to the boat.
6. **P1 — interaction-ring desynchronization and optical alignment:** the HTML hit target previously moved only during the 15 Hz HUD refresh while the Canvas hook moved every rendered frame, and the authored hook art sat above-left of its atlas cell center. The target now synchronizes immediately after every Canvas render. Atlas-measured optical-center offsets align the complete hook-and-arc artwork with the target center. The browser regression samples 24 rendered frames during boat movement and requires more than eight distinct target positions.

## Required fidelity surfaces

### Typography

The approved fishing cue contains no persistent type. The implementation removes the former floating nameplate completely. The transparent interaction target retains the accessible name `Drop line · Sunward Shoal` without adding visible text.

### Spacing and layout

The hook is centered above the fishing ground in clear air, with the ground, lens, and school sharing one world-space horizontal anchor. It stays fixed to that ground while the boat moves inside interaction range. Direction A's above-water hook and wider living school are combined with Direction B's localized lens. The production panorama has a lower waterline and larger boat than the concept renders; preserving the game's existing camera, panorama, and boat scale is an intentional scope constraint rather than a cue mismatch.

### Color and tokens

The generated cue uses the references' desaturated ink-teal fish, pale turquoise clear-water reveal, cream hook, and restrained amber highlight. The normal mode remains atmospheric; high contrast increases cue opacity and highlight separation without introducing a new hue family.

### Image quality and assets

`surface-fishing-cues.png` and `polarized-lens.png` are built-in GPT Image outputs, uniformly downscaled for 2× runtime use. The magenta atlas matte is keyed in memory and the black lens field is removed through screen compositing. Final desktop and mobile captures show no rectangular edges, hard lens polygon, key-color halo, blur from upscaling, or sprite clipping. The retired fishing-spot landmark atlas is no longer imported or emitted in the production build.

### Copy and content

Permanent fishing-ground names, species labels, buoy-like landmarks, and interaction rings are gone. Supporting copy now consistently directs the player to follow the shoal and wait for the hook. The fishing action's accessible label and the survey flow still communicate the specific ground name.

## Responsive, interaction, and accessibility checks

- Desktop normal mode: cue is centered, unobscured, and readable against the harbor panorama.
- Far discovery state: submerged fish remain faintly discoverable; the hook control is hidden.
- Mobile landscape state: the hook remains above the boat and the school remains clear of the touch controls, with no overlap or clipping.
- Interaction state: the transparent 78 × 78 DOM target follows the fixed-world Canvas hook every rendered frame; the generated hook-and-arc artwork is optically centered within it and the target provides visible hover/focus treatment without duplicating the artwork.
- In-app browser console audit: no errors or warnings in the verified fishing and survey states.
- Survey interaction opened successfully from the generated hook cue.

## Final severity audit

- P0 blockers: none.
- P1 fidelity or usability issues: none.
- P2 polish issues: none.
- P3 note: the production panorama's daytime crop is brighter than the concept images; changing the world panorama was deliberately excluded from this fishing-spot-only rework.

## Final result

passed
