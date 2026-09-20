import { expect, test, type Page } from "@playwright/test";

async function expectViewport(page: Page, width: number, height: number, x: number, y: number) {
  await expect.poll(() => page.locator("#game-canvas").boundingBox()).toEqual({ width, height, x, y });
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(0, 0, 0)");
}

test.beforeEach(async ({ page }) => {
  await page.route("https://sdk.crazygames.com/**", (route) => route.abort());
});

test("ultrawide recommendation enables a centered 16:9 game and aligned tutorial", async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1080 });
  await page.goto("/?e2e=1");
  const notice = page.getByRole("dialog", { name: "Best played in 16:9" });
  await expect(notice).toBeVisible();
  await expect(page.getByRole("button", { name: "Use 16:9", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Use 16:9", exact: true }).click();
  await expect(notice).not.toBeVisible();
  await expectViewport(page, 1920, 1080, 320, 0);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Brindle Harbor" })).toBeVisible();
  await expect(page.locator("#quest-glow")).toBeVisible();
  await expect.poll(async () => {
    const glow = await page.locator("#quest-glow").boundingBox();
    const target = await page.getByRole("button", { name: /Bluegill, \d+ shells/ }).boundingBox();
    return Boolean(glow && target && Math.abs(glow.x - target.x) < 1 && Math.abs(glow.y - target.y) < 1);
  }).toBe(true);
  await page.screenshot({ path: "test-results/ultrawide-16-9-harbor.png" });
  await page.reload();
  await expectViewport(page, 1920, 1080, 320, 0);
  await expect(notice).not.toBeVisible();
  await page.setViewportSize({ width: 1920, height: 1440 });
  await expectViewport(page, 1920, 1080, 0, 180);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Display", exact: true }).click();
  const forceRatio = page.getByRole("checkbox", { name: "Force 16:9 aspect ratio", exact: true });
  await expect(forceRatio).toBeChecked();
  await forceRatio.focus();
  await page.keyboard.press("Space");
  await expectViewport(page, 1920, 1440, 0, 0);
  await page.locator("label").filter({ hasText: "Force 16:9 aspect ratio" }).click();
  await expectViewport(page, 1920, 1080, 0, 180);
});

test("players can keep an irregular ratio and the choice survives restart", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/");
  await page.getByRole("button", { name: "Keep current ratio", exact: true }).click();
  await expectViewport(page, 1600, 1000, 0, 0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("gamecomp-new.save")!).settings.aspectRatio)).toBe("fill");
  await expect(page.getByRole("dialog", { name: "Best played in 16:9" })).not.toBeVisible();
});

test("a resize notice pauses gameplay and keeps black-bar clicks out of fishing input", async ({ page }) => {
  await page.goto("/?e2e=1");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.locator('[data-action="undock"]').click();
  await expect(page.locator("#scene-transition")).not.toHaveClass(/is-(covering|revealing)/);
  await page.keyboard.down("d");
  await page.setViewportSize({ width: 2560, height: 1080 });
  await expect(page.getByRole("dialog", { name: "Best played in 16:9" })).toBeVisible();
  const elapsed = await page.evaluate(() => window.__FSHING_TEST__!.elapsed());
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__FSHING_TEST__!.elapsed())).toBe(elapsed);
  await page.keyboard.up("d");
  await page.getByRole("button", { name: "Use 16:9", exact: true }).click();
  await page.evaluate(() => window.__FSHING_TEST__!.previewFishing("sunwardShoal", "bluegill"));
  const canvas = page.locator("#game-canvas");
  await page.mouse.move(100, 700);
  await page.mouse.down();
  await expect(canvas).not.toHaveClass(/is-reeling-input/);
  await page.mouse.up();
  await page.mouse.move(1000, 700);
  await page.mouse.down();
  await expect(canvas).toHaveClass(/is-reeling-input/);
  await page.mouse.up();
  await expect(canvas).not.toHaveClass(/is-reeling-input/);
});

test("16:9 mode keeps settings usable within a tall window", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 1000 });
  await page.goto("/");
  await page.getByRole("button", { name: "Use 16:9", exact: true }).click();
  await expectViewport(page, 800, 450, 0, 275);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Display", exact: true }).click();
  await page.locator("label").filter({ hasText: "Force 16:9 aspect ratio" }).click();
  await expectViewport(page, 800, 1000, 0, 0);
});

test("saved mute is visible on the title and can be cleared without resetting progress", async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("gamecomp-new.save")) return;
    localStorage.setItem("gamecomp-new.save", JSON.stringify({
      version: 16,
      progress: { money: 275 },
      settings: { muted: true, volume: 0.75, musicVolume: 0.6 },
    }));
  });
  await page.goto("/");
  const mutedButton = page.getByRole("button", { name: "Sound muted · Turn on", exact: true });
  await expect(mutedButton).toBeVisible();
  await mutedButton.click();
  await expect(mutedButton).toHaveCount(0);
  await expect.poll(() => page.locator('audio[data-music-scene="menu"]').evaluate((node) => {
    const track = node as HTMLAudioElement;
    return !track.paused && !track.muted && track.volume > 0 && track.currentTime > 5.1;
  })).toBe(true);
  await page.reload();
  await expect(mutedButton).toHaveCount(0);
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem("gamecomp-new.save")!));
  expect(save.settings).toEqual(expect.objectContaining({ muted: false, musicVolume: 0.6 }));
  expect(save.progress.money).toBe(275);
});
