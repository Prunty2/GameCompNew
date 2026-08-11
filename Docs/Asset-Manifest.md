# FSHING asset manifest

The initial authored visual set was generated with GPT Image 2.0 on 24 July 2026. The expanded nine-species fish atlas was generated with OpenAI's built-in image-generation tool on 31 July 2026. The surface-school cue atlas and polarized-water lens were generated with the built-in GPT Image tool on 5 August 2026. The tugboat steam atlas was generated with the built-in GPT Image tool on 6 August 2026. No bitmap, SVG, icon, texture, panel, button, logo, scenery plate, or game sprite was created with drawing code.

Authoring originals are preserved outside the production bundle. Runtime copies live in `src/assets/` and are explicitly imported by TypeScript or CSS. HTML and CSS arrange and label the generated interface surfaces. Canvas draws the simulation, camera, line, wake, water movement, visibility, and accessibility indicators; it does not manufacture replacement UI art.

The boat, harbor pier, fish atlas, and world atlas were requested on a uniform `#FF00FF` matte. The renderer removes the atlas and boat mattes in memory; the harbor pier matte is removed during authoring so its long shoreline edge can be tightly cropped without changing the generated subject.

## Generation record

### `lake-chart.png`

- Runtime role: horizontal side-view panorama and parallax source
- Generated size: 1672 × 941
- Prompt: “Use GPT Image 2.0. Create a wide 16:9 illustrated background plate for a side-scrolling 2D browser game named FSHING. STRICT side-on landscape view, not top-down and not isometric. A long calm freshwater lake crosses the full image horizontally; crisp waterline at about 58 percent of image height; layered low wooded hills and reeds; small warm working harbor silhouette at far left; a colder lonely ferry landing light at far right; quiet overcast late-afternoon sky. Restrained editorial gouache and screen-print style, simplified shapes, subtle paper grain, muted slate blue, lake teal, warm cream and sparse safety-orange light accents. No boat, no fish, no characters, no text, no logo, no interface, no icons, no borders, no map, no labels. Full-bleed scenery, readable behind gameplay silhouettes, coherent horizontal parallax layers.”

### `lake-chart-night.png`

- Runtime role: composition-matched nighttime panorama shown throughout the night phase
- Generated source size: 1667 × 943; runtime size: 1672 × 941 to match the daytime panorama exactly
- Generation mode: OpenAI built-in GPT Image lighting/weather edit using `lake-chart.png` as the edit target
- Prompt: “Use case: lighting-weather. Asset type: runtime side-scrolling game panorama, nighttime counterpart to the supplied daytime lake background. Transform only the time of day from overcast daylight to a clear, atmospheric deep night. Preserve exactly the existing painterly illustrated texture, horizon, waterline, mountain ridges, shorelines, buildings, docks, reeds, trees, navigable empty lake space, and every object's placement and scale. Use cool blue-black moonlight, subtle silvery ambient glow, darker readable silhouettes, and restrained warm harbor lamps and reflections. Do not add a moon, boat, characters, creatures, text, UI, labels, borders, watermark, fog, vignette, spotlight, camera change, or new landmarks.”
- Runtime processing: resized to the daytime panorama's exact dimensions so both plates share the same camera crop and waterline calculations

### `player-boat.png`

- Runtime role: player vessel, strict side profile
- Generated size: 1536 × 1024
- Generation mode: GPT Image 2.0 style-transfer edit using the earlier boat as the subject reference and `lake-chart.png` as the painting-style reference
- Prompt: “Use GPT Image 2.0. Use case: style-transfer. Asset type: player boat sprite for a side-on 2D browser game. Input 1 is the existing boat and defines the subject, strict orthographic side-profile composition, right-facing direction, workboat proportions, cream cabin, blue hull, small crane, cargo crate, and tiny amber lamp. Input 2 is the lake panorama and is ONLY the required painting-style reference. Repaint the boat so it genuinely belongs in Input 2: quiet desaturated gouache, soft dry-brush edges, visible aged-paper grain, slightly hazy atmospheric color, restrained contrast, simplified shapes, muted slate-blue hull, weathered gray-cream cabin, sparse dull ochre details, and a small warm lamp. Reduce the crisp ink outline, sharp digital edge, saturated color, high micro-detail, and sticker-like contrast of Input 1. Keep the boat readable at 100–160 pixels but painterly and subdued. Preserve exactly one complete boat, strict side profile facing right, with no person. Place the isolated boat centered on a perfectly uniform full-bleed pure chroma-magenta #FF00FF matte. No water, wake, reflection, shadow, landscape, fog, text, UI, border, grid, or extra object outside the boat. The matte must have no texture, gradient, checkerboard, or lighting variation. Avoid: clip-art, cel shading, hard black contour, glossy 3D rendering, oversaturation, photorealism.”
- Final readability refinement: “Use GPT Image 2.0. Use case: style-transfer refinement. Input 1 is the current player boat sprite and must remain the same strict side-profile, right-facing workboat with identical silhouette, proportions, crane, crate, cabin, hull, and lamp. Input 2 is the lake panorama and remains the painting-style reference only. Keep the successful desaturated gouache, aged-paper grain, dry-brush softness, muted slate-blue and gray-cream palette, and atmospheric integration of Input 1. Make only one targeted adjustment for gameplay readability at 100–160 pixels: increase opaque paint coverage and local value contrast by about 15–20 percent, deepen the slate-blue hull and the cabin/crane shadow shapes, and make the cream cabin slightly more distinct from the distant shoreline. Keep edges painterly and soft; do not add a black contour, digital sharpness, saturated color, or high micro-detail. Preserve the small warm lamp accent. Exactly one complete boat centered on a perfectly uniform full-bleed pure chroma-magenta #FF00FF matte. No water, wake, reflection, shadow, landscape, fog, text, UI, border, grid, or extra objects. Avoid: transparency within the boat, washed-out ghostly values, clip-art, cel shading, glossy 3D rendering, oversaturation, photorealism.”

### `boat-steam-atlas.png`

- Runtime role: eight deterministic tugboat exhaust-steam variations in a strict 4 × 2 atlas
- Generated size: 1536 × 1024
- Runtime size: 768 × 512, downscaled uniformly for 2× gameplay rendering
- Generation mode: OpenAI built-in GPT Image generation, using `player-boat.png` for sprite treatment and scale context and `lake-chart.png` for palette and atmosphere
- Prompt: “Use case: stylized-concept. Asset type: production smoke-puff sprite atlas for the tugboat exhaust effect in the FSHING side-on 2D browser game. Image 1 is the player tugboat and authoritative painterly sprite treatment and scale context. Image 2 is the lake panorama and authoritative muted palette, paper grain, subdued contrast, and atmosphere reference. Create one strict 4 columns × 2 rows sprite atlas containing exactly eight distinct isolated white steam puffs, one complete puff centered in each equal cell. Variations should include: small round newborn puff; small lopsided puff; medium soft three-lobed cloud; medium flattened wind-swept puff; larger tall rising billow; larger wide trailing billow; broken two-lobed wispy puff; broad fading mature cloud. Restrained editorial gouache and screen print, soft dry-brush edges, subtle aged-paper grain, painterly white and pale gray-cream steam, simple readable silhouettes at 24–80 px gameplay size. Exact 4 × 2 atlas, eight equal cells, consistent visual weight and center alignment, generous padding, no overlap or artwork crossing cell boundaries. Each puff should occupy roughly 45–65% of its cell with clearly different silhouette and internal paint texture. Perfectly uniform full-bleed pure black #000000 across the entire canvas, intended for Canvas screen blend compositing. Keep the outer 8% of every cell pure black. Warm cream-white cores with cool pale blue-gray edges; luminous but subdued. No brown, charcoal, soot, or colored smoke. Exactly eight smoke sprites and nothing else; the black background must have no texture, gradient, glow, grid, dividers, or lighting variation; each puff must fade softly into pure black within its own cell. Avoid: boat, chimney, flame, sparks, water, scenery, text, labels, borders, grid lines, cell dividers, cast shadows, photorealism, glossy 3D, cartoon outlines, dark pollution smoke, watermark.”
- Runtime processing: the black field is removed visually with Canvas `screen` compositing; deterministic seeded selection, drift, rise, stretch, rotation, and opacity vary the authored puffs without redrawing them.

### `fish-atlas.png`

- Runtime role: original three-fish reference atlas; the hook cell remains in active use
- Generated size: 1254 × 1254
- Prompt: “Use GPT Image 2.0. Create a strict 2 by 2 sprite atlas for a side-on 2D fishing game. Every cell equal size and every object entirely inside its cell with generous padding. Top-left: round-bodied Reedfin with broad fan fins. Top-right: long needle-like pike with sharp pointed snout. Bottom-left: compact eerie Gloam Gill with forked tail and a single eye-like side marking. Bottom-right: simple J-shaped fishing hook with short swivel, no long line. All three fish in STRICT orthographic side profile facing right, with bold distinct silhouettes. Restrained editorial gouache/screen-print style, muted lake teal, cream, ink navy, and sparse orange accents. No labels, text, borders, cell dividers, bubbles, plants, scenery, water, shadows, or extra objects. Entire canvas behind all cells must be perfectly uniform full-bleed pure chroma-magenta #FF00FF with no texture, gradient, checkerboard, or variation.”

### `fish-atlas-v2.png`

- Authoring role: superseded static nine-species reference retained for provenance; no longer imported at runtime
- Generated size: 1254 × 1254
- Generation mode: OpenAI built-in image generation, using `fish-atlas.png` for sprite treatment and `lake-chart.png` for palette/painting context
- Prompt: “Create one original strict 3 × 3 sprite atlas for FSHING. Use the supplied fish atlas only for the restrained editorial gouache/screen-print treatment and the lake image only for its desaturated teal, cream, ink-navy and sparse amber palette. Put exactly one complete fish in each equal cell with generous padding, strict orthographic side profile facing right, no overlap, and a uniform full-bleed chroma-magenta matte. Row 1: round Reedfin with fan fins; tall Sun Perch with crest; slim Silver Dart with split tail. Row 2: long Needle Pike with pointed snout; heavy Mossback with leaf-like fins; snake-like Lantern Eel with a small lure. Row 3: Gloam Gill with fork tail and eye marking; wide Violet Ray with ribbon tail; armoured Abyss Crown with crowned head and pale sensory eye. Make all nine silhouettes immediately different at gameplay size. No text, labels, borders, grid lines, hook, water, bubbles, plants, scenery, shadows, extra objects, copied characters, or designs from another fishing game.”
- Originality note: species names, silhouettes, arrangement, palette direction, and prompt were authored specifically for FSHING. The output does not reproduce assets from *Cat Goes Fishing* or another commercial game.

### Animated habitat fish sheets

- Runtime files: `fish-sunward-swim.png`, `fish-mosswater-swim.png`, and `fish-gloam-swim.png`
- Runtime role: four authored swim frames for every resident species, grouped by fishing site in strict 4-column × 3-row sheets. Columns are neutral glide, tail or fin flex, neutral return, and opposite flex. Rows follow each site's resident order from `SPOT_RESIDENTS`.
- Authoring sources: `output/imagegen/fish-*-swim-source.png`
- Generated on: 10 August 2026 with OpenAI's built-in image-generation tool
- Runtime processing: authoring sheets are proportionally downscaled to 768 px wide; the uniform magenta matte is keyed in memory. The deterministic presentation cycle selects one of four cells and reduced-motion mode holds frame zero. The renderer derives a thin, partially translucent rarity outline from the active frame only for the requested fish.
- Shared prompt direction: “Create one strict 4 columns × 3 rows animation sprite sheet. Each row is one consistent fish individual shown through four sequential subtle swimming frames. Keep head, eye, body size, markings, lighting, and centre position identical across frames; move only the tail, rear body, and small fins. Strict orthographic side profile facing right; visually appealing semi-realistic natural-history gouache; anatomically plausible proportions; softly painted scales; controlled detail readable at 55–100 px. Exactly one complete fish per equal cell with generous safe padding on a uniform full-bleed `#FF00FF` matte. No pale sticker outline; only a thin soft habitat-dark keyline integrated into the painting. No text, labels, grid, borders, water, bubbles, scenery, shadows, extra objects, or watermark.”
- Sunward rows: realistic rounded olive-teal Reedfin; compact amber barred Sun Perch; slim steel-blue Silver Dart.
- Mosswater rows: long olive-silver Needle Pike; heavy mottled Mossback; charcoal-teal Lantern Eel with a restrained warm lure.
- Outer Gloam rows: compact blue-violet Gloam Gill with a natural eye spot; dusky Violet Ray with subtly undulating wings; dark armored Abyss Crown with restrained raised head plates.

### `surface-fishing-cues.png`

- Runtime role: strict 4 × 2 atlas containing six coordinated surface-school fish poses and the primary hook-and-arc cue; the disabled broken-arc cell is retained in the source atlas but is not rendered
- Generated size: 1536 × 1024
- Runtime size: 768 × 512, downscaled uniformly for 2× gameplay rendering
- Generation mode: OpenAI built-in GPT Image generation, using the two approved fishing-spot mockups as visual targets, `fish-atlas-v2.png` for sprite treatment, and `lake-chart.png` for palette and atmosphere
- Prompt: “Use case: stylized-concept. Asset type: production game sprite atlas for the surface fishing-ground cue in FSHING. Image 1 and Image 2 are authoritative visual targets for how faint submerged fish and the hook-and-arc cue should look during gameplay. Image 3 is the authoritative fish silhouette and editorial gouache/screen-print style reference. Image 4 is the authoritative lake palette, paper grain, subdued contrast, and atmosphere reference. Create one strict 4 columns × 2 rows sprite atlas with exactly eight isolated sprites, one complete sprite centered in each equal cell, in this exact row-major order. Top row cells 1–4: compact round fish facing right; compact round fish facing left with a raised tail; slim dart fish facing right; slim dart fish facing left with a gentle downward turn. Bottom row cells 1–2: long narrow fish facing right; small compact fish facing left with a lowered head. Bottom row cell 3: one compact cream-and-warm-amber fishing hook pictogram with an integrated thin upward-curving semicircle arc beneath it. Bottom row cell 4: a disabled version of the same hook pictogram, in muted gray-cream, with an integrated visibly broken/dashed semicircle arc beneath it. Restrained painterly editorial gouache and screen print, soft dry-brush edges, subtle aged-paper grain, simple readable silhouettes at 28–52 px gameplay size. Fish are deep desaturated ink-teal with restrained blue-green edge variation and almost no interior detail. Exact 4 × 2 atlas; all eight equal cells; consistent scale and visual weight; generous padding; no overlap. Perfectly uniform full-bleed pure chroma-magenta #FF00FF for runtime keying. No text, labels, borders, grid lines, water, bubbles, plants, scenery, boat, people, extra objects, shadows, neon, photorealism, glossy 3D, copied commercial art, or watermark.”
- Runtime processing: the generated magenta matte is keyed in memory; the fish and hook artwork is not recoloured or redrawn.

### `polarized-lens.png`

- Runtime role: additive clear-water reveal beneath the boat, including its soft feathered column, painted refraction texture, and three incomplete caustic trails
- Generated size: 1024 × 1536
- Runtime size: 512 × 768, downscaled uniformly for gameplay
- Generation mode: OpenAI built-in GPT Image generation, using the approved polarized-lens and shoal mockups plus `lake-chart.png` as visual references
- Prompt: “Use case: stylized-concept. Asset type: production additive-blend game sprite for the polarized survey lens in FSHING. Image 1 is the authoritative shape and mood target for the soft localized clear-water reveal beneath the boat. Image 2 is the supporting target for restrained caustic orbit trails around a living shoal. Image 3 is the authoritative muted lake palette, painterly texture, and atmospheric grain reference. Create exactly one isolated vertical underwater clarity-lens sprite. It is a softly feathered oval/column of pale desaturated turquoise, blue-green, and tiny cream caustic highlights, narrowest at the very top where it meets the waterline, gently widening through the middle, and fading completely before every canvas edge. Include three extremely subtle incomplete elliptical caustic trails inside the light, but no fish and no hook. Restrained painterly gouache and soft screen print, hazy dry-brush texture, subtle aged-paper grain, subdued contrast. The lens must feel like slightly clearer water, not a flashlight, sonar beam, sci-fi cone, magical portal, or solid geometric overlay. Single centered vertical lens occupying about 48% of the canvas width and 78% of the canvas height; perfectly soft feathered boundary with no visible trapezoid, polygon, hard rim, or rectangular edge. Perfectly uniform full-bleed pure black #000000 everywhere outside the fading lens, designed for Canvas screen additive blending; the outer 12% border remains pure black. No text, labels, fish, hook, boat, waterline, bubbles, plants, scenery, objects, neon, photorealism, glossy 3D, hard contour, watermark, or extra sprites.”
- Runtime processing: the black field is removed visually with Canvas `screen` compositing; the generated light, texture, and caustic trails are rendered intact.

### Fishing environment backgrounds

- Runtime files: `fishing-sunward-shoal.jpg`, `fishing-mosswater-pool.jpg`, and `fishing-outer-gloam.jpg`
- Runtime role: three swappable background-only underwater paintings for Sunward Shoal, Mosswater Pool, and Outer Gloam. Fish, hook, line, target treatment, line-limit boundary, and UI are rendered separately so gameplay objects remain movable.
- Generated and runtime dimensions: 1536 × 1024 each. Runtime copies use quality-82 JPEG compression because the paintings need no transparency.
- Generation mode: OpenAI built-in image generation using the approved revised Living Cross-Section fishing mockup and the existing sailing-water screenshots as visual references
- Shared constraints: one side-on underwater lake environment with an open central gameplay area; restrained painterly gouache and screen-print texture matching the sailing panorama; no fish, hook, line, boat, UI, text, labels, icons, reticles, or watermark.
- Sunward Shoal direction: warm blue-green shallows, bright cream surface reflections, sunlit reeds, suspended particles, and scattered submerged timber.
- Mosswater Pool direction: greener lower-visibility water, mossy vegetation, hanging roots, silt pockets, and a darker central pool.
- Outer Gloam direction: cold violet-blue near-black water, poor visibility, sparse pale reeds, rock shelves, faint mineral or silt glow, and restrained ambiguous distant scenery.

### Dock menu backgrounds

- Runtime files: `dock-brindle-day.jpg`, `dock-brindle-night.jpg`, `dock-gloam-day.jpg`, and `dock-gloam-night.jpg`
- Runtime role: harbor- and time-specific full-screen settings behind the shared dock menu. Brindle Harbor is a practical working pier; Gloam Ferry is a colder, isolated outer-lake landing. Each harbor's day and night plates blend using the sailing scene's night intensity. The paintings are interface backdrops only and contain no boat, characters, labels, or UI.
- Authoring sources: matching `output/imagegen/dock-*-source.png` files for all four runtime plates, regenerated on 7 August 2026
- Generated and runtime dimensions: 1536 × 1024 for all four plates; runtime copies use quality-82 JPEG compression.
- Generation mode: OpenAI built-in image generation using the in-game sailing views and `lake-chart.png` as authoritative identity, geography, palette, atmosphere, and world-scale references, plus `harbor-pier.png` for timber and narrow-plank construction only. The daytime plates expand the exact edge-of-panorama landmarks into dock-level menu views rather than inventing alternate harbors. Each nighttime plate is a lighting-weather edit of its approved daytime anchor and preserves the anchor's exact camera, geometry, and placement.
- Shared prompt direction: a medium-wide dock-level view in restrained editorial gouache and screen print, recognizable as the same shoreline approached during sailing. Human-scale timber uses narrow plank divisions; the environment leaves readable sky and water behind the menu without replacing, rearranging, or redesigning source landmarks. Full bleed; no boat, fish, people, text, logo, UI, detached sprite, chroma key, or transparency.
- Brindle direction: preserve the panorama's large dark boathouse with warm doorway and roof mast, small pale annex, tall open A-frame working crane, low red-roof shed, reed-lined pilings, and their left-to-right order. The foreground pier connects to the left harbor and extends rightward to a free terminal end. The day plate uses warm overcast light; its registered night edit uses readable blue-black color and restrained existing work lamps.
- Gloam direction: preserve the panorama's left-to-right sloped railed ferry ramp, square flat-roof hut, tall red beacon mast with guy supports, smaller work light, rocky right bank, bare tree, and two tall conifers. The landing attaches to the right shoreline while its pier/ramp projects leftward to a free terminal end. The day plate uses cool overcast light with the red beacon visible; its registered night edit uses deep violet-blue color and localized existing beacon and hut light.

### `fishing-line-limit-float.png`

- Runtime role: repeated round survey-float sprite along the reachable fishing-depth boundary
- Generated source size: 1254 × 1254; runtime size: 512 × 512 with authored alpha
- Generation mode: OpenAI built-in image generation using the approved revised fishing mockup and `world-atlas.png` as visual references
- Prompt direction: one compact circular weathered cream survey housing with a small amber center, rope fastenings, and a tiny bottom mount; restrained FSHING gouache and screen-print texture; isolated on a uniform chroma-magenta matte; no line, fish, hook, boat, water, scenery, UI, text, shadow, or extra object
- Processing: the border-sampled magenta matte was removed with a soft alpha ramp and despill, then the sprite was uniformly downscaled to 512 × 512.

### `world-atlas.png`

- Runtime role: fog and night wake; the original dock, rock, buoy, and fishing-marker cells remain in the source atlas but are not rendered
- Generated size: 1536 × 1024
- Prompt: “Use GPT Image 2.0. Create a strict 3 by 2 sprite atlas for a side-on 2D lake game. Every cell equal size and every object entirely inside its cell with generous padding. Top-left: short wooden dock and mooring posts in strict side profile. Top-middle: jagged rock protruding above the waterline in strict side profile. Top-right: one simple amber buoy in strict side profile. Bottom-left: hanging fishing-ground marker with a small suspended fish-shaped sign and a reed tuft. Bottom-middle: low horizontal fog wisp. Bottom-right: ambiguous dark wake or long lake-creature silhouette just under water, unsettling but non-graphic. Restrained editorial gouache/screen-print style, bold readable silhouettes, muted ink navy, cream, lake teal, weathered wood, and sparse orange. No labels, text, borders, grid lines, cell dividers, water, scenery, additional objects, or shadows outside the objects. Entire canvas background must be perfectly uniform full-bleed pure chroma-magenta #FF00FF with no texture, gradient, checkerboard, or variation.”

### `fishing-spots-atlas.png` (retired)

- Runtime role: none. The former six site-specific surface landmarks are retained as an authoring record but are no longer imported, rendered, or included in the production bundle. Fishing grounds now use the dedicated `surface-fishing-cues.png` and `polarized-lens.png` assets.
- Generated size: 1536 × 1024
- Runtime size: 768 × 512 (downscaled from the untouched authoring source for 2× gameplay rendering)
- Generation mode: OpenAI built-in image generation, using `world-atlas.png` for sprite/material context and `lake-chart.png` as the authoritative painting-style reference
- Prompt: “Use case: stylized-concept. Asset type: production sprite atlas for six fishing-spot landmarks in the side-on 2D browser game FSHING. Image 1 is the existing world atlas and defines the strict sprite-atlas treatment and weathered marker materials; Image 2 is the lake panorama and is the authoritative soft gouache palette, paper grain, subdued contrast, and atmospheric painting reference. Create one original strict 3 × 2 sprite atlas containing exactly six complete, different research fishing markers, one per equal cell, in this exact row-major order: Sunward Shoal, Silver Bay, Needle Run, Mosswater Pool, Outer Gloam, Blackwater Trench. Use a perfectly uniform full-bleed pure chroma-magenta #FF00FF matte. Sunward Shoal: low cream-and-ochre survey buoy with a sun-disc top and a small fan-fin plate. Silver Bay: slim pale float with twin reflective silver plates and a split-tail pennant shape. Needle Run: narrow leaning channel marker with a long pointed fish-vane silhouette. Mosswater Pool: stout weathered timber-and-metal sampling post wrapped with restrained reed and leaf shapes. Outer Gloam: tall cold-violet cage buoy with one small warm lamp and fork-tail plate. Blackwater Trench: heavy dark deep-water beacon with a crown-like sensor rack and pale round lens. All six read as equipment maintained by the same lake research service. Restrained editorial gouache and screen-print illustration matching Image 2; soft dry-brush edges, aged-paper grain within the objects, simplified shapes, opaque paint coverage, muted ink navy, weathered gray-cream, desaturated lake teal, moss green and cold violet, with sparse dull safety-ochre accents. Exact 3 columns by 2 rows; one centered full marker per equal cell; consistent baseline; similar visual weight; generous padding; no overlap. Each silhouette must be immediately distinguishable without color. No text, letters, numbers, labels, borders, grid lines, cell dividers, water, waves, reflections, cast shadows, scenery, fish, boats, people, ropes leaving the cell, or extra objects. Do not use #FF00FF inside any marker. Avoid glossy 3D, clip art, cel shading, hard black contour, high saturation, photorealism, ornate fantasy design, tiny fragile details, or inconsistent scale.”
- Originality note: all six landmark concepts and their site-specific silhouettes were authored for FSHING. They are retained only as a record of the retired direction.

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

### `bin-icon.png`

- Runtime role: remove/release action on occupied Cargo inventory slots
- Generated source size: 1254 × 1254; optimized runtime size: 256 × 256 with authored alpha
- Generation mode: OpenAI built-in GPT Image generation followed by local chroma-key removal and runtime downscaling
- Prompt: “Use case: stylized-concept. Asset type: game UI bin / trash icon for an occupied cargo-slot removal button in the FSHING browser game. Create one original front-facing rubbish bin pictogram that clearly communicates remove/release cargo: a compact lidded waste bin with two subtle vertical ribs and a small handle, in a restrained bold hand-painted screen-print style. Use a warm cream main shape, sparse safety-orange detail on the lid/handle, and very limited ink-navy contour detail; keep it crisp and readable at 24–40 pixels. Exactly one centered icon with generous equal padding on a perfectly flat solid #00FF00 chroma-key background. Do not use #00FF00 in the icon. No cast shadow, contact shadow, reflection, watermark, text, navy tile, circle, medallion, border, frame, label, extra object, recycling symbol, fish, or checkerboard.”
- Processing: The border-sampled green matte was removed with a soft alpha ramp and despill. The full generated source is retained as `output/imagegen/bin-icon-source.png`; the runtime alpha PNG was reduced to 256 × 256 to avoid shipping unused resolution.

## Procedural audio assets

FSHING bundles no external audio files. `src/services/feedbackService.ts` creates the implemented sound and haptic feedback at runtime:

| Cue | Source/implementation | Runtime role | Accessible equivalent |
| --- | --- | --- | --- |
| Engine | Filtered triangle oscillator with speed-controlled pitch and gain | Communicate movement intensity | Boat movement and wake state |
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
