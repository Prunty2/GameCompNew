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
