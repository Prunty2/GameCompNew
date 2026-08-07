# Fishing Cross-Section — Design QA

## Visual truth and test state

- Approved reference: `/Users/liam/.codex/generated_images/019fd968-1e5a-7d93-8ae7-eb2d82bb84b8/exec-4d585b59-3cb4-4e4a-aa81-88ea61a82a6a.png`.
- Desktop implementation: `/Users/liam/.codex/visualizations/2026/08/07/fishing-cross-section/implementation-desktop.png`.
- Mobile implementation: `/Users/liam/.codex/visualizations/2026/08/07/fishing-cross-section/implementation-mobile.png`.
- Full comparison: `/Users/liam/.codex/visualizations/2026/08/07/fishing-cross-section/full-comparison.png`.
- Focused specimen and line-limit comparison: `/Users/liam/.codex/visualizations/2026/08/07/fishing-cross-section/focused-comparison.png`.
- Reference source: 1586 × 992 pixels, normalized to the 1440 × 900 desktop viewport for comparison.
- Implementation viewports: 1440 × 900 and 844 × 390 CSS pixels at DPR 1.
- State: settled Sunward Shoal fishing view, Reedfin common-rarity target, normal contrast and motion, tutorial and transient toast dismissed.

## Comparison history

1. **P2 — line-limit asset mismatch:** the first implementation reused a world-atlas buoy cell, which became a row of irregular orange spikes at gameplay size. It was replaced with a dedicated round cream-and-amber survey-float sprite generated for the selected mockup and repeated along the boundary.
2. **P2 — small-landscape overlap:** the line-limit label initially competed with the `Leave fishing` control at 844 × 390. The compact layout now places the label above the boundary, clear of the control.
3. **P2 — target readability:** the selected fish was readable as a sprite but the target state was too subtle at normal gameplay scale. The final treatment uses a silhouette-following outline plus a downward chevron; the outline changes by rarity while the chevron remains a non-color cue.

## Required fidelity surfaces

### Camera and composition

The view eases down through the existing sailing waterline instead of cutting to a separate aquarium. The settled composition retains the real sailing panorama and boat in the narrow top band while the selected site's underwater painting fills the play space. Reduced-motion mode skips directly to the settled framing.

### Typography and hierarchy

The target specimen is an unboxed upper-right cue with the authored fish sprite, name, and shape description. The depth ruler, line-limit label, and desktop movement hint use the existing condensed game typography and remain subordinate to the moving hook and fish.

### Color and target states

Common targets use warm ivory, uncommon targets sea-glass green, rare targets amber, and legendary targets restrained violet. The outline follows the sprite alpha rather than drawing a rectangular bracket, and the chevron preserves target identification without relying on color.

### Assets and layering

Sunward Shoal, Mosswater Pool, and Outer Gloam each use a distinct generated background-only environment. Fish, hook, line, target outline, depth ruler, line-limit floats, and labels remain separate movable or procedural layers. The production backgrounds are quality-compressed JPEGs; the line-limit float retains authored transparency.

### Responsive behavior

At 844 × 390, the waterline, target fish, depth ruler, specimen cue, line-limit boundary, touch control, and leave control remain visible without clipping. The boundary label moves above the line to avoid the leave control. Desktop-only movement help is removed in favor of the existing touch joystick.

## Intentional differences

- The implementation uses the live sailing panorama and camera, so the boat is larger and the harbor crop is tighter than the concept image. This preserves visual continuity with actual sailing, as requested.
- The comparison shows the active contract's Reedfin instead of the concept's Silver Dart. Species, target positions, and rarity color are gameplay-driven rather than baked into the environment.
- Two Reedfin targets can be outlined because the deterministic school spawns two residents of each valid species. Both are valid targets and move independently.

## Verification

- Full-view and focused side-by-side comparisons show the final reference and implementation at matching 1440 × 900 dimensions.
- In-app browser desktop and mobile checks completed with no console warnings or errors.
- The camera descent, site key, rarity, and accessible fishing label are covered by browser tests.
- Pure presentation tests cover camera progress, reduced motion, line-tier boundary depth, rarity colors, and per-site environment selection.

## Final severity audit

- P0 blockers: none.
- P1 fidelity or usability issues: none.
- P2 polish issues: none.
- P3 note: live simulation content creates small composition differences from the static concept, while preserving the approved hierarchy and interaction cues.

## Final result

passed
