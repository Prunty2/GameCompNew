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

A subsequent full run passed 48/49 and revealed that the settings layout test
sampled its entrance animation before it finished (a 0.08 px transient offset).
The test now waits for that animation before comparing anchors; 3/3 focused
repeats passed. Keyboard QA also caught the existing game-level Space handler
blocking focused settings inputs. Settings checkboxes and sliders now retain
their native keyboard behavior, including Space on the new 16:9 option, and the
five display/audio tests pass with that keyboard path covered.

## Final release verification

Release code: `4a64c7e` (PR #145). `npm run check` passed 185 tests across
21 files. `npm run build` and `npm run desktop:mac` passed. All four
`npm run test:desktop-web` checks passed in Chromium and WebKit.
`E2E_PORT=4331 npm run test:e2e` passed **49/49** after the fixes above.
Earlier timing failures remain recorded as test history rather than being
reclassified as successful runs.

Native macOS checks exercised the recommendation popup, fullscreen with side
bars, Display and Audio settings, title, harbor, lake/dock framing, and quit.
The final Desktop copy was reopened and showed `v1.0.1 (PR #145)`; its native
version is 1.0.1, `codesign --verify --deep --strict` passed, and its executable
matches the build output. Mute is off, volumes remain 0.6/0.75, and 16:9 is enabled
in the local native save. The old 1.0.0 delivery is preserved.

Windows browser run `35491320567` tested the same release code and passed
48/49 tests, including all five new display/audio tests. Its only failure was
the existing fixed-time reel-colour assertion at `e2e/game.spec.ts:434`, matching
the timing failure recorded above. The Windows unit checks and two production
Chromium checks passed. This is not a fully green Windows regression run.

In that same run, `npm run desktop:windows -- --ci` built the 1.0.1 x64 NSIS
installer, and silent installation completed successfully. The native WebView2
test could not create its WebDriver session (`DevToolsActivePort file doesn't
exist`), matching the hosted-runner limitation documented for 1.0.0. It never
reached gameplay assertions. The run is red for this limitation and the browser
timing assertion above; native Windows gameplay remains a manual follow-up.

Delivered both packages to `/Users/liam/Desktop/Fishing 1.0.1/`: `FSHING.app`
(Apple Silicon macOS) and `FSHING_1.0.1_x64-setup.exe` (Windows x64). The
installer's embedded product version is 1.0.1.0; its copied bytes match the
artifact from run `35491320567`. Both packages were built from release code
`4a64c7e`; the final documentation-only commit does not change the app.
PR #145 is open and unmerged.
