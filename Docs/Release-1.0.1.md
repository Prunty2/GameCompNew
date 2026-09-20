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
