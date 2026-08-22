# FSHING visual and interface notes

This file describes the playable presentation in `v0.4.3`. It replaces earlier QA logs that documented delivery-job route cards, water surveys, the field guide, and fantasy species names (Reedfin, Sun Perch, and the rest of that set).

## Screens that exist

- **Title.** Centred wordmark, Play, Settings, Credits, build label `v0.4.3 (PR #85)` in the corner. No tagline, no How to play, no control summary. The lake panorama runs behind the panel in cinematic mode.
- **Harbor.** Dock photograph for Brindle or Gloam (day/night plates). Beach docks use the Beach panorama instead. Three tabs: Market, Cargo, Services. Footer: Help, Return to Lake or Beach.
- **Market catalogue.** Nine cards. Undiscovered cards are darkened with a `?`. Discovered cards show species art, name, price, optional cargo count, and a tracking badge.
- **Market detail.** Species art, current-harbor price, Track, Sell, 7-day graph. No “Found at”, no supply pill, no second-harbor column.
- **Cargo.** Up to ten slots. Occupied slots can be released. Locked slots open Services.
- **Services.** Cargo, Engine, Line, Engine boost, and Beach. Fishing-line tier 3 unlocks Outer Gloam.
- **Pause.** Compact centred menu: Resume, Settings, How to play, Title screen. Lake behind the menu is blurred.
- **Settings / Controls.** Mute, volume, high contrast, reduced motion, seven remappable actions.
- **Credits.** Liam, Saxon, Harrison, David, each with a decorative flag on hover.
- **How to play.** Four cards on the harbor sheet.
- **On water.** Destination badge, context dock/fish button, night moon, boost gauge after unlock. No HTML money HUD.

## Fishing view

- Dive lasts 0.85 s. Settled waterline sits near 31% of the viewport; sailing waterline sits near 78%.
- Each site uses its own underwater painting. Beach maps surf / bay / reef art onto the same three spot ids.
- Four line-limit floats and a short “upgrade line” label mark unreachable depth. There is no centre depth ruler.
- The tracked fish gets a rarity-coloured outline and a name-only specimen cue. If nothing is tracked, or the tracked fish does not live at this site, neither cue is shown.
- Escape reels out and returns to sailing. It does not open pause.
- Reduced motion skips dive/reel camera motion and body flex; fish still translate.

## Surface fishing grounds

Fishing spots are not labelled landmarks. Distant water shows faint school sprites. Approaching strengthens a polarized-water lens. The hook cue and the HTML drop-line button appear only inside the true interaction radius and follow the boat. Current captures: `Docs/screenshots/07-sailing.png`, `Docs/screenshots/09-fishing-cue.png`, `Docs/screenshots/08-fishing.png`.

## Accessibility presentation

- High contrast strengthens shoals, outlines, and night/fishing strokes.
- Reduced motion kills menu wobble, scene-transition motion, decorative pulses, and boost camera pull.
- Mobile and compact viewports have no on-screen move/boost/cast pads. Menus and the context action remain the pointer/touch path.
- Colour is never the only signal for locked cards, depth gates, tracking, or sales.

## Intentional mismatches with older mockups

- No three-stage job route, no freshness/deliver pictograms, no survey prediction sheet, no field guide.
- Boat class names are not shown when cargo is upgraded.
- Beach fishing grounds keep the lake names Sunward Shoal, Mosswater Pool, and Outer Gloam.
- Help text mentions comparing both harbors; the live detail card shows only the docked harbor's quote.
