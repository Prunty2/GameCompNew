# FSHING asset manifest

The initial authored visual set was generated with GPT Image 2.0 on 24 July 2026. The expanded nine-species fish atlas was generated with OpenAI's built-in image-generation tool on 31 July 2026, and the standalone tutorial-guide prototype and its eight-pose sequence were generated with the same built-in image workflow on 5 August 2026. No bitmap, SVG, icon, texture, panel, button, logo, scenery plate, or game sprite was created with drawing code.

The untouched generated outputs are preserved in `output/imagegen/`. Runtime copies live in `src/assets/` and are explicitly imported by TypeScript or CSS. HTML and CSS arrange and label the generated interface surfaces. Canvas draws the simulation, camera, line, wake, water movement, visibility, and accessibility indicators; it does not manufacture replacement UI art.

The boat, harbor pier, fish atlas, and world atlas were requested on a uniform `#FF00FF` matte. The renderer removes the atlas and boat mattes in memory; the harbor pier matte is removed during authoring so its long shoreline edge can be tightly cropped without changing the generated subject.

## Generation record

### `lake-chart.png`

- Runtime role: horizontal side-view panorama and parallax source
- Generated size: 1672 × 941
- Prompt: “Use GPT Image 2.0. Create a wide 16:9 illustrated background plate for a side-scrolling 2D browser game named FSHING. STRICT side-on landscape view, not top-down and not isometric. A long calm freshwater lake crosses the full image horizontally; crisp waterline at about 58 percent of image height; layered low wooded hills and reeds; small warm working harbor silhouette at far left; a colder lonely ferry landing light at far right; quiet overcast late-afternoon sky. Restrained editorial gouache and screen-print style, simplified shapes, subtle paper grain, muted slate blue, lake teal, warm cream and sparse safety-orange light accents. No boat, no fish, no characters, no text, no logo, no interface, no icons, no borders, no map, no labels. Full-bleed scenery, readable behind gameplay silhouettes, coherent horizontal parallax layers.”

### `player-boat.png`

- Runtime role: player vessel, strict side profile
- Generated size: 1536 × 1024
- Generation mode: GPT Image 2.0 style-transfer edit using the earlier boat as the subject reference and `lake-chart.png` as the painting-style reference
- Prompt: “Use GPT Image 2.0. Use case: style-transfer. Asset type: player boat sprite for a side-on 2D browser game. Input 1 is the existing boat and defines the subject, strict orthographic side-profile composition, right-facing direction, workboat proportions, cream cabin, blue hull, small crane, cargo crate, and tiny amber lamp. Input 2 is the lake panorama and is ONLY the required painting-style reference. Repaint the boat so it genuinely belongs in Input 2: quiet desaturated gouache, soft dry-brush edges, visible aged-paper grain, slightly hazy atmospheric color, restrained contrast, simplified shapes, muted slate-blue hull, weathered gray-cream cabin, sparse dull ochre details, and a small warm lamp. Reduce the crisp ink outline, sharp digital edge, saturated color, high micro-detail, and sticker-like contrast of Input 1. Keep the boat readable at 100–160 pixels but painterly and subdued. Preserve exactly one complete boat, strict side profile facing right, with no person. Place the isolated boat centered on a perfectly uniform full-bleed pure chroma-magenta #FF00FF matte. No water, wake, reflection, shadow, landscape, fog, text, UI, border, grid, or extra object outside the boat. The matte must have no texture, gradient, checkerboard, or lighting variation. Avoid: clip-art, cel shading, hard black contour, glossy 3D rendering, oversaturation, photorealism.”
- Final readability refinement: “Use GPT Image 2.0. Use case: style-transfer refinement. Input 1 is the current player boat sprite and must remain the same strict side-profile, right-facing workboat with identical silhouette, proportions, crane, crate, cabin, hull, and lamp. Input 2 is the lake panorama and remains the painting-style reference only. Keep the successful desaturated gouache, aged-paper grain, dry-brush softness, muted slate-blue and gray-cream palette, and atmospheric integration of Input 1. Make only one targeted adjustment for gameplay readability at 100–160 pixels: increase opaque paint coverage and local value contrast by about 15–20 percent, deepen the slate-blue hull and the cabin/crane shadow shapes, and make the cream cabin slightly more distinct from the distant shoreline. Keep edges painterly and soft; do not add a black contour, digital sharpness, saturated color, or high micro-detail. Preserve the small warm lamp accent. Exactly one complete boat centered on a perfectly uniform full-bleed pure chroma-magenta #FF00FF matte. No water, wake, reflection, shadow, landscape, fog, text, UI, border, grid, or extra objects. Avoid: transparency within the boat, washed-out ghostly values, clip-art, cel shading, glossy 3D rendering, oversaturation, photorealism.”

### `fish-atlas.png`

- Runtime role: original three-fish reference atlas; the hook cell remains in active use
- Generated size: 1254 × 1254
- Prompt: “Use GPT Image 2.0. Create a strict 2 by 2 sprite atlas for a side-on 2D fishing game. Every cell equal size and every object entirely inside its cell with generous padding. Top-left: round-bodied Reedfin with broad fan fins. Top-right: long needle-like pike with sharp pointed snout. Bottom-left: compact eerie Gloam Gill with forked tail and a single eye-like side marking. Bottom-right: simple J-shaped fishing hook with short swivel, no long line. All three fish in STRICT orthographic side profile facing right, with bold distinct silhouettes. Restrained editorial gouache/screen-print style, muted lake teal, cream, ink navy, and sparse orange accents. No labels, text, borders, cell dividers, bubbles, plants, scenery, water, shadows, or extra objects. Entire canvas behind all cells must be perfectly uniform full-bleed pure chroma-magenta #FF00FF with no texture, gradient, checkerboard, or variation.”

### `fish-atlas-v2.png`

- Runtime role: nine distinct fish sprites in the exact row-major order Reedfin, Sun Perch, Silver Dart, Needle Pike, Mossback, Lantern Eel, Gloam Gill, Violet Ray, and Abyss Crown
- Generated size: 1254 × 1254
- Generation mode: OpenAI built-in image generation, using `fish-atlas.png` for sprite treatment and `lake-chart.png` for palette/painting context
- Prompt: “Create one original strict 3 × 3 sprite atlas for FSHING. Use the supplied fish atlas only for the restrained editorial gouache/screen-print treatment and the lake image only for its desaturated teal, cream, ink-navy and sparse amber palette. Put exactly one complete fish in each equal cell with generous padding, strict orthographic side profile facing right, no overlap, and a uniform full-bleed chroma-magenta matte. Row 1: round Reedfin with fan fins; tall Sun Perch with crest; slim Silver Dart with split tail. Row 2: long Needle Pike with pointed snout; heavy Mossback with leaf-like fins; snake-like Lantern Eel with a small lure. Row 3: Gloam Gill with fork tail and eye marking; wide Violet Ray with ribbon tail; armoured Abyss Crown with crowned head and pale sensory eye. Make all nine silhouettes immediately different at gameplay size. No text, labels, borders, grid lines, hook, water, bubbles, plants, scenery, shadows, extra objects, copied characters, or designs from another fishing game.”
- Originality note: species names, silhouettes, arrangement, palette direction, and prompt were authored specifically for FSHING. The output does not reproduce assets from *Cat Goes Fishing* or another commercial game.

### `world-atlas.png`

- Runtime role: buoy, fishing marker, fog, and night wake; the original dock and rock cells remain in the source atlas but are not rendered
- Generated size: 1536 × 1024
- Prompt: “Use GPT Image 2.0. Create a strict 3 by 2 sprite atlas for a side-on 2D lake game. Every cell equal size and every object entirely inside its cell with generous padding. Top-left: short wooden dock and mooring posts in strict side profile. Top-middle: jagged rock protruding above the waterline in strict side profile. Top-right: one simple amber buoy in strict side profile. Bottom-left: hanging fishing-ground marker with a small suspended fish-shaped sign and a reed tuft. Bottom-middle: low horizontal fog wisp. Bottom-right: ambiguous dark wake or long lake-creature silhouette just under water, unsettling but non-graphic. Restrained editorial gouache/screen-print style, bold readable silhouettes, muted ink navy, cream, lake teal, weathered wood, and sparse orange. No labels, text, borders, grid lines, cell dividers, water, scenery, additional objects, or shadows outside the objects. Entire canvas background must be perfectly uniform full-bleed pure chroma-magenta #FF00FF with no texture, gradient, checkerboard, or variation.”

### `harbor-pier.png`

- Runtime role: long shoreline-connected pier for both harbors; mirrored at the right shore
- Generated source size: 2148 × 732
- Runtime cropped size: 1623 × 386 with authored alpha
- Generation mode: built-in image edit using the previous `harbor-pier.png` as the composition target, `lake-chart.png` as the painting-style reference, and `player-boat.png` as the scale reference
- Prompt: “Use case: precise-object-edit. Asset type: runtime harbor-pier sprite for a side-on 2D browser game. Image 1 is the edit target and authoritative pier composition. Image 2 is the authoritative painting-style, atmosphere, and palette reference only. Image 3 is a scale reference only; do not include the boat. Regenerate the pier from Image 1 so the same overall pier footprint contains far more, much narrower deck planks. Replace the current roughly 18 oversized deck boards with approximately 40 distinct narrow plank divisions distributed evenly across exactly the same deck length. Make each board read as ordinary dock timber at the scale of the boat in Image 3. Refine the horizontal fascia boards and supporting pilings to the same smaller construction scale without making the structure visually busy. Preserve exactly one long, low, weathered wooden pier in strict orthographic side profile; the same left-edge shoreline cut, full pier length, deck height, thickness, outer edge, two above-deck mooring posts, rope wrapping, and supporting-pile arrangement; the original muted ink-navy, gray-brown, and cream palette; restrained editorial gouache/screen-print painting, dry-brush edges, aged-paper grain, and subdued contrast matching Image 2; and an uncluttered, readable silhouette at gameplay size. Use a very wide horizontal composition with the pier touching and exiting the left edge, a substantial rope-wrapped outer mooring post at the far right, all geometry fully visible vertically, and modest padding. Use a perfectly uniform full-bleed pure chroma-magenta #FF00FF matte for background removal with no texture, gradient, shadow, floor, water, reflection, checkerboard, or lighting variation. Do not use #FF00FF anywhere in the pier. Change only timber scale and plank density; preserve the recognizable pier design and orientation. No boat, people, buildings, landscape, water, text, UI, border, grid, extra objects, detached boards, or watermark. Avoid wide cabin-sized planks, fewer than 32 visible plank divisions, top-down perspective, diagonal perspective, floating isolated platform, glossy 3D, hard black outline, saturated color, or photorealism.”
- Post-processing: hard chroma key sampled from the generated border with 45 tolerance, despill, and one-pixel edge contraction; cropped to the alpha bounds and runtime aspect ratio so the shoreline cut and outer post meet opposite canvas edges, then uniformly resized to 1623 × 386

### `fshing-wordmark.png`

- Runtime role: title identity
- Generated size: 1536 × 1024
- Prompt: “Use GPT Image 2.0. Create a full-bleed title identity plate for a side-on 2D lake game. The exact single word FSHING, spelled F-S-H-I-N-G with no other words, in bold compact hand-painted uppercase display lettering. Cream letters with subtle worn ink texture and one small safety-orange accent stroke, centered with generous breathing room. Restrained editorial screen-print design, mature and understated, no nautical cliches, no hook forming a letter, no cartoon bubble style, no ornate frame, no extra icons. Full rectangular canvas covered edge-to-edge by a flat deep ink-navy painted background with very subtle paper grain; no transparency, no checkerboard, no border, no mockup.”

### `ui-panel.png`

- Runtime role: title, harbor, pause, settings, help, tutorial, and toast surface
- Generated size: 1536 × 1024
- Prompt: “Use GPT Image 2.0. Create a seamless-looking full-bleed interface panel surface for a restrained side-on 2D lake game. Edge-to-edge deep ink-navy painted paper with subtle coarse screen-print grain, a very thin inset warm-cream keyline, and one tiny safety-orange registration-mark accent in a corner. Minimal editorial design, quiet and practical. No text, no icons, no buttons, no sections, no ornate metal, no wood, no rivets, no bevel, no glowing, no transparency, no checkerboard, no external margin. The artwork must fill the entire rectangular canvas so it can be directly stretched as a dark UI panel.”

### `ui-button.png`

- Runtime role: primary actions and touch-control surfaces
- Generated size: 1536 × 1024
- Prompt: “Use GPT Image 2.0. Create a full-bleed primary action button surface for a restrained side-on 2D lake game. Edge-to-edge warm safety-orange and ochre painted rectangle, minimal screen-print texture, subtly darker bottom edge and a thin deep ink-navy inner keyline. Confident, practical, high-contrast, slightly worn but clean. No text, no icon, no arrow, no label, no ornate frame, no metal, no wood, no rivets, no detached shadow, no transparency, no checkerboard, no external margin. The colored surface must fill the entire canvas and remain readable when stretched behind HTML button text.”

### `ui-icons.png`

- Runtime role: thirteen status, objective, upgrade, setting, and pause pictograms
- Generated size: 1448 × 1448
- Prompt: “Use GPT Image 2.0. Regenerate the complete menu icon set. Preserve these pictogram meanings: cargo crate; fish freshness shown by fish plus leaf; damaged boat hull; clock/time; shell currency; objective compass arrow; engine; boat lamp; line depth shown by a fishing line descending through depth marks to a hook; stamped permit paper; repair wrench; speaker/sound; pause bars. Use restrained bold screen-printed game UI pictograms, warm cream shapes with sparse safety-orange details, crisp high-contrast silhouettes, matching the existing FSHING interface. Use one icon per cell, consistent apparent scale, generous equal safe padding, and no artwork crossing a cell boundary. Place the icons on a perfectly flat solid chroma-key background for removal. No navy or colored tiles, circles, medallions, labels, letters, numbers, borders, grid lines, frames, shadows, reflections, watermark, or checkerboard.”
- Processing: The flat keys were removed to alpha, then the generated pictogram bounds were mechanically packed into the first thirteen cells of a 4 × 4 atlas with three transparent unused cells. Every alpha-bound centre is within 0.5 px of its 362 × 362 cell centre; the artwork itself was not redrawn during packing.

### `padlock-icon.png`

- Runtime role: locked Cargo inventory slots
- Generated source size: 1254 × 1254; optimized runtime size: 256 × 256 with authored alpha
- Generation mode: OpenAI built-in GPT Image 2.0 generation followed by local chroma-key removal and Lanczos downscaling
- Prompt: “Use case: stylized-concept. Asset type: game UI padlock icon for the FSHING browser game. Create one original closed padlock pictogram for locked cargo inventory slots: front-facing and symmetrical, with a thick rounded shackle, compact rectangular lock body, and one small keyhole. Restrained bold hand-painted screen-print treatment; warm cream main shape, sparse safety-orange keyhole, very limited ink-navy contour detail; crisp silhouette readable at 30–50 pixels. Exactly one centered icon with generous equal padding on a perfectly flat solid #00FF00 chroma-key background. No navy tile, circle, medallion, border, frame, label, text, extra object, shadow, reflection, or watermark.”
- Processing: The flat chroma key was removed with a soft matte and despill. The full generated source is retained as `output/imagegen/padlock-icon-source.png`; the runtime alpha PNG was reduced to 256 × 256 to avoid shipping unused resolution.

### `tutorial-guide.png`

- Runtime role: demo-only full-screen portrait of Rook in `tutorial-demo.html`; not connected to first-start gameplay
- Generated source size: 953 × 1651; runtime size: 953 × 1651 with authored alpha
- Generation mode: OpenAI built-in image generation, using the first realistic Rook draft as the authoritative character/wardrobe reference and a user-supplied stylized farmer render as the proportion/material reference
- Final prompt: “Use case: style-transfer. Asset type: high-resolution full-screen dialogue character sprite for the FSHING browser game. Input images: Image 1 is the authoritative character design and identity reference. Image 2 is only the visual style and proportion reference: chunky exaggerated toy-like 3D farm-mechanic character design, simplified sculpted forms, oversized head and hands, compact sturdy body, playful asymmetry, smooth hand-painted materials, and readable silhouette. Primary request: restyle the exact lake surveyor from Image 1 into the stylized chunky 3D cartoon character language shown by Image 2. Make him clearly non-realistic and game-like while remaining recognizable as the same person. Preserve from Image 1: male lake surveyor in his late 40s; calm observant personality; salt-and-pepper beard; dull orange knit beanie; faded ink-navy waterproof work jacket; gray-cream knitted layer; patched slate work trousers; sturdy brown work boots; small brass pin; battered blue field notebook held at his side; three-quarter stance looking slightly toward screen-right. Change only the rendering style and proportions: enlarge head and hands, shorten and broaden the body, simplify facial planes, make the beard a bold sculpted shape, make clothing seams and patches chunky and readable, use soft rounded toy-like geometry and stylized hand-painted 3D materials. Retain slightly weathered clothing and the muted FSHING palette, but remove realistic skin pores, realistic anatomy, painterly portrait rendering, and photographic detail. Composition/framing: exactly one complete full-body character, head to boots visible, centered in a tall portrait canvas with generous padding; neutral natural stance, not a T-pose; strong silhouette for prominent display on either side of a full-screen dialogue UI. Scene/backdrop: perfectly flat uniform full-bleed #FF00FF chroma-key background for local removal, with no texture, gradient, lighting variation, floor, reflection, or shadow. Constraints: preserve the character’s outfit, objects, colors, age cues, beard, pose direction, and identity; natural readable hands; no text, dialogue box, scenery, water, boat, dock, cast shadow, contact shadow, watermark, or extra objects; do not use #FF00FF anywhere in the character. Avoid: realism, photorealism, detailed human skin, painterly concept-art realism, anime, flat 2D cartoon, grim horror, steampunk, fantasy costume, exact copying of the farmer character’s clothes/hat/moustache, logos, weapons.”
- Processing: The generated magenta matte was removed locally with the installed chroma-key helper using automatic border-key sampling, soft matte, and despill. The untouched source is retained as `output/imagegen/tutorial-guide-source.png`; the alpha result was visually checked against a contrasting neutral background before use.

### Rook tutorial pose sequence

- Runtime role: eight demo-only identity-consistent pose variants used with `tutorial-guide.png` across the standalone nine-beat dialogue sequence
- Files: `rook-front.png`, `rook-profile-left.png`, `rook-wave.png`, `rook-explain.png`, `rook-point-right.png`, `rook-point-left.png`, `rook-warning.png`, and `rook-approval.png`
- Generated size: 953 × 1650 or 953 × 1651; every runtime copy is RGBA with transparent corners
- Generation mode: eight separate OpenAI built-in image-generation calls using `tutorial-guide-source.png` as the authoritative character, wardrobe, proportion, material, and style reference
- Shared prompt contract: “Use case: stylized-concept. Asset type: full-screen tutorial character sprite for the FSHING browser game. Preserve the exact Rook identity and chunky toy-like stylized 3D rendering from the supplied reference: orange ribbed knit cap, salt-and-pepper sculpted beard and moustache, warm large eyes, faded navy weatherproof jacket with brass hardware and pin, cream cable-knit sweater, patched slate work trousers, brown boots, and worn blue spiral notebook. Exactly one complete full-body character, hat through boot soles visible with generous padding, natural readable hands, and a strong game-scale silhouette. Use a perfectly flat uniform full-bleed #FF00FF chroma-key background. No cast or contact shadow, floor, reflection, scenery, water, boat, dock, text, watermark, duplicate person, cropped extremity, photorealism, or wardrobe redesign. Do not use #FF00FF on the character.”
- Pose-specific requests:
  - `rook-front.png`: “Strict front-on neutral standing view; face, shoulders, hips, knees, and boots square to camera; arms relaxed; notebook at one side.”
  - `rook-profile-left.png`: “Strict 90-degree left-side profile; face, chest, hips, knees, and boots point screen-left; notebook naturally visible at his side.”
  - `rook-wave.png`: “Front-facing three-quarter pose; warm smile; one hand raised beside his head in a broad friendly wave with open palm readable; notebook in the other hand.”
  - `rook-explain.png`: “Three-quarter/front pose; blue notebook open at chest height; one index finger clearly indicates a page; friendly focused mid-explanation expression.”
  - `rook-point-right.png`: “Three-quarter pose facing screen-right; one arm extended with index finger clearly pointing horizontally right; eyes follow the gesture; notebook tucked against body.”
  - `rook-point-left.png`: “Three-quarter pose facing screen-left; one arm extended with index finger clearly pointing horizontally left; eyes follow the gesture; notebook tucked against body.”
  - `rook-warning.png`: “Front/slight three-quarter pose; one open palm raised toward the viewer as an unmistakable stop/caution signal; serious attentive expression; notebook at side.”
  - `rook-approval.png`: “Front/slight three-quarter pose; clear thumbs-up at chest height; warm satisfied smile; notebook tucked under the opposite arm.”
- Processing: Every untouched magenta source is retained in `output/imagegen/` with the corresponding `-source.png` suffix. Each runtime PNG was processed with automatic border-key sampling, soft matte, and despill, then checked for transparent corners, complete hands and boots, readable gesture, identity consistency, and visible edge artifacts.

## Procedural audio assets

FSHING bundles no external audio files. `src/services/feedbackService.ts` creates the implemented sound and haptic feedback at runtime:

| Cue | Source/implementation | Runtime role | Accessible equivalent |
| --- | --- | --- | --- |
| Engine/boost | Filtered triangle oscillator with speed-controlled pitch and gain | Communicate movement intensity | Boat movement, wake, and boost state |
| UI | Short sine sweep | Confirm a menu/control action | Pressed/focus state |
| Cast | Filtered noise plus descending sine | Confirm that the line entered the water | Visible hook descent |
| Catch | Noise transient plus two rising tones | Confirm a secured fish | Catch toast, flash, cargo update |
| Collision | Low noise plus descending sawtooth | Communicate hull damage | Named hazard and damage toast |
| Dock | Two descending triangle tones | Confirm arrival | Harbor overlay |
| Delivery | Three-tone rising sequence | Confirm job completion | Delivery result and payment |
| Deny | Descending square tone | Mark an unavailable action | Written reason and disabled state |
| Upgrade | Two rising tones | Confirm permanent progression | New tier/class text |
| Haptics | Optional `navigator.vibrate` patterns per cue | Reinforce action category | Never required to understand state |

The saved mute and volume controls apply to the master gain. Sounds are original parameterised synthesis, not recordings or adaptations of another game.

## Runtime constraints

- Production code imports only the files in `src/assets/`.
- `output/imagegen/` is retained as the human-reviewable authoring record and is not included by Vite unless explicitly imported.
- CSS uses the generated panel, button, and icon atlas directly. It supplies layout, responsive behavior, text, focus, disabled, high-contrast, and reduced-motion states.
- Canvas rendering may transform, crop, flip, key, and scale generated game sprites and may draw transient simulation effects. It does not synthesize authored interface imagery.
