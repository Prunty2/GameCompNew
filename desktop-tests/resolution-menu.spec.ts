import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 2560, height: 1440 },
  { width: 3440, height: 1440 },
]) {
  test(`resolution options stay above nearby controls at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    // Only the native window boundary is stubbed; production DOM/CSS and menu
    // interactions are exercised unchanged in both browser engines.
    await page.addInitScript(() => {
      Object.assign(window, {
        __TAURI_INTERNALS__: {
          metadata: { currentWindow: { label: "main" } },
          transformCallback: () => 1,
          invoke: async (command: string) => {
            if (command === "plugin:window|current_monitor") {
              return {
                name: "Ultrawide", scaleFactor: 1,
                position: { x: 0, y: 0 }, size: { width: 3440, height: 1440 },
                workArea: { position: { x: 0, y: 0 }, size: { width: 3440, height: 1440 } },
              };
            }
            if (command === "plugin:window|is_fullscreen") return false;
            if (command === "plugin:event|listen") return 1;
            if (["plugin:window|set_size", "plugin:window|center", "plugin:window|set_fullscreen"].includes(command)) return;
            throw new Error(`Unexpected native command: ${command}`);
          },
        },
      });
      localStorage.setItem("gamecomp-new.save", JSON.stringify({
        version: 17,
        settings: { resolution: "2560x1440", aspectRatio: "16:9", reducedMotion: true },
      }));
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("tab", { name: "Display", exact: true }).click();
    const trigger = page.getByRole("combobox", { name: "Display resolution", exact: true });
    const menu = page.getByRole("listbox", { name: "Display resolution options" });
    const ratio = page.getByRole("checkbox", { name: "Force 16:9 aspect ratio" });
    await trigger.click();
    await expect(menu).toBeVisible();
    const options = menu.getByRole("option");
    await expect(options).toHaveCount(5);
    // Visibility alone passes for an obscured element. Hit-test every option
    // so another setting cannot paint over it or intercept pointer input.
    for (const option of await options.all()) {
      await expect.poll(() => option.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
      })).toBe(true);
    }
    await page.screenshot({ path: `test-results/resolution-menu-${test.info().project.name}-${viewport.width}.png` });
    await menu.getByRole("option", { name: "1280 × 720", exact: true }).click();
    await expect(menu).toBeHidden();
    await expect(trigger).toHaveText(/1280 × 720/);
    await expect(ratio).toBeChecked();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("gamecomp-new.save")!).settings.resolution)).toBe("1280x720");

    await trigger.focus();
    await page.keyboard.press("ArrowDown");
    await expect(menu.getByRole("option", { name: "1280 × 720", exact: true })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(trigger).toHaveText(/1600 × 900/);
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
    await page.locator("label").filter({ hasText: "Force 16:9 aspect ratio" }).click();
    await expect(ratio).not.toBeChecked();
  });
}
