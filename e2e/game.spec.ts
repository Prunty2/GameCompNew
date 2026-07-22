import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://sdk.crazygames.com/**", (route) => route.abort());
  await page.addInitScript(() => localStorage.clear());
});

test("loads the theme-neutral game shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "New Game" })).toBeVisible();
  await expect(page.getByLabel("Score")).toHaveText("0");
  await expect(page.getByLabel("Game area")).toBeVisible();
});
