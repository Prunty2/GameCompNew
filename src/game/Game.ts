import brindleDockDayUrl from "../assets/dock-brindle-day.jpg";
import brindleDockNightUrl from "../assets/dock-brindle-night.jpg";
import beachChartUrl from "../assets/beach-chart.png";
import beachChartNightUrl from "../assets/beach-chart-night.png";
import binIconUrl from "../assets/bin-icon.png";
import gloamDockDayUrl from "../assets/dock-gloam-day.jpg";
import gloamDockNightUrl from "../assets/dock-gloam-night.jpg";
import fishAtlasUiUrl from "../assets/fish-atlas-ui.png";
import beachFishAtlasUiUrl from "../assets/fish-beach-atlas-ui.png";
import wordmarkUrl from "../assets/fshing-wordmark.png";
import padlockIconUrl from "../assets/padlock-icon.png";
import uiButtonUrl from "../assets/ui-button.png";
import uiIconsUrl from "../assets/ui-icons.png";
import uiPanelUrl from "../assets/ui-panel.png";
import { FeedbackService, type FeedbackCue } from "../services/feedbackService";
import type { PlatformService } from "../services/platformService";
import { defaultSave, saveGame, type SaveData } from "../services/saveGame";
import {
  BALANCE,
  FISH,
  engineSpeedMultiplier,
  harborById,
  spotById,
  upgradeTierCap,
  type FishSpecies,
  type HarborId,
  type SpotId,
  type UpgradeId,
  type WorldId,
} from "./balance";
import {
  CONTROL_ACTIONS,
  CONTROL_LABELS,
  DEFAULT_CONTROL_BINDINGS,
  formatKey,
  isBindableCode,
  rebindControl,
  type ControlAction,
} from "./controls";
import { InputController } from "./input";
import {
  captureRenderMotion,
  interpolateSimulationForRender,
  type RenderMotionSnapshot,
} from "./renderInterpolation";
import { CanvasRenderer } from "./renderer";
import { fishIcon, marketBoardMarkup } from "./marketView";
import {
  chooseQuestArrowSide,
  questPresentation,
  questUiArrowLayout,
  type QuestPresentation,
  type QuestViewContext,
} from "./quest";
import {
  beginFishingExit,
  buyBoost,
  buyBeachAccess,
  buyPermit,
  buyUpgrade,
  cargoCapacity,
  closeMarketSpeciesDetail,
  consumeEvents,
  createSimulation,
  damageBoat,
  dayProgress,
  getInteractionPrompt,
  finishMarketTutorial,
  inspectMarketSpecies,
  noteUpgradeServicesOpened,
  interact,
  leaveFishing,
  moveBoatForTesting,
  navigationGuidance,
  nightVisualIntensity,
  releaseCargo,
  restoreCargo,
  resolveCatch,
  sellAllFishAtMarket,
  sellSpeciesAtMarket,
  shouldShowNightIndicator,
  skipMarketTutorial,
  startFishing,
  syncUpgradeTutorial,
  travelToWorld,
  trackMarketSpecies,
  undock,
  unlockBoostForTesting,
  updateSimulation,
  upgradeCost,
  type CargoItem,
  type Simulation,
  type SimulationEvent,
} from "./simulation";

const FIXED_STEP = 1 / 120;
const MAX_FRAME = 0.05;
const UI_REFRESH_INTERVAL = 100;
const HELP_STEP_COUNT = 4;
const PAUSE_EXIT_DURATION = 340;
const MENU_EXIT_DURATION = 340;
const SCENE_COVER_DURATION = 120;
const SCENE_REVEAL_DURATION = 160;
const DELIVERY_NOTIFICATION_DURATION = 4_000;
const DELIVERY_NOTIFICATION_EXIT_DURATION = 280;

const DOCK_BACKGROUND_URL: Record<HarborId, { day: string; night: string }> = {
  brindle: { day: brindleDockDayUrl, night: brindleDockNightUrl },
  gloam: { day: gloamDockDayUrl, night: gloamDockNightUrl },
};

type OverlayScreen =
  | "title"
  | "harbor"
  | "pause"
  | "settings"
  | "credits"
  | "controls"
  | "help"
  | "seasonReport"
  | null;

type HarborSection = "market" | "cargo" | "services";

const HARBOR_SECTION_ICON: Record<HarborSection, string> = {
  market: "objective",
  cargo: "cargo",
  services: "repair",
};

declare global {
  interface Window {
    __FSHING_TEST__?: {
      sailToSpot(id: SpotId): void;
      sailToHarbor(id: HarborId): void;
      previewFishing(id: SpotId, species: FishSpecies): void;
      catchSpecies(species: FishSpecies): void;
      grantMoney(amount: number): void;
      discoverAllFish(): void;
      hookSpecies(species: FishSpecies): void;
      damage(amount: number): void;
      setElapsed(seconds: number): void;
      elapsed(): number;
      mode(): Simulation["mode"];
      boatX(): number;
      facing(): -1 | 1;
      world(): WorldId;
    };
  }
}

export class Game {
  private readonly renderer: CanvasRenderer;
  private readonly input: InputController;
  private readonly feedback: FeedbackService;
  private simulation: Simulation;
  private previousRenderMotion: RenderMotionSnapshot;
  private lastTime = 0;
  private accumulator = 0;
  private lastUiRefresh = 0;
  private started = false;
  private overlay: OverlayScreen = "title";
  private overlaySource: OverlayScreen = null;
  private overlayReturn: OverlayScreen = "pause";
  private harborSection: HarborSection = "market";
  private selectedMarketSpecies: FishSpecies = "bluegill";
  private marketDetailOpen = false;
  private helpStep = 0;
  private toastTimer: number | undefined;
  private deliveryNotificationTimer: number | undefined;
  private deliveryNotificationExitTimer: number | undefined;
  private pauseTransitionTimer: number | undefined;
  private menuTransitionTimer: number | undefined;
  private cargoUpgradeTransitionTimer: number | undefined;
  private cargoReleaseTimer: number | undefined;
  private pendingCargoRelease: { item: CargoItem; index: number } | null = null;
  private sceneTransitioning = false;
  private sceneTransitionTarget: OverlayScreen | undefined;
  private queuedOverlay: { next: OverlayScreen; useSceneTransition: boolean } | null = null;
  private seasonReportQueued = false;
  private questGuide: QuestPresentation | null = null;
  private lastQuestMarkup = "";
  private resetConfirming = false;
  private overlayEntering = false;
  private readonly visualTestSpot = import.meta.env.DEV
    ? new URLSearchParams(window.location.search).get("e2eSpot") as SpotId | null
    : null;
  private readonly interfaceReady = Promise.all([
    preloadImage(brindleDockDayUrl),
    preloadImage(brindleDockNightUrl),
    preloadImage(beachChartUrl),
    preloadImage(beachChartNightUrl),
    preloadImage(gloamDockDayUrl),
    preloadImage(gloamDockNightUrl),
    preloadImage(binIconUrl),
    preloadImage(padlockIconUrl),
    preloadImage(wordmarkUrl),
    preloadImage(uiButtonUrl),
    preloadImage(uiIconsUrl),
    preloadImage(uiPanelUrl),
  ]);

  constructor(
    canvas: HTMLCanvasElement,
    private readonly uiRoot: HTMLElement,
    private readonly platform: PlatformService,
    private readonly save: SaveData,
  ) {
    this.renderer = new CanvasRenderer(canvas);
    this.input = new InputController(save.settings.controls);
    this.feedback = new FeedbackService(save.settings);
    this.simulation = createSimulation(7, save.progress);
    this.previousRenderMotion = captureRenderMotion(this.simulation);
  }

  async prepare(): Promise<void> {
    await Promise.all([this.renderer.ready(), this.interfaceReady]);
    this.buildUi();
    this.installTestingBridge();
  }

  start(): void {
    this.applySettings();
    requestAnimationFrame((time) => this.frame(time));
  }

  private frame(time: number): void {
    const delta = this.lastTime === 0 ? 0 : Math.min(MAX_FRAME, (time - this.lastTime) / 1_000);
    this.lastTime = time;
    this.accumulator += delta;

    const escapeRequested = this.input.consumeEscape();
    const pauseRequested = this.input.consumePause();
    if ((escapeRequested || pauseRequested) && this.started) {
      if (escapeRequested && this.overlay === null && this.simulation.mode === "fishing") {
        this.exitFishing();
      } else if (this.overlay === null || this.sceneTransitioning && this.sceneTransitionTarget === null) {
        this.setOverlay("pause");
      } else if (this.overlay === "pause") {
        this.setOverlay(null);
      }
    }

    if (import.meta.env.DEV) {
      const debugTimeJump = this.input.consumeDebugTimeJump();
      if (debugTimeJump && this.started && this.overlay === null) {
        this.simulation.elapsed = debugTimeJump === "transition-start"
          ? BALANCE.nightStart
          : BALANCE.nightStart + BALANCE.nightFadeLength;
        this.accumulator = 0;
        this.refreshHud();
      }
    }

    if (this.input.consumeDebugBoostUnlock() && this.started) {
      if (!unlockBoostForTesting(this.simulation)) this.showToast("Boost is already unlocked.");
      this.handleSimulationEvents();
    }

    if (this.started && this.overlay === null && !this.sceneTransitioning) {
      while (this.accumulator >= FIXED_STEP) {
        this.previousRenderMotion = captureRenderMotion(this.simulation);
        updateSimulation(this.simulation, this.input.read(), FIXED_STEP);
        this.accumulator -= FIXED_STEP;
      }
      if (this.input.consumeAction()) this.handleInteract();
      this.handleSimulationEvents();
    } else {
      this.accumulator = 0;
      this.previousRenderMotion = captureRenderMotion(this.simulation);
      this.input.consumeAction();
    }

    const engineMaximum = BALANCE.maxSurfaceSpeed * engineSpeedMultiplier(this.simulation.progress.upgrades.engine);
    this.feedback.updateEngine(
      Math.abs(this.simulation.boat.speed) / engineMaximum,
      this.started && this.overlay === null && !this.sceneTransitioning && this.simulation.mode === "cruising",
    );
    const renderSimulation = interpolateSimulationForRender(
      this.simulation,
      this.previousRenderMotion,
      this.accumulator / FIXED_STEP,
      FIXED_STEP,
    );
    this.renderer.render(renderSimulation, {
      ...this.save.settings,
      cinematic: this.overlay === "title"
        || (this.overlay === "settings" || this.overlay === "controls" || this.overlay === "credits") && this.overlayReturn === "title",
    });
    this.syncContextActionAnchor();
    if (time - this.lastUiRefresh >= UI_REFRESH_INTERVAL) {
      this.refreshHud();
      this.lastUiRefresh = time;
    }
    requestAnimationFrame((nextTime) => this.frame(nextTime));
  }

  private buildUi(): void {
    this.uiRoot.innerHTML = `
      <div class="game-ui">
        <div class="night-indicator" role="img" aria-label="Nighttime" aria-hidden="true">
          <span class="night-indicator-icon" aria-hidden="true"></span>
        </div>
        <div class="boost-gauge" role="meter" aria-label="Boost charge" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" hidden>
          <span class="boost-gauge-label">BOOST</span>
          <span class="boost-gauge-track"><i></i></span>
          <small>SHIFT</small>
        </div>
        <p class="visually-hidden navigation-status" role="status" aria-live="polite"></p>
        <div class="toast" id="toast" role="status" aria-live="polite" aria-atomic="true"></div>
        <section class="delivery-success" id="delivery-notification" role="status" aria-live="polite" aria-atomic="true" hidden>
          <span class="delivery-success-seal" aria-hidden="true">✓</span>
          <strong></strong>
          <button class="delivery-success-close" type="button" data-action="dismiss-delivery-notification">
            <span aria-hidden="true">×</span>
          </button>
        </section>
        <div class="feedback-flash" id="feedback-flash" aria-hidden="true"></div>
        <aside class="market-tutorial" id="market-tutorial" role="status" aria-live="polite" hidden></aside>
        <div class="quest-glow" id="quest-glow" hidden aria-hidden="true"></div>
        <div class="quest-arrow" id="quest-arrow" hidden aria-hidden="true">
          <svg class="quest-arrow-mark" viewBox="0 0 64 48" focusable="false">
            <path d="M6 24h38M32 8l22 16-22 16" />
          </svg>
        </div>

        <button class="context-action" id="context-action" type="button" data-action="interact" data-control="action" hidden>Interact</button>

        <div class="overlay-host" id="overlay-host"></div>
        <div class="scene-transition" id="scene-transition" aria-hidden="true">
          <span class="scene-transition-panel scene-transition-panel-top"></span>
          <span class="scene-transition-panel scene-transition-panel-bottom"></span>
          <span class="scene-transition-waterline"></span>
        </div>
      </div>`;

    this.uiRoot.addEventListener("click", this.onClick);
    this.uiRoot.addEventListener("change", this.onChange);
    window.addEventListener("blur", this.onFocusLost);
    document.addEventListener("visibilitychange", this.onVisibilityChanged);
    this.input.bindPointerAction(this.uiRoot);
    this.renderOverlay();
    this.refreshHud();
  }

  private handleInteract(): void {
    if (this.simulation.mode === "fishing") return;
    const prompt = getInteractionPrompt(this.simulation);
    if (prompt?.kind === "fishing" && prompt.enabled && prompt.spot) {
      if (startFishing(this.simulation, prompt.spot)) {
        this.feedback.cue("cast");
        this.refreshHud();
      }
      return;
    }
    interact(this.simulation);
    if (prompt && !prompt.enabled && prompt.reason) this.showToast(prompt.reason);
    this.handleSimulationEvents();
  }

  private handleSimulationEvents(): void {
    const events = consumeEvents(this.simulation);
    for (const event of events) this.handleEvent(event);
    if (events.length > 0) {
      this.syncSave();
      this.refreshHud();
    }
    if (events.some((event) => event.type === "sold") && this.seasonReportQueued) {
      this.seasonReportQueued = false;
      this.setOverlay("seasonReport");
    }
  }

  private handleEvent(event: SimulationEvent): void {
    switch (event.type) {
      case "caught":
        this.feedback.cue("catch");
        this.pulseFeedback("catch");
        this.showToast(`${FISH[event.species].name} secured. Freshness is falling.`);
        break;
      case "sold":
        this.feedback.cue("delivery");
        this.pulseFeedback("delivery");
        this.harborSection = "market";
        this.showDeliveryNotification(
          `Sold, ${event.result.quantity} fish`,
          "Close sale notification",
        );
        break;
      case "market-day":
        this.showToast(`Market day ${event.day}. Harbor prices have changed.`);
        if (this.overlay === "harbor") this.renderOverlay();
        break;
      case "docked":
        this.feedback.cue("dock");
        this.harborSection = "market";
        this.marketDetailOpen = false;
        this.setOverlay("harbor", true);
        break;
      case "full-cargo":
        this.feedback.cue("deny");
        this.showToast("Cargo hold full. Deliver or release a catch.");
        break;
      case "locked-region":
        this.feedback.cue("deny");
        this.showToast("Outer Gloam is permit water. Turn back or buy access at Gloam Ferry.");
        break;
      case "depth-locked":
        this.feedback.cue("deny");
        this.showToast(`Upgrade line depth to tier ${event.tier} to fish this water.`);
        break;
      case "rescued":
        this.feedback.cue("collision");
        this.showToast(`Harbor rescue · ${event.cost} shells · cargo lost`);
        this.harborSection = "market";
        this.marketDetailOpen = false;
        this.setOverlay("harbor", true);
        break;
      case "upgrade":
        this.feedback.cue("upgrade");
        this.pulseFeedback("upgrade");
        this.showToast(`${upgradeName(event.upgrade)} upgraded to tier ${this.simulation.progress.upgrades[event.upgrade]}.`);
        break;
      case "permit":
        this.feedback.cue("upgrade");
        this.showToast("Outer Gloam permit granted. Keep your lamp close.");
        break;
      case "beach-unlocked":
        this.feedback.cue("upgrade");
        this.pulseFeedback("upgrade");
        this.showToast("Beach unlocked. Travel there from Dock Services.");
        break;
      case "boost-unlocked":
        this.feedback.cue("upgrade");
        this.pulseFeedback("upgrade");
        this.showToast(event.temporary
          ? "Boost temporarily unlocked. Hold Shift while sailing."
          : "Boost unlocked. Hold Shift while sailing.");
        break;
      case "released":
        this.feedback.cue("cast");
        break;
      case "season-complete":
        this.seasonReportQueued = true;
        break;
    }
  }

  private refreshHud(): void {
    const simulation = this.simulation;

    const guidance = navigationGuidance(simulation);
    const navigationStatus = this.uiRoot.querySelector<HTMLElement>(".navigation-status");
    const navigationStatusText = this.overlay === null && simulation.mode === "cruising" && guidance
      ? `${guidance.kicker} ${guidance.label}. ${guidance.instruction}`
      : "";
    if (navigationStatus && navigationStatus.textContent !== navigationStatusText) {
      navigationStatus.textContent = navigationStatusText;
    }

    this.refreshContextAction();
    this.refreshQuestGuide();

    const showNightIndicator = shouldShowNightIndicator(simulation);
    document.body.classList.toggle("show-night-indicator", showNightIndicator);
    this.uiRoot.querySelector<HTMLElement>(".night-indicator")
      ?.setAttribute("aria-hidden", String(!showNightIndicator));
    document.documentElement.style.setProperty("--day-progress", String(dayProgress(simulation)));
    const boostGauge = this.uiRoot.querySelector<HTMLElement>(".boost-gauge");
    if (boostGauge) {
      const unlocked = simulation.progress.boostUnlocked || simulation.boost.temporaryUnlocked;
      const charge = Math.round((1 - simulation.boost.heat) * 100);
      boostGauge.hidden = !unlocked || this.overlay !== null || simulation.mode !== "cruising";
      boostGauge.classList.toggle("is-active", simulation.boost.active);
      boostGauge.classList.toggle("is-overheated", simulation.boost.overheated);
      boostGauge.style.setProperty("--boost-charge", `${charge}%`);
      boostGauge.setAttribute("aria-valuenow", String(charge));
      boostGauge.setAttribute("aria-valuetext", simulation.boost.overheated ? `${charge}% cooling` : `${charge}% available`);
      const label = boostGauge.querySelector<HTMLElement>(".boost-gauge-label");
      if (label) label.textContent = simulation.boost.overheated ? "COOLING" : "BOOST";
    }
  }

  private refreshContextAction(): void {
    const action = this.uiRoot.querySelector<HTMLButtonElement>("#context-action");
    const prompt = getInteractionPrompt(this.simulation);
    if (action) {
      const fishingCue = prompt?.kind === "fishing";
      action.hidden = !prompt || this.overlay !== null || this.simulation.mode === "fishing";
      action.disabled = prompt ? !prompt.enabled : true;
      action.textContent = prompt?.label ?? "Interact";
      action.setAttribute("aria-label", prompt?.label ?? "Interact");
      action.title = prompt?.label ?? "";
      action.classList.toggle("is-fishing-cue", fishingCue);
      this.syncContextActionAnchor(action);
    }
  }

  private questViewContext(): QuestViewContext {
    return {
      started: this.started,
      overlay: this.overlay,
      harborSection: this.harborSection,
      marketDetailOpen: this.marketDetailOpen,
    };
  }

  private refreshQuestGuide(): void {
    const tutorial = this.uiRoot.querySelector<HTMLElement>("#market-tutorial");
    if (!tutorial) return;
    const previousUpgradeStep = this.simulation.progress.upgradeTutorialStep;
    syncUpgradeTutorial(this.simulation);
    if (this.overlay === "harbor" && this.harborSection === "services") {
      noteUpgradeServicesOpened(this.simulation);
    }
    if (previousUpgradeStep !== this.simulation.progress.upgradeTutorialStep) this.syncSave();
    const presentation = questPresentation(this.simulation, this.questViewContext());
    this.questGuide = presentation;
    tutorial.hidden = presentation.hidden;
    tutorial.dataset.questStep = presentation.step;
    tutorial.setAttribute(
      "aria-label",
      presentation.hidden
        ? "Tutorial"
        : `Tutorial, ${presentation.title}, step ${presentation.index} of ${presentation.totalSteps}`,
    );
    if (presentation.hidden) {
      this.lastQuestMarkup = "";
      tutorial.innerHTML = "";
      this.clearQuestUiTargets();
      this.syncQuestArrow();
      return;
    }
    const markup = `<span class="market-tutorial-step" aria-hidden="true">${presentation.index}</span><div class="market-tutorial-copy"><span>${presentation.heading}</span><strong>${presentation.title}</strong></div><button class="market-tutorial-close" type="button" data-action="skip-market-tutorial" aria-label="Close tutorial"><span aria-hidden="true">×</span></button>`;
    if (markup !== this.lastQuestMarkup) {
      tutorial.innerHTML = markup;
      this.lastQuestMarkup = markup;
    }
    this.applyQuestUiTarget(presentation.uiTargetSelector);
    this.syncQuestArrow();
  }

  private applyQuestUiTarget(selector: string | null): void {
    for (const element of this.uiRoot.querySelectorAll(".is-tutorial-target")) {
      if (selector && element.matches(selector)) continue;
      element.classList.remove("is-tutorial-target");
    }
    if (!selector) return;
    const target = this.uiRoot.querySelector<HTMLElement>(selector);
    target?.classList.add("is-tutorial-target");
  }

  private clearQuestUiTargets(): void {
    for (const element of this.uiRoot.querySelectorAll(".is-tutorial-target")) {
      element.classList.remove("is-tutorial-target");
    }
  }

  private syncQuestArrow(): void {
    const arrow = this.uiRoot.querySelector<HTMLElement>("#quest-arrow");
    const glow = this.uiRoot.querySelector<HTMLElement>("#quest-glow");
    const selector = this.questGuide?.uiTargetSelector;
    const target = selector ? this.uiRoot.querySelector<HTMLElement>(selector) : null;
    const targetRect = target?.getClientRects()[0];
    if (!arrow || !glow) return;
    if (!selector || !target || !targetRect) {
      arrow.hidden = true;
      glow.hidden = true;
      return;
    }
    const radius = getComputedStyle(target).borderRadius;
    glow.hidden = false;
    glow.style.width = `${targetRect.width}px`;
    glow.style.height = `${targetRect.height}px`;
    glow.style.borderRadius = radius;
    glow.style.transform = `translate(${targetRect.left}px, ${targetRect.top}px)`;
    if (target.closest("#market-tutorial")) {
      arrow.hidden = true;
      return;
    }
    const tutorial = this.uiRoot.querySelector<HTMLElement>("#market-tutorial");
    const avoidBox = tutorial && !tutorial.hidden ? tutorial.getBoundingClientRect() : null;
    const avoid = avoidBox
      ? { left: avoidBox.left, top: avoidBox.top, width: avoidBox.width, height: avoidBox.height }
      : null;
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const targetBox = { left: targetRect.left, top: targetRect.top, width: targetRect.width, height: targetRect.height };
    const side = chooseQuestArrowSide(targetBox, viewport, avoid);
    const layout = questUiArrowLayout(targetBox, side);
    arrow.hidden = false;
    arrow.dataset.side = side;
    arrow.style.transform = `translate(${layout.left}px, ${layout.top}px) rotate(${layout.rotation}deg)`;
  }

  private syncContextActionAnchor(
    action = this.uiRoot.querySelector<HTMLButtonElement>("#context-action"),
  ): void {
    if (action) {
      const anchor = action.classList.contains("is-fishing-cue")
        ? this.renderer.surfaceInteractionAnchor()
        : null;
      if (anchor) {
        action.style.left = `${anchor.x}px`;
        action.style.top = `${anchor.y}px`;
      } else {
        action.style.removeProperty("left");
        action.style.removeProperty("top");
      }
    }
    this.syncQuestArrow();
  }

  private renderOverlay(): void {
    const host = this.uiRoot.querySelector<HTMLElement>("#overlay-host");
    if (!host) return;
    if (this.overlay === null) {
      host.innerHTML = "";
      this.refreshQuestGuide();
      return;
    }
    switch (this.overlay) {
      case "title":
        host.innerHTML = this.titleScreen();
        break;
      case "harbor":
        host.innerHTML = this.harborScreen();
        break;
      case "pause":
        host.innerHTML = this.pauseScreen();
        break;
      case "settings":
        host.innerHTML = this.settingsScreen();
        break;
      case "credits":
        host.innerHTML = this.creditsScreen();
        break;
      case "controls":
        host.innerHTML = this.controlsScreen();
        break;
      case "help":
        host.innerHTML = this.helpScreen();
        break;
      case "seasonReport":
        host.innerHTML = this.seasonReportScreen();
        break;
    }
    this.refreshQuestGuide();
  }

  private titleScreen(): string {
    const returnClass = this.overlaySource === "settings" || this.overlaySource === "credits"
      ? " is-settings-return"
      : "";
    return `
      <section class="screen-overlay title-screen${returnClass}" role="dialog" aria-label="FSHING main menu">
        <div class="title-panel">
          <img class="wordmark" src="${wordmarkUrl}" alt="FSHING" />
          <div class="title-actions">
            <button class="primary-button title-play-button" type="button" data-action="start" aria-label="Play">
              <span class="title-play-icon" aria-hidden="true">▶</span>
              <strong>Play</strong>
            </button>
            <div class="title-secondary-actions">
              <button class="menu-button title-settings-button" type="button" data-action="open-settings"><strong>Settings</strong></button>
              <button class="menu-button title-credits-button" type="button" data-action="open-credits"><strong>Credits</strong></button>
            </div>
          </div>
        </div>
        <small class="title-build-version">v${__APP_VERSION__} (PR #${__PR_NUMBER__})</small>
      </section>`;
  }

  private harborScreen(): string {
    return this.marketHarborScreen();
  }

  private marketHarborScreen(): string {
    const harborId = this.simulation.dockedAt ?? "brindle";
    const harbor = harborById(harborId);
    const availableSections: HarborSection[] = ["market", "cargo", "services"];
    const activeSection = availableSections.includes(this.harborSection) ? this.harborSection : "market";
    const availableCargoSlots = cargoCapacity(this.simulation);
    const cargoMarkup = Array.from({ length: BALANCE.maxCargoSlots }, (_, index) => {
      const item = this.simulation.cargo[index];
      const slotNumber = String(index + 1).padStart(2, "0");
      if (item) {
        const freshness = Math.ceil(item.freshness);
        return `<article class="cargo-slot is-occupied" aria-label="Cargo slot ${index + 1}: ${FISH[item.species].name}, ${freshness}% fresh"><span class="cargo-slot-number">${slotNumber}</span>${fishIcon(item.species, fishAtlasUiUrl, beachFishAtlasUiUrl, "cargo-fish")}<div class="cargo-slot-copy"><strong>${FISH[item.species].name}</strong><small>${freshness}% fresh</small></div><button class="cargo-release" type="button" data-action="release" data-index="${index}" aria-label="Release ${FISH[item.species].name} from cargo"><span class="cargo-release-tooltip" aria-hidden="true">Release</span><span class="cargo-release-art" aria-hidden="true"><img class="cargo-bin-body" src="${binIconUrl}" alt="" /><img class="cargo-bin-lid" src="${binIconUrl}" alt="" /></span></button></article>`;
      }
      if (index < availableCargoSlots) {
        return `<div class="cargo-slot is-empty" aria-label="Cargo slot ${index + 1}: empty"><span class="cargo-slot-number">${slotNumber}</span><span class="ui-icon icon-cargo" aria-hidden="true"></span><small>Empty</small></div>`;
      }
      return `<button class="cargo-slot is-locked" type="button" data-action="open-cargo-upgrades" aria-label="Cargo slot ${index + 1} locked. Open Cargo upgrades"><span class="cargo-slot-number">${slotNumber}</span><img class="cargo-padlock" src="${padlockIconUrl}" alt="" aria-hidden="true" /><small>Upgrade</small></button>`;
    }).join("");
    const content = activeSection === "market"
      ? marketBoardMarkup(
          this.simulation,
          harborId,
          this.selectedMarketSpecies,
          this.marketDetailOpen,
          fishAtlasUiUrl,
          beachFishAtlasUiUrl,
        )
      : activeSection === "cargo"
        ? `<aside class="cargo-section" aria-labelledby="cargo-heading"><div class="cargo-inventory-heading"><h3 id="cargo-heading">Fish inventory</h3><span>${this.simulation.cargo.length} carried · ${availableCargoSlots} unlocked</span></div><div class="cargo-slot-grid" aria-label="Cargo inventory">${cargoMarkup}</div></aside>`
        : `<section class="services" aria-label="Dock services"><div class="service-grid">${this.upgradeCard("cargo", "Cargo", "+1 cargo slot")}${this.upgradeCard("engine", "Engine", "+11% speed")}${this.upgradeCard("lamp", "Lamp", "Wider night view")}${this.upgradeCard("line", "Line depth", "Next depth tier")}${this.boostCard()}${this.beachCard()}${harborId === "gloam" ? this.permitCard() : ""}</div></section>`;
    const tabs = `<nav class="harbor-tabs has-3-tabs" aria-label="Harbor sections" style="--harbor-tab-count: 3">${availableSections.map((section) => `<button class="harbor-tab ${activeSection === section ? "is-active" : ""}" type="button" data-action="harbor-section" data-harbor-section="${section}" aria-label="${capitalise(section)}" aria-pressed="${activeSection === section}"><span class="ui-icon icon-${HARBOR_SECTION_ICON[section]}" aria-hidden="true"></span><span>${capitalise(section)}</span></button>`).join("")}</nav>`;
    const mainFooterAction = activeSection === "market" && this.marketDetailOpen
      ? `<button class="leave-button market-footer-back" type="button" data-action="close-market-fish-detail" aria-label="Back to market"><span class="harbor-back-arrow" aria-hidden="true">←</span><strong>Back to market</strong></button>`
      : `<button class="leave-button" type="button" data-action="undock" aria-label="Back to ${this.simulation.world}"><span class="ui-icon icon-hull" aria-hidden="true"></span><strong>Return to ${capitalise(this.simulation.world)}</strong></button>`;
    return `<section class="screen-overlay harbor-screen is-first-voyage is-expanded-harbor is-harbor-${activeSection} is-dock-${harborId}" ${this.dockBackdropAttributes(harborId)} role="dialog" aria-labelledby="harbor-title">
      <div class="art-panel harbor-panel side-sheet market-harbor-panel">
        <header class="panel-heading harbor-header"><div class="harbor-title-block"><img class="wordmark harbor-wordmark" src="${wordmarkUrl}" alt="FSHING" /><span class="harbor-title-divider" aria-hidden="true"></span><div><h2 id="harbor-title">${harbor.name}</h2></div></div><span class="shell-balance" aria-label="${this.simulation.progress.money} shells"><span class="ui-icon icon-shells" aria-hidden="true"></span><strong>${this.simulation.progress.money}</strong></span></header>
        ${tabs}
        <div class="harbor-content is-${activeSection}">${content}</div>
        <footer class="panel-actions"><div><button class="text-button harbor-utility-button" type="button" data-action="open-help" aria-label="How to play"><span class="ui-icon icon-objective" aria-hidden="true"></span><strong>Help</strong></button></div>${mainFooterAction}</footer>
      </div>
    </section>`;
  }

  private dockBackdropAttributes(harborId: HarborId): string {
    const nightOpacity = nightVisualIntensity(this.simulation);
    const timeOfDay = nightOpacity >= 0.5 ? "night" : "day";
    const background = this.simulation.world === "beach"
      ? { day: beachChartUrl, night: beachChartNightUrl }
      : DOCK_BACKGROUND_URL[harborId];
    return `data-dock="${harborId}" data-time-of-day="${timeOfDay}" style="--dock-day-background: url(&quot;${background.day}&quot;); --dock-night-background: url(&quot;${background.night}&quot;); --dock-night-opacity: ${nightOpacity}"`;
  }

  private upgradeCard(upgrade: UpgradeId, title: string, detail: string): string {
    const tier = this.simulation.progress.upgrades[upgrade];
    const tierCap = upgradeTierCap(upgrade);
    const maximum = tier >= tierCap;
    const cost = upgradeCost(upgrade, tier);
    const displayLevel = Math.min(tier + 1, tierCap);
    return `<article class="service-card"><span class="ui-icon icon-${upgrade}" aria-hidden="true"></span><div class="service-copy"><h4>${title}</h4><p>${maximum ? "Maximum tier" : detail}</p></div>${this.upgradeMeter(title, displayLevel, tierCap)}<button class="service-purchase" type="button" data-action="buy-upgrade" data-upgrade="${upgrade}" aria-label="${maximum ? `${title} at maximum tier` : `Upgrade ${title} for ${cost} shells`}" ${maximum || this.simulation.progress.money < cost ? "disabled" : ""}>${maximum ? "<strong>MAX</strong>" : `<span class="ui-icon icon-shells" aria-hidden="true"></span><strong>${cost}</strong>`}</button></article>`;
  }

  private permitCard(): string {
    const unlocked = this.simulation.progress.outerUnlocked;
    return `<article class="service-card"><span class="ui-icon icon-permit" aria-hidden="true"></span><div class="service-copy"><h4>Outer permit</h4><p>Outer water access</p></div>${this.upgradeMeter("Outer permit", unlocked ? BALANCE.maxUpgradeTier : 0, BALANCE.maxUpgradeTier)}<button class="service-purchase" type="button" data-action="buy-permit" aria-label="${unlocked ? "Outer permit owned" : `Buy Outer permit for ${BALANCE.permitCost} shells`}" ${unlocked || this.simulation.progress.money < BALANCE.permitCost ? "disabled" : ""}>${unlocked ? "<strong>OWNED</strong>" : `<span class="ui-icon icon-shells" aria-hidden="true"></span><strong>${BALANCE.permitCost}</strong>`}</button></article>`;
  }

  private beachCard(): string {
    const unlocked = this.simulation.progress.beachUnlocked;
    const destination: WorldId = this.simulation.world === "beach" ? "lake" : "beach";
    const destinationName = capitalise(destination);
    if (unlocked) {
      const activeJob = this.simulation.activeContract !== null;
      return `<article class="service-card"><span class="ui-icon icon-objective" aria-hidden="true"></span><div class="service-copy"><h4>Beach</h4><p>${activeJob ? "Finish the active job before travelling" : "Surf club · pier · lighthouse"}</p></div><span class="service-owned" aria-label="Beach location unlocked">UNLOCKED</span><button class="service-purchase" type="button" data-action="travel-world" data-world="${destination}" aria-label="Travel to ${destinationName}" ${activeJob ? "disabled" : ""}><strong>${destination === "beach" ? "VISIT" : "RETURN"}</strong></button></article>`;
    }
    return `<article class="service-card"><span class="ui-icon icon-objective" aria-hidden="true"></span><div class="service-copy"><h4>Beach</h4><p>Unlock the seaside town</p></div><span class="service-owned" aria-label="One-time location unlock">LOCATION</span><button class="service-purchase" type="button" data-action="buy-beach" aria-label="Unlock Beach for ${BALANCE.beachAccessCost} shells" ${this.simulation.progress.money < BALANCE.beachAccessCost ? "disabled" : ""}><span class="ui-icon icon-shells" aria-hidden="true"></span><strong>${BALANCE.beachAccessCost}</strong></button></article>`;
  }

  private boostCard(): string {
    const unlocked = this.simulation.progress.boostUnlocked;
    return `<article class="service-card"><span class="ui-icon icon-engine" aria-hidden="true"></span><div class="service-copy"><h4>Engine boost</h4><p>${unlocked ? "Hold Shift to overclock" : "+35% speed until heat builds"}</p></div><span class="service-owned" aria-label="${unlocked ? "Engine boost owned" : "One-time unlock"}">${unlocked ? "OWNED" : "ABILITY"}</span><button class="service-purchase" type="button" data-action="buy-boost" aria-label="${unlocked ? "Engine boost owned" : `Unlock Engine boost for ${BALANCE.boostUnlockCost} shells`}" ${unlocked || this.simulation.progress.money < BALANCE.boostUnlockCost ? "disabled" : ""}>${unlocked ? "<strong>OWNED</strong>" : `<span class="ui-icon icon-shells" aria-hidden="true"></span><strong>${BALANCE.boostUnlockCost}</strong>`}</button></article>`;
  }

  private upgradeMeter(label: string, level: number, tierCap: number): string {
    return `<span class="upgrade-meter" aria-label="${label} level ${level} of ${tierCap}" style="--upgrade-tier-count: ${tierCap}">${Array.from({ length: tierCap }, (_, index) => `<i class="${index < level ? "is-filled" : ""}" aria-hidden="true"></i>`).join("")}</span>`;
  }

  private pauseScreen(): string {
    const returnClass = this.overlaySource === "settings" ? " is-settings-return" : "";
    return `
      <section class="screen-overlay pause-screen${returnClass}" role="dialog" aria-labelledby="pause-title">
        <div class="pause-menu">
          <img class="wordmark pause-wordmark" src="${wordmarkUrl}" alt="FSHING" />
          <h2 id="pause-title">Paused</h2>
          <div class="pause-actions">
            <button class="primary-button pause-resume-button" type="button" data-action="resume">
              <span class="title-play-icon" aria-hidden="true">▶</span>
              <strong>Resume</strong>
            </button>
            <div class="pause-secondary-actions">
              <button class="menu-button" type="button" data-action="open-settings"><strong>Settings</strong></button>
              <button class="menu-button" type="button" data-action="open-help"><strong>How to play</strong></button>
              <button class="menu-button" type="button" data-action="title"><strong>Title screen</strong></button>
            </div>
          </div>
        </div>
      </section>`;
  }

  private resetSaveSettingMarkup(): string {
    if (this.resetConfirming) {
      return `<div class="setting-option setting-reset is-confirming">
              <span class="setting-copy"><strong>Reset save?</strong><small>This clears progress and cannot be undone.</small></span>
              <div class="setting-reset-actions">
                <button type="button" data-action="cancel-reset-save">Cancel</button>
                <button type="button" data-action="reset-save">Reset</button>
              </div>
            </div>`;
    }
    return `<button class="setting-option settings-link setting-reset" type="button" data-action="confirm-reset-save">
              <span class="setting-copy"><strong>Reset save</strong><small>Clear progress and restart the tutorial.</small></span>
              <span class="menu-arrow" aria-hidden="true">→</span>
            </button>`;
  }

  private settingsScreen(): string {
    const settings = this.save.settings;
    const entryClass = [
      this.overlayEntering ? " is-entering" : "",
      this.overlayEntering && this.overlaySource === "title" ? " is-title-entry" : "",
    ].join("");
    return `
      <section class="screen-overlay settings-overlay${entryClass}" role="dialog" aria-labelledby="settings-title" tabindex="-1">
        <div class="settings-panel settings-menu">
          <img class="wordmark settings-wordmark" src="${wordmarkUrl}" alt="FSHING" />
          <header class="settings-heading">
            <h2 id="settings-title">Settings</h2>
          </header>
          <div class="settings-list">
            <label class="setting-option setting-toggle">
              <span class="setting-copy"><strong>Mute</strong><small>Silence all game audio.</small></span>
              <input class="setting-input" type="checkbox" data-setting="muted" ${settings.muted ? "checked" : ""}>
              <span class="setting-switch" aria-hidden="true"><span></span></span>
            </label>
            <label class="setting-option setting-volume">
              <span class="setting-copy"><strong>Volume</strong><small>Overall game volume.</small></span>
              <input type="range" min="0" max="1" step="0.05" value="${settings.volume}" data-setting="volume">
            </label>
            <label class="setting-option setting-toggle">
              <span class="setting-copy"><strong>High contrast</strong><small>Brighter shoals and stronger outlines.</small></span>
              <input class="setting-input" type="checkbox" data-setting="highContrast" ${settings.highContrast ? "checked" : ""}>
              <span class="setting-switch" aria-hidden="true"><span></span></span>
            </label>
            <label class="setting-option setting-toggle">
              <span class="setting-copy"><strong>Reduced motion</strong><small>Stops decorative pulses and drifting threats.</small></span>
              <input class="setting-input" type="checkbox" data-setting="reducedMotion" ${settings.reducedMotion ? "checked" : ""}>
              <span class="setting-switch" aria-hidden="true"><span></span></span>
            </label>
            <button class="setting-option settings-link" type="button" data-action="open-controls">
              <span class="setting-copy"><strong>Controls</strong><small>Review or rebind every action.</small></span>
              <span class="menu-arrow" aria-hidden="true">→</span>
            </button>
            ${this.resetSaveSettingMarkup()}
          </div>
          <button class="primary-button settings-done" type="button" data-action="back">
            <strong>Done</strong><span class="menu-arrow" aria-hidden="true">→</span>
          </button>
        </div>
      </section>`;
  }

  private creditsScreen(): string {
    const australianFlag = `
      <span class="credit-flag" aria-hidden="true">
        <span class="credit-flag-mast"></span>
        <svg class="credit-flag-cloth" viewBox="0 0 72 44" focusable="false">
          <path class="credit-flag-field" d="M2 3.5Q20 1 36 4t34-.5v34Q52 40 36 37.5T2 39Z" />
          <g class="credit-flag-union">
            <path d="M2 3.5Q18 2 35 3.8V21H2Z" fill="#092f6e" />
            <path d="M2 4l33 17M35 4L2 21" stroke="#fff" stroke-width="5" />
            <path d="M2 4l33 17M35 4L2 21" stroke="#e21d38" stroke-width="2" />
            <path d="M18.5 3v18M2 12.5h33" stroke="#fff" stroke-width="6" />
            <path d="M18.5 3v18M2 12.5h33" stroke="#e21d38" stroke-width="3" />
          </g>
          <g fill="#fff">
            <polygon transform="translate(18 30) scale(.55)" points="0,-10 1.91,-3.96 7.82,-6.23 4.29,-.98 9.75,2.23 3.44,2.74 4.34,9.01 0,4.4 -4.34,9.01 -3.44,2.74 -9.75,2.23 -4.29,-.98 -7.82,-6.23 -1.91,-3.96" />
            <polygon transform="translate(53 11) scale(.34)" points="0,-10 1.91,-3.96 7.82,-6.23 4.29,-.98 9.75,2.23 3.44,2.74 4.34,9.01 0,4.4 -4.34,9.01 -3.44,2.74 -9.75,2.23 -4.29,-.98 -7.82,-6.23 -1.91,-3.96" />
            <polygon transform="translate(61 21) scale(.34)" points="0,-10 1.91,-3.96 7.82,-6.23 4.29,-.98 9.75,2.23 3.44,2.74 4.34,9.01 0,4.4 -4.34,9.01 -3.44,2.74 -9.75,2.23 -4.29,-.98 -7.82,-6.23 -1.91,-3.96" />
            <polygon transform="translate(50 34) scale(.34)" points="0,-10 1.91,-3.96 7.82,-6.23 4.29,-.98 9.75,2.23 3.44,2.74 4.34,9.01 0,4.4 -4.34,9.01 -3.44,2.74 -9.75,2.23 -4.29,-.98 -7.82,-6.23 -1.91,-3.96" />
            <polygon transform="translate(42 22) scale(.34)" points="0,-10 1.91,-3.96 7.82,-6.23 4.29,-.98 9.75,2.23 3.44,2.74 4.34,9.01 0,4.4 -4.34,9.01 -3.44,2.74 -9.75,2.23 -4.29,-.98 -7.82,-6.23 -1.91,-3.96" />
            <polygon transform="translate(55 25) scale(.38)" points="0,-6 1.59,-2.18 5.71,-1.85 2.57,.83 3.53,4.85 0,2.7 -3.53,4.85 -2.57,.83 -5.71,-1.85 -1.59,-2.18" />
          </g>
        </svg>
      </span>`;
    return `
      <section class="screen-overlay credits-overlay" role="dialog" aria-labelledby="credits-title">
        <div class="credits-menu">
          <img class="wordmark credits-wordmark" src="${wordmarkUrl}" alt="FSHING" />
          <header class="credits-heading">
            <h2 id="credits-title">Credits</h2>
            <p>The crew behind FSHING</p>
          </header>
          <dl class="credits-list">
            <div class="credit-entry">
              <dt>${australianFlag}<span class="credit-name">Liam</span></dt>
              <dd>Game Designer <span>/</span> Programmer <span>/</span> Gameplay Tester</dd>
            </div>
            <div class="credit-entry">
              <dt>${australianFlag}<span class="credit-name">Saxon</span></dt>
              <dd>Game Designer <span>/</span> Visual Designer <span>/</span> Gameplay Tester</dd>
            </div>
            <div class="credit-entry">
              <dt>${australianFlag}<span class="credit-name">Harrison</span></dt>
              <dd>Story Writer <span>/</span> Documentation <span>/</span> Gameplay Tester</dd>
            </div>
            <div class="credit-entry">
              <dt>${australianFlag}<span class="credit-name">David</span></dt>
              <dd>Audio Designer <span>/</span> Marine Specialist <span>/</span> Gameplay Tester</dd>
            </div>
          </dl>
          <button class="primary-button credits-back" type="button" data-action="back"><span aria-hidden="true">←</span><strong>Back</strong></button>
        </div>
      </section>`;
  }

  private controlsScreen(): string {
    const rows = CONTROL_ACTIONS.map((action) => {
      const copy = CONTROL_LABELS[action];
      return `
        <div class="binding-row">
          <span><strong>${copy.label}</strong><small>${copy.detail}</small></span>
          <button class="binding-button" type="button" data-action="rebind" data-control-action="${action}" aria-label="Rebind ${copy.label}">${formatKey(this.save.settings.controls[action])}</button>
        </div>`;
    }).join("");
    return `
      <section class="screen-overlay controls-overlay" role="dialog" aria-labelledby="controls-title">
        <div class="controls-panel controls-menu">
          <img class="wordmark controls-wordmark" src="${wordmarkUrl}" alt="FSHING" />
          <header class="controls-heading">
            <h2 id="controls-title">Controls</h2>
            <p class="binding-help">Choose an action, then press its new key. Occupied keys swap actions.</p>
          </header>
          <div class="binding-list">${rows}</div>
          <div class="controls-actions">
            <button class="text-button" type="button" data-action="reset-controls">Reset defaults</button>
            <button class="primary-button controls-done" type="button" data-action="close-controls">Done</button>
          </div>
        </div>
      </section>`;
  }

  private helpScreen(): string {
    const harborId = this.simulation.dockedAt ?? "brindle";
    const steps = [
      {
        title: "Read the market",
        body: "Every discovered fish has a local quote. Select one to compare both harbors, read its seven-day graph, and see where it lives.",
      },
      {
        title: "Track and catch",
        body: `Track a listing, then use <kbd>${formatKey(this.save.settings.controls.left)}</kbd> and <kbd>${formatKey(this.save.settings.controls.right)}</kbd> to follow its marker. When the hook appears, press <kbd>${formatKey(this.save.settings.controls.action)}</kbd>.`,
      },
      {
        title: "Catch and protect",
        body: "Drop the line and steer the hook with the movement keys. Once caught, faster travel protects freshness and can change which harbor gives the better realised sale.",
      },
      {
        title: "Sell and invest",
        body: "Open a fish listing to sell every fresh catch of that species. A bigger cargo hold increases each trip's potential, while line upgrades reach more valuable fish.",
      },
    ];
    const step = steps[this.helpStep] ?? steps[0];
    const progress = steps.map((_, index) => `<span class="${index === this.helpStep ? "is-current" : ""}" aria-hidden="true"></span>`).join("");
    return `
      <section class="screen-overlay harbor-screen help-screen is-first-voyage is-dock-${harborId}" ${this.dockBackdropAttributes(harborId)} role="dialog" aria-labelledby="help-title">
        <div class="art-panel harbor-panel help-panel side-sheet">
          <header class="panel-heading harbor-header help-header">
            <div class="harbor-title-block"><img class="wordmark harbor-wordmark" src="${wordmarkUrl}" alt="FSHING" /><span class="harbor-title-divider" aria-hidden="true"></span><div><h2 id="help-title">How to play</h2></div></div>
          </header>
          <div class="help-content">
            <div class="help-progress">
              <span>Step <strong>${this.helpStep + 1}</strong> of ${steps.length}</span>
              <div class="help-progress-track" role="img" aria-label="Step ${this.helpStep + 1} of ${steps.length}">${progress}</div>
            </div>
            <article class="help-card" aria-live="polite">
              <span class="help-card-number" aria-hidden="true">${String(this.helpStep + 1).padStart(2, "0")}</span>
              <div><h3>${step.title}</h3><p>${step.body}</p></div>
            </article>
          </div>
          <footer class="help-footer">
            <nav class="help-navigation" aria-label="Instruction navigation">
              <button class="help-nav-button" type="button" data-action="help-previous" ${this.helpStep === 0 ? "disabled" : ""}><span aria-hidden="true">←</span> Previous</button>
              <button class="help-nav-button is-forward" type="button" data-action="help-next" ${this.helpStep === steps.length - 1 ? "disabled" : ""}>Next <span aria-hidden="true">→</span></button>
            </nav>
            <button class="leave-button help-back-button" type="button" data-action="back"><span class="harbor-back-arrow" aria-hidden="true">←</span><strong>Back</strong></button>
          </footer>
        </div>
      </section>`;
  }

  private seasonReportScreen(): string {
    return `
      <section class="screen-overlay sheet-overlay science-overlay" role="dialog" aria-labelledby="season-title">
        <div class="art-panel science-panel result-panel side-sheet">
          <span class="panel-eyebrow">End-of-season evaluation</span><h2 id="season-title">Research season complete</h2>
          <p>You completed ${this.simulation.progress.marketSales} market sales and earned ${this.simulation.progress.marketEarnings} shells. The exchange remains open after this report.</p>
          <div class="report-grid">
            <div><small>Species discovered</small><strong>${this.simulation.progress.discovered.length} / ${Object.keys(FISH).length}</strong><span>recorded this season</span></div>
            <div><small>Market sales</small><strong>${this.simulation.progress.marketSales}</strong><span>transactions completed</span></div>
            <div><small>Market earnings</small><strong>${this.simulation.progress.marketEarnings}</strong><span>shells earned from fish</span></div>
            <div><small>Current market day</small><strong>${this.simulation.progress.marketDay}</strong><span>daily prices observed</span></div>
          </div>
          <p class="reflection-prompt"><strong>Reflect:</strong> Which harbor offered the best sales? When was a longer crossing worth the freshness loss? Which habitat produced your strongest catch?</p>
          <button class="primary-button" type="button" data-action="continue-season">Continue trading</button>
        </div>
      </section>`;
  }

  private setOverlay(next: OverlayScreen, useSceneTransition = false): void {
    if (this.sceneTransitioning) {
      this.queuedOverlay = { next, useSceneTransition };
      return;
    }
    if (next === this.overlay) return;

    if (
      (this.overlay === "settings" || this.overlay === "credits")
      && (next === "title" || next === "pause")
      && this.overlayReturn === next
      && !this.save.settings.reducedMotion
    ) {
      if (this.menuTransitionTimer !== undefined) return;
      const menuScreen = this.uiRoot.querySelector<HTMLElement>(
        this.overlay === "settings" ? ".settings-overlay" : ".credits-overlay",
      );
      if (menuScreen) {
        menuScreen.classList.add("is-closing", `is-closing-to-${next}`);
        this.menuTransitionTimer = window.setTimeout(() => {
          this.menuTransitionTimer = undefined;
          this.commitOverlay(next);
        }, MENU_EXIT_DURATION);
        return;
      }
    }

    if (this.menuTransitionTimer !== undefined) {
      window.clearTimeout(this.menuTransitionTimer);
      this.menuTransitionTimer = undefined;
    }

    if (this.overlay === "pause" && next === null && !this.save.settings.reducedMotion) {
      if (this.pauseTransitionTimer !== undefined) return;
      const pauseScreen = this.uiRoot.querySelector<HTMLElement>(".pause-screen");
      if (pauseScreen) {
        pauseScreen.classList.add("is-closing");
        this.pauseTransitionTimer = window.setTimeout(() => {
          this.pauseTransitionTimer = undefined;
          this.commitOverlay(null);
        }, PAUSE_EXIT_DURATION);
        return;
      }
    }

    if (this.pauseTransitionTimer !== undefined) {
      window.clearTimeout(this.pauseTransitionTimer);
      this.pauseTransitionTimer = undefined;
    }

    if (!useSceneTransition || this.save.settings.reducedMotion) {
      this.commitOverlay(next);
      return;
    }

    const transition = this.uiRoot.querySelector<HTMLElement>("#scene-transition");
    if (!transition) {
      this.commitOverlay(next);
      return;
    }

    this.sceneTransitioning = true;
    this.sceneTransitionTarget = next;
    transition.className = "scene-transition is-covering";
    window.setTimeout(() => {
      this.commitOverlay(next);
      transition.className = "scene-transition is-revealing";
      window.setTimeout(() => {
        transition.className = "scene-transition";
        this.sceneTransitioning = false;
        this.sceneTransitionTarget = undefined;
        const queuedOverlay = this.queuedOverlay;
        this.queuedOverlay = null;
        if (queuedOverlay && queuedOverlay.next !== this.overlay) {
          this.setOverlay(queuedOverlay.next, queuedOverlay.useSceneTransition);
        }
      }, SCENE_REVEAL_DURATION);
    }, SCENE_COVER_DURATION);
  }

  private commitOverlay(next: OverlayScreen): void {
    const wasPlaying = this.started && this.overlay === null;
    const willPlay = this.started && next === null;
    this.overlaySource = this.overlay;
    this.overlay = next;
    this.overlayEntering = true;
    if (next !== "settings") this.resetConfirming = false;
    if (wasPlaying && !willPlay) this.platform.gameplayStop();
    if (!wasPlaying && willPlay) this.platform.gameplayStart();
    this.renderOverlay();
    this.overlayEntering = false;
    this.refreshHud();
    if (next !== null) {
      requestAnimationFrame(() => {
        if (next === "settings") {
          this.uiRoot.querySelector<HTMLElement>(".settings-overlay")?.focus({ preventScroll: true });
          return;
        }
        this.uiRoot.querySelector<HTMLElement>("#overlay-host button")?.focus({ preventScroll: true });
      });
    }
  }

  private replaceResetSaveSetting(): void {
    const current = this.uiRoot.querySelector(".setting-reset");
    if (!current) {
      this.renderOverlay();
      return;
    }
    const template = document.createElement("template");
    template.innerHTML = this.resetSaveSettingMarkup().trim();
    const next = template.content.firstElementChild;
    if (next) current.replaceWith(next);
  }

  private resetSave(): void {
    this.resetConfirming = false;
    this.save.progress = defaultSave().progress;
    saveGame(this.platform.saveStorage, this.save);
    this.simulation = createSimulation(7, this.save.progress);
    this.previousRenderMotion = captureRenderMotion(this.simulation);
    this.started = false;
    this.harborSection = "market";
    this.selectedMarketSpecies = "bluegill";
    this.marketDetailOpen = false;
    this.seasonReportQueued = false;
    this.pendingCargoRelease = null;
    this.questGuide = null;
    this.lastQuestMarkup = "";
    this.overlayReturn = "title";
    this.replaceResetSaveSetting();
    this.refreshHud();
    this.refreshQuestGuide();
    this.showToast("Save reset. Play to start the first assignment.");
  }

  private beginVoyage(): void {
    this.started = true;
    this.harborSection = "market";
    this.marketDetailOpen = false;
    if (this.simulation.dockedAt) this.setOverlay("harbor", true);
    else this.setOverlay(null, true);
  }

  private openHarborSection(section: HarborSection): void {
    const sectionOrder: HarborSection[] = ["market", "cargo", "services"];
    const previousIndex = sectionOrder.indexOf(this.harborSection);
    const nextIndex = sectionOrder.indexOf(section);
    this.harborSection = section;
    this.marketDetailOpen = false;
    if (section === "services") {
      const previousUpgradeStep = this.simulation.progress.upgradeTutorialStep;
      noteUpgradeServicesOpened(this.simulation);
      if (previousUpgradeStep !== this.simulation.progress.upgradeTutorialStep) this.syncSave();
    }
    this.renderOverlay();

    const content = this.uiRoot.querySelector<HTMLElement>(".harbor-content");
    if (content && previousIndex !== nextIndex) {
      content.classList.add(nextIndex > previousIndex ? "is-entering-forward" : "is-entering-backward");
    }
    requestAnimationFrame(() => {
      this.uiRoot.querySelector<HTMLButtonElement>(`[data-harbor-section="${section}"]`)?.focus({ preventScroll: true });
    });
  }

  private syncSave(): void {
    this.save.progress = {
      money: this.simulation.progress.money,
      upgrades: { ...this.simulation.progress.upgrades },
      outerUnlocked: this.simulation.progress.outerUnlocked,
      beachUnlocked: this.simulation.progress.beachUnlocked,
      boostUnlocked: this.simulation.progress.boostUnlocked,
      completedContracts: this.simulation.progress.completedContracts,
      discovered: [...this.simulation.progress.discovered],
      learning: { ...this.simulation.progress.learning },
      marketDay: this.simulation.progress.marketDay,
      marketSales: this.simulation.progress.marketSales,
      marketEarnings: this.simulation.progress.marketEarnings,
      marketTarget: this.simulation.progress.marketTarget,
      marketTutorialStep: this.simulation.progress.marketTutorialStep,
      upgradeTutorialStep: this.simulation.progress.upgradeTutorialStep,
      seasonCompleted: this.simulation.progress.seasonCompleted,
    };
    saveGame(this.platform.saveStorage, this.save);
  }

  private applySettings(): void {
    document.body.classList.toggle("high-contrast", this.save.settings.highContrast);
    document.body.classList.toggle("reduced-motion", this.save.settings.reducedMotion);
    this.feedback.updateSettings(this.save.settings);
  }

  private pulseFeedback(cue: FeedbackCue): void {
    const flash = this.uiRoot.querySelector<HTMLElement>("#feedback-flash");
    if (!flash) return;
    flash.className = "feedback-flash";
    void flash.offsetWidth;
    flash.classList.add(`is-${cue}`);
  }

  private showToast(message: string): void {
    const toast = this.uiRoot.querySelector<HTMLElement>("#toast");
    if (!toast) return;
    window.clearTimeout(this.toastTimer);
    this.pendingCargoRelease = null;
    toast.classList.remove("has-action");
    toast.textContent = message;
    toast.classList.add("is-visible");
    this.toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), this.save.settings.reducedMotion ? 4_500 : 3_200);
  }

  private showCargoReleaseToast(species: FishSpecies, focusUndo: boolean): void {
    const toast = this.uiRoot.querySelector<HTMLElement>("#toast");
    if (!toast) return;
    window.clearTimeout(this.toastTimer);
    const message = document.createElement("span");
    message.textContent = `${FISH[species].name} released to the lake.`;
    const undo = document.createElement("button");
    undo.className = "toast-undo";
    undo.type = "button";
    undo.dataset.action = "undo-release";
    undo.textContent = "Undo";
    toast.replaceChildren(message, undo);
    toast.classList.add("is-visible", "has-action");
    const dismiss = (): void => {
      if (document.activeElement === undo) {
        this.toastTimer = window.setTimeout(dismiss, 1_000);
        return;
      }
      this.pendingCargoRelease = null;
      toast.classList.remove("is-visible", "has-action");
      toast.replaceChildren();
    };
    this.toastTimer = window.setTimeout(dismiss, 5_000);
    if (focusUndo) requestAnimationFrame(() => undo.focus({ preventScroll: true }));
  }

  private dismissCargoReleaseToast(): void {
    if (!this.pendingCargoRelease) return;
    window.clearTimeout(this.toastTimer);
    this.pendingCargoRelease = null;
    const toast = this.uiRoot.querySelector<HTMLElement>("#toast");
    toast?.classList.remove("is-visible", "has-action");
    toast?.replaceChildren();
  }

  private releaseCargoWithFeedback(target: HTMLElement, index: number, focusUndo: boolean): void {
    const item = this.simulation.cargo[index];
    if (!item) return;
    const finishRelease = (): void => {
      if (!releaseCargo(this.simulation, index)) return;
      this.handleSimulationEvents();
      this.pendingCargoRelease = { item: { ...item }, index };
      this.renderOverlay();
      this.showCargoReleaseToast(item.species, focusUndo);
    };
    window.clearTimeout(this.cargoReleaseTimer);
    if (this.save.settings.reducedMotion) {
      finishRelease();
      return;
    }
    target.closest<HTMLElement>(".cargo-slot")?.classList.add("is-releasing");
    if (target instanceof HTMLButtonElement) target.disabled = true;
    this.cargoReleaseTimer = window.setTimeout(finishRelease, 180);
  }

  private showDeliveryNotification(message: string, closeLabel: string): void {
    const notification = this.uiRoot.querySelector<HTMLElement>("#delivery-notification");
    if (!notification) return;
    const notificationText = notification.querySelector<HTMLElement>("strong");
    const closeButton = notification.querySelector<HTMLButtonElement>(".delivery-success-close");
    if (notificationText) notificationText.textContent = message;
    if (closeButton) closeButton.ariaLabel = closeLabel;
    notification.classList.toggle("is-accepted", message === "Delivery Accepted");
    window.clearTimeout(this.deliveryNotificationTimer);
    window.clearTimeout(this.deliveryNotificationExitTimer);
    notification.hidden = false;
    notification.classList.remove("is-visible", "is-dismissing");
    void notification.offsetWidth;
    notification.classList.add("is-visible");
    this.deliveryNotificationTimer = window.setTimeout(
      () => this.dismissDeliveryNotification(),
      DELIVERY_NOTIFICATION_DURATION,
    );
  }

  private dismissDeliveryNotification(): void {
    const notification = this.uiRoot.querySelector<HTMLElement>("#delivery-notification");
    if (!notification || notification.hidden) return;
    window.clearTimeout(this.deliveryNotificationTimer);
    window.clearTimeout(this.deliveryNotificationExitTimer);
    notification.classList.remove("is-visible");
    notification.classList.add("is-dismissing");
    this.deliveryNotificationExitTimer = window.setTimeout(() => {
      notification.hidden = true;
      notification.classList.remove("is-dismissing");
    }, this.save.settings.reducedMotion ? 0 : DELIVERY_NOTIFICATION_EXIT_DURATION);
  }

  private readonly onClick = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!target || target instanceof HTMLButtonElement && target.disabled) return;
    const action = target.dataset.action;
    this.feedback.cue("ui");
    switch (action) {
      case "dismiss-delivery-notification":
        this.dismissDeliveryNotification();
        break;
      case "start": this.beginVoyage(); break;
      case "confirm-reset-save":
        this.resetConfirming = true;
        this.replaceResetSaveSetting();
        break;
      case "cancel-reset-save":
        this.resetConfirming = false;
        this.replaceResetSaveSetting();
        break;
      case "reset-save":
        if (!this.resetConfirming) break;
        this.resetSave();
        break;
      case "interact": this.handleInteract(); break;
      case "resume": this.setOverlay(null); break;
      case "open-settings": this.overlayReturn = this.overlay; this.setOverlay("settings"); break;
      case "open-credits": this.overlayReturn = this.overlay; this.setOverlay("credits"); break;
      case "open-controls": this.setOverlay("controls"); break;
      case "close-controls": this.setOverlay("settings"); break;
      case "reset-controls":
        this.save.settings.controls = { ...DEFAULT_CONTROL_BINDINGS };
        this.input.setControlBindings(this.save.settings.controls);
        saveGame(this.platform.saveStorage, this.save);
        this.renderOverlay();
        this.showToast("Controls reset to defaults.");
        break;
      case "rebind": {
        const controlAction = target.dataset.controlAction as ControlAction | undefined;
        if (!controlAction || !CONTROL_ACTIONS.includes(controlAction)) break;
        target.classList.add("is-listening");
        target.textContent = "Press a key…";
        this.input.beginRebind(controlAction, (code) => {
          if (code && isBindableCode(code)) {
            this.save.settings.controls = rebindControl(this.save.settings.controls, controlAction, code);
            this.input.setControlBindings(this.save.settings.controls);
            saveGame(this.platform.saveStorage, this.save);
          } else if (code) {
            this.showToast("That key cannot be assigned.");
          }
          this.renderOverlay();
        });
        break;
      }
      case "open-help":
        this.helpStep = 0;
        this.overlayReturn = this.overlay;
        this.setOverlay("help");
        break;
      case "help-previous":
        this.helpStep = Math.max(0, this.helpStep - 1);
        this.renderOverlay();
        requestAnimationFrame(() => {
          const nextFocus = this.helpStep === 0 ? "help-next" : "help-previous";
          this.uiRoot.querySelector<HTMLButtonElement>(`[data-action="${nextFocus}"]`)?.focus();
        });
        break;
      case "help-next":
        this.helpStep = Math.min(HELP_STEP_COUNT - 1, this.helpStep + 1);
        this.renderOverlay();
        requestAnimationFrame(() => {
          const nextFocus = this.helpStep === HELP_STEP_COUNT - 1 ? "help-previous" : "help-next";
          this.uiRoot.querySelector<HTMLButtonElement>(`[data-action="${nextFocus}"]`)?.focus();
        });
        break;
      case "back": this.setOverlay(this.overlayReturn); break;
      case "title": this.started = false; this.setOverlay("title", true); break;
      case "harbor-section": {
        const section = target.dataset.harborSection as HarborSection | undefined;
        if (!section || !(["market", "cargo", "services"] as HarborSection[]).includes(section)) break;
        this.openHarborSection(section);
        break;
      }
      case "select-market-fish": {
        const species = target.dataset.species as FishSpecies | undefined;
        if (!species || !(species in FISH)) break;
        this.selectedMarketSpecies = species;
        this.marketDetailOpen = true;
        inspectMarketSpecies(this.simulation, species);
        this.syncSave();
        this.renderOverlay();
        this.refreshQuestGuide();
        requestAnimationFrame(() => {
          this.uiRoot.querySelector<HTMLButtonElement>(`[data-action="track-market-fish"][data-species="${species}"]`)?.focus({ preventScroll: true });
        });
        break;
      }
      case "close-market-fish-detail": {
        if (this.selectedMarketSpecies) {
          closeMarketSpeciesDetail(this.simulation, this.selectedMarketSpecies);
          this.syncSave();
        }
        this.marketDetailOpen = false;
        this.renderOverlay();
        this.refreshQuestGuide();
        requestAnimationFrame(() => {
          this.uiRoot.querySelector<HTMLButtonElement>(`[data-action="select-market-fish"][data-species="${this.selectedMarketSpecies}"]`)?.focus({ preventScroll: true });
        });
        break;
      }
      case "track-market-fish": {
        const species = target.dataset.species as FishSpecies | undefined;
        const untracking = species !== undefined && this.simulation.progress.marketTarget === species;
        if (!species || !(species in FISH) || !trackMarketSpecies(this.simulation, species)) break;
        this.selectedMarketSpecies = species;
        this.syncSave();
        this.renderOverlay();
        this.refreshQuestGuide();
        this.showToast(untracking
          ? `${FISH[species].name} untracked.`
          : `${FISH[species].name} tracked. The navigation marker now points to its fishing ground.`);
        break;
      }
      case "sell-market-fish": {
        const species = target.dataset.species as FishSpecies | undefined;
        if (!species || !(species in FISH)) break;
        if (sellSpeciesAtMarket(this.simulation, species)) {
          this.handleSimulationEvents();
          this.renderOverlay();
          this.refreshQuestGuide();
        }
        break;
      }
      case "sell-all-market-fish":
        if (sellAllFishAtMarket(this.simulation)) {
          this.handleSimulationEvents();
          this.renderOverlay();
          this.refreshQuestGuide();
        }
        break;
      case "finish-market-tutorial":
        finishMarketTutorial(this.simulation);
        this.syncSave();
        this.refreshQuestGuide();
        break;
      case "skip-market-tutorial":
        skipMarketTutorial(this.simulation);
        this.syncSave();
        this.renderOverlay();
        this.refreshQuestGuide();
        break;
      case "open-cargo-upgrades": {
        const openCargoUpgrade = (): void => {
          if (this.overlay !== "harbor" || !this.simulation.dockedAt) return;
          this.openHarborSection("services");
        };
        window.clearTimeout(this.cargoUpgradeTransitionTimer);
        if (this.save.settings.reducedMotion) {
          openCargoUpgrade();
        } else {
          target.classList.add("is-wobbling");
          if (target instanceof HTMLButtonElement) target.disabled = true;
          this.cargoUpgradeTransitionTimer = window.setTimeout(openCargoUpgrade, 240);
        }
        break;
      }
      case "undock":
        this.dismissCargoReleaseToast();
        undock(this.simulation);
        if (this.visualTestSpot) {
          try {
            moveBoatForTesting(this.simulation, spotById(this.visualTestSpot));
          } catch {
            // Ignore malformed development-only visual test parameters.
          }
        }
        this.setOverlay(null, true);
        break;
      case "continue-season": this.harborSection = "market"; this.marketDetailOpen = false; this.setOverlay("harbor"); break;
      case "buy-upgrade": {
        const upgrade = target.dataset.upgrade as UpgradeId | undefined;
        if (upgrade && buyUpgrade(this.simulation, upgrade)) {
          this.handleSimulationEvents();
          this.renderOverlay();
        }
        break;
      }
      case "buy-permit":
        if (buyPermit(this.simulation)) {
          this.handleSimulationEvents();
          this.renderOverlay();
        }
        break;
      case "buy-boost":
        if (buyBoost(this.simulation)) {
          this.handleSimulationEvents();
          this.renderOverlay();
        }
        break;
      case "buy-beach":
        if (buyBeachAccess(this.simulation)) {
          this.handleSimulationEvents();
          this.renderOverlay();
        }
        break;
      case "travel-world": {
        const world = target.dataset.world as WorldId | undefined;
        if (world && travelToWorld(this.simulation, world)) {
          this.setOverlay(null, true);
          this.showToast(world === "beach" ? "Welcome to Beach." : "Returned to the lake.");
        }
        break;
      }
      case "release": {
        const index = Number(target.dataset.index);
        this.releaseCargoWithFeedback(target, index, event.detail === 0);
        break;
      }
      case "undo-release": {
        const released = this.pendingCargoRelease;
        if (!released || !restoreCargo(this.simulation, released.item, released.index)) break;
        window.clearTimeout(this.toastTimer);
        this.pendingCargoRelease = null;
        this.renderOverlay();
        this.showToast(`${FISH[released.item.species].name} returned to cargo.`);
        requestAnimationFrame(() => {
          this.uiRoot.querySelector<HTMLButtonElement>(`.cargo-release[data-index="${released.index}"]`)?.focus({ preventScroll: true });
        });
        break;
      }
    }
  };

  private exitFishing(): void {
    if (this.simulation.mode !== "fishing"
      || this.simulation.fishing?.reeling
      || this.simulation.fishing?.exitingAt !== null) return;
    this.feedback.cue("cast");
    if (this.save.settings.reducedMotion) leaveFishing(this.simulation);
    else beginFishingExit(this.simulation);
    this.refreshHud();
  }

  private readonly onChange = (event: Event): void => {
    const input = (event.target as HTMLElement).closest<HTMLInputElement>("[data-setting]");
    if (!input) return;
    const setting = input.dataset.setting;
    if (setting === "volume") this.save.settings.volume = Number(input.value);
    if (setting === "muted") this.save.settings.muted = input.checked;
    if (setting === "highContrast") this.save.settings.highContrast = input.checked;
    if (setting === "reducedMotion") this.save.settings.reducedMotion = input.checked;
    this.applySettings();
    saveGame(this.platform.saveStorage, this.save);
  };

  private readonly onFocusLost = (): void => {
    if (this.started && this.overlay === null) {
      this.setOverlay("pause");
      this.showToast("Paused because the game lost focus.");
    }
  };

  private readonly onVisibilityChanged = (): void => {
    if (document.hidden) this.onFocusLost();
  };

  private installTestingBridge(): void {
    if (!import.meta.env.DEV || !new URLSearchParams(window.location.search).has("e2e")) return;
    window.__FSHING_TEST__ = {
      sailToSpot: (id) => moveBoatForTesting(this.simulation, spotById(id)),
      sailToHarbor: (id) => moveBoatForTesting(this.simulation, harborById(id)),
      previewFishing: (id, species) => {
        const spot = spotById(id);
        this.simulation.progress.upgrades.line = spot.requiredDepthTier;
        this.simulation.progress.outerUnlocked = true;
        if (!this.simulation.progress.discovered.includes(species)) {
          this.simulation.progress.discovered.push(species);
        }
        this.simulation.progress.marketTarget = species;
        if (this.simulation.activeContract) {
          this.simulation.activeContract.spot = id;
          this.simulation.activeContract.species = species;
        }
        moveBoatForTesting(this.simulation, spot);
        startFishing(this.simulation, id);
        this.setOverlay(null);
        this.refreshHud();
      },
      catchSpecies: (species) => {
        resolveCatch(this.simulation, species);
        this.handleSimulationEvents();
        this.refreshHud();
      },
      grantMoney: (amount) => {
        this.simulation.progress.money = Math.max(0, this.simulation.progress.money + Math.max(0, Math.floor(amount)));
        syncUpgradeTutorial(this.simulation);
        this.syncSave();
        this.refreshHud();
        if (this.overlay === "harbor") this.renderOverlay();
      },
      discoverAllFish: () => {
        for (const species of Object.keys(FISH) as FishSpecies[]) {
          if (!this.simulation.progress.discovered.includes(species)) {
            this.simulation.progress.discovered.push(species);
          }
        }
        this.syncSave();
        this.renderOverlay();
      },
      hookSpecies: (species) => {
        const target = this.simulation.fishing?.targets.find((candidate) => candidate.species === species);
        if (!this.simulation.fishing || !target) return;
        this.simulation.fishing.hook = { x: target.x, y: target.y };
        updateSimulation(this.simulation, { travel: 0, hookX: 0, hookY: 0, boost: false }, 0);
        this.refreshHud();
      },
      damage: (amount) => {
        damageBoat(this.simulation, amount);
        this.handleSimulationEvents();
      },
      setElapsed: (seconds) => {
        this.simulation.elapsed = Math.max(0, seconds);
        this.refreshHud();
      },
      elapsed: () => this.simulation.elapsed,
      mode: () => this.simulation.mode,
      boatX: () => this.simulation.boat.x,
      facing: () => this.simulation.boat.facing,
      world: () => this.simulation.world,
    };
  }
}

function upgradeName(upgrade: UpgradeId): string {
  return { cargo: "Boat and cargo", engine: "Engine", lamp: "Lamp", line: "Line depth" }[upgrade];
}

function capitalise(value: string): string {
  return value.length === 0 ? value : `${value[0]?.toUpperCase()}${value.slice(1)}`;
}

function preloadImage(source: string): Promise<void> {
  const image = new Image();
  image.decoding = "async";
  return new Promise<void>((resolve, reject) => {
    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener("error", () => reject(new Error(`Failed to load interface art: ${source}`)), { once: true });
    image.src = source;
  });
}
