# Fishing Cross-Section Refinement — Design QA

## Visual truth and state

- Source visual truth: `/Users/liam/.codex/generated_images/019fd968-1e5a-7d93-8ae7-eb2d82bb84b8/exec-4d585b59-3cb4-4e4a-aa81-88ea61a82a6a.png`.
- Desktop implementation: `/Users/liam/.codex/visualizations/2026/08/07/fishing-cross-section-refinement/implementation-desktop.png`.
- Mobile implementation: `/Users/liam/.codex/visualizations/2026/08/07/fishing-cross-section-refinement/implementation-mobile.png`.
- Full comparison: `/Users/liam/.codex/visualizations/2026/08/07/fishing-cross-section-refinement/full-comparison.png`.
- Focused animation comparison: `/Users/liam/.codex/visualizations/2026/08/07/fishing-cross-section-refinement/animation-frames.png`.
- Source size: 1586 × 992 pixels, normalized to 1440 × 900 for the desktop comparison.
- Implementation sizes: 1440 × 900 and 844 × 390 CSS pixels at DPR 1.
- State: settled Sunward Shoal fishing view, Reedfin common-rarity target, normal contrast and motion, tutorial and status toast dismissed.

## Findings

No actionable P0, P1, or P2 issues remain in the refined state.

## Comparison history

1. **P2 — static fish:** the first build translated fish horizontally but rendered each sprite rigidly. Fish now have deterministic per-target bob, pitch, and body-flex cycles layered over gameplay movement. The two-frame comparison shows independent positions and poses; reduced-motion mode removes the secondary cycles.
2. **P2 — camera settled too low:** the first build placed the waterline at 22% of the viewport, making the surface feel incidental. The settled waterline now sits at 31%, close to the selected mockup's upper-third framing, with the live boat and harbor remaining readable.
3. **P2 — depth barrier too dense:** the first build repeated marker floats across the full width, creating a decorative bead row. The final boundary is a quieter low-opacity line with four small generated survey floats and a shortened mobile label.
4. **P2 — redundant shape copy:** the specimen cue and fishing instruction repeated `Round body · fan fins`. The settled cue now shows only the fish sprite and `REEDFIN`, and the fishing instruction is reduced to `Guide the hook toward the Reedfin.` Shape language remains only in the preceding survey choice where it supports the prediction mechanic.

## Required fidelity surfaces

### Fonts and typography

The specimen name, depth labels, boundary label, and movement hint retain the game's condensed, high-weight display treatment. Removing the secondary specimen line restores the sparse hierarchy of the selected visual. Desktop copy remains legible without wrapping; mobile uses `UPGRADE LINE` to avoid collision with the leave control.

### Spacing and layout rhythm

The waterline now settles near the upper third, preserving the surface-world context while leaving a broad underwater play field. Hook, ruler, fish, sparse line boundary, and corner controls remain separated at 1440 × 900 and 844 × 390. No persistent control clips or overlaps.

### Colors and visual tokens

The live harbor and generated Sunward environment retain the reference's desaturated teal, cream, ink-navy, and restrained amber palette. Common target outlines remain warm ivory, and the quieter boundary no longer competes with that state color.

### Image quality and asset fidelity

The environment, boat, fish, hook, and four line markers are production raster assets with appropriate cropping and transparency. No visible matte edges, rectangular sprite bounds, scaling blur, or placeholder art appears in the verified views.

### Copy and content

The specimen cue contains only the species name, as requested. Fishing guidance no longer repeats the shape description. The survey retains shape language because it is evidence used by the species-prediction interaction rather than persistent fishing-screen chrome.

### Motion, interaction, and accessibility

Fish continue their deterministic horizontal routes while each target receives an independent secondary swim cycle. Target outlines and chevrons follow the animated pose. Reduced-motion mode suppresses bob, pitch, and flex. Keyboard and touch fishing controls remain unchanged, and the Canvas accessible label still communicates site, target, and rarity.

## Intentional differences

- The implementation uses the live sailing panorama and camera, so the boat remains larger than the static concept boat.
- Species, school positions, and animation phases are simulation-driven instead of baked into the background.
- Four boundary floats replace the concept's longer float row in response to the refinement request.

## Verification evidence

- Full-view source and implementation comparison at 1440 × 900.
- Two desktop frames captured 420 ms apart to verify independent fish motion.
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
