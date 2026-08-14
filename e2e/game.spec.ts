import { expect, test } from "@playwright/test";

const BOOST_CAMERA_VIEW_MULTIPLIER = 1.18;

async function expectHorizontallyCentered(page: import("@playwright/test").Page, selector: string): Promise<void> {
  const offset = await page.locator(selector).evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return Math.abs((bounds.left + bounds.width / 2) - window.innerWidth / 2);
  });
  expect(offset).toBeLessThanOrEqual(1);
}

test.beforeEach(async ({ page }) => {
  await page.route("https://sdk.crazygames.com/**", (route) => route.abort());
});

test("main menu presents only centered play and settings actions", async ({ page }) => {
  await page.goto("/");

  const version = page.locator(".title-build-version");
  await expect(version).toHaveText("v0.2.0 (PR #37)");
  const versionBounds = await version.boundingBox();
  expect(versionBounds).not.toBeNull();
  expect(versionBounds!.x).toBeLessThan(24);
  expect(versionBounds!.y + versionBounds!.height).toBeGreaterThan(690);

  const actions = page.locator(".title-actions button");
  await expect(actions).toHaveCount(2);
  const playButton = page.getByRole("button", { name: "Play", exact: true });
  await expect(playButton).toBeVisible();
  await playButton.hover();
  await expect(playButton).toHaveCSS("animation-name", "menu-button-hover-wobble");
  await page.mouse.move(0, 0);
  await page.waitForTimeout(250);
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("button", { name: "How to play" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Field guide" })).toHaveCount(0);
  await expect(page.locator(".title-tagline, .title-controls")).toHaveCount(0);

  const bounds = await actions.evaluateAll((buttons) => buttons.map((button) => {
    const rect = button.getBoundingClientRect();
    return {
      center: rect.left + rect.width / 2,
      width: rect.width,
    };
  }));
  const viewportCenter = await page.evaluate(() => window.innerWidth / 2);

  expect(bounds[0].width).toBe(bounds[1].width);
  expect(bounds.every(({ center }) => Math.abs(center - viewportCenter) <= 1)).toBe(true);
});

test("accepting a delivery drops the shared confirmation pill", async ({ page }) => {
  await page.goto("/?e2e=1");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Accept contract" }).click();

  const notification = page.locator("#delivery-notification");
  await expect(notification).toBeVisible();
  await expect(notification).toContainText("Delivery Accepted");
  await expect(notification).toHaveCSS("animation-name", "delivery-success-enter");
  await expect(notification).toHaveCSS("border-radius", "999px");
  await expect(notification).toHaveCSS("width", "310px");
  await expect(notification.locator("strong")).toHaveCSS("color", "rgb(255, 215, 120)");
  await expect(notification.locator(".delivery-success-seal")).toBeHidden();
  await expect(page.locator("#toast")).not.toContainText("Contract accepted");

  await page.getByRole("button", { name: "Close delivery accepted notification" }).click();
  await expect(notification).toBeHidden();
});

test("the waterline transition carries title, dock, and lake scene changes", async ({ page }) => {
  await page.goto("/?e2e=1");
  const transition = page.locator("#scene-transition");

  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(transition).toHaveClass(/is-(covering|revealing)/);
  await expect(page.getByRole("heading", { name: "Brindle Harbor" })).toBeVisible();
  await expect(page.locator(".harbor-screen")).toHaveAttribute("data-dock", "brindle");
  await expect(page.locator(".harbor-screen")).toHaveAttribute("data-time-of-day", "day");
  await expect(page.locator(".harbor-screen")).toHaveCSS("background-image", /dock-brindle-day/);
  await expect(transition).not.toHaveClass(/is-(covering|revealing)/);

  await page.getByRole("button", { name: "Accept contract" }).click();
  await expect(transition).toHaveClass(/is-(covering|revealing)/);
  await expect(page.locator(".screen-overlay")).toHaveCount(0);
  await expect(transition).not.toHaveClass(/is-(covering|revealing)/);

  await page.evaluate(() => window.__FSHING_TEST__?.sailToHarbor("gloam"));
  await page.getByRole("button", { name: "Dock · Gloam Ferry" }).click();
  await expect(transition).toHaveClass(/is-(covering|revealing)/);
  await expect(page.locator(".harbor-screen")).toHaveAttribute("data-dock", "gloam");
  await expect(page.locator(".harbor-screen")).toHaveAttribute("data-time-of-day", "day");
  await expect(page.locator(".harbor-screen")).toHaveCSS("background-image", /dock-gloam-day/);
  await expect(transition).not.toHaveClass(/is-(covering|revealing)/);

  await page.getByRole("button", { name: "Back to lake →" }).click();
  await expect(transition).toHaveClass(/is-(covering|revealing)/);
  await expect(page.locator(".screen-overlay")).toHaveCount(0);
  await expect(transition).not.toHaveClass(/is-(covering|revealing)/);

  await page.evaluate(() => window.__FSHING_TEST__?.setElapsed(165));
  await page.evaluate(() => window.__FSHING_TEST__?.sailToHarbor("brindle"));
  await page.getByRole("button", { name: "Dock · Brindle Harbor" }).click();
  await expect(page.locator(".harbor-screen")).toHaveAttribute("data-time-of-day", "night");
  expect(await page.locator(".harbor-screen").evaluate((element) => getComputedStyle(element, "::before").backgroundImage)).toContain("dock-brindle-night");
  await page.getByRole("button", { name: "Back to lake →" }).click();
  await expect(transition).not.toHaveClass(/is-(covering|revealing)/);

  await page.evaluate(() => window.__FSHING_TEST__?.sailToHarbor("gloam"));
  await page.getByRole("button", { name: "Dock · Gloam Ferry" }).click();
  await expect(page.locator(".harbor-screen")).toHaveAttribute("data-time-of-day", "night");
  expect(await page.locator(".harbor-screen").evaluate((element) => getComputedStyle(element, "::before").backgroundImage)).toContain("dock-gloam-night");
  await page.getByRole("button", { name: "Back to lake →" }).click();
  await expect(transition).not.toHaveClass(/is-(covering|revealing)/);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  await expect(transition).not.toHaveClass(/is-(covering|revealing)/);

  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByRole("heading", { name: "Paused" })).toHaveCount(0);
  await expect(transition).not.toHaveClass(/is-(covering|revealing)/);

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Title screen" }).click();
  await expect(transition).toHaveClass(/is-(covering|revealing)/);
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
});

test("leaving the title frames the boat before gameplay is revealed", async ({ page }) => {
  await page.goto("/?e2e=1");
  const transition = page.locator("#scene-transition");
  const canvas = page.locator("#game-canvas");

  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Accept contract" }).click();
  await expect(transition).not.toHaveClass(/is-(covering|revealing)/);
  await page.evaluate(() => window.__FSHING_TEST__?.sailToHarbor("brindle"));

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Title screen" }).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await expect(transition).not.toHaveClass(/is-(covering|revealing)/);
  expect(Number(await canvas.getAttribute("data-surface-camera-center"))).toBeCloseTo(0.27, 2);

  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator(".screen-overlay")).toHaveCount(0);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  expect(Number(await canvas.getAttribute("data-surface-camera-center"))).toBeCloseTo(0.15, 2);
});

test("nightfall changes the panorama and keeps a moon indicator visible until morning", async ({ page }) => {
  await page.goto("/?e2e=1");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Accept contract" }).click();

  const indicator = page.locator(".night-indicator");
  await expect(indicator).toBeHidden();
  const daytimeFrame = await page.locator("#game-canvas").evaluate(
    (element) => (element as HTMLCanvasElement).toDataURL(),
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();

  await page.evaluate(() => window.__FSHING_TEST__?.setElapsed(152.49));
  await expect(indicator).toBeHidden();
  await page.evaluate(() => window.__FSHING_TEST__?.setElapsed(152.5));
  await expect(page.locator("body")).toHaveClass(/show-night-indicator/);
  await expect(page.getByRole("img", { name: "Nighttime" })).toBeVisible();
  await expect(indicator).toHaveCSS("animation-name", "night-indicator-in");
  await expect(indicator).toHaveAttribute("aria-hidden", "false");
  await expect(indicator).toHaveCSS("width", "48px");
  await expect(indicator).toHaveCSS("height", "48px");
  await expect(indicator).toHaveCSS("border-radius", "50%");
  await expect(indicator).toHaveText("");
  await expect.poll(() => page.locator("#game-canvas").evaluate(
    (element) => (element as HTMLCanvasElement).toDataURL(),
  )).not.toBe(daytimeFrame);

  await page.evaluate(() => window.__FSHING_TEST__?.setElapsed(210));
  await expect(page.locator("body")).not.toHaveClass(/show-night-indicator/);
  await expect(indicator).toBeHidden();
  await expect(indicator).toHaveAttribute("aria-hidden", "true");
});

test("development shortcuts jump to dusk and full night", async ({ page }) => {
  await page.goto("/?e2e=1");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Accept contract" }).click();
  await expect(page.locator("#scene-transition")).not.toHaveClass(/is-(covering|revealing)/);

  await page.keyboard.press("KeyG");
  await expect.poll(() => page.evaluate(() => window.__FSHING_TEST__?.elapsed() ?? 0)).toBeGreaterThanOrEqual(140);
  expect(await page.evaluate(() => window.__FSHING_TEST__?.elapsed() ?? 0)).toBeLessThan(140.2);
  await expect(page.locator(".night-indicator")).toBeHidden();

  const transitionFrame = await page.locator("#game-canvas").evaluate(
    (element) => (element as HTMLCanvasElement).toDataURL(),
  );
  await page.keyboard.press("KeyH");
  await expect.poll(() => page.evaluate(() => window.__FSHING_TEST__?.elapsed() ?? 0)).toBeGreaterThanOrEqual(165);
  expect(await page.evaluate(() => window.__FSHING_TEST__?.elapsed() ?? 0)).toBeLessThan(165.2);
  await expect(page.getByRole("img", { name: "Nighttime" })).toBeVisible();
  await expect.poll(() => page.locator("#game-canvas").evaluate(
    (element) => (element as HTMLCanvasElement).toDataURL(),
  )).not.toBe(transitionFrame);
});

test("B temporarily unlocks the rechargeable engine boost", async ({ page }) => {
  await page.goto("/?e2e=1");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Accept contract" }).click();

  await page.keyboard.press("b");
  await expect(page.locator("#toast")).toContainText("Boost temporarily unlocked");
  const gauge = page.getByRole("meter", { name: "Boost charge" });
  await expect(gauge).toBeVisible();
  await expect(gauge).toHaveAttribute("aria-valuenow", "100");
  const canvas = page.locator("#game-canvas");
  const normalViewWidth = Number(await canvas.getAttribute("data-surface-camera-view-width"));
  const normalBoatWidth = Number(await canvas.getAttribute("data-surface-boat-width"));

  await page.keyboard.down("KeyD");
  await page.keyboard.down("ShiftLeft");
  await expect.poll(async () => Number(await gauge.getAttribute("aria-valuenow"))).toBeLessThan(100);
  await expect(gauge).toHaveClass(/is-active/);
  await page.waitForTimeout(250);
  const openingViewWidth = Number(await canvas.getAttribute("data-surface-camera-view-width"));
  const openingBoatWidth = Number(await canvas.getAttribute("data-surface-boat-width"));
  expect(openingViewWidth).toBeGreaterThan(normalViewWidth);
  expect(openingViewWidth).toBeLessThan(normalViewWidth * BOOST_CAMERA_VIEW_MULTIPLIER - 0.003);
  expect(openingBoatWidth).toBeLessThan(normalBoatWidth);
  expect(openingBoatWidth).toBeGreaterThan(normalBoatWidth / BOOST_CAMERA_VIEW_MULTIPLIER + 2);
  await expect.poll(async () => Number(await canvas.getAttribute("data-surface-camera-view-width"))).toBeGreaterThan(normalViewWidth + 0.045);
  await expect.poll(async () => Number(await canvas.getAttribute("data-surface-boat-width"))).toBeLessThan(normalBoatWidth * 0.87);
  await page.keyboard.up("ShiftLeft");
  await page.keyboard.up("KeyD");
  await page.waitForTimeout(250);
  const closingViewWidth = Number(await canvas.getAttribute("data-surface-camera-view-width"));
  const closingBoatWidth = Number(await canvas.getAttribute("data-surface-boat-width"));
  expect(closingViewWidth).toBeGreaterThan(normalViewWidth + 0.003);
  expect(closingViewWidth).toBeLessThan(normalViewWidth + 0.05);
  expect(closingBoatWidth).toBeGreaterThan(normalBoatWidth * 0.85);
  expect(closingBoatWidth).toBeLessThan(normalBoatWidth);
  await expect.poll(async () => Number(await canvas.getAttribute("data-surface-camera-view-width"))).toBeLessThan(normalViewWidth + 0.005);
});

test("pause blurs the lake and slides the compact menu in and out", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  const titleLogoWidth = await page.locator(".title-panel .wordmark").evaluate((element) => element.getBoundingClientRect().width);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Accept contract" }).click();

  await page.keyboard.press("Escape");
  const pauseScreen = page.locator(".pause-screen");
  const pauseMenu = page.locator(".pause-menu");
  await expect(pauseScreen).toBeVisible();
  await expect(pauseScreen).toHaveCSS("animation-name", "pause-blur-in");
  await expect(pauseMenu).toHaveCSS("animation-name", "pause-menu-in");
  await expect(page.getByRole("button", { name: "Resume" })).toBeFocused();
  await page.getByRole("button", { name: "Resume" }).hover();
  await expect(page.getByRole("button", { name: "Resume" })).toHaveCSS("animation-name", "menu-button-hover-wobble");
  await expect(page.locator(".pause-actions button")).toHaveCount(4);
  await expectHorizontallyCentered(page, ".pause-menu");

  const pauseSecondaryWidth = await page.locator(".pause-secondary-actions").evaluate((element) => element.getBoundingClientRect().width);
  const titleScreenButtonWidth = await page.getByRole("button", { name: "Title screen" }).evaluate((element) => element.getBoundingClientRect().width);
  expect(titleScreenButtonWidth).toBeCloseTo(pauseSecondaryWidth, 0);

  const pauseLogoWidth = await page.locator(".pause-wordmark").evaluate((element) => element.getBoundingClientRect().width);
  expect(pauseLogoWidth).toBeLessThan(titleLogoWidth);

  await page.getByRole("button", { name: "Settings" }).click();
  const settingsScreen = page.locator(".settings-overlay");
  await expect(settingsScreen).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(settingsScreen).toHaveCount(0);
  await expect(pauseScreen).toHaveClass(/is-settings-return/);
  await expect(pauseScreen).toHaveCSS("animation-name", "none");
  await expect(pauseMenu).toHaveCSS("animation-name", "menu-handoff-in");

  await page.getByRole("button", { name: "Resume" }).click();
  await expect(pauseScreen).toHaveCount(0);
});

test("settings reverses its title transition when closing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
  const titleLakeFrame = await page.locator("#game-canvas").evaluate((element) => (element as HTMLCanvasElement).toDataURL());

  await page.getByRole("button", { name: "Settings" }).click();
  const settingsScreen = page.locator(".settings-overlay");
  const settingsMenu = page.locator(".settings-menu");
  await expect(settingsScreen).toHaveClass(/is-title-entry/);
  await page.getByRole("button", { name: "Done" }).hover();
  await expect(page.getByRole("button", { name: "Done" })).toHaveCSS("animation-name", "menu-button-hover-wobble");

  await page.getByRole("button", { name: "Done" }).click();
  await expect(settingsScreen).toHaveClass(/is-closing-to-title/);
  await expect(settingsScreen).toHaveCSS("animation-name", "settings-backdrop-out");
  await expect(settingsMenu).toHaveCSS("animation-name", "settings-menu-out");
  await expect(settingsScreen).toHaveCount(0);
  await expect(page.locator(".title-screen")).toHaveClass(/is-settings-return/);
  await expect(page.locator(".title-panel")).toHaveCSS("animation-name", "menu-handoff-in");
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();

  const returnedLakeFrame = await page.locator("#game-canvas").evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  expect(returnedLakeFrame).toBe(titleLakeFrame);
});

test("surface shoals anchor the interaction to the fishing hook", async ({ page }) => {
  await page.goto("/?e2e=1");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Accept contract" }).click();

  const action = page.locator("#context-action");
  await expect(action).toBeHidden();

  await page.evaluate(() => window.__FSHING_TEST__?.sailToSpot("sunwardShoal"));
  await expect(action).toBeVisible();
  await expect(action).toHaveAccessibleName("Drop line · Sunward Shoal");
  await expect(action).toHaveClass(/is-fishing-cue/);
  await expect(action).toHaveCSS("width", "78px");
  await expect(action).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

  const canvasBounds = await page.locator("#game-canvas").boundingBox();
  const initialHookBounds = await action.boundingBox();
  expect(canvasBounds).not.toBeNull();
  expect(initialHookBounds).not.toBeNull();
  expect(initialHookBounds!.y + initialHookBounds!.height).toBeLessThan(
    canvasBounds!.y + canvasBounds!.height * 0.68,
  );

  const initialHookLeft = Number.parseFloat(await action.evaluate((element) => (element as HTMLElement).style.left));
  await page.evaluate(() => {
    const samples: string[] = [];
    let framesRemaining = 24;
    const sampleAnchor = (): void => {
      samples.push(document.querySelector<HTMLElement>("#context-action")?.style.left ?? "");
      document.body.dataset.hookAnchorSamples = JSON.stringify(samples);
      framesRemaining -= 1;
      if (framesRemaining > 0) requestAnimationFrame(sampleAnchor);
    };
    requestAnimationFrame(sampleAnchor);
  });
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(1_000);
  await page.keyboard.up("KeyD");
  await expect(action).toBeVisible();
  const shiftedHookLeft = Number.parseFloat(await action.evaluate((element) => (element as HTMLElement).style.left));
  const anchorSamples = await page.evaluate<string[]>(() => JSON.parse(document.body.dataset.hookAnchorSamples ?? "[]"));
  expect(new Set(anchorSamples).size).toBeGreaterThan(8);
  expect(Math.abs(shiftedHookLeft - initialHookLeft)).toBeGreaterThan(6);

  await page.evaluate(() => window.__FSHING_TEST__?.sailToHarbor("gloam"));
  await expect(action).not.toHaveClass(/is-fishing-cue/);
});

test("fishing descends through the sailing waterline into a site-specific scene", async ({ page }) => {
  await page.goto("/?e2e=1&e2eSpot=sunwardShoal");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Accept contract" }).click();
  await page.getByRole("button", { name: "Drop line · Sunward Shoal" }).click();

  const canvas = page.locator("#game-canvas");
  await expect(canvas).toHaveAttribute("data-fishing-spot", "sunwardShoal");
  await expect(canvas).toHaveAttribute("data-target-rarity", "common");
  await expect(canvas).toHaveAttribute(
    "aria-label",
    "Fishing at Sunward Shoal. Target Bluegill, common rarity.",
  );
  const initialDiveProgress = Number(await canvas.getAttribute("data-fishing-dive-progress"));
  expect(initialDiveProgress).toBeLessThan(1);
  await expect.poll(async () => Number(await canvas.getAttribute("data-fishing-dive-progress"))).toBeGreaterThan(0.99);
});

test("all three fishing spots render their habitat-specific real species", async ({ page }) => {
  await page.goto("/?e2e=1");
  const canvas = page.locator("#game-canvas");
  const sites = [
    { id: "sunwardShoal", name: "Sunward Shoal", species: "bluegill", label: "Bluegill", rarity: "common" },
    { id: "mosswaterPool", name: "Mosswater Pool", species: "largemouthBass", label: "Largemouth Bass", rarity: "uncommon" },
    { id: "outerGloam", name: "Outer Gloam", species: "lakeTrout", label: "Lake Trout", rarity: "rare" },
  ] as const;

  for (const site of sites) {
    await page.evaluate(({ id, species }) => window.__FSHING_TEST__?.previewFishing(id, species), site);
    await expect(canvas).toHaveAttribute("data-fishing-spot", site.id);
    await expect(canvas).toHaveAttribute("data-target-rarity", site.rarity);
    await expect(canvas).toHaveAttribute(
      "aria-label",
      `Fishing at ${site.name}. Target ${site.label}, ${site.rarity} rarity.`,
    );
  }
});

test("reels a hooked fish to the boat before securing the catch", async ({ page }) => {
  await page.goto("/?e2e=1&e2eSpot=sunwardShoal");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Accept contract" }).click();
  await page.getByRole("button", { name: "Drop line · Sunward Shoal" }).click();

  const canvas = page.locator("#game-canvas");
  await expect.poll(async () => Number(await canvas.getAttribute("data-fishing-dive-progress"))).toBeGreaterThan(0.99);
  const [reelStart, reelMidpoint] = await page.evaluate(async () => {
    const element = document.querySelector<HTMLCanvasElement>("#game-canvas");
    if (!element) throw new Error("Expected the game canvas.");
    window.__FSHING_TEST__?.hookSpecies("bluegill");

    type ReelSample = {
      diveProgress: number;
      schoolOpacity: number;
      surfaceBlend: number;
      surfaceSpriteOpacity: number;
    };
    let firstSample: ReelSample | null = null;
    const startedAt = performance.now();
    return new Promise<[ReelSample, ReelSample]>((resolve, reject) => {
      const sampleFrame = (): void => {
        if (element.dataset.fishingState === "reeling") {
          const sample = {
            diveProgress: Number(element.getAttribute("data-fishing-dive-progress")),
            schoolOpacity: Number(element.getAttribute("data-fishing-school-opacity")),
            surfaceBlend: Number(element.getAttribute("data-fishing-surface-blend")),
            surfaceSpriteOpacity: Number(element.getAttribute("data-fishing-surface-sprite-opacity")),
          };
          firstSample ??= sample;
          if (sample.surfaceBlend >= firstSample.surfaceBlend + 0.05) {
            resolve([firstSample, sample]);
            return;
          }
        }
        if (performance.now() - startedAt >= 5_000) {
          reject(new Error("Reel transition did not produce two distinct frames."));
          return;
        }
        requestAnimationFrame(sampleFrame);
      };
      requestAnimationFrame(sampleFrame);
    });
  });
  expect(reelMidpoint.diveProgress).toBeLessThan(reelStart.diveProgress);
  expect(reelMidpoint.surfaceBlend).toBeGreaterThan(reelStart.surfaceBlend);
  expect(reelMidpoint.schoolOpacity).toBeLessThan(reelStart.schoolOpacity);
  expect(reelMidpoint.schoolOpacity).toBeGreaterThan(0);
  expect(reelMidpoint.surfaceSpriteOpacity).toBeGreaterThan(reelStart.surfaceSpriteOpacity);
  expect(reelStart.schoolOpacity + reelStart.surfaceBlend).toBeCloseTo(1, 2);
  expect(reelMidpoint.schoolOpacity + reelMidpoint.surfaceBlend).toBeCloseTo(1, 2);
  expect(reelStart.surfaceSpriteOpacity).toBeCloseTo(reelStart.surfaceBlend, 2);
  expect(reelMidpoint.surfaceSpriteOpacity).toBeCloseTo(reelMidpoint.surfaceBlend, 2);
  await expect(page.locator(".fishing-controls")).toBeHidden();
  await expect.poll(async () => page.evaluate(() => window.__FSHING_TEST__?.mode())).toBe("cruising");
  await expect(canvas).not.toHaveAttribute("data-fishing-state");
  await expect(canvas).not.toHaveAttribute("data-fishing-school-opacity");
  await expect(canvas).not.toHaveAttribute("data-fishing-surface-sprite-opacity");
});

test("first harbor job keeps full-size route art clear of the title", async ({ page }) => {
  await page.goto("/?e2e=1");
  await page.getByRole("button", { name: "Play", exact: true }).click();

  const title = page.getByRole("heading", { name: "First Assignment" });
  const firstMarker = page.locator(".job-route-number").first();
  const firstStage = page.locator(".job-route > li").first();
  const secondStage = page.locator(".job-route > li").nth(1);
  const fish = page.getByRole("img", { name: "Bluegill target fish" });
  const freshness = page.locator(".job-route-freshness-icon");
  const deliver = page.locator(".job-route-deliver-icon");
  const reward = page.getByLabel("Reward: 75 shells");
  const missionButton = page.getByRole("button", { name: "Accept contract" });
  const helpButton = page.getByRole("button", { name: "How to play" });
  const menuButton = page.getByRole("button", { name: "Back to main menu" });
  const stageHeadings = page.locator(".job-route small");
  const stageIcons = page.locator(".job-route-icon");
  const stageValues = page.locator(".job-route-copy > strong");
  const titleBounds = await title.boundingBox();
  const markerBounds = await firstMarker.boundingBox();
  const stageBounds = await firstStage.boundingBox();
  const secondStageBounds = await secondStage.boundingBox();
  const missionBounds = await missionButton.boundingBox();
  const helpBounds = await helpButton.boundingBox();
  const menuBounds = await menuButton.boundingBox();

  expect((markerBounds?.y ?? 0) - ((titleBounds?.y ?? 0) + (titleBounds?.height ?? 0))).toBeGreaterThanOrEqual(20);
  expect(stageBounds?.height).toBeGreaterThanOrEqual(160);
  expect(Math.abs((secondStageBounds?.x ?? 0) - ((stageBounds?.x ?? 0) + (stageBounds?.width ?? 0)) - 16)).toBeLessThanOrEqual(1);
  expect((helpBounds?.y ?? 0) - ((missionBounds?.y ?? 0) + (missionBounds?.height ?? 0))).toBeGreaterThanOrEqual(12);
  expect((menuBounds?.y ?? 0) - ((missionBounds?.y ?? 0) + (missionBounds?.height ?? 0))).toBeGreaterThanOrEqual(12);
  const headingPositions = await stageHeadings.evaluateAll((headings) => (
    headings.map((heading) => heading.getBoundingClientRect().y)
  ));
  expect(Math.max(...headingPositions) - Math.min(...headingPositions)).toBeLessThanOrEqual(1);
  expect(
    headingPositions[0]! - ((markerBounds?.y ?? 0) + (markerBounds?.height ?? 0)),
  ).toBeGreaterThanOrEqual(12);
  const iconCenters = await stageIcons.evaluateAll((icons) => icons.map((icon) => {
    const bounds = icon.getBoundingClientRect();
    return bounds.y + bounds.height / 2;
  }));
  expect(Math.max(...iconCenters) - Math.min(...iconCenters)).toBeLessThanOrEqual(1);
  const valuePositions = await stageValues.evaluateAll((values) => (
    values.map((value) => value.getBoundingClientRect().y)
  ));
  expect(Math.max(...valuePositions) - Math.min(...valuePositions)).toBeLessThanOrEqual(1);
  await expect(fish).toHaveCSS("width", "100px");
  await expect(fish).toHaveCSS("height", "100px");
  await expect(fish).toHaveCSS("transform", "matrix(1, 0, 0, 1, -6, 0)");
  await expect(fish).toHaveCSS("background-image", /fish-atlas-ui/);
  await expect(freshness).toHaveCSS("width", "88px");
  await expect(freshness).toHaveCSS("height", "88px");
  await expect(freshness).toHaveAttribute("src", /job-freshness-fish/);
  await expect(secondStage.locator("strong")).toHaveText("Freshness 80%+");
  await expect(deliver).toHaveCSS("width", "96px");
  await expect(deliver).toHaveCSS("height", "96px");
  await expect(reward).toHaveCSS("border-left-width", "2px");
  await expect(reward).toHaveCSS("border-left-style", "solid");
  expect(await firstStage.evaluate((element) => getComputedStyle(element, "::after").display)).toBe("none");
  expect(await firstStage.evaluate((element) => getComputedStyle(element, "::after").content)).toBe("none");
});

test("navigation does not show a top tutorial callout", async ({ page }) => {
  await page.goto("/?e2e=1");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Accept contract" }).click();

  await expect(page.locator("#tutorial-callout")).toHaveCount(0);
  await expect(page.locator(".navigation-status")).toContainText("FISH AT Sunward Shoal");

  await page.evaluate(() => window.__FSHING_TEST__?.sailToSpot("sunwardShoal"));
  await expect(page.locator("#tutorial-callout")).toHaveCount(0);
  await expect(page.locator(".navigation-status")).toContainText("Drop the line at Sunward Shoal");
});

test("completes the tutorial delivery, buys an upgrade, and persists it", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/?e2e=1");
  await expect(page.getByRole("img", { name: "FSHING" })).toBeVisible();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Brindle Harbor" })).toBeVisible();
  await expect(page.locator(".harbor-intro")).toHaveCount(0);
  await expect(page.getByText("Welcome aboard")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "First Assignment" })).toBeVisible();
  await expect(page.locator(".job-ticket").getByText("The Morning Order")).toHaveCount(0);
  await expect(page.locator(".harbor-screen")).toHaveClass(/is-first-voyage/);
  await expect(page.locator(".harbor-wordmark")).toBeVisible();
  await expectHorizontallyCentered(page, ".harbor-panel");
  const firstPanelHeight = (await page.locator(".harbor-panel").boundingBox())?.height ?? 0;
  expect(firstPanelHeight).toBeGreaterThanOrEqual(380);
  expect(firstPanelHeight).toBeLessThanOrEqual(720);
  await expect(page.locator(".job-route > li")).toHaveCount(3);
  await expect(page.locator(".job-route-icon")).toHaveCount(3);
  await expect(page.getByRole("img", { name: "Bluegill target fish" })).toBeVisible();
  await expect(page.locator(".job-route")).toContainText("Catch");
  await expect(page.locator(".job-route")).toContainText("Freshness");
  await expect(page.locator(".job-route")).toContainText("Deliver");
  const firstHeaderBounds = await page.locator(".harbor-header").boundingBox();
  const firstTicketBounds = await page.locator(".job-ticket").boundingBox();
  const firstFooterBounds = await page.locator(".panel-actions").boundingBox();
  expect((firstTicketBounds?.y ?? 0) - ((firstHeaderBounds?.y ?? 0) + (firstHeaderBounds?.height ?? 0))).toBeGreaterThanOrEqual(12);
  expect((firstFooterBounds?.y ?? 0) - ((firstTicketBounds?.y ?? 0) + (firstTicketBounds?.height ?? 0))).toBeGreaterThanOrEqual(10);
  await expect(page.locator(".harbor-panel")).toHaveCSS("background-color", "rgba(4, 23, 31, 0.94)");
  await expect(page.locator(".mission-button")).toHaveCSS("border-radius", "14px");
  await expect(page.locator(".job-ticket")).toHaveClass(/is-guided/);
  const reward = page.getByLabel("Reward: 75 shells");
  await expect(reward).toBeVisible();
  await expect(reward).toContainText("Reward");
  await expect(reward).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(reward).toHaveCSS("box-shadow", "none");
  await expect(reward).toHaveCSS("border-top-width", "0px");
  await expect(reward.locator(".reward-label")).toHaveCSS("font-size", "9.92px");
  await expect(reward.locator("strong")).toHaveCSS("font-size", "20px");
  await expect(page.getByRole("button", { name: "Accept contract" })).toContainText("Begin the First Voyage");
  await expect(page.getByRole("heading", { name: "Your cargo" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Dock services" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Back to lake →" })).toHaveCount(0);
  await expect(page.locator(".harbor-back-arrow")).toHaveCSS("font-size", "28px");
  await page.getByRole("button", { name: "Back to main menu" }).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("heading", { name: "First Assignment" })).toBeVisible();
  await page.getByRole("button", { name: "Accept contract" }).click();
  await expect(page.locator("#tutorial-callout")).toHaveCount(0);
  await expect(page.locator(".navigation-status")).toContainText("FISH AT Sunward Shoal");

  await page.evaluate(() => window.__FSHING_TEST__?.sailToSpot("sunwardShoal"));
  await expect(page.locator(".navigation-status")).toContainText("Drop the line at Sunward Shoal");
  await page.getByRole("button", { name: "Drop line · Sunward Shoal" }).click();
  await expect(page.getByRole("heading", { name: "Read the lake" })).toHaveCount(0);
  await expect(page.getByText(/Guide the hook toward the Bluegill/)).toBeVisible();
  await page.evaluate(() => window.__FSHING_TEST__?.catchSpecies("bluegill"));
  await expect(page.getByRole("heading", { name: "Plan your crossing" })).toHaveCount(0);
  await expect(page.getByText("Applied mathematics")).toHaveCount(0);
  await expect(page.locator(".navigation-status")).toContainText("DELIVER TO Gloam Ferry");

  await page.evaluate(() => window.__FSHING_TEST__?.sailToHarbor("gloam"));
  await expect(page.locator(".navigation-status")).toContainText("Dock at Gloam Ferry");
  await page.getByRole("button", { name: "Dock · Gloam Ferry" }).click();
  await expect(page.getByRole("heading", { name: "Gloam Ferry" })).toBeVisible();
  await expect(page.locator(".harbor-screen")).toHaveAttribute("data-dock", "gloam");
  await expect(page.locator(".harbor-screen")).toHaveAttribute("data-time-of-day", "day");
  await expect(page.locator(".harbor-screen")).toHaveCSS("background-image", /dock-gloam-day/);
  await expect(page.getByText("Last light before the outer water.")).toHaveCount(0);
  await expect(page.locator(".harbor-intro")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Delivery job" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Your cargo" })).toHaveCount(0);
  const deliveryPanelBounds = await page.locator(".harbor-panel").boundingBox();
  const deliveryTabsBounds = await page.locator(".harbor-tabs").boundingBox();
  const deliveryCardBounds = await page.locator(".job-ticket").boundingBox();
  const deliveryFooterBounds = await page.locator(".panel-actions").boundingBox();
  const deliveryStageBounds = await page.locator(".job-route > li").first().boundingBox();
  expect(deliveryStageBounds?.height).toBeGreaterThanOrEqual(160);
  await expect(page.locator(".job-route-number")).toHaveCount(3);
  await expect(page.locator(".job-route-icon")).toHaveCount(3);
  expect(Math.abs((deliveryTabsBounds?.x ?? 0) - (deliveryCardBounds?.x ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((deliveryTabsBounds?.width ?? 0) - (deliveryCardBounds?.width ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((deliveryTabsBounds?.x ?? 0) - (deliveryFooterBounds?.x ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((deliveryTabsBounds?.width ?? 0) - (deliveryFooterBounds?.width ?? 0))).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Cargo", exact: true }).click();
  await expect(page.getByRole("button", { name: "Cargo", exact: true })).toBeFocused();
  await expect(page.locator(".harbor-content")).toHaveCSS("animation-name", "harbor-page-enter-forward");
  await expect(page.locator(".harbor-tab .ui-icon")).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "Fish inventory" })).toBeVisible();
  await expect(page.locator(".harbor-intro")).toHaveCount(0);
  await expect(page.locator(".cargo-slot")).toHaveCount(10);
  await expect(page.locator(".cargo-slot:not(.is-locked)")).toHaveCount(3);
  await expect(page.locator(".cargo-slot.is-locked")).toHaveCount(7);
  const cargoBin = page.getByRole("button", { name: "Release Bluegill from cargo" });
  await expect(cargoBin).toBeVisible();
  await expect(cargoBin.locator("img")).toHaveCount(2);
  await expect(cargoBin.locator("img").first()).toHaveAttribute("src", /bin-icon/);
  await expect(cargoBin.locator("img").first()).toHaveJSProperty("complete", true);
  const cargoBinBounds = await cargoBin.boundingBox();
  expect(cargoBinBounds?.width).toBeGreaterThanOrEqual(44);
  expect(cargoBinBounds?.height).toBeGreaterThanOrEqual(44);
  const cargoPanelBounds = await page.locator(".harbor-panel").boundingBox();
  expect(Math.abs((cargoPanelBounds?.y ?? 0) - (deliveryPanelBounds?.y ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((cargoPanelBounds?.height ?? 0) - (deliveryPanelBounds?.height ?? 0))).toBeLessThanOrEqual(1);
  const lockedCargoSlot = page.getByRole("button", { name: "Cargo slot 4 locked. Open Cargo upgrades" });
  await lockedCargoSlot.hover();
  await expect(lockedCargoSlot).toHaveCSS("border-top-color", "rgba(174, 194, 199, 0.62)");
  await expect(lockedCargoSlot).toHaveCSS("animation-name", "menu-button-hover-wobble");
  await lockedCargoSlot.click();
  await expect(page.getByRole("button", { name: "Services", exact: true })).toBeFocused();
  await expect(page.getByRole("region", { name: "Dock services" })).toBeVisible();
  await expect(page.locator(".harbor-intro")).toHaveCount(0);
  await page.getByRole("button", { name: "Delivery", exact: true }).click();
  await expect(page.locator(".harbor-content")).toHaveCSS("animation-name", "harbor-page-enter-backward");
  await page.getByRole("button", { name: "Complete delivery" }).click();
  const deliverySuccess = page.locator("#delivery-notification");
  await expect(deliverySuccess).toBeVisible();
  await expect(deliverySuccess).toContainText("Delivery Success");
  await expect(deliverySuccess).toHaveCSS("animation-name", "delivery-success-enter");
  await expect(page.getByRole("heading", { name: "Gloam Ferry" })).toBeVisible();
  await page.getByRole("button", { name: "Close delivery success notification" }).click();
  await expect(deliverySuccess).toBeHidden();
  await expect(page.getByRole("region", { name: "Dock services" })).toHaveCount(0);
  await page.evaluate(() => window.__FSHING_TEST__?.catchSpecies("yellowPerch"));
  await page.getByRole("button", { name: "Cargo", exact: true }).click();
  await page.getByRole("button", { name: "Release Yellow Perch from cargo" }).click();
  await expect(page.locator(".cargo-slot.is-occupied")).toHaveCount(0);
  await expect(page.locator("#toast")).toContainText("Yellow Perch released to the lake.");
  const undoRelease = page.getByRole("button", { name: "Undo" });
  await expect(undoRelease).toBeVisible();
  await undoRelease.click();
  await expect(page.locator(".cargo-slot.is-occupied")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Release Yellow Perch from cargo" })).toBeFocused();
  await expect(page.locator("#toast")).toContainText("Yellow Perch returned to cargo.");
  const deliveryHubBounds = await page.locator(".harbor-panel").boundingBox();
  await page.getByRole("button", { name: "Services", exact: true }).click();
  await expect(page.getByRole("button", { name: "Services", exact: true })).toBeFocused();
  await expect(page.locator(".harbor-tab .ui-icon")).toHaveCount(3);
  await expect(page.getByRole("region", { name: "Dock services" })).toBeVisible();
  await expect(page.locator(".service-card > .ui-icon")).toHaveCount(6);
  await expect(page.getByRole("heading", { name: "Repair hull" })).toHaveCount(0);
  const engineService = page.locator(".service-card").filter({ has: page.getByRole("heading", { name: "Engine", exact: true }) });
  await expect(engineService.locator(".service-copy p")).toHaveText("+11% speed");
  await expect(page.locator(".service-card > .icon-line")).toHaveCSS("background-image", /ui-icons/);
  await expect(page.locator(".service-card > .icon-line")).toHaveCSS("background-color", "rgb(7, 27, 41)");
  await expect(page.locator(".harbor-utility-button")).toHaveCount(1);
  const servicesPanelBounds = await page.locator(".harbor-panel").boundingBox();
  expect(Math.abs((servicesPanelBounds?.y ?? 0) - (deliveryHubBounds?.y ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((servicesPanelBounds?.height ?? 0) - (deliveryHubBounds?.height ?? 0))).toBeLessThanOrEqual(1);
  await page.setViewportSize({ width: 1672, height: 941 });
  const referencePanelBounds = await page.locator(".harbor-panel").boundingBox();
  const referenceTabsBounds = await page.locator(".harbor-tabs").boundingBox();
  const referenceRowBounds = await page.locator(".service-card").first().boundingBox();
  expect(referencePanelBounds?.width).toBe(900);
  expect(referencePanelBounds?.height).toBe(760);
  expect(referenceTabsBounds?.height).toBe(63);
  expect(referenceRowBounds?.height).toBe(66);
  const cargoService = page.locator(".service-card").filter({ hasText: "+1 cargo slot" });
  await expect(cargoService.getByRole("button", { name: "Upgrade Cargo for 60 shells" })).toContainText("60");
  await expect(cargoService.locator(".upgrade-meter")).toHaveAttribute("aria-label", "Cargo level 1 of 7");
  await cargoService.getByRole("button", { name: "Upgrade Cargo for 60 shells" }).click();
  await expect(cargoService.locator(".upgrade-meter")).toHaveAttribute("aria-label", "Cargo level 2 of 7");
  const harborFitsViewport = await page.locator(".harbor-screen").evaluate((element) => element.scrollHeight <= element.clientHeight);
  expect(harborFitsViewport).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  const helpBounds = await page.locator(".harbor-utility-button").boundingBox();
  const lakeBounds = await page.locator(".leave-button").boundingBox();
  expect((helpBounds?.x ?? 0) + (helpBounds?.width ?? 0)).toBeLessThanOrEqual(lakeBounds?.x ?? 0);
  await expect(page.getByRole("button", { name: "Back to lake →" })).toContainText("Return to Lake");
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator(".harbor-screen")).toHaveClass(/is-expanded-harbor/);
  await expect(page.locator(".harbor-wordmark")).toBeVisible();
  await expect(page.getByLabel(/Reward: .* shells/)).toContainText("Reward");
  await expect(page.locator(".harbor-panel")).toHaveCSS("background-color", "rgba(4, 23, 31, 0.94)");
  await expect(page.getByRole("region", { name: "Dock services" })).toHaveCount(0);
  await page.getByRole("button", { name: "Services", exact: true }).click();
  await expect(page.locator(".service-card").filter({ hasText: "+1 cargo slot" }).locator(".upgrade-meter")).toHaveAttribute("aria-label", "Cargo level 2 of 7");
});

test("delivers a matching catch that was aboard before accepting the contract", async ({ page }) => {
  await page.goto("/?e2e=1");
  await page.evaluate(() => window.__FSHING_TEST__?.catchSpecies("bluegill"));
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Accept contract" }).click();

  await page.evaluate(() => window.__FSHING_TEST__?.sailToHarbor("gloam"));
  await page.getByRole("button", { name: "Dock · Gloam Ferry" }).click();
  const completeDelivery = page.getByRole("button", { name: "Complete delivery" });
  await expect(completeDelivery).toBeEnabled();
  await completeDelivery.click();

  const deliverySuccess = page.locator("#delivery-notification");
  await expect(deliverySuccess).toBeVisible();
  await expect(deliverySuccess).toBeHidden({ timeout: 6_000 });
  await expect(page.locator(".shell-balance strong")).toHaveText(/^[1-9]\d*$/);
  await expect(page.getByRole("heading", { name: "Harbor Trade" })).toBeVisible();
  await expect(page.locator(".job-route-detail").filter({ hasText: "2 required" })).toBeVisible();
  const freshnessStep = page.locator(".job-route li").filter({ hasText: "Freshness" });
  await expect(freshnessStep.locator("strong")).toHaveText("Freshness 85%+");
  await expect(freshnessStep).not.toContainText("if missed");
});

test("settings, keyboard pause, and local SDK fallback remain usable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
  const titleLakeFrame = await page.locator("#game-canvas").evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.locator(".settings-panel")).toBeVisible();
  await expect(page.locator(".settings-overlay")).toHaveClass(/is-title-entry/);
  await expect(page.locator(".settings-overlay")).toHaveCSS("animation-name", "settings-backdrop-in");
  const settingsLakeFrame = await page.locator("#game-canvas").evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  expect(settingsLakeFrame).toBe(titleLakeFrame);
  await expect(page.locator(".settings-wordmark")).toBeVisible();
  await expectHorizontallyCentered(page, ".settings-panel");
  await expect(page.locator(".setting-option")).toHaveCount(5);
  await expect(page.locator(".settings-done")).toHaveCSS("border-radius", "14px");
  await expect(page.locator(".settings-overlay")).toHaveCSS("backdrop-filter", "blur(8px) saturate(0.78)");
  await page.getByText("High contrast").click();
  await page.getByText("Reduced motion").click();
  await page.getByRole("button", { name: "Controls" }).click();
  await expectHorizontallyCentered(page, ".controls-panel");
  await expect(page.locator(".controls-wordmark")).toBeVisible();
  await expect(page.locator(".binding-row")).toHaveCount(7);
  await expect(page.getByRole("button", { name: "Rebind Boost" })).toHaveText("Left Shift");
  await expect(page.locator(".binding-row").first()).toHaveCSS("border-radius", "12px");
  await expect(page.locator(".controls-overlay")).toHaveCSS("backdrop-filter", "blur(8px) saturate(0.78)");
  await expect(page.getByRole("button", { name: "Rebind Hook up" })).toHaveText("W");
  await expect(page.getByRole("button", { name: "Rebind Hook down" })).toHaveText("S");
  await page.getByRole("button", { name: "Rebind Hook up" }).click();
  await page.keyboard.press("ArrowUp");
  await page.getByRole("button", { name: "Rebind Hook up" }).click();
  await page.keyboard.press("KeyW");
  await expect(page.getByRole("button", { name: "Rebind Hook up" })).toHaveText("W");
  await page.getByRole("button", { name: "Rebind Pause" }).click();
  await page.keyboard.press("KeyO");
  await expect(page.getByRole("button", { name: "Rebind Pause" })).toHaveText("O");
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Done" }).click();
  const reducedMotionPlayButton = page.getByRole("button", { name: "Play", exact: true });
  await reducedMotionPlayButton.hover();
  await expect(reducedMotionPlayButton).toHaveCSS("animation-name", "none");
  await reducedMotionPlayButton.click();
  await expect(page.locator("#scene-transition")).not.toHaveClass(/is-(covering|revealing)/);
  await expectHorizontallyCentered(page, ".harbor-panel");
  await page.getByRole("button", { name: "Accept contract" }).click();
  await page.keyboard.press("o");
  await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  await expectHorizontallyCentered(page, ".pause-menu");
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.locator(".hud")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pause and options" })).toHaveCount(0);
  await expect(page.locator("body")).toHaveClass(/high-contrast/);
  await expect(page.locator("body")).toHaveClass(/reduced-motion/);
  await page.keyboard.press("b");
  await page.keyboard.down("KeyD");
  await page.keyboard.down("ShiftLeft");
  await expect(page.getByRole("meter", { name: "Boost charge" })).toHaveClass(/is-active/);
  await expect(page.locator("#game-canvas")).toHaveAttribute("data-surface-camera-view-width", "0.300");
  await page.keyboard.up("ShiftLeft");
  await page.keyboard.up("KeyD");
});

test("how to play instructions advance one card at a time", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "How to play" }).click();

  await expect(page.locator(".help-panel")).toHaveCSS("background-color", "rgba(4, 23, 31, 0.94)");
  await expect(page.locator(".help-panel")).toHaveCSS("border-radius", "20px");
  await expect(page.locator(".help-header .harbor-wordmark")).toBeVisible();
  await expect(page.getByText("Step 1 of 4")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Take a job" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous" })).toBeDisabled();

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Step 2 of 4")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Follow the shoal" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Take a job" })).toHaveCount(0);

  await page.getByRole("button", { name: "Previous" }).click();
  await expect(page.getByText("Step 1 of 4")).toBeVisible();

  for (let step = 1; step < 4; step += 1) {
    await page.getByRole("button", { name: "Next" }).click();
  }
  await expect(page.getByText("Step 4 of 4")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Manage your cargo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Brindle Harbor" })).toBeVisible();
});

test("touch controls are available at a mobile landscape viewport", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Accept contract" }).click();
  await expect(page.getByRole("button", { name: "Move right" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Move left" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Brake", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Engine boost" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Interact or cast" })).toBeVisible();
});

test("touch controls stay hidden at a portrait viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Accept contract" }).click();
  await expect(page.getByRole("button", { name: "Move right" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Move left" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Interact or cast" })).toBeHidden();
});

test("dock interaction starts on pointer press", async ({ page }) => {
  await page.goto("/?e2e=1");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Accept contract" }).click();
  await expect(page.locator("#scene-transition")).not.toHaveClass(/is-(covering|revealing)/);
  await page.evaluate(() => window.__FSHING_TEST__?.sailToHarbor("brindle"));

  const dockButton = page.getByRole("button", { name: "Dock · Brindle Harbor" });
  await expect(dockButton).toHaveCSS("background-image", "none");
  await expect(dockButton).toHaveCSS("background-color", "rgb(255, 106, 31)");
  await expect(dockButton).toHaveCSS("border-radius", "14px");
  await expect(dockButton).toHaveCSS("width", "300px");
  await dockButton.hover();
  await page.mouse.down();
  await expect(page.getByRole("heading", { name: "Brindle Harbor" })).toBeVisible();
  await page.mouse.up();
});

test("keyboard input moves the boat horizontally and flips its side profile", async ({ page }) => {
  await page.goto("/?e2e=1");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Accept contract" }).click();
  const startX = await page.evaluate(() => window.__FSHING_TEST__?.boatX() ?? 0);

  await page.keyboard.press("KeyW");
  await page.keyboard.press("KeyS");
  expect(await page.evaluate(() => window.__FSHING_TEST__?.boatX() ?? 0)).toBe(startX);

  await page.keyboard.down("KeyD");
  await page.waitForTimeout(600);
  await page.keyboard.up("KeyD");
  const rightX = await page.evaluate(() => window.__FSHING_TEST__?.boatX() ?? 0);
  expect(rightX).toBeGreaterThan(startX);
  expect(await page.evaluate(() => window.__FSHING_TEST__?.facing())).toBe(1);

  await page.keyboard.down("KeyA");
  await page.waitForTimeout(1400);
  await page.keyboard.up("KeyA");
  expect(await page.evaluate(() => window.__FSHING_TEST__?.facing())).toBe(-1);
});

test("field guide menu and buttons are removed", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("button", { name: "Field guide" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Guide", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Lake field guide" })).toHaveCount(0);

  await page.getByRole("button", { name: "Accept contract" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Field guide" })).toHaveCount(0);
});
