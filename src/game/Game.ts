import wordmarkUrl from "../assets/fshing-wordmark.png";
import padlockIconUrl from "../assets/padlock-icon.png";
import uiButtonUrl from "../assets/ui-button.png";
import uiIconsUrl from "../assets/ui-icons.png";
import uiPanelUrl from "../assets/ui-panel.png";
import { FeedbackService, type FeedbackCue } from "../services/feedbackService";
import type { PlatformService } from "../services/platformService";
import { saveGame, type SaveData } from "../services/saveGame";
import {
  BALANCE,
  FISH,
  REGIONS,
  harborById,
  spotById,
  upgradeTierCap,
  type FishSpecies,
  type HarborId,
  type SpotId,
  type UpgradeId,
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
import { CanvasRenderer } from "./renderer";
import {
  acceptAvailableContract,
  buyPermit,
  buyUpgrade,
  cargoCapacity,
  chooseRoute,
  consumeEvents,
  createSimulation,
  damageBoat,
  dayProgress,
  deliverContract,
  getInteractionPrompt,
  interact,
  isNight,
  learningAccuracy,
  moveBoatForTesting,
  recordSurvey,
  releaseCargo,
  resolveCatch,
  startFishing,
  tutorialPrompt,
  undock,
  updateSimulation,
  upgradeCost,
  type Simulation,
  type SimulationEvent,
} from "./simulation";
import {
  FISH_SCIENCE,
  WATER_READINGS,
  averagePopulation,
  populationLabel,
  surveyChoices,
  type SurveyResult,
} from "./stem";

const FIXED_STEP = 1 / 120;
const MAX_FRAME = 0.05;
const UI_REFRESH_INTERVAL = 100;
const HELP_STEP_COUNT = 5;
const PAUSE_EXIT_DURATION = 340;
const SETTINGS_EXIT_DURATION = 340;
const SCENE_COVER_DURATION = 120;
const SCENE_REVEAL_DURATION = 160;

type OverlayScreen =
  | "title"
  | "harbor"
  | "pause"
  | "settings"
  | "controls"
  | "help"
  | "survey"
  | "deliveryResult"
  | "fieldGuide"
  | "seasonReport"
  | null;

type HarborSection = "delivery" | "cargo" | "services";

const HARBOR_SECTION_ICON: Record<HarborSection, string> = {
  delivery: "objective",
  cargo: "cargo",
  services: "repair",
};

declare global {
  interface Window {
    __FSHING_TEST__?: {
      sailToSpot(id: SpotId): void;
      sailToHarbor(id: HarborId): void;
      catchSpecies(species: FishSpecies): void;
      damage(amount: number): void;
      boatX(): number;
      facing(): -1 | 1;
    };
  }
}

export class Game {
  private readonly renderer: CanvasRenderer;
  private readonly input: InputController;
  private readonly feedback: FeedbackService;
  private readonly simulation: Simulation;
  private lastTime = 0;
  private accumulator = 0;
  private lastUiRefresh = 0;
  private started = false;
  private overlay: OverlayScreen = "title";
  private overlaySource: OverlayScreen = null;
  private overlayReturn: OverlayScreen = "pause";
  private harborSection: HarborSection = "delivery";
  private helpStep = 0;
  private toastTimer: number | undefined;
  private tutorialDismissTimer: number | undefined;
  private pauseTransitionTimer: number | undefined;
  private settingsTransitionTimer: number | undefined;
  private cargoUpgradeTransitionTimer: number | undefined;
  private sceneTransitioning = false;
  private sceneTransitionTarget: OverlayScreen | undefined;
  private queuedOverlay: { next: OverlayScreen; useSceneTransition: boolean } | null = null;
  private dismissedTutorialText: string | null = null;
  private pendingSpot: SpotId | null = null;
  private surveyResult: SurveyResult | null = null;
  private seasonReportQueued = false;
  private readonly interfaceReady = Promise.all([
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

    if (this.input.consumePause() && this.started) {
      if (this.overlay === null || this.sceneTransitioning && this.sceneTransitionTarget === null) this.setOverlay("pause");
      else if (this.overlay === "pause") this.setOverlay(null);
    }

    if (this.started && this.overlay === null && !this.sceneTransitioning) {
      while (this.accumulator >= FIXED_STEP) {
        updateSimulation(this.simulation, this.input.read(), FIXED_STEP);
        this.accumulator -= FIXED_STEP;
      }
      if (this.input.consumeAction()) this.handleInteract();
      this.handleSimulationEvents();
    } else {
      this.accumulator = 0;
      this.input.consumeAction();
    }

    const engineMaximum = BALANCE.maxSurfaceSpeed * (1 + this.simulation.progress.upgrades.engine * 0.11);
    const currentInput = this.input.read();
    this.feedback.updateEngine(
      Math.abs(this.simulation.boat.speed) / engineMaximum,
      currentInput.boost,
      this.started && this.overlay === null && !this.sceneTransitioning && this.simulation.mode === "cruising",
    );
    this.renderer.render(this.simulation, {
      ...this.save.settings,
      cinematic: this.overlay === "title"
        || (this.overlay === "settings" || this.overlay === "controls") && this.overlayReturn === "title",
    });
    if (time - this.lastUiRefresh >= UI_REFRESH_INTERVAL) {
      this.refreshHud();
      this.lastUiRefresh = time;
    }
    requestAnimationFrame((nextTime) => this.frame(nextTime));
  }

  private buildUi(): void {
    this.uiRoot.innerHTML = `
      <div class="game-ui">
        <button class="tutorial-callout" id="tutorial-callout" type="button" data-action="dismiss-tutorial" title="Dismiss instruction" hidden>
          <span class="tutorial-label" aria-hidden="true">Next</span>
          <span class="tutorial-message" aria-live="polite"></span>
        </button>
        <output class="toast" id="toast" aria-live="polite"></output>
        <div class="feedback-flash" id="feedback-flash" aria-hidden="true"></div>

        <button class="context-action" id="context-action" type="button" data-action="interact" data-control="action" hidden>Interact</button>

        <section class="touch-controls navigation-controls" aria-label="Touch boat controls">
          <div class="travel-controls">
            <button type="button" data-control="left" aria-label="Move left"><span>←</span><small>LEFT</small></button>
            <button type="button" data-control="brake" aria-label="Brake"><span>■</span><small>BRAKE</small></button>
            <button type="button" data-control="right" aria-label="Move right"><span>→</span><small>RIGHT</small></button>
          </div>
          <button class="boost-control" type="button" data-control="boost" aria-label="Engine boost"><span>↑</span><small>BOOST</small></button>
          <button class="touch-action" type="button" data-control="action" aria-label="Interact or cast"><span>E</span><small>ACT</small></button>
        </section>

        <section class="touch-controls fishing-controls" aria-label="Touch hook controls" hidden>
          <div class="hook-pad" data-hook-pad aria-label="Drag to steer the hook"><span></span></div>
          <button class="leave-fishing" type="button" data-action="leave-fishing">Leave fishing</button>
        </section>

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
    this.input.bindVirtualControls(this.uiRoot);
    this.renderOverlay();
    this.refreshHud();
  }

  private handleInteract(): void {
    if (this.simulation.mode === "fishing") return;
    const prompt = getInteractionPrompt(this.simulation);
    if (prompt?.kind === "fishing" && prompt.enabled && prompt.spot) {
      this.pendingSpot = prompt.spot;
      this.surveyResult = null;
      this.setOverlay("survey");
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
  }

  private handleEvent(event: SimulationEvent): void {
    switch (event.type) {
      case "caught":
        this.feedback.cue("catch");
        this.pulseFeedback("catch");
        if (
          this.simulation.activeContract?.species === event.species
          && !this.simulation.routeChoice
        ) {
          chooseRoute(this.simulation, "fast");
        }
        this.showToast(`${FISH[event.species].name} secured. Freshness is falling.`);
        break;
      case "delivered":
        this.feedback.cue("delivery");
        this.pulseFeedback("delivery");
        this.showToast(`Delivery complete · +${event.payment} shells`);
        this.setOverlay("deliveryResult");
        break;
      case "docked":
        this.feedback.cue("dock");
        this.harborSection = "delivery";
        this.setOverlay("harbor");
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
        this.harborSection = "delivery";
        this.setOverlay("harbor");
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
      case "population-protected":
        this.feedback.cue("deny");
        this.showToast(`${FISH[event.species].name} is protected while its population recovers.`);
        break;
      case "released":
        this.showToast(`${FISH[event.species].name} released · population +${event.restored}`);
        break;
      case "season-complete":
        this.seasonReportQueued = true;
        break;
    }
  }

  private refreshHud(): void {
    const simulation = this.simulation;

    const tutorial = this.uiRoot.querySelector<HTMLElement>("#tutorial-callout");
    const tutorialText = tutorialPrompt(simulation);
    if (tutorial) {
      if (this.dismissedTutorialText && tutorialText !== this.dismissedTutorialText) {
        this.dismissedTutorialText = null;
      }
      const tutorialMessage = tutorial.querySelector<HTMLElement>(".tutorial-message");
      if (tutorialMessage) tutorialMessage.textContent = tutorialText ?? "";
      const shouldShow = Boolean(tutorialText) && this.overlay === null && tutorialText !== this.dismissedTutorialText;
      if (shouldShow) {
        window.clearTimeout(this.tutorialDismissTimer);
        tutorial.classList.remove("is-dismissing");
        tutorial.hidden = false;
      } else if (!tutorial.classList.contains("is-dismissing")) {
        tutorial.hidden = true;
      }
    }

    const action = this.uiRoot.querySelector<HTMLButtonElement>("#context-action");
    const prompt = getInteractionPrompt(simulation);
    if (action) {
      action.hidden = !prompt || this.overlay !== null || simulation.mode === "fishing";
      action.disabled = prompt ? !prompt.enabled : true;
      action.textContent = prompt?.label ?? "Interact";
    }

    const navigation = this.uiRoot.querySelector<HTMLElement>(".navigation-controls");
    const fishing = this.uiRoot.querySelector<HTMLElement>(".fishing-controls");
    if (navigation) navigation.hidden = this.overlay !== null || simulation.mode === "fishing";
    if (fishing) fishing.hidden = this.overlay !== null || simulation.mode !== "fishing";
    document.body.classList.toggle("is-night", isNight(simulation));
    document.documentElement.style.setProperty("--day-progress", String(dayProgress(simulation)));
  }

  private renderOverlay(): void {
    const host = this.uiRoot.querySelector<HTMLElement>("#overlay-host");
    if (!host) return;
    if (this.overlay === null) {
      host.innerHTML = "";
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
      case "controls":
        host.innerHTML = this.controlsScreen();
        break;
      case "help":
        host.innerHTML = this.helpScreen();
        break;
      case "survey":
        host.innerHTML = this.surveyScreen();
        break;
      case "deliveryResult":
        host.innerHTML = this.deliveryResultScreen();
        break;
      case "fieldGuide":
        host.innerHTML = this.fieldGuideScreen();
        break;
      case "seasonReport":
        host.innerHTML = this.seasonReportScreen();
        break;
    }
  }

  private titleScreen(): string {
    const returnClass = this.overlaySource === "settings" ? " is-settings-return" : "";
    return `
      <section class="screen-overlay title-screen${returnClass}" role="dialog" aria-label="FSHING main menu">
        <div class="title-panel">
          <img class="wordmark" src="${wordmarkUrl}" alt="FSHING" />
          <div class="title-actions">
            <button class="primary-button title-play-button" type="button" data-action="start" aria-label="Play">
              <span class="title-play-icon" aria-hidden="true">▶</span>
              <strong>Play</strong>
            </button>
            <button class="menu-button title-settings-button" type="button" data-action="open-settings"><strong>Settings</strong></button>
          </div>
        </div>
        <small class="title-build-version">v${__APP_VERSION__} (PR #${__PR_NUMBER__})</small>
      </section>`;
  }

  private harborScreen(): string {
    const harborId = this.simulation.dockedAt ?? "brindle";
    const harbor = harborById(harborId);
    const contract = this.simulation.activeContract;
    const available = this.simulation.availableContract?.origin === harborId ? this.simulation.availableContract : null;
    const deliverable = contract?.destination === harborId
      && this.simulation.cargo.some((item) => item.species === contract.species && item.freshness >= contract.minimumFreshness);
    const isFirstJobOffer = this.simulation.progress.completedContracts === 0 && available?.id === "morning-order";
    const showCargo = !isFirstJobOffer;
    const showServices = !isFirstJobOffer;
    const availableSections: HarborSection[] = ["delivery", ...(showCargo ? ["cargo" as const] : []), ...(showServices ? ["services" as const] : [])];
    const activeSection: HarborSection = availableSections.includes(this.harborSection) ? this.harborSection : "delivery";
    const contractMarkup = available
      ? `<div class="contract-card job-ticket ${isFirstJobOffer ? "is-guided" : ""}">
          <div class="job-ticket-heading">
            <div>${isFirstJobOffer ? "" : `<span class="card-kicker">Your next job</span>`}<h3>${isFirstJobOffer ? "First Assignment" : available.title}</h3></div>
            <span class="reward-stamp" aria-label="Reward: ${available.reward} shells"><span class="reward-label">Reward</span><span class="reward-value"><span class="ui-icon icon-shells" aria-hidden="true"></span><strong>${available.reward}</strong></span></span>
          </div>
          <ol class="job-route" aria-label="Job steps">
            <li><span>1</span><div><small>Catch</small><strong>${FISH[available.species].name}</strong></div></li>
            <li><span>2</span><div><small>Keep it</small><strong>${available.minimumFreshness}% fresh</strong></div></li>
            <li><span>3</span><div><small>Deliver to</small><strong>${harborById(available.destination).name}</strong></div></li>
          </ol>
          <button class="primary-button mission-button" type="button" data-action="accept-contract" aria-label="Accept contract">
            <span><strong>${isFirstJobOffer ? "Begin the First Voyage" : "Take this job"}</strong></span><b aria-hidden="true">→</b>
          </button>
        </div>`
      : contract
        ? `<div class="contract-card job-ticket ${deliverable ? "is-ready" : ""}">
            <span class="card-kicker">${deliverable ? "Ready to hand in" : "Job in progress"}</span>
            <h3>${contract.title}</h3>
            <ol class="job-route" aria-label="Job steps">
              <li class="is-complete"><span>✓</span><div><small>Job</small><strong>Accepted</strong></div></li>
              <li class="${this.simulation.cargo.some((item) => item.species === contract.species) ? "is-complete" : ""}"><span>2</span><div><small>Catch</small><strong>${FISH[contract.species].name}</strong></div></li>
              <li class="${deliverable ? "is-current" : ""}"><span>3</span><div><small>Deliver to</small><strong>${harborById(contract.destination).name}</strong></div></li>
            </ol>
            ${contract.destination === harborId
              ? `<button class="primary-button mission-button" type="button" data-action="deliver" ${deliverable ? "" : "disabled"}>${deliverable ? "<span><strong>Complete delivery</strong></span><b aria-hidden=\"true\">→</b>" : "Catch is missing or no longer fresh enough"}</button>`
              : `<p class="next-step"><span class="ui-icon icon-objective" aria-hidden="true"></span><span><strong>Next</strong> Leave the harbor and follow the marker to ${harborById(contract.destination).name}.</span></p>`}
          </div>`
        : `<div class="contract-card empty-job"><span class="card-kicker">Ecological recovery</span><h3>No catch contract is safe yet</h3><p>Every unlocked contract stock is protected. Each return to harbor restores the lake; leave and dock again to continue recovery.</p></div>`;

    const availableCargoSlots = cargoCapacity(this.simulation);
    const cargoMarkup = Array.from({ length: BALANCE.maxCargoSlots }, (_, index) => {
      const item = this.simulation.cargo[index];
      const slotNumber = String(index + 1).padStart(2, "0");
      if (item) {
        return `<article class="cargo-slot is-occupied" aria-label="Cargo slot ${index + 1}: ${FISH[item.species].name}, ${Math.ceil(item.freshness)}% fresh"><span class="cargo-slot-number">${slotNumber}</span><span class="ui-icon icon-freshness cargo-fish-icon" aria-hidden="true"></span><div class="cargo-slot-copy"><strong>${FISH[item.species].name}</strong><small>${Math.ceil(item.freshness)}% fresh</small></div><button class="cargo-release" type="button" data-action="release" data-index="${index}" aria-label="Release ${FISH[item.species].name}">Release</button></article>`;
      }
      if (index < availableCargoSlots) {
        return `<div class="cargo-slot is-empty" aria-label="Cargo slot ${index + 1}: empty"><span class="cargo-slot-number">${slotNumber}</span><span class="ui-icon icon-cargo" aria-hidden="true"></span><small>Empty</small></div>`;
      }
      return `<button class="cargo-slot is-locked" type="button" data-action="open-cargo-upgrades" aria-label="Cargo slot ${index + 1} locked. Open Cargo upgrades"><span class="cargo-slot-number">${slotNumber}</span><img class="cargo-padlock" src="${padlockIconUrl}" alt="" aria-hidden="true" /><small>Upgrade</small></button>`;
    }).join("");

    const harborTabs = !isFirstJobOffer
      ? `<nav class="harbor-tabs has-${availableSections.length}-tabs" aria-label="Harbor sections" style="--harbor-tab-count: ${availableSections.length}">
          ${availableSections.map((section) => `<button class="harbor-tab ${activeSection === section ? "is-active" : ""}" type="button" data-action="harbor-section" data-harbor-section="${section}" aria-label="${capitalise(section)}" aria-pressed="${activeSection === section}"><span class="ui-icon icon-${HARBOR_SECTION_ICON[section]}" aria-hidden="true"></span><span>${capitalise(section)}</span></button>`).join("")}
        </nav>`
      : "";

    const activeContent = activeSection === "cargo"
      ? `<aside class="cargo-section" aria-labelledby="cargo-heading">
          <div class="cargo-inventory-heading"><h3 id="cargo-heading">Fish inventory</h3><span>${this.simulation.cargo.length} carried · ${availableCargoSlots} unlocked</span></div>
          <div class="cargo-slot-grid" aria-label="Cargo inventory">${cargoMarkup}</div>
        </aside>`
      : activeSection === "services"
        ? `<section class="services" aria-label="Dock services">
            <div class="service-grid">
              ${this.upgradeCard("cargo", "Cargo", "+1 cargo slot")}
              ${this.upgradeCard("engine", "Engine", "+11% speed")}
              ${this.upgradeCard("lamp", "Lamp", "Wider night view")}
              ${this.upgradeCard("line", "Line depth", "Next depth tier")}
              ${harborId === "gloam" ? this.permitCard() : ""}
            </div>
          </section>`
        : `<section class="mission-section" aria-label="Delivery job">${contractMarkup}</section>`;

    return `
      <section class="screen-overlay harbor-screen is-first-voyage${isFirstJobOffer ? " is-first-job-offer" : " is-expanded-harbor"} is-harbor-${activeSection}" role="dialog" aria-labelledby="harbor-title">
        <div class="art-panel harbor-panel side-sheet">
          <header class="panel-heading harbor-header">
            <div class="harbor-title-block"><img class="wordmark harbor-wordmark" src="${wordmarkUrl}" alt="FSHING" /><span class="harbor-title-divider" aria-hidden="true"></span><div><h2 id="harbor-title">${harbor.name}</h2></div></div>
            <span class="shell-balance" aria-label="${this.simulation.progress.money} shells"><span class="ui-icon icon-shells" aria-hidden="true"></span><strong>${this.simulation.progress.money}</strong></span>
          </header>
          ${harborTabs}
          <div class="harbor-content is-${activeSection}">${activeContent}</div>
          <footer class="panel-actions ${isFirstJobOffer ? "is-guided" : ""}"><div><button class="text-button harbor-utility-button" type="button" data-action="open-help" aria-label="How to play"><span class="ui-icon icon-objective" aria-hidden="true"></span><strong>Help</strong></button><button class="text-button harbor-utility-button" type="button" data-action="open-field-guide" aria-label="Field guide"><span class="ui-icon icon-freshness" aria-hidden="true"></span><strong>Guide</strong></button></div>${isFirstJobOffer ? `<button class="leave-button harbor-main-menu-button" type="button" data-action="title" aria-label="Back to main menu"><span class="harbor-back-arrow" aria-hidden="true">←</span><strong>Main Menu</strong></button>` : `<button class="leave-button" type="button" data-action="undock" aria-label="Back to lake →"><span class="ui-icon icon-hull" aria-hidden="true"></span><strong>Return to Lake</strong></button>`}</footer>
        </div>
      </section>`;
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
              <button class="menu-button" type="button" data-action="open-field-guide"><strong>Field guide</strong></button>
              <button class="menu-button" type="button" data-action="open-settings"><strong>Settings</strong></button>
              <button class="menu-button" type="button" data-action="open-help"><strong>How to play</strong></button>
              <button class="menu-button" type="button" data-action="title"><strong>Title screen</strong></button>
            </div>
          </div>
        </div>
      </section>`;
  }

  private settingsScreen(): string {
    const settings = this.save.settings;
    const entryClass = this.overlaySource === "title" ? " is-title-entry" : "";
    return `
      <section class="screen-overlay settings-overlay${entryClass}" role="dialog" aria-labelledby="settings-title">
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
              <span class="setting-copy"><strong>High contrast</strong><small>Brighter markers and stronger outlines.</small></span>
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
          </div>
          <button class="primary-button settings-done" type="button" data-action="back">
            <strong>Done</strong><span class="menu-arrow" aria-hidden="true">→</span>
          </button>
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
    const steps = [
      {
        title: "Take a job",
        body: "At a harbor, choose the delivery job. It tells you exactly which fish to catch and where to take it.",
      },
      {
        title: "Follow the marker",
        body: `Use <kbd>${formatKey(this.save.settings.controls.left)}</kbd> and <kbd>${formatKey(this.save.settings.controls.right)}</kbd> to move. Brake with <kbd>${formatKey(this.save.settings.controls.brake)}</kbd>, then press <kbd>${formatKey(this.save.settings.controls.action)}</kbd> at the fishing marker.`,
      },
      {
        title: "Read and predict",
        body: "Use temperature, dissolved oxygen, depth, turbidity and habitat evidence to predict which fish is best adapted to each site.",
      },
      {
        title: "Catch the right fish",
        body: "Steer the hook with the movement keys or touch pad. Upgrade line depth to cross the amber depth boundary and reach rarer fish.",
      },
      {
        title: "Fish sustainably",
        body: "Check population labels in the field guide. Release unneeded catches, avoid protected species, and keep the ecosystem healthy for a bonus.",
      },
    ];
    const step = steps[this.helpStep] ?? steps[0];
    const progress = steps.map((_, index) => `<span class="${index === this.helpStep ? "is-current" : ""}" aria-hidden="true"></span>`).join("");
    return `
      <section class="screen-overlay sheet-overlay" role="dialog" aria-labelledby="help-title">
        <div class="art-panel help-panel side-sheet"><h2 id="help-title">How to play</h2>
          <div class="help-progress">
            <span>Step <strong>${this.helpStep + 1}</strong> of ${steps.length}</span>
            <div class="help-progress-track" role="img" aria-label="Step ${this.helpStep + 1} of ${steps.length}">${progress}</div>
          </div>
          <article class="help-card" aria-live="polite">
            <span class="help-card-number" aria-hidden="true">${String(this.helpStep + 1).padStart(2, "0")}</span>
            <div><h3>${step.title}</h3><p>${step.body}</p></div>
          </article>
          <div class="help-navigation" aria-label="Instruction navigation">
            <button class="help-nav-button" type="button" data-action="help-previous" ${this.helpStep === 0 ? "disabled" : ""}><span aria-hidden="true">←</span> Previous</button>
            <button class="help-nav-button is-forward" type="button" data-action="help-next" ${this.helpStep === steps.length - 1 ? "disabled" : ""}>Next <span aria-hidden="true">→</span></button>
          </div>
          <button class="primary-button" type="button" data-action="back">Back</button>
        </div>
      </section>`;
  }

  private surveyScreen(): string {
    const spotId = this.pendingSpot;
    if (!spotId) return this.messageScreen("Survey unavailable", "Return to the lake and stop beside a marked research buoy.", "cancel-survey", "Back to water");
    const spot = spotById(spotId);
    const reading = WATER_READINGS[spotId];
    const researchTarget = this.simulation.activeContract?.spot === spotId
      ? this.simulation.activeContract.species
      : undefined;
    const choices = surveyChoices(spotId, researchTarget);
    const result = this.surveyResult;
    const choicesMarkup = choices.map((species) => {
      const fish = FISH[species];
      const isExpected = result?.expected === species;
      return `<button class="science-choice ${isExpected ? "is-answer" : ""}" type="button" data-action="survey-choice" data-species="${species}" ${result ? "disabled" : ""}>
        <strong>${fish.name}</strong><span>${fish.shape}</span><small>Typical depth tier ${fish.depthTier}</small>
      </button>`;
    }).join("");
    const feedback = result
      ? `<div class="evidence-result ${result.correct ? "is-correct" : "is-rethink"}" role="status">
          <span class="result-mark" aria-hidden="true">${result.correct ? "✓" : "↻"}</span>
          <div><h3>${result.correct ? "Prediction supported" : `Evidence points to ${FISH[result.expected].name}`}</h3><p>${result.explanation}</p></div>
        </div>
        <button class="primary-button" type="button" data-action="continue-fishing">Use the evidence and drop the line</button>`
      : `<p class="science-prompt">Which species is best adapted to these conditions? Make a prediction from the evidence—not the colour alone.</p>`;
    return `
      <section class="screen-overlay sheet-overlay science-overlay" role="dialog" aria-labelledby="survey-title">
        <div class="art-panel science-panel side-sheet">
          <header class="science-heading"><div><span class="panel-eyebrow">Water survey · ${spot.name}</span><h2 id="survey-title">Read the lake</h2></div><span class="depth-badge">Depth ${reading.depthM} m</span></header>
          <div class="reading-grid" aria-label="Water-quality readings">
            <div><small>Temperature</small><strong>${reading.temperatureC}°C</strong></div>
            <div><small>Dissolved oxygen</small><strong>${reading.oxygenMgL.toFixed(1)} mg/L</strong></div>
            <div><small>Turbidity</small><strong>${capitalise(reading.turbidity)}</strong></div>
            <div><small>Habitat</small><strong>${capitalise(reading.habitat)}</strong></div>
          </div>
          <p class="evidence-clue"><strong>Field note:</strong> ${reading.clue}</p>
          ${feedback}
          <div class="science-choices" aria-label="Species predictions">${choicesMarkup}</div>
          ${result ? "" : `<button class="text-button" type="button" data-action="cancel-survey">Cancel survey</button>`}
        </div>
      </section>`;
  }

  private deliveryResultScreen(): string {
    const result = this.simulation.lastDeliveryResult;
    if (!result) return this.messageScreen("No delivery result", "Complete a delivery to compare your estimate with the result.", "continue-after-delivery", "Back to harbor");
    const difference = result.actualFreshness - result.predictedFreshness;
    return `
      <section class="screen-overlay sheet-overlay science-overlay" role="dialog" aria-labelledby="delivery-result-title">
        <div class="art-panel science-panel result-panel side-sheet">
          <span class="completion-seal" aria-hidden="true">✓</span>
          <span class="panel-eyebrow">Prediction versus result</span>
          <h2 id="delivery-result-title">Delivery analysed</h2>
          <div class="result-comparison">
            <div><small>Predicted freshness</small><strong>${result.predictedFreshness}%</strong></div>
            <span aria-hidden="true">→</span>
            <div><small>Actual freshness</small><strong>${result.actualFreshness}%</strong></div>
          </div>
          <p class="result-explanation">The ${result.route === "fast" ? "express" : "survey"} route took ${result.travelSeconds} in-game seconds. The result was ${Math.abs(difference)} percentage points ${difference >= 0 ? "above" : "below"} the estimate.</p>
          <div class="payment-summary"><span>Delivery payment</span><strong>${result.payment} shells</strong>${result.populationBonus > 0 ? `<small>Includes ${result.populationBonus}-shell healthy-ecosystem bonus</small>` : `<small>Keep at least five populations healthy to earn an ecosystem bonus.</small>`}</div>
          <button class="primary-button" type="button" data-action="continue-after-delivery">Continue at harbor</button>
        </div>
      </section>`;
  }

  private fieldGuideScreen(): string {
    const species = Object.keys(FISH) as FishSpecies[];
    const discovered = new Set(this.simulation.progress.discovered);
    const fishMarkup = species.map((id) => {
      const fish = FISH[id];
      const profile = FISH_SCIENCE[id];
      const population = this.simulation.progress.populations[id];
      const known = discovered.has(id);
      return `<article class="field-card ${known ? "is-known" : "is-unknown"}">
        <header><div><span class="field-tier">Depth tier ${fish.depthTier}</span><h3>${known ? fish.name : "Unconfirmed species"}</h3></div><span class="population-chip is-${populationLabel(population).toLowerCase()}">${populationLabel(population)} · ${population}%</span></header>
        <p><strong>Silhouette:</strong> ${fish.shape}</p>
        <p><strong>${known ? "Habitat" : "Research clue"}:</strong> ${known ? profile.habitat : profile.evidence}</p>
        ${known ? `<p><strong>Food-web role:</strong> ${profile.ecologicalRole}</p><small>${profile.temperatureRangeC[0]}–${profile.temperatureRangeC[1]}°C · needs at least ${profile.minimumOxygenMgL.toFixed(1)} mg/L oxygen</small>` : `<small>Survey or catch this species to confirm its full record.</small>`}
      </article>`;
    }).join("");
    const regionMarkup = REGIONS.map((region) => `<div class="region-key"><span style="--region-colour:${region.surfaceTint}"></span><strong>${region.name}</strong><small>${Math.round(region.startX * 100)}–${Math.round(region.endX * 100)}% across lake</small></div>`).join("");
    return `
      <section class="screen-overlay guide-overlay" role="dialog" aria-labelledby="guide-title">
        <div class="art-panel guide-panel">
          <header class="guide-heading"><div><span class="panel-eyebrow">Scientific field journal</span><h2 id="guide-title">Lake field guide</h2><p>Use evidence and population data to decide where—and whether—to fish.</p></div>
            <div class="mastery-summary"><span><strong>${discovered.size}</strong><small>of ${species.length} species</small></span><span><strong>${learningAccuracy(this.simulation)}%</strong><small>prediction accuracy</small></span><span><strong>${averagePopulation(this.simulation.progress.populations)}%</strong><small>lake health</small></span></div>
          </header>
          <section class="ecosystem-map" aria-labelledby="ecosystem-map-title"><h3 id="ecosystem-map-title">Ecosystems and depth access</h3><div class="region-keys">${regionMarkup}</div><div class="depth-scale"><span>T0 · 0–8 m</span><span>T1 · 8–14 m</span><span>T2 · 14–23 m</span><span>T3 · 23–34 m</span><span>T4 · 34–41 m</span><span>T5 · 41–50 m</span></div><p>Your line is tier ${this.simulation.progress.upgrades.line}; amber boundaries underwater show your current maximum depth.</p></section>
          <div class="field-grid">${fishMarkup}</div>
          <footer class="guide-actions"><p>Population labels are also written in text, so colour is never the only signal.</p><button class="primary-button" type="button" data-action="back">Back</button></footer>
        </div>
      </section>`;
  }

  private seasonReportScreen(): string {
    const learning = this.simulation.progress.learning;
    const average = averagePopulation(this.simulation.progress.populations);
    const accuracy = learningAccuracy(this.simulation);
    return `
      <section class="screen-overlay sheet-overlay science-overlay" role="dialog" aria-labelledby="season-title">
        <div class="art-panel science-panel result-panel side-sheet">
          <span class="panel-eyebrow">End-of-season evaluation</span><h2 id="season-title">Research season complete</h2>
          <p>You completed ${this.simulation.progress.completedContracts} deliveries and unlocked a reusable evidence record. You can keep exploring and improving every result.</p>
          <div class="report-grid">
            <div><small>Species predictions</small><strong>${learning.correctPredictions} / ${learning.surveysCompleted}</strong><span>${accuracy}% accuracy</span></div>
            <div><small>Crossings started</small><strong>${learning.routePlans}</strong><span>contract catches secured</span></div>
            <div><small>Lake health</small><strong>${average}%</strong><span>${populationLabel(average)}</span></div>
            <div><small>Conservation</small><strong>${learning.conservationScore}</strong><span>population points restored</span></div>
          </div>
          <p class="reflection-prompt"><strong>Reflect:</strong> Which water reading was most useful? When was the faster route worth its extra risk? What would you change to protect a vulnerable species?</p>
          <button class="primary-button" type="button" data-action="continue-season">Continue researching</button>
        </div>
      </section>`;
  }

  private messageScreen(title: string, body: string, action: string, label: string): string {
    return `<section class="screen-overlay sheet-overlay" role="dialog"><div class="art-panel compact-panel side-sheet"><h2>${title}</h2><p>${body}</p><button class="primary-button" type="button" data-action="${action}">${label}</button></div></section>`;
  }

  private setOverlay(next: OverlayScreen, useSceneTransition = false): void {
    if (this.sceneTransitioning) {
      this.queuedOverlay = { next, useSceneTransition };
      return;
    }
    if (next === this.overlay) return;

    if (
      this.overlay === "settings"
      && (next === "title" || next === "pause")
      && this.overlayReturn === next
      && !this.save.settings.reducedMotion
    ) {
      if (this.settingsTransitionTimer !== undefined) return;
      const settingsScreen = this.uiRoot.querySelector<HTMLElement>(".settings-overlay");
      if (settingsScreen) {
        settingsScreen.classList.add("is-closing", `is-closing-to-${next}`);
        this.settingsTransitionTimer = window.setTimeout(() => {
          this.settingsTransitionTimer = undefined;
          this.commitOverlay(next);
        }, SETTINGS_EXIT_DURATION);
        return;
      }
    }

    if (this.settingsTransitionTimer !== undefined) {
      window.clearTimeout(this.settingsTransitionTimer);
      this.settingsTransitionTimer = undefined;
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
    if (wasPlaying && !willPlay) this.platform.gameplayStop();
    if (!wasPlaying && willPlay) this.platform.gameplayStart();
    this.renderOverlay();
    this.refreshHud();
    if (next !== null) {
      requestAnimationFrame(() => this.uiRoot.querySelector<HTMLElement>("#overlay-host button")?.focus({ preventScroll: true }));
    }
  }

  private beginVoyage(): void {
    this.started = true;
    this.harborSection = "delivery";
    if (this.simulation.dockedAt) this.setOverlay("harbor", true);
    else this.setOverlay(null, true);
  }

  private syncSave(): void {
    this.save.progress = {
      money: this.simulation.progress.money,
      upgrades: { ...this.simulation.progress.upgrades },
      outerUnlocked: this.simulation.progress.outerUnlocked,
      completedContracts: this.simulation.progress.completedContracts,
      populations: { ...this.simulation.progress.populations },
      discovered: [...this.simulation.progress.discovered],
      learning: { ...this.simulation.progress.learning },
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
    const toast = this.uiRoot.querySelector<HTMLOutputElement>("#toast");
    if (!toast) return;
    window.clearTimeout(this.toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    this.toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), this.save.settings.reducedMotion ? 4_500 : 3_200);
  }

  private readonly onClick = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!target || target instanceof HTMLButtonElement && target.disabled) return;
    const action = target.dataset.action;
    this.feedback.cue("ui");
    switch (action) {
      case "dismiss-tutorial": {
        const tutorial = this.uiRoot.querySelector<HTMLButtonElement>("#tutorial-callout");
        const message = tutorial?.querySelector<HTMLElement>(".tutorial-message")?.textContent;
        if (!tutorial || !message) break;
        window.clearTimeout(this.tutorialDismissTimer);
        this.dismissedTutorialText = message;
        tutorial.classList.add("is-dismissing");
        this.tutorialDismissTimer = window.setTimeout(() => {
          tutorial.hidden = true;
          tutorial.classList.remove("is-dismissing");
        }, this.save.settings.reducedMotion ? 0 : 280);
        break;
      }
      case "start": this.beginVoyage(); break;
      case "interact": this.handleInteract(); break;
      case "resume": this.setOverlay(null); break;
      case "open-settings": this.overlayReturn = this.overlay; this.setOverlay("settings"); break;
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
      case "open-field-guide":
        this.overlayReturn = this.overlay;
        this.setOverlay("fieldGuide");
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
        if (!section || !(["delivery", "cargo", "services"] as HarborSection[]).includes(section)) break;
        this.harborSection = section;
        this.renderOverlay();
        requestAnimationFrame(() => this.uiRoot.querySelector<HTMLButtonElement>(`[data-harbor-section="${section}"]`)?.focus({ preventScroll: true }));
        break;
      }
      case "open-cargo-upgrades": {
        const openCargoUpgrade = (): void => {
          if (this.overlay !== "harbor" || !this.simulation.dockedAt) return;
          this.harborSection = "services";
          this.renderOverlay();
          requestAnimationFrame(() => this.uiRoot.querySelector<HTMLButtonElement>('[data-harbor-section="services"]')?.focus({ preventScroll: true }));
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
        if (this.simulation.activeContract
          && this.simulation.cargo.some((item) => item.species === this.simulation.activeContract?.species)
          && !this.simulation.routeChoice) {
          chooseRoute(this.simulation, "fast");
        }
        undock(this.simulation);
        this.setOverlay(null);
        break;
      case "accept-contract":
        if (acceptAvailableContract(this.simulation)) {
          this.syncSave();
          undock(this.simulation);
          this.setOverlay(null);
          this.showToast("Contract accepted. Survey the marked habitat first.");
        }
        break;
      case "survey-choice": {
        const species = target.dataset.species as FishSpecies | undefined;
        if (!this.pendingSpot || !species || !(species in FISH) || this.surveyResult) break;
        const researchTarget = this.simulation.activeContract?.spot === this.pendingSpot
          ? this.simulation.activeContract.species
          : undefined;
        this.surveyResult = recordSurvey(this.simulation, this.pendingSpot, species, researchTarget);
        this.syncSave();
        this.renderOverlay();
        this.feedback.cue(this.surveyResult.correct ? "upgrade" : "deny");
        break;
      }
      case "continue-fishing":
        if (this.pendingSpot && this.surveyResult && startFishing(this.simulation, this.pendingSpot)) {
          this.feedback.cue("cast");
          this.pendingSpot = null;
          this.surveyResult = null;
          this.setOverlay(null);
        }
        break;
      case "cancel-survey":
        this.pendingSpot = null;
        this.surveyResult = null;
        this.setOverlay(null);
        break;
      case "deliver":
        if (deliverContract(this.simulation) !== null) {
          this.handleSimulationEvents();
          this.renderOverlay();
        }
        break;
      case "continue-after-delivery":
        if (this.seasonReportQueued) {
          this.seasonReportQueued = false;
          this.setOverlay("seasonReport");
        } else {
          this.harborSection = "delivery";
          this.setOverlay("harbor");
        }
        break;
      case "continue-season": this.harborSection = "delivery"; this.setOverlay("harbor"); break;
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
      case "release": {
        const index = Number(target.dataset.index);
        if (releaseCargo(this.simulation, index)) {
          this.handleSimulationEvents();
          this.renderOverlay();
        }
        break;
      }
      case "leave-fishing":
        this.feedback.cue("cast");
        this.simulation.mode = "cruising";
        this.simulation.fishing = null;
        this.refreshHud();
        break;
    }
  };

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
      catchSpecies: (species) => {
        resolveCatch(this.simulation, species);
        this.handleSimulationEvents();
      },
      damage: (amount) => {
        damageBoat(this.simulation, amount);
        this.handleSimulationEvents();
      },
      boatX: () => this.simulation.boat.x,
      facing: () => this.simulation.boat.facing,
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
