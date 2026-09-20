# FSHING

FSHING is a single-player, side-on fishing market game for desktop and mobile browsers. Pilot a working boat across the lake and an unlockable Beach, catch habitat-specific species, and sell them at two harbors whose prices move each day.

The playable game includes:

- Deterministic fixed-step sailing, research-backed species movement and reel-and-release line fights, market quotes, and day/night
- A lake with twelve real species and an unlockable Beach with eleven, each across three fishing grounds
- Two harbors with seeded daily quotes, seven-day price history, and full-quote sales
- Cargo, engine, line, and five-tier reel-power upgrades, plus a rechargeable engine boost
- Line-tier-gated Outer Gloam water and a paid Beach location
- A five-step First Assignment, four-card How to play, and credits
- Keyboard sailing and hook steering, keyboard/pointer/touch reeling, and pause on focus loss
- Quiet looping scene music, mute, separate music and sound-effects volume, high contrast, reduced motion, and remappable controls
- Version 16 validated persistence, native-aware Tauri display settings, and a local-safe CrazyGames SDK v3 adapter
- Generated runtime art documented in [`Docs/Asset-Manifest.md`](Docs/Asset-Manifest.md)

## Run locally

```sh
npm install
npm run dev
```

## Verify

```sh
npm run check
npm run build
npm run test:e2e
```

## Desktop apps (Tauri 2)

The teacher runs the Windows installer and launches **FSHING**. Node, npm, Rust,
and a development server are not needed on the teacher's computer. The x64 Windows
installer includes the offline WebView2 installer and installs for the current user.
The school may still restrict unsigned applications through its device policy.

On this development Mac, install the Xcode command line tools and Rust using
[Tauri's prerequisites](https://v2.tauri.app/start/prerequisites/), then run:

```sh
npm ci
npm run desktop:dev
# Or build a standalone application:
npm run desktop:mac
open src-tauri/target/release/bundle/macos/FSHING.app
```

The macOS build targets the current Mac's architecture and requires macOS 13.3 or
later for the canvas APIs used by the game. A local test build is not notarized.
If Rust was installed without shell setup, run `source "$HOME/.cargo/env"` first.

Build Windows installers on Windows with `npm run desktop:windows`, or download
the **FSHING-Windows-x64** artifact from the **Desktop compatibility** GitHub Actions
run on the pull request. The installer is under
`src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/`.

Both desktop bundles include all game images and music and skip the online
CrazyGames SDK. Saves are local to the app and OS user; they do not share the
browser's save. Progress and settings persist, while cargo, position, and the
current voyage reset according to the existing save design.

`npm run test:desktop-web` checks the built desktop frontend in Chromium and WebKit.
The Windows workflow also installs the actual `.exe` package and attempts native
WebView2 checks of display controls, audio, input, persistence, and Quit. The current
hosted-runner test is blocked during WebDriver session creation; native Windows
playtesting remains required before submission.
See [`Docs/Desktop-Audit.md`](Docs/Desktop-Audit.md) for scope, evidence, and limits.

Product, scope, balance, and acceptance live in [`Docs/Game-Brief.md`](Docs/Game-Brief.md). The design, testing, and reflection portfolio is in [`Docs/Assessment-Report.md`](Docs/Assessment-Report.md).
