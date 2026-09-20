import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

assert.equal(process.platform, "win32", "Run the native smoke test on Windows.");
const application = process.env.FSHING_APP ?? resolve("src-tauri/target/x86_64-pc-windows-msvc/release/FSHING.exe");
const driver = spawn("tauri-driver", process.env.EDGE_DRIVER ? ["--native-driver", process.env.EDGE_DRIVER] : [], {
  stdio: ["ignore", "pipe", "pipe"],
});
let driverLog = "";
driver.stdout.on("data", (data) => { driverLog += data; });
driver.stderr.on("data", (data) => { driverLog += data; });
driver.on("error", (error) => { driverLog += error.stack; });
let session;

async function request(method, path, body) {
  const response = await fetch(`http://127.0.0.1:4444${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const result = await response.json();
  if (!response.ok || result.value?.error) throw new Error(JSON.stringify(result));
  return result.value;
}

async function until(check, message) {
  const deadline = Date.now() + 15_000;
  let lastError;
  do {
    try { if (await check()) return; } catch (error) { lastError = error; }
    await delay(150);
  } while (Date.now() < deadline);
  throw new Error(`${message}: ${lastError ?? "condition did not become true"}`);
}

const execute = (script, args = []) => request("POST", `/session/${session}/execute/sync`, { script, args });
const visible = (selector) => execute("return !!document.querySelector(arguments[0])?.getClientRects().length", [selector]);

async function click(selector) {
  await until(() => visible(selector), `Missing control ${selector}`);
  const element = await request("POST", `/session/${session}/element`, { using: "css selector", value: selector });
  await request("POST", `/session/${session}/element/${element["element-6066-11e4-a52e-4f735466cecf"]}/click`, {});
}

async function key(value, duration = 0) {
  await request("POST", `/session/${session}/actions`, {
    actions: [{ type: "key", id: "keyboard", actions: [
      { type: "keyDown", value }, { type: "pause", duration }, { type: "keyUp", value },
    ] }],
  });
}

async function fullscreen() {
  const result = await request("POST", `/session/${session}/execute/async`, {
    script: `const done = arguments[arguments.length - 1];
      window.__TAURI_INTERNALS__.invoke("plugin:window|is_fullscreen", { label: "main" })
        .then(value => done({ value }), error => done({ error: String(error) }));`,
    args: [],
  });
  assert.equal(result.error, undefined);
  return result.value;
}

async function start() {
  const created = await request("POST", "/session", {
    capabilities: { alwaysMatch: { "tauri:options": { application } } },
  });
  session = created.sessionId;
  await until(() => visible('[data-action="start"]'), "Native title did not load");
  assert.equal(await execute("return '__TAURI_INTERNALS__' in window"), true);
  assert.equal(await execute("return '__FSHING_TEST__' in window"), false);
  assert.equal(await visible('[data-action="quit"]'), true);
}

await mkdir("native-test-results", { recursive: true });
try {
  await until(async () => { await request("GET", "/status"); return true; }, "tauri-driver did not start");
  await start();
  await execute(`window.__nativeWarnings = []; window.addEventListener("error", e => window.__nativeWarnings.push(e.message));
    const warn = console.warn; console.warn = (...args) => { window.__nativeWarnings.push(args.map(String).join(" ")); warn(...args); };`);
  await click('[data-action="open-settings"]');
  await click('label:has([data-setting="reducedMotion"])');
  await click('[data-settings-tab="audio"]');
  await until(() => execute('return [...document.querySelectorAll("audio")].some(a => !a.paused && a.readyState >= 2 && a.currentTime > 0)'), "Native audio did not play");
  await click('label:has([data-setting="muted"])');
  await click('[data-settings-tab="display"]');
  await click('[data-action="toggle-resolution-menu"]');
  await click('[data-resolution="1600x900"]');
  await until(() => execute("return innerWidth === 1600 && innerHeight === 900"), "Native resizing failed");
  await click('[data-action="toggle-resolution-menu"]');
  await click('[data-resolution="1280x720"]');
  await click('label:has([data-setting="fullscreen"])');
  await until(fullscreen, "Native fullscreen failed");
  assert.equal(await execute('return document.querySelector(".settings-resolution-trigger").disabled'), true);
  await click('label:has([data-setting="fullscreen"])');
  await until(async () => !(await fullscreen()), "Native fullscreen exit failed");
  await click('[data-action="toggle-resolution-menu"]');
  await click('[data-resolution="native"]');
  await click('[data-action="toggle-resolution-menu"]');
  await click('[data-resolution="1280x720"]');
  await click('[data-action="back"]');
  await click('[data-action="start"]');
  await until(() => visible('[data-action="undock"]'), "Harbor failed to load");
  await click('[data-action="undock"]');
  await until(async () => !(await visible('[data-action="undock"]')), "Undocking failed");
  await key("d", 700);
  await key("\uE00C");
  await until(() => visible('[data-action="resume"]'), "Keyboard pause failed");
  assert.deepEqual(await execute("return window.__nativeWarnings"), []);
  const external = await execute(`return performance.getEntriesByType("resource").map(r => r.name)
    .filter(url => /^https?:/.test(url) && !["tauri.localhost", "ipc.localhost"].includes(new URL(url).hostname));`);
  assert.deepEqual(external, [], "Packaged app made external requests");
  await writeFile("native-test-results/windows-game.png", Buffer.from(await request("GET", `/session/${session}/screenshot`), "base64"));
  await request("DELETE", `/session/${session}`);
  session = undefined;
  await start();
  const settings = await execute('return JSON.parse(localStorage.getItem("gamecomp-new.save")).settings');
  assert.equal(settings.muted, true);
  assert.equal(settings.reducedMotion, true);
  assert.equal(settings.resolution, "1280x720");
  assert.equal(settings.fullscreen, false);
  await click('[data-action="quit"]');
  console.log("PASS: installed Windows app, offline assets, audio, native resize/fullscreen/monitor, keyboard, pause, save across relaunch, Quit.");
} catch (error) {
  if (session) {
    try {
      await writeFile("native-test-results/failure.png", Buffer.from(await request("GET", `/session/${session}/screenshot`), "base64"));
      await writeFile("native-test-results/failure.html", await execute("return document.documentElement.outerHTML"));
    } catch { /* Keep the original test failure if the app has exited. */ }
  }
  throw error;
} finally {
  if (session) await request("DELETE", `/session/${session}`).catch(() => {});
  driver.kill();
  await writeFile("native-test-results/driver.log", driverLog);
}
