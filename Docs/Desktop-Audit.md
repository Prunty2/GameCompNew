# Desktop compatibility audit

Owner: Codex. Scope: Windows/macOS packaging, offline bootstrap, asset delivery,
native API permissions, display, persistence, audio, input, and regression checks.
Baseline: `d082cae`, 20 September 2026. Acceptance: a standalone local macOS app,
a Windows x64 installer built on Windows, and recorded checks of the shipped app.

Changes use an isolated branch. Existing music edits in the primary checkout and
open gameplay/fullscreen PRs (#140, #141, #142) are not incorporated into this audit.
Shared files touched: package scripts, Vite test configuration, PlatformService.
No gameplay, balance, save schema, asset, or dependency upgrades are intended.

## Findings and fixes

- The HTML loaded the online CrazyGames SDK synchronously before game startup.
  Desktop mode now skips it entirely. Browser SDK loading and initialization have
  bounded waits, preserving local play during a stalled network request.
- Tauri was already scaffolded, but lacked npm app commands and Windows CI.
  Added repeatable development/build scripts and a Windows installer/native test job.
- The native bundle still advertised version 0.1.0 while the game was 0.9.0.
  Tauri now reads package.json and the Rust package is aligned to 0.9.0.
- Windows packaging previously depended on downloading WebView2 when absent.
  NSIS now includes the offline installer, uses current-user installation, and
  requests WebView2 110 or newer. Windows 10/11 x64 is the submission target.
- Assets are imported through Vite, including MP3s; no external fonts or assets
  are required. Native saves use the app's localStorage origin.
- Native window calls are isolated in WindowService with declared capabilities.
  Renderer and fixed-step simulation remain separate from OS APIs. Keyboard
  controls use event.code; pointer capture and blur handling are platform neutral.
- macOS minimum version is 13.3 to cover the game's Canvas roundRect API.

## Verification

Results will be finalized after native and production test runs.

Initial checks: `npm run check` passed 175 tests. The initial full Chromium suite
passed 40/44. Failures were stale music gain/start-position assertions, a short
line-retraction state missed by polling, and a help-button transition timeout.
Music and fishing architecture have separate active work; these results are not
treated as Windows-specific failures or silently hidden.

`npm audit --omit=dev` found zero production npm advisories. The development tree
reported four advisory entries (three moderate, one high) in Vitest/mocker,
PostCSS, and nanoid. Dependency upgrades are deferred to a separate agreed change.

## Submission limits

Unsigned Windows builds can trigger SmartScreen or school application policies;
this audit cannot establish the teacher's device policy. A school-managed Windows
device still needs a final install/play check, especially display scaling and
audio output. Local macOS builds are for testing, not notarized distribution.

Saves keep progression/settings but intentionally do not keep cargo, world,
position, or an in-progress voyage. Do not describe those as desktop persistence.

## Reference

[Tauri Windows packaging](https://v2.tauri.app/distribute/windows-installer/)
documents the NSIS and offline WebView2 options.
[Tauri native testing](https://v2.tauri.app/develop/tests/webdriver/)
documents the Windows WebDriver route used here.
