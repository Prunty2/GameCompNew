# FSHING asset manifest

Every authored visual asset used by the MVP was generated with GPT Image 2.0 on 24 July 2026. No bitmap, SVG, icon, texture, panel, button, logo, scenery plate, or game sprite was created with drawing code.

The untouched generated outputs are preserved in `output/imagegen/`. Runtime copies live in `src/assets/` and are explicitly imported by TypeScript or CSS. HTML and CSS arrange and label the generated interface surfaces. Canvas draws the simulation, camera, line, wake, water movement, visibility, and accessibility indicators; it does not manufacture replacement UI art.

The boat, fish atlas, and world atlas were requested on a uniform `#FF00FF` matte. The renderer removes that matte in memory when the generated sprite is loaded. This preserves the GPT-generated sprite while allowing it to layer over the side-on lake.

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

- Runtime role: Reedfin, Needle Pike, Gloam Gill, and fishing hook
- Generated size: 1254 × 1254
- Prompt: “Use GPT Image 2.0. Create a strict 2 by 2 sprite atlas for a side-on 2D fishing game. Every cell equal size and every object entirely inside its cell with generous padding. Top-left: round-bodied Reedfin with broad fan fins. Top-right: long needle-like pike with sharp pointed snout. Bottom-left: compact eerie Gloam Gill with forked tail and a single eye-like side marking. Bottom-right: simple J-shaped fishing hook with short swivel, no long line. All three fish in STRICT orthographic side profile facing right, with bold distinct silhouettes. Restrained editorial gouache/screen-print style, muted lake teal, cream, ink navy, and sparse orange accents. No labels, text, borders, cell dividers, bubbles, plants, scenery, water, shadows, or extra objects. Entire canvas behind all cells must be perfectly uniform full-bleed pure chroma-magenta #FF00FF with no texture, gradient, checkerboard, or variation.”

### `world-atlas.png`

- Runtime role: side-view dock, rock, buoy, fishing marker, fog, and night wake
- Generated size: 1536 × 1024
- Prompt: “Use GPT Image 2.0. Create a strict 3 by 2 sprite atlas for a side-on 2D lake game. Every cell equal size and every object entirely inside its cell with generous padding. Top-left: short wooden dock and mooring posts in strict side profile. Top-middle: jagged rock protruding above the waterline in strict side profile. Top-right: one simple amber buoy in strict side profile. Bottom-left: hanging fishing-ground marker with a small suspended fish-shaped sign and a reed tuft. Bottom-middle: low horizontal fog wisp. Bottom-right: ambiguous dark wake or long lake-creature silhouette just under water, unsettling but non-graphic. Restrained editorial gouache/screen-print style, bold readable silhouettes, muted ink navy, cream, lake teal, weathered wood, and sparse orange. No labels, text, borders, grid lines, cell dividers, water, scenery, additional objects, or shadows outside the objects. Entire canvas background must be perfectly uniform full-bleed pure chroma-magenta #FF00FF with no texture, gradient, checkerboard, or variation.”

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

- Runtime role: twelve status, objective, upgrade, setting, and pause pictograms
- Generated size: 1448 × 1086
- Prompt: “Use GPT Image 2.0. Create a strict 4 by 3 icon atlas for a restrained side-on 2D lake game's HTML interface. Twelve equal rectangular cells in exact row-major order: cargo crate, fish freshness with leaf and fish, damaged boat hull, clock/time, shell currency, objective compass arrow, engine, boat lamp, stamped permit paper, repair wrench, speaker/sound, pause bars. One centered icon per cell. Minimal bold cream line-and-solid pictograms with sparse safety-orange accents on a uniform edge-to-edge deep ink-navy painted background. Icons must remain highly legible at 20 pixels and differ by silhouette, not color alone. No circles or medallions around icons, no labels, no letters, no numbers, no decorative frames, no cell borders, no grid lines, no gradients, no transparency, no checkerboard. Keep exact equal-cell alignment and generous inner padding.”

## Runtime constraints

- Production code imports only the files in `src/assets/`.
- `output/imagegen/` is retained as the human-reviewable authoring record and is not included by Vite unless explicitly imported.
- CSS uses the generated panel, button, and icon atlas directly. It supplies layout, responsive behavior, text, focus, disabled, high-contrast, and reduced-motion states.
- Canvas rendering may transform, crop, flip, key, and scale generated game sprites and may draw transient simulation effects. It does not synthesize authored interface imagery.
