import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://sdk.crazygames.com/**", (route) => route.abort());
});

test("completes the tutorial delivery, buys an upgrade, and persists it", async ({ page }) => {
  await page.goto("/?e2e=1");
  await expect(page.getByRole("img", { name: "FSHING" })).toBeVisible();
  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("heading", { name: "Brindle Harbor" })).toBeVisible();
  await page.getByRole("button", { name: "Accept contract" }).click();
  await expect(page.locator("#tutorial-callout")).toContainText("Sunward Shoal");

  await page.evaluate(() => window.__FSHING_TEST__?.sailToSpot("sunwardShoal"));
  await page.getByRole("button", { name: "Drop line · Sunward Shoal" }).click();
  await expect(page.getByText(/Guide the hook into the round Reedfin/)).toBeVisible();
  await page.evaluate(() => window.__FSHING_TEST__?.catchSpecies("reedfin"));
  await expect(page.locator("#tutorial-callout")).toContainText("Gloam Ferry");

  await page.evaluate(() => window.__FSHING_TEST__?.sailToHarbor("gloam"));
  await page.getByRole("button", { name: "Dock · Gloam Ferry" }).click();
  await expect(page.getByRole("heading", { name: "Gloam Ferry" })).toBeVisible();
  await page.getByRole("button", { name: "Complete delivery" }).click();
  await expect(page.getByText(/Delivery complete/)).toBeVisible();
  const cargoService = page.locator(".service-card").filter({ hasText: "Cargo hold" });
  await cargoService.getByRole("button", { name: "Upgrade" }).click();
  await expect(cargoService).toContainText("T1");

  await page.reload();
  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.locator(".service-card").filter({ hasText: "Cargo hold · T1" })).toBeVisible();
});

test("settings, keyboard pause, and local SDK fallback remain usable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByText("High contrast").click();
  await page.getByText("Reduced motion").click();
  await page.getByRole("button", { name: "Controls" }).click();
  await page.getByRole("button", { name: "Rebind Pause" }).click();
  await page.keyboard.press("KeyO");
  await expect(page.getByRole("button", { name: "Rebind Pause" })).toHaveText("O");
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Play" }).click();
  await page.getByRole("button", { name: "Back to lake →" }).click();
  await page.keyboard.press("o");
  await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  await page.getByRole("button", { name: "Return to water" }).click();
  await expect(page.locator(".hud")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pause and options" })).toHaveCount(0);
  await expect(page.locator("body")).toHaveClass(/high-contrast/);
  await expect(page.locator("body")).toHaveClass(/reduced-motion/);
});

test("touch controls are available at a mobile landscape viewport", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  await page.getByRole("button", { name: "Play" }).click();
  await page.getByRole("button", { name: "Back to lake →" }).click();
  await expect(page.getByRole("button", { name: "Move right" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Move left" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Brake" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Engine boost" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Interact or cast" })).toBeVisible();
});

test("keyboard input moves the boat horizontally and flips its side profile", async ({ page }) => {
  await page.goto("/?e2e=1");
  await page.getByRole("button", { name: "Play" }).click();
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
