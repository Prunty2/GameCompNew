import { expect, test } from "@playwright/test";

test("tutorial dialogue demo presents responsive character scenes without entering the game", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/tutorial-demo.html");

  await expect(page.getByRole("heading", { name: "You made it across." })).toBeVisible();
  await expect(page.getByRole("img", { name: /Rook, a stocky harbor surveyor/ })).toBeVisible();
  await expect(page.locator("#game-canvas")).toHaveCount(0);
  await expect(page.locator(".dialogue-demo")).toHaveAttribute("data-side", "left");

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Evidence first. Always." })).toBeVisible();
  await expect(page.getByRole("list", { name: "Key information" }).getByRole("listitem")).toHaveCount(5);
  await expect(page.locator(".dialogue-demo")).toHaveAttribute("data-side", "right");

  await page.getByRole("button", { name: "Move Rook to the left side" }).click();
  await expect(page.locator(".dialogue-demo")).toHaveAttribute("data-side", "left");

  await page.getByRole("button", { name: "Show scene 4" }).click();
  await expect(page.getByRole("heading", { name: "What matters most here?" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Dialogue choices" }).getByRole("button")).toHaveCount(2);
  await page.getByRole("button", { name: /reed habitat and broad fins/i }).click();
  await expect(page.getByRole("heading", { name: "The lake keeps a record." })).toBeVisible();

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
