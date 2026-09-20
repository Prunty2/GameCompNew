# FSHING 1.0.1 desktop fixes

Owner: Codex. Scope: investigate native macOS audio, add an optional 16:9 game
viewport with black bars and a recommendation dialog on other aspect ratios,
then rebuild macOS and Windows packages at version 1.0.1.

Acceptance: reproduce and diagnose packaged macOS music playback, verify the
fix in the native app, cover 16:9/ultrawide/tall layouts and pointer alignment,
pass unit and browser checks, and deliver rebuilt packages in a new Desktop
folder named `Fishing 1.0.1`. Preserve the existing 1.0.0 delivery.

Coordination: keep aspect-ratio presentation in a focused module. PR #141 owns
native fullscreen startup behavior and remains separate; avoid changing its
window API work. Any shared Game coordination, settings, and version changes
will be recorded here with verification evidence before handoff.

## Audio finding

A temporary diagnostic build using the bundled `tauri://localhost` assets found
that the existing native save had `muted: true` (music volume 0.6, effects 0.75).
Both original MP3s loaded with readyState 4 and valid durations; no media load
error was reported. After clearing Mute through the Audio settings, native menu
playback advanced beyond 11 seconds, unpaused and unmuted, at output volume
0.0702 (0.6 × the existing 0.117 gain). The local saved mute preference was cleared
without resetting progress or other settings. No codec, gain, or music lifecycle
change was needed. Physical speaker output has not been independently recorded.

The release adds a visible title-screen mute indicator with a Turn on button.
Other players' deliberate mute settings remain respected. All temporary
diagnostic UI was removed before the release build.

## Aspect ratio and compatibility

On a window more than 2% away from 16:9, the initial recommendation offers the
16:9 view or the current ratio. The choice is saved and editable in Display.
The whole game, menus, and tutorial overlays fit inside the bars. Responsive
styles now use the game container, and fishing population/layout and tutorial
coordinates use its dimensions. The modal pauses simulation and clears held game
input; black bars cannot trigger fishing input.

Save schema 17 validates `ask`, `16:9`, and `fill`, defaulting old or malformed
choices to `ask` while retaining progress and audio settings. PR #141 remains
unmerged: its future integration must retain schema 17 and the aspect-ratio
migration when combining its separate fullscreen-startup changes.

Checks so far: 185 unit tests, five focused display/audio browser tests, and four
production Chromium/WebKit checks passed. The browser production build passed.

The first full browser run passed 47/49. It exposed a resize-event ordering bug:
an immediately started fishing session could read the previous container size.
The viewport now calculates current intended dimensions before creating the
session; the existing population-size regression then passed 3/3 repeats.
The other failure is the existing reel-control test's fixed-time line-colour
assertion (also failed 1/3 focused repeats). No fishing rules were changed to
work around it; PR #142 owns the separate fishing determinism work.
