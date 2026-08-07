# Fishing Cross-Section Refinement — Design QA

## Visual truth and state

- Source visual truth: `/Users/liam/.codex/generated_images/019fd968-1e5a-7d93-8ae7-eb2d82bb84b8/exec-4d585b59-3cb4-4e4a-aa81-88ea61a82a6a.png`.
- Desktop implementation: `/Users/liam/.codex/visualizations/2026/08/07/fishing-species-movement/implementation-desktop.png`.
- Mobile implementation: `/Users/liam/.codex/visualizations/2026/08/07/fishing-species-movement/implementation-mobile.png`.
- Full comparison: `/Users/liam/.codex/visualizations/2026/08/07/fishing-species-movement/full-comparison.png`.
- Focused movement comparison: `/Users/liam/.codex/visualizations/2026/08/07/fishing-species-movement/movement-frames.png`.
- Source size: 1586 × 992 pixels, normalized to 1440 × 900 for the desktop comparison.
- Implementation sizes: 1440 × 900 and 844 × 390 CSS pixels at DPR 1.
- State: settled Sunward Shoal fishing view, Reedfin common-rarity target, normal contrast and motion, tutorial and status toast dismissed. Desktop was captured in daytime; the supplementary mobile view was captured after the same running simulation reached night.

## Findings

No actionable P0, P1, or P2 issues remain in the refined state.

## Comparison history

1. **P2 — static fish:** the first build translated every fish along the same horizontal route and only added cosmetic bob, pitch, and body flex. All nine species now change their real simulation speed and depth using distinct deterministic profiles. The two-frame comparison shows Reedfin, Sun Perch, and Silver Dart changing both horizontal spacing and vertical position; reduced-motion mode removes only the secondary body flex.
2. **P2 — camera settled too low:** the first build placed the waterline at 22% of the viewport, making the surface feel incidental. The settled waterline now sits at 31%, close to the selected mockup's upper-third framing, with the live boat and harbor remaining readable.
3. **P2 — depth barrier too dense:** the first build repeated marker floats across the full width, creating a decorative bead row. The final boundary is a quieter low-opacity line with four small generated survey floats and a shortened mobile label.
4. **P2 — redundant shape copy:** the specimen cue and fishing instruction repeated `Round body · fan fins`. The settled cue now shows only the fish sprite and `REEDFIN`, and the fishing instruction is reduced to `Guide the hook toward the Reedfin.` Shape language remains only in the preceding survey choice where it supports the prediction mechanic.
5. **P2 — unnecessary depth meter:** the vertical ruler and `1 m`, `3 m`, and `6 m` labels added central clutter and implied precision the interaction does not use. The ruler is removed; the existing lower boundary remains the sole line-depth affordance.

## Required fidelity surfaces

### Fonts and typography

The specimen name, boundary label, and movement hint retain the game's condensed, high-weight display treatment. Removing the specimen's secondary line and the three ruler labels restores a sparse hierarchy. Desktop copy remains legible without wrapping; mobile uses `UPGRADE LINE` to avoid collision with the leave control.

### Spacing and layout rhythm

The waterline settles near the upper third, preserving the surface-world context while leaving a broad underwater play field. Removing the center ruler opens a clear route between the hook and moving fish. Hook, fish, sparse line boundary, and corner controls remain separated at 1440 × 900 and 844 × 390. No persistent control clips or overlaps.

### Colors and visual tokens

The live harbor and generated Sunward environment retain the reference's desaturated teal, cream, ink-navy, and restrained amber palette. Common target outlines remain warm ivory, and the quieter boundary no longer competes with that state color.

### Image quality and asset fidelity

The environment, boat, fish, hook, and four line markers are production raster assets with appropriate cropping and transparency. No visible matte edges, rectangular sprite bounds, scaling blur, or placeholder art appears in the verified views.

### Copy and content

The specimen cue contains only the species name, as requested. Fishing guidance no longer repeats the shape description. The survey retains shape language because it is evidence used by the species-prediction interaction rather than persistent fishing-screen chrome.

### Motion, interaction, and accessibility

Each species uses a deterministic movement profile that changes real horizontal speed, burst timing, and depth path. Reedfin cruise, Sun Perch climb in short darts, Silver Dart burst, Needle Pike glide level, Mossback drift, Lantern Eel weave, Gloam Gill hover and surge, Violet Ray arc broadly, and Abyss Crown lunge rarely. Target outlines and chevrons follow the moving state. Reduced-motion mode suppresses body flex but preserves gameplay movement. Keyboard and touch controls remain unchanged, and the Canvas accessible label still communicates site, target, and rarity.

## Intentional differences

- The implementation uses the live sailing panorama and camera, so the boat remains larger than the static concept boat.
- Species, school positions, and animation phases are simulation-driven instead of baked into the background.
- Four boundary floats replace the concept's longer float row in response to the refinement request.
- The concept's depth ruler is intentionally absent in response to the latest refinement request.

## Verification evidence

- Full-view source and implementation comparison at 1440 × 900.
- Two focused desktop frames captured 1.2 seconds apart to verify real horizontal and vertical fish displacement.
- Mobile landscape capture at 844 × 390 with touch and leave controls visible.
- Primary flow tested: play, accept contract, open survey, select Reedfin, enter fishing, dismiss instruction.
- In-app browser console checked for warnings and errors.

## Final severity audit

- P0 blockers: none.
- P1 fidelity or usability issues: none.
- P2 polish issues: none.
- P3 note: the live simulation can briefly cluster fish as their deterministic routes cross; this is transient and does not obscure the target cue.

## Final result

passed
