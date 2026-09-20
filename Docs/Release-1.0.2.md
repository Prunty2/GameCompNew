# FSHING 1.0.2 display dropdown fix

Owner: Codex. Scope: keep the open resolution dropdown above sibling Display
settings, verify its options are readable and clickable, and deliver rebuilt
Mac and Windows packages in `Desktop/Fishing 1.0.2`.

This follows the unmerged 1.0.1 PR #145. The new branch starts from current main
and includes that prerequisite; this follow-up PR targets the 1.0.1 branch.
PR #145 must land first. Shared files in scope are `src/styles.css`, version
metadata, browser assertions, and the build label in `Docs/Game-Brief.md`.
PR #141's native fullscreen changes and PR #142's fishing work remain separate.
Existing Desktop deliveries and native save data will be preserved.

Acceptance: reproduce the dropdown occlusion before the fix; check pointer
selection, keyboard closing, and nearby controls at 1280×720, 2560×1440, and
3440×1440 with 16:9 framing in Chromium and WebKit; run the required project
checks and build both 1.0.2 packages. Native Windows gameplay retains the
documented hosted-runner automation limitation unless this build proves otherwise.

## Fix and regression evidence

Each blurred setting row creates its own stacking context. The open menu's
existing z-index was trapped below the later 16:9 row. The resolution row now
gets z-index 1 only while its trigger is expanded; closing the menu restores
the normal order. No window logic, save fields, or dependencies changed.

The new production regression failed before the CSS fix in WebKit because the
first option failed its pointer hit-test. After the fix, all ten production
checks passed in Chromium and WebKit, including every option's hit-test at
1280×720, 2560×1440, and 3440×1440, pointer selection, keyboard selection,
Escape/focus restoration, and the neighboring ratio control after closing.
Native window IPC is stubbed in these browser tests; native app checks are
recorded separately below. `npm run check` passed all 185 unit tests.

## Release verification

Release code: `74320b8` (PR #146). `npm run build` passed.
`E2E_PORT=4333 npm run test:e2e -- --output=/tmp/fishing-1.0.2-e2e-results`
passed all 49 browser tests. `npm run desktop:mac` built the Apple Silicon app.
The copy in `Desktop/Fishing 1.0.2/FSHING.app` has bundle version 1.0.2 and
passes `codesign --verify --deep --strict`.

The delivered native app displayed `v1.0.2 (PR #146)`. Its open resolution menu
was visually above the 16:9 row at 2560×1440 and 1280×720. Pointer selection of
the formerly covered 1280×720 option resized the native window successfully;
keyboard selection restored the original 2560×1440 preference. Escape closed
the menu and restored trigger focus, and Done returned to the title. Fullscreen
remained off and 16:9 remained enabled. Audio settings and progress were not
changed during this release's native check.

Windows run `35492446824` tested release code `74320b8`. All 185 unit tests,
all five production Chromium tests, and all 49 browser tests passed. The x64
NSIS build and silent installation passed. Native WebDriver session creation
failed with `DevToolsActivePort file doesn't exist`, the same hosted-runner
limitation as 1.0.0/1.0.1, before any native gameplay assertions. The overall
workflow is red for that failure; native Windows gameplay remains unverified.

Both packages are delivered in `/Users/liam/Desktop/Fishing 1.0.2/`:
`FSHING.app` and `FSHING_1.0.2_x64-setup.exe`. The installer has embedded product
version 1.0.2.0 and matches the downloaded CI artifact byte-for-byte. The Mac
executable also matches its build output. The final documentation-only commit
does not change release code `74320b8`. Older Desktop deliveries are preserved;
PR #146 remains open and unmerged, following PR #145.
