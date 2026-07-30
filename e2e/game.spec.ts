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

test("main menu actions form a balanced vertical stack", async ({ page }) => {
  await page.goto("/");

  const actions = page.locator(".title-actions button");
  await expect(actions).toHaveCount(3);

  const bounds = await actions.evaluateAll((buttons) => buttons.map((button) => {
    const rect = button.getBoundingClientRect();
    const label = button.querySelector("strong")?.getBoundingClientRect();
    return {
      bottom: rect.bottom,
      height: rect.height,
      labelHeight: label?.height ?? 0,
      top: rect.top,
      width: rect.width,
    };
  }));

  expect(new Set(bounds.map(({ width }) => width)).size).toBe(1);
  expect(new Set(bounds.map(({ height }) => height)).size).toBe(1);
  expect(bounds[0].bottom).toBeLessThan(bounds[1].top);
  expect(bounds[1].bottom).toBeLessThan(bounds[2].top);
  expect(bounds[1].labelHeight).toBeLessThanOrEqual(bounds[1].height);
  await expect(page.getByRole("button", { name: "How to play" }).locator("strong")).toHaveCSS("white-space", "nowrap");
});

test("completes the tutorial delivery, buys an upgrade, and persists it", async ({ page }) => {
  await page.goto("/?e2e=1");
  await expect(page.getByRole("img", { name: "FSHING" })).toBeVisible();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Brindle Harbor" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Accept your first delivery to begin" })).toBeVisible();
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
  await expect(page.getByText(/Guide the hook into the round Reedfin/)).toBeVisible();
  await page.evaluate(() => window.__FSHING_TEST__?.catchSpecies("reedfin"));
  await expect(page.locator("#tutorial-callout")).toContainText("Gloam Ferry");

  await page.evaluate(() => window.__FSHING_TEST__?.sailToHarbor("gloam"));
  await page.getByRole("button", { name: "Dock · Gloam Ferry" }).click();
  await expect(page.getByRole("heading", { name: "Gloam Ferry" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your cargo" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dock services" })).toHaveCount(0);
  await page.getByRole("button", { name: "Complete delivery" }).click();
  await expect(page.getByText(/Delivery complete/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dock services" })).toBeVisible();
  const cargoService = page.locator(".service-card").filter({ hasText: "Cargo hold" });
  await cargoService.getByRole("button", { name: "Upgrade" }).click();
  await expect(cargoService).toContainText("T1");

  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator(".service-card").filter({ hasText: "Cargo hold · T1" })).toBeVisible();
});

test("settings, keyboard pause, and local SDK fallback remain usable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.locator(".settings-panel")).toBeVisible();
  await expect(page.getByText("Set up the lake to suit you.")).toBeVisible();
  await expect(page.locator(".setting-option")).toHaveCount(5);
  await expect(page.locator(".settings-done")).toHaveCSS("border-radius", "999px");
  await page.getByText("High contrast").click();
  await page.getByText("Reduced motion").click();
  await page.getByRole("button", { name: "Controls" }).click();
  await expectHorizontallyCentered(page, ".controls-panel");
  await page.getByRole("button", { name: "Rebind Pause" }).click();
  await page.keyboard.press("KeyO");
  await expect(page.getByRole("button", { name: "Rebind Pause" })).toHaveText("O");
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expectHorizontallyCentered(page, ".harbor-panel");
  await page.getByRole("button", { name: "Accept contract" }).click();
  await page.keyboard.press("o");
  await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  await expectHorizontallyCentered(page, ".compact-panel");
  await page.getByRole("button", { name: "Return to water" }).click();
  await expect(page.locator(".hud")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pause and options" })).toHaveCount(0);
  await expect(page.locator("body")).toHaveClass(/high-contrast/);
  await expect(page.locator("body")).toHaveClass(/reduced-motion/);
});

test("how to play instructions advance one card at a time", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "How to play" }).click();

  await expect(page.getByText("Take a delivery job, catch the requested fish")).toHaveCount(0);
  await expect(page.getByText("Step 1 of 4")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Take a job" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous" })).toBeDisabled();

  const nextButton = page.getByRole("button", { name: "Next" });
  await nextButton.hover();
  await expect(nextButton).toHaveCSS("background-color", "rgb(255, 106, 31)");
  await expect(nextButton).toHaveCSS("color", "rgb(7, 24, 36)");
  await nextButton.click();
  await expect(page.getByText("Step 2 of 4")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Follow the marker" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Take a job" })).toHaveCount(0);

  const previousButton = page.getByRole("button", { name: "Previous" });
  await previousButton.hover();
  await expect(previousButton).toHaveCSS("background-color", "rgba(238, 228, 201, 0.1)");
  await expect(previousButton).toHaveCSS("color", "rgb(238, 228, 201)");
  await previousButton.click();
  await expect(page.getByText("Step 1 of 4")).toBeVisible();

  for (let step = 1; step < 4; step += 1) {
    await page.getByRole("button", { name: "Next" }).click();
  }
  await expect(page.getByText("Step 4 of 4")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Deliver it fresh" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("img", { name: "FSHING" })).toBeVisible();
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
