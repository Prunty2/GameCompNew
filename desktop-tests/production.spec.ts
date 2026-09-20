import { expect, test } from "@playwright/test";

test("production 16:9 framing works on an ultrawide display", async ({ page }) => {
  await page.setViewportSize({ width: 3440, height: 1440 });
  await page.goto("/");
  await page.getByRole("button", { name: "Use 16:9", exact: true }).click();
  await expect.poll(() => page.locator("#game-canvas").boundingBox())
    .toEqual({ x: 440, y: 0, width: 2560, height: 1440 });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Display", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Force 16:9 aspect ratio", exact: true })).toBeChecked();
  await page.reload();
  await expect.poll(() => page.locator("#game-canvas").boundingBox())
    .toEqual({ x: 440, y: 0, width: 2560, height: 1440 });
  await expect(page.locator(".title-build-version")).toHaveText("v1.0.2 (PR #146)");
});

test("packaged frontend starts offline, renders assets, plays audio, and saves settings", async ({ page }) => {
  const externalRequests: string[] = [];
  const failedAssets: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) failedAssets.push(response.url());
  });
  await page.route("**/*", (route) => {
    if (new URL(route.request().url()).hostname !== "127.0.0.1") {
      externalRequests.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  expect(await page.evaluate(() => "__FSHING_TEST__" in window)).toBe(false);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator("label").filter({ hasText: "Reduced motion" }).click();
  await page.getByRole("tab", { name: "Audio", exact: true }).click();
  await expect.poll(() => page.locator('audio[data-music-scene="menu"]').evaluate((node) => {
    const audio = node as HTMLAudioElement;
    return !audio.paused && audio.readyState >= 2 && audio.currentTime > 0;
  })).toBe(true);
  await page.locator("label").filter({ hasText: "Mute" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("gamecomp-new.save")!).settings))
    .toEqual(expect.objectContaining({ muted: true, reducedMotion: true }));
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator('[data-action="undock"]')).toBeVisible();
  await page.locator('[data-action="undock"]').click();
  await expect(page.locator('[data-action="undock"]')).toHaveCount(0);
  await page.keyboard.down("d");
  await page.waitForTimeout(500);
  await page.keyboard.up("d");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  await expect.poll(() => page.locator("img[src]").evaluateAll((images) => images.every((img) => {
    const image = img as HTMLImageElement;
    return image.complete && image.naturalWidth > 0;
  }))).toBe(true);
  expect(externalRequests).toEqual([]);
  expect(failedAssets).toEqual([]);
  expect(errors).toEqual([]);
});
