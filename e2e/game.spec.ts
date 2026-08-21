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

test("main menu presents centered play, settings, and credits actions", async ({ page }) => {
  await page.goto("/");

  const version = page.locator(".title-build-version");
  await expect(version).toHaveText("v0.4.3 (PR #85)");
  const versionBounds = await version.boundingBox();
  expect(versionBounds).not.toBeNull();
  expect(versionBounds!.x).toBeLessThan(24);
  expect(versionBounds!.y + versionBounds!.height).toBeGreaterThan(690);

  const actions = page.locator(".title-actions button");
  await expect(actions).toHaveCount(3);
  const playButton = page.getByRole("button", { name: "Play", exact: true });
  await expect(playButton).toBeVisible();
  await playButton.hover();
  await expect(playButton).toHaveCSS("animation-name", "menu-button-hover-wobble");
  await page.mouse.move(0, 0);
  await page.waitForTimeout(250);
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Credits" })).toBeVisible();
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

  expect(bounds[1].width).toBe(bounds[2].width);
  expect(Math.abs(bounds[0].center - viewportCenter)).toBeLessThanOrEqual(1);
  expect(Math.abs((bounds[1].center + bounds[2].center) / 2 - viewportCenter)).toBeLessThanOrEqual(1);
});

test("credits lists the team and returns to the main menu", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Credits" }).click();

  await expect(page.getByRole("heading", { name: "Credits" })).toBeVisible();
  await expect(page.locator(".credits-list dt")).toHaveText(["Liam", "Saxon", "Harrison", "David"]);
  await expect(page.getByText("Game Designer / Programmer / Gameplay Tester")).toBeVisible();
  await expect(page.getByText("Game Designer / Visual Designer / Gameplay Tester")).toBeVisible();
  await expect(page.getByText("Story Writer / Documentation / Gameplay Tester")).toBeVisible();
  await expect(page.getByText("Audio Designer / Marine Specialist / Gameplay Tester")).toBeVisible();

  const entries = page.locator(".credit-entry");
  const flags = page.locator(".credit-flag");
  const creditsScreen = page.locator(".credits-overlay");
  const creditsMenu = page.locator(".credits-menu");
  const backButton = page.getByRole("button", { name: "Back" });
  await expect(entries).toHaveCount(4);
  await expect(flags).toHaveCount(4);
  await expect(entries.first()).toHaveCSS("border-radius", "0px");
  await expect(backButton).toHaveCSS("border-radius", "999px");
  const [listBounds, backBounds] = await Promise.all([
    page.locator(".credits-list").boundingBox(),
    backButton.boundingBox(),
  ]);
  expect(backBounds?.width).toBe(listBounds?.width);
  await expect(flags.first()).toHaveAttribute("aria-hidden", "true");
  await expect(flags.first()).toHaveCSS("opacity", "0");
  await entries.first().hover();
  await expect(flags.first()).toHaveCSS("opacity", "1");
  await expect(entries.first().locator(".credit-flag-cloth")).toHaveCSS("animation-name", "credit-flag-ripple");

  await backButton.click();
  await expect(creditsScreen).toHaveClass(/is-closing-to-title/);
  await expect(creditsScreen).toHaveCSS("animation-name", "settings-backdrop-out");
  await expect(creditsMenu).toHaveCSS("animation-name", "settings-menu-out");
  await expect(creditsScreen).toHaveCount(0);
  await expect(page.locator(".title-screen")).toHaveClass(/is-settings-return/);
  await expect(page.locator(".title-panel")).toHaveCSS("animation-name", "menu-handoff-in");
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Credits" })).toHaveCount(0);
});

test("first assignment teaches the complete market sale loop", async ({ page }) => {
  await page.goto("/?e2e=1");
  await page.getByRole("button", { name: "Play", exact: true }).click();

  const tutorial = page.locator("#market-tutorial");
  const bluegillListing = page.locator('[data-action="select-market-fish"][data-species="bluegill"]');
  await expect(page.getByRole("heading", { name: "Brindle Harbor" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fish market" })).toBeVisible();
  await expect(page.locator(".market-listing")).toHaveCount(9);
  await expect(page.locator(".market-listing.is-locked")).toHaveCount(8);
  await expect(page.locator(".market-listing.is-locked").first().locator(".market-lock-question")).toHaveText("?");
  await expect(page.locator(".market-listing.is-locked").first().locator(".market-listing-fish")).toHaveCSS("filter", /brightness\(0\)/);
  await expect(page.locator(".market-listing.is-locked").first()).not.toHaveAttribute("data-action");
  await expect(tutorial).toContainText("FIRST ASSIGNMENT · 1 of 5");
  await expect(bluegillListing).toHaveClass(/is-tutorial-target/);
  await expect(bluegillListing).toHaveCSS("animation-name", "tutorial-target-pulse");

  await bluegillListing.click();
  await expect(tutorial).toContainText("FIRST ASSIGNMENT · 2 of 5");
  const trackButton = page.locator('[data-action="track-market-fish"][data-species="bluegill"]');
  await expect(trackButton).toHaveClass(/is-tutorial-target/);
  await expect(page.getByRole("img", { name: /Bluegill price history/ })).toBeVisible();

  await trackButton.click();
  await expect(tutorial).toContainText("FIRST ASSIGNMENT · 3 of 5");
  await expect(page.getByRole("button", { name: "Back to market" })).toHaveClass(/is-tutorial-target/);
  await page.getByRole("button", { name: "Back to market" }).click();
  await expect(bluegillListing.locator(".market-tracking-badge")).toHaveText("!");
  await expect(bluegillListing.locator(".market-tracking-badge")).toHaveAttribute("aria-label", "Tracking Bluegill");
  await expect(bluegillListing.locator(".market-tracking-badge")).toHaveCSS("left", "0px");
  await expect(bluegillListing.locator(".market-tracking-badge")).toHaveCSS("top", "0px");
  await expect(bluegillListing.locator(".market-tracking-badge")).toHaveCSS("border-radius", "50%");
  await expect(bluegillListing).toHaveAttribute("aria-label", /tracked/);
  await expect(page.locator(".market-tracking-badge")).toHaveCount(1);
  await expect(page.locator('[data-action="undock"]')).toHaveClass(/is-tutorial-target/);
  await page.locator('[data-action="undock"]').click();
  await expect(page.locator(".navigation-status")).toContainText("FISH AT Sunward Shoal");

  await page.evaluate(() => window.__FSHING_TEST__?.catchSpecies("bluegill"));
  await expect(tutorial).toContainText("FIRST ASSIGNMENT · 4 of 5");
  await expect(page.locator(".navigation-status")).toContainText("SELL AT Gloam Ferry");

  await page.evaluate(() => window.__FSHING_TEST__?.sailToHarbor("gloam"));
  await page.getByRole("button", { name: "Dock · Gloam Ferry" }).click();
  await expect(page.getByRole("heading", { name: "Gloam Ferry" })).toBeVisible();
  await page.locator('[data-action="select-market-fish"][data-species="bluegill"]').click();
  const sellButton = page.locator('[data-action="sell-market-fish"][data-species="bluegill"]');
  await expect(sellButton).toHaveClass(/is-tutorial-target/);
  await expect(sellButton).toHaveText(/Sell 1 fish · \d+ shells/);
  await sellButton.click();

  await expect(page.locator("#delivery-notification")).toContainText("Sold, 1 fish");
  await expect(tutorial).toContainText("FIRST ASSIGNMENT · 5 of 5");
  await page.locator('[data-action="finish-market-tutorial"]').click({ force: true });
  await expect(tutorial).toBeHidden();
  await expect(page.locator(".shell-balance strong")).toHaveText(/^[1-9]\d*$/);

  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(tutorial).toBeHidden();
  await expect(page.locator(".shell-balance strong")).toHaveText(/^[1-9]\d*$/);
});

test("hides direction guidance unless a fish is tracked or the first assignment is active", async ({ page }) => {
  await page.goto("/?e2e=1");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator("#market-tutorial")).toBeVisible();
  await page.locator('[data-action="skip-market-tutorial"]').click({ force: true });
  await expect(page.locator("#market-tutorial")).toBeHidden();
  await page.locator('[data-action="undock"]').click();
  await expect(page.getByRole("heading", { name: "Brindle Harbor" })).toHaveCount(0);
  await expect(page.locator(".navigation-status")).toHaveText("");

  await page.evaluate(() => window.__FSHING_TEST__?.sailToHarbor("brindle"));
  await page.getByRole("button", { name: "Dock · Brindle Harbor" }).click();
  await page.locator('[data-action="select-market-fish"][data-species="bluegill"]').click();
  await page.locator('[data-action="track-market-fish"][data-species="bluegill"]').click();
  await page.getByRole("button", { name: "Back to market" }).click();
  await page.locator('[data-action="undock"]').click();
  await expect(page.locator(".navigation-status")).toContainText("FISH AT Sunward Shoal");

  await page.evaluate(() => window.__FSHING_TEST__?.sailToHarbor("brindle"));
  await page.getByRole("button", { name: "Dock · Brindle Harbor" }).click();
  await page.locator('[data-action="select-market-fish"][data-species="bluegill"]').click();
  const trackButton = page.locator('[data-action="track-market-fish"][data-species="bluegill"]');
  await expect(trackButton).toHaveAttribute("aria-pressed", "true");
  await trackButton.click();
  await expect(trackButton).toHaveAttribute("aria-pressed", "false");
  await expect(trackButton).toHaveText("Track Bluegill");
  await page.getByRole("button", { name: "Back to market" }).click();
  await expect(page.locator(".market-tracking-badge")).toHaveCount(0);
  await page.locator('[data-action="undock"]').click();
  await expect(page.getByRole("heading", { name: "Brindle Harbor" })).toHaveCount(0);
  await expect(page.locator(".navigation-status")).toHaveText("");
});

test("market uses a scrollable fish-card grid and a focused detail view", async ({ page }) => {
  await page.goto("/?e2e=1");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.evaluate(() => {
    for (let index = 0; index < 3; index += 1) window.__FSHING_TEST__?.catchSpecies("bluegill");
    window.__FSHING_TEST__?.discoverAllFish();
  });

  const list = page.locator(".market-list");
  const listings = list.locator(".market-listing");
  await expect(listings).toHaveCount(9);
  await expect(list.locator(".market-listing.is-locked")).toHaveCount(0);
  await expect(listings.first().locator(".market-listing-fish")).toBeVisible();
  await expect(listings.first().locator(".market-listing-copy > strong")).not.toBeEmpty();
  await expect(listings.first().locator(".market-price-pill")).toHaveText(/^\d+$/);
  await expect(listings.first().locator(".market-cargo-count")).toHaveText("×3");
  await expect(listings.first().locator(".market-cargo-count")).toHaveAttribute("aria-label", "3 Bluegill in cargo");
  await expect(listings.first().locator(".market-cargo-count")).toHaveCSS("right", "0px");
  await expect(listings.nth(1).locator(".market-cargo-count")).toHaveCount(0);
  await expect(page.locator(".market-board-heading .panel-eyebrow")).toHaveCount(0);
  await expect(page.locator(".market-info-pill")).toHaveCount(0);
  const scrollState = await list.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    overflowY: getComputedStyle(element).overflowY,
  }));
  expect(scrollState.overflowY).toBe("auto");
  expect(scrollState.scrollHeight).toBeGreaterThan(scrollState.clientHeight);

  const sturgeonCard = page.locator('[data-action="select-market-fish"][data-species="lakeSturgeon"]');
  await expect(sturgeonCard).toHaveCSS("border-radius", "18px");
  await sturgeonCard.hover();
  await expect(sturgeonCard).toHaveCSS("animation-name", "menu-button-hover-wobble");
  await sturgeonCard.click();
  const detail = page.locator(".market-detail");
  await expect(detail.getByRole("heading", { name: "Lake Sturgeon" })).toBeVisible();
  await expect(detail.getByRole("img", { name: /Lake Sturgeon price history/ })).toBeVisible();
  await expect(detail.locator(".market-hold-pill")).toHaveCount(0);
  await expect(detail.locator(".panel-eyebrow")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Back to market" })).toBeVisible();
  await expect(detail).not.toContainText("Found at");
  await expect(detail).not.toContainText("Today's supply");

  const desktopLayout = await detail.evaluate((element) => {
    const summary = element.querySelector<HTMLElement>(".market-fish-summary")?.getBoundingClientRect();
    const chart = element.querySelector<HTMLElement>(".market-chart-shell")?.getBoundingClientRect();
    return { summaryRight: summary?.right ?? 0, chartLeft: chart?.left ?? 0 };
  });
  expect(desktopLayout.chartLeft).toBeGreaterThanOrEqual(desktopLayout.summaryRight);

  await page.getByRole("button", { name: "Back to market" }).click();
  await expect(listings).toHaveCount(9);
  await expect(sturgeonCard).toBeFocused();

  await sturgeonCard.click();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(detail).toBeVisible();
  const mobileLayout = await detail.evaluate((element) => {
    const summary = element.querySelector<HTMLElement>(".market-fish-summary")?.getBoundingClientRect();
    const chart = element.querySelector<HTMLElement>(".market-chart-shell")?.getBoundingClientRect();
    return { summaryBottom: summary?.bottom ?? 0, chartTop: chart?.top ?? 0 };
  });
  expect(mobileLayout.chartTop).toBeGreaterThanOrEqual(mobileLayout.summaryBottom);
  const panelFitsWidth = await page.locator(".market-harbor-panel").evaluate(
    (element) => element.scrollWidth <= element.clientWidth,
  );
  expect(panelFitsWidth).toBe(true);
});

test("Beach market lists, prices, and tracks coastal fish with coastal artwork", async ({ page }) => {
  await page.goto("/?e2e=1");
  await page.evaluate(() => {
    window.localStorage.setItem("gamecomp-new.save", JSON.stringify({
      version: 10,
      progress: {
        money: 0,
        upgrades: {},
        beachUnlocked: true,
        discovered: [
          "bluegill",
          "seaMullet",
          "yellowfinBream",
          "sandWhiting",
          "duskyFlathead",
          "luderick",
          "easternAustralianSalmon",
          "snapper",
          "yellowtailKingfish",
          "mulloway",
        ],
        marketTutorialStep: "done",
      },
      settings: {},
    }));
  });
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Services", exact: true }).click();
  await page.getByRole("button", { name: "Travel to Beach" }).click();
  await expect(page.locator("#game-canvas")).toHaveAttribute("data-world", "beach");

  await page.evaluate(() => window.__FSHING_TEST__?.sailToHarbor("brindle"));
  await page.getByRole("button", { name: "Dock · Brindle Harbor" }).click();
  await page.getByRole("button", { name: "Market", exact: true }).click();

  const listings = page.locator(".market-listing");
  const snapper = page.locator('[data-action="select-market-fish"][data-species="snapper"]');
  await expect(listings).toHaveCount(9);
  await expect(page.locator('[data-species="bluegill"]')).toHaveCount(0);
  await expect(snapper).toBeVisible();
  await expect(snapper.locator(".market-fish-icon")).toHaveAttribute("style", /fish-beach-atlas-ui/);
  await snapper.click();
  await page.getByRole("button", { name: "Track Snapper" }).click();
  await page.getByRole("button", { name: "Back to market" }).click();
  await expect(snapper.locator(".market-tracking-badge")).toHaveAttribute("aria-label", "Tracking Snapper");
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

  await page.locator('[data-action="undock"]').click();
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

  await page.locator('[data-action="undock"]').click();
  await expect(transition).toHaveClass(/is-(covering|revealing)/);
  await expect(page.locator(".screen-overlay")).toHaveCount(0);
  await expect(transition).not.toHaveClass(/is-(covering|revealing)/);

  await page.evaluate(() => window.__FSHING_TEST__?.setElapsed(165));
  await page.evaluate(() => window.__FSHING_TEST__?.sailToHarbor("brindle"));
  await page.getByRole("button", { name: "Dock · Brindle Harbor" }).click();
  await expect(page.locator(".harbor-screen")).toHaveAttribute("data-time-of-day", "night");
  expect(await page.locator(".harbor-screen").evaluate((element) => getComputedStyle(element, "::before").backgroundImage)).toContain("dock-brindle-night");
  await page.locator('[data-action="undock"]').click();
  await expect(transition).not.toHaveClass(/is-(covering|revealing)/);

  await page.evaluate(() => window.__FSHING_TEST__?.sailToHarbor("gloam"));
  await page.getByRole("button", { name: "Dock · Gloam Ferry" }).click();
  await expect(page.locator(".harbor-screen")).toHaveAttribute("data-time-of-day", "night");
  expect(await page.locator(".harbor-screen").evaluate((element) => getComputedStyle(element, "::before").backgroundImage)).toContain("dock-gloam-night");
  await page.locator('[data-action="undock"]').click();
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
  await page.locator('[data-action="undock"]').click();
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
  await page.locator('[data-action="undock"]').click();

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
  await page.locator('[data-action="undock"]').click();
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
  await page.locator('[data-action="undock"]').click();

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
  await page.locator('[data-action="undock"]').click();

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

test("pause stays open when Escape keydown is duplicated before keyup", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.locator('[data-action="undock"]').click();

  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape" }));
  });
  const pauseScreen = page.locator(".pause-screen");
  await expect(pauseScreen).toBeVisible();

  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape" }));
  });
  await page.waitForTimeout(100);
  await expect(pauseScreen).toBeVisible();
  await expect(pauseScreen).not.toHaveClass(/is-closing/);

  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "Escape" }));
  });
  await page.keyboard.press("Escape");
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
  await page.locator('[data-action="undock"]').click();

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
  await page.locator('[data-action="undock"]').click();
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

test("Escape leaves fishing without opening the pause menu", async ({ page }) => {
  await page.goto("/?e2e=1&e2eSpot=sunwardShoal");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.locator('[data-action="undock"]').click();
  await page.getByRole("button", { name: "Drop line · Sunward Shoal" }).click();

  await expect.poll(async () => page.evaluate(() => window.__FSHING_TEST__?.mode())).toBe("fishing");
  const canvas = page.locator("#game-canvas");
  const startingDiveProgress = Number(await canvas.getAttribute("data-fishing-dive-progress"));
  await page.keyboard.press("Escape");

  await expect(canvas).toHaveAttribute("data-fishing-state", "exiting");
  await expect.poll(async () => Number(await canvas.getAttribute("data-fishing-surface-blend"))).toBeGreaterThan(0.05);
  await expect.poll(async () => Number(await canvas.getAttribute("data-fishing-dive-progress"))).toBeLessThan(startingDiveProgress - 0.05);
  await expect(page.getByRole("heading", { name: "Paused" })).toHaveCount(0);
  await expect.poll(async () => page.evaluate(() => window.__FSHING_TEST__?.mode())).toBe("cruising");
  await expect(page.getByRole("heading", { name: "Paused" })).toHaveCount(0);
  await expect(canvas).not.toHaveAttribute("data-fishing-state");
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
  await page.locator('[data-action="undock"]').click();
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
  await expect.poll(async () => page.evaluate(() => window.__FSHING_TEST__?.mode())).toBe("cruising");
  await expect(canvas).not.toHaveAttribute("data-fishing-state");
  await expect(canvas).not.toHaveAttribute("data-fishing-school-opacity");
  await expect(canvas).not.toHaveAttribute("data-fishing-surface-sprite-opacity");
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
  await page.locator('[data-action="undock"]').click();
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
  await expect(page.getByRole("heading", { name: "Read the market" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous" })).toBeDisabled();

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Step 2 of 4")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Track and catch" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Read the market" })).toHaveCount(0);

  await page.getByRole("button", { name: "Previous" }).click();
  await expect(page.getByText("Step 1 of 4")).toBeVisible();

  for (let step = 1; step < 4; step += 1) {
    await page.getByRole("button", { name: "Next" }).click();
  }
  await expect(page.getByText("Step 4 of 4")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sell and invest" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Brindle Harbor" })).toBeVisible();
});

test("mobile button controls are absent at responsive viewports", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.locator('[data-action="undock"]').click();
  await expect(page.locator(".touch-controls, [data-hook-pad]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Move left|Move right|Hold boost|Interact or cast|Leave fishing/ })).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".touch-controls, [data-hook-pad]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Move left|Move right|Hold boost|Interact or cast|Leave fishing/ })).toHaveCount(0);
});

test("dock interaction starts on pointer press", async ({ page }) => {
  await page.goto("/?e2e=1");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.locator('[data-action="undock"]').click();
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
  await page.locator('[data-action="undock"]').click();
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

  await page.locator('[data-action="undock"]').click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Field guide" })).toHaveCount(0);
});
