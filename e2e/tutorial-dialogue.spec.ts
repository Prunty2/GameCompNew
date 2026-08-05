import { expect, test } from "@playwright/test";

test("tutorial dialogue demo presents responsive character scenes without entering the game", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/tutorial-demo.html");

  await expect(page.getByRole("heading", { name: "Morning, skipper." })).toBeVisible();
  await expect(page.getByRole("img", { name: "Rook smiling and raising one hand in a friendly wave" })).toBeVisible();
  await expect(page.locator(".guide-portrait")).toHaveAttribute("data-pose", "wave");
  await expect(page.locator("#game-canvas")).toHaveCount(0);
  await expect(page.locator(".dialogue-demo")).toHaveAttribute("data-side", "left");

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "The lake rewards attention." })).toBeVisible();
  await expect(page.locator(".guide-portrait")).toHaveAttribute("data-pose", "front");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Evidence first. Always." })).toBeVisible();
  await expect(page.getByRole("list", { name: "Key information" }).getByRole("listitem")).toHaveCount(5);
  await expect(page.locator(".guide-portrait")).toHaveAttribute("data-pose", "explain");

  await page.getByRole("button", { name: "Move Rook to the right side" }).click();
  await expect(page.locator(".dialogue-demo")).toHaveAttribute("data-side", "right");

  await page.getByRole("button", { name: "Show scene 8" }).click();
  await expect(page.getByRole("heading", { name: "What matters most here?" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Dialogue choices" }).getByRole("button")).toHaveCount(2);
  await page.getByRole("button", { name: /reed habitat and broad fins/i }).click();
  await expect(page.getByRole("heading", { name: "That’s the whole crossing." })).toBeVisible();
  await expect(page.locator(".guide-portrait")).toHaveAttribute("data-pose", "approval");

  await page.setViewportSize({ width: 390, height: 844 });
  const panel = page.locator(".dialogue-panel");
  await expect(panel).toBeVisible();
  await expect.poll(async () => {
    const animatedBounds = await panel.boundingBox();
    return (animatedBounds?.x ?? 0) + (animatedBounds?.width ?? 0);
  }).toBeLessThanOrEqual(390);
  const bounds = await panel.boundingBox();
  expect(bounds?.x).toBeGreaterThanOrEqual(0);
  expect((bounds?.y ?? 0) + (bounds?.height ?? 0)).toBeLessThanOrEqual(844);
});

test("every tutorial beat selects its own Rook pose", async ({ page }) => {
  await page.goto("/tutorial-demo.html");

  const poses = [
    "wave",
    "front",
    "explain",
    "point-right",
    "warning",
    "profile-left",
    "point-left",
    "neutral-three-quarter",
    "approval",
  ];

  for (const [index, pose] of poses.entries()) {
    await page.getByRole("button", { name: `Show scene ${index + 1}` }).click();
    await expect(page.locator(".guide-portrait")).toHaveAttribute("data-pose", pose);
    await expect(page.locator(".guide-portrait img")).toBeVisible();
  }
});
