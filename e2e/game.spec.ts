import { expect, test } from "@playwright/test";

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

  const actions = page.locator(".title-actions button");
  await expect(actions).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
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

test("the waterline transition is reserved for entering and leaving the title", async ({ page }) => {
  await page.goto("/");
  const transition = page.locator("#scene-transition");

  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(transition).toHaveClass(/is-(covering|revealing)/);
  await expect(page.getByRole("heading", { name: "Brindle Harbor" })).toBeVisible();
  await expect(transition).not.toHaveClass(/is-(covering|revealing)/);

  await page.getByRole("button", { name: "Accept contract" }).click();
  await expect(page.locator(".screen-overlay")).toHaveCount(0);
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

test("pause blurs the lake and slides the compact menu in and out", async ({ page }) => {
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
  await expect(page.locator(".pause-actions button")).toHaveCount(5);
  await expectHorizontallyCentered(page, ".pause-menu");

  const pauseLogoWidth = await page.locator(".pause-wordmark").evaluate((element) => element.getBoundingClientRect().width);
  expect(pauseLogoWidth).toBeLessThan(titleLogoWidth);

  await page.getByRole("button", { name: "Settings" }).click();
  const settingsScreen = page.locator(".settings-overlay");
  const settingsMenu = page.locator(".settings-menu");
  await expect(settingsScreen).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(settingsScreen).toHaveClass(/is-closing-to-pause/);
  await expect(settingsMenu).toHaveCSS("animation-name", "settings-menu-out");
  await expect(settingsScreen).toHaveCount(0);
  await expect(pauseScreen).toHaveClass(/is-settings-return/);
  await expect(pauseScreen).toHaveCSS("animation-name", "none");
  await expect(pauseMenu).toHaveCSS("animation-name", "menu-handoff-in");

  await page.getByRole("button", { name: "Resume" }).click();
  await expect(pauseScreen).toHaveClass(/is-closing/);
  await expect(pauseMenu).toHaveCSS("animation-name", "pause-menu-out");
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

test("completes the tutorial delivery, buys an upgrade, and persists it", async ({ page }) => {
  await page.goto("/?e2e=1");
  await expect(page.getByRole("img", { name: "FSHING" })).toBeVisible();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Brindle Harbor" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Accept your first delivery to begin" })).toBeVisible();
  await expect(page.locator(".harbor-screen")).toHaveClass(/is-first-voyage/);
  await expect(page.locator(".harbor-wordmark")).toBeVisible();
  await expectHorizontallyCentered(page, ".harbor-panel");
  await expect(page.locator(".harbor-panel")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(page.locator(".mission-button")).toHaveCSS("border-radius", "14px");
  await expect(page.locator(".job-ticket")).toHaveClass(/is-guided/);
  await expect(page.getByRole("heading", { name: "Your cargo" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Dock services" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Back to lake →" })).toHaveCount(0);
  await page.getByRole("button", { name: "Accept contract" }).click();
  await expect(page.locator("#tutorial-callout")).toContainText("Sunward Shoal");
  await page.locator("#tutorial-callout").click();
  await expect(page.locator("#tutorial-callout")).toBeHidden();

  await page.evaluate(() => window.__FSHING_TEST__?.sailToSpot("sunwardShoal"));
  await page.getByRole("button", { name: "Drop line · Sunward Shoal" }).click();
  await expect(page.getByRole("heading", { name: "Read the lake" })).toBeVisible();
  await expect(page.getByText("8.4 mg/L")).toBeVisible();
  await page.getByRole("button", { name: /Reedfin/ }).click();
  await expect(page.getByRole("heading", { name: "Prediction supported" })).toBeVisible();
  await page.getByRole("button", { name: "Use the evidence and drop the line" }).click();
  await expect(page.getByText(/Guide the hook toward the Reedfin/)).toBeVisible();
  await page.evaluate(() => window.__FSHING_TEST__?.catchSpecies("reedfin"));
  await expect(page.getByRole("heading", { name: "Plan your crossing" })).toBeVisible();
  await expect(page.getByText("time = distance ÷ speed")).toBeVisible();
  await expect(page.getByText("Sunward Shoal → Gloam Ferry")).toBeVisible();
  await page.getByRole("button", { name: "Choose survey route" }).click();
  await expect(page.locator("#tutorial-callout")).toContainText("Gloam Ferry");

  await page.evaluate(() => window.__FSHING_TEST__?.sailToHarbor("gloam"));
  await page.getByRole("button", { name: "Dock · Gloam Ferry" }).click();
  await expect(page.getByRole("heading", { name: "Gloam Ferry" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your cargo" })).toHaveCount(0);
  const deliveryPanelBounds = await page.locator(".harbor-panel").boundingBox();
  await page.getByRole("button", { name: "Cargo", exact: true }).click();
  await expect(page.getByRole("button", { name: "Cargo", exact: true })).toBeFocused();
  await expect(page.getByRole("heading", { name: "Your cargo" })).toBeVisible();
  const cargoPanelBounds = await page.locator(".harbor-panel").boundingBox();
  expect(Math.abs((cargoPanelBounds?.y ?? 0) - (deliveryPanelBounds?.y ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((cargoPanelBounds?.height ?? 0) - (deliveryPanelBounds?.height ?? 0))).toBeLessThanOrEqual(1);
  await expect(page.getByRole("heading", { name: "Dock services" })).toHaveCount(0);
  await page.getByRole("button", { name: "Delivery", exact: true }).click();
  await page.getByRole("button", { name: "Complete delivery" }).click();
  await expect(page.getByRole("heading", { name: "Delivery analysed" })).toBeVisible();
  await expect(page.getByText("Prediction versus result")).toBeVisible();
  await page.getByRole("button", { name: "Continue at harbor" }).click();
  await expect(page.getByRole("heading", { name: "Dock services" })).toHaveCount(0);
  const deliveryHubBounds = await page.locator(".harbor-panel").boundingBox();
  await page.getByRole("button", { name: "Services", exact: true }).click();
  await expect(page.getByRole("button", { name: "Services", exact: true })).toBeFocused();
  await expect(page.getByRole("heading", { name: "Dock services" })).toBeVisible();
  const servicesPanelBounds = await page.locator(".harbor-panel").boundingBox();
  expect(Math.abs((servicesPanelBounds?.y ?? 0) - (deliveryHubBounds?.y ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((servicesPanelBounds?.height ?? 0) - (deliveryHubBounds?.height ?? 0))).toBeLessThanOrEqual(1);
  const cargoService = page.locator(".service-card").filter({ hasText: "Boat · Skiff" });
  await cargoService.getByRole("button", { name: "Upgrade" }).click();
  await expect(page.locator(".service-card").filter({ hasText: "Boat · Wide skiff · T1" })).toBeVisible();
  const harborFitsViewport = await page.locator(".harbor-screen").evaluate((element) => element.scrollHeight <= element.clientHeight);
  expect(harborFitsViewport).toBe(true);

  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator(".harbor-screen")).toHaveClass(/is-expanded-harbor/);
  await expect(page.locator(".harbor-wordmark")).toBeVisible();
  await expect(page.locator(".harbor-panel")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(page.getByRole("heading", { name: "Dock services" })).toHaveCount(0);
  await page.getByRole("button", { name: "Services", exact: true }).click();
  await expect(page.locator(".service-card").filter({ hasText: "Boat · Wide skiff · T1" })).toBeVisible();
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
  await expect(page.locator(".binding-row")).toHaveCount(6);
  await expect(page.locator(".binding-row").first()).toHaveCSS("border-radius", "12px");
  await expect(page.locator(".controls-overlay")).toHaveCSS("backdrop-filter", "blur(8px) saturate(0.78)");
  await page.getByRole("button", { name: "Rebind Pause" }).click();
  await page.keyboard.press("KeyO");
  await expect(page.getByRole("button", { name: "Rebind Pause" })).toHaveText("O");
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
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
});

test("how to play instructions advance one card at a time", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "How to play" }).click();

  await expect(page.getByText("Step 1 of 6")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Take a job" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous" })).toBeDisabled();

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Step 2 of 6")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Follow the marker" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Take a job" })).toHaveCount(0);

  await page.getByRole("button", { name: "Previous" }).click();
  await expect(page.getByText("Step 1 of 6")).toBeVisible();

  for (let step = 1; step < 6; step += 1) {
    await page.getByRole("button", { name: "Next" }).click();
  }
  await expect(page.getByText("Step 6 of 6")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fish sustainably" })).toBeVisible();
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
  await expect(page.getByRole("button", { name: "Brake", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Engine boost" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Interact or cast" })).toBeVisible();
});

test("keyboard input moves the boat horizontally and flips its side profile", async ({ page }) => {
  await page.goto("/?e2e=1");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Accept contract" }).click();
  const startX = await page.evaluate(() => window.__FSHING_TEST__?.boatX() ?? 0);

  await page.keyboard.down("KeyD");
  await page.waitForTimeout(600);
  await page.keyboard.up("KeyD");
  const rightX = await page.evaluate(() => window.__FSHING_TEST__?.boatX() ?? 0);
  expect(rightX).toBeGreaterThan(startX);
  expect(await page.evaluate(() => window.__FSHING_TEST__?.facing())).toBe(1);

  await page.keyboard.down("KeyS");
  await page.waitForTimeout(350);
  await page.keyboard.up("KeyS");
  await page.keyboard.down("KeyA");
  await page.waitForTimeout(600);
  await page.keyboard.up("KeyA");
  expect(await page.evaluate(() => window.__FSHING_TEST__?.facing())).toBe(-1);
});

test("field guide exposes regions, depth access, and non-colour population labels", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Field guide" }).click();
  await expect(page.getByRole("heading", { name: "Lake field guide" })).toBeVisible();
  await expect(page.getByText("Brindle Coast")).toBeVisible();
  await expect(page.getByText("Mosswater Reach")).toBeVisible();
  await expect(page.getByText("Violet Gloam")).toBeVisible();
  await expect(page.getByText("Healthy · 100%", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("T5 · 41–50 m")).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Brindle Harbor" })).toBeVisible();
});
