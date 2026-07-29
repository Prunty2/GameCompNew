import wordmarkUrl from "../assets/fshing-wordmark.png";
import uiButtonUrl from "../assets/ui-button.png";
import uiIconsUrl from "../assets/ui-icons.png";
import uiPanelUrl from "../assets/ui-panel.png";
import { FeedbackService, type FeedbackCue } from "../services/feedbackService";
import type { PlatformService } from "../services/platformService";
import { saveGame, type SaveData } from "../services/saveGame";
import { BALANCE, FISH, harborById, spotById, type FishSpecies, type HarborId, type SpotId, type UpgradeId } from "./balance";
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
  consumeEvents,
  createSimulation,
  damageBoat,
  dayProgress,
  deliverContract,
  discardCargo,
  getInteractionPrompt,
  interact,
  isNight,
  moveBoatForTesting,
  repairBoat,
  repairCost,
  resolveCatch,
  tutorialPrompt,
  undock,
  updateSimulation,
  upgradeCost,
  type Simulation,
  type SimulationEvent,
} from "./simulation";

const FIXED_STEP = 1 / 120;
const MAX_FRAME = 0.05;
const UI_REFRESH_INTERVAL = 100;
const HELP_STEP_COUNT = 4;

type OverlayScreen = "title" | "harbor" | "pause" | "settings" | "controls" | "help" | null;

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
  private overlayReturn: OverlayScreen = "pause";
  private helpStep = 0;
  private toastTimer: number | undefined;
  private tutorialDismissTimer: number | undefined;
  private dismissedTutorialText: string | null = null;
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
      if (this.overlay === null) this.setOverlay("pause");
      else if (this.overlay === "pause") this.setOverlay(null);
    }

    if (this.started && this.overlay === null) {
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

    const engineMaximum = BALANCE.maxSurfaceSpeed * (1 + this.simulation.progress.upgrades.engine * 0.16);
    const currentInput = this.input.read();
    this.feedback.updateEngine(
      Math.abs(this.simulation.boat.speed) / engineMaximum,
      currentInput.boost,
      this.started && this.overlay === null && this.simulation.mode === "cruising",
    );
    this.renderer.render(this.simulation, {
      ...this.save.settings,
      cinematic: this.overlay === "title",
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

        <button class="context-action" id="context-action" type="button" data-action="interact" hidden>Interact</button>

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
    const prompt = interact(this.simulation);
    if (prompt?.kind === "fishing" && prompt.enabled) this.feedback.cue("cast");
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
        this.showToast(`${FISH[event.species].name} secured. Freshness is falling.`);
        break;
      case "delivered":
        this.feedback.cue("delivery");
        this.pulseFeedback("delivery");
        this.showToast(`Delivery complete · +${event.payment} shells`);
        break;
      case "docked":
        this.feedback.cue("dock");
        this.setOverlay("harbor");
        break;
      case "full-cargo":
        this.feedback.cue("deny");
        this.showToast("Cargo hold full. Deliver or discard a catch.");
        break;
      case "locked-region":
        this.feedback.cue("deny");
        this.showToast("Outer Gloam is permit water. Turn back or buy access at Gloam Ferry.");
        break;
      case "rescued":
        this.feedback.cue("collision");
        this.showToast(`Harbor rescue · ${event.cost} shells · cargo lost`);
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
    }
  }

  private titleScreen(): string {
    return `
      <section class="screen-overlay title-screen" role="dialog" aria-label="FSHING main menu">
        <div class="title-panel">
          <img class="wordmark" src="${wordmarkUrl}" alt="FSHING" />
          <div class="title-actions">
            <button class="primary-button title-play-button" type="button" data-action="start" aria-label="Play">
              <span class="title-play-icon" aria-hidden="true">01</span>
              <span><strong>Begin voyage</strong></span>
              <b aria-hidden="true">ENTER</b>
            </button>
            <div class="title-secondary-actions">
              <button class="menu-button" type="button" data-action="open-help"><span aria-hidden="true">02</span><strong>How to play</strong></button>
              <button class="menu-button" type="button" data-action="open-settings"><span aria-hidden="true">03</span><strong>Settings</strong></button>
            </div>
          </div>
        </div>
      </section>`;
  }

  private harborScreen(): string {
    const harborId = this.simulation.dockedAt ?? "brindle";
    const harbor = harborById(harborId);
    const contract = this.simulation.activeContract;
    const available = this.simulation.availableContract?.origin === harborId ? this.simulation.availableContract : null;
    const deliverable = contract?.destination === harborId
      && this.simulation.cargo.some((item) => item.species === contract.species && item.freshness >= contract.minimumFreshness);
    const contractMarkup = available
      ? `<div class="contract-card job-ticket">
          <div class="job-ticket-heading">
            <div><span class="card-kicker">Your next job</span><h3>${available.title}</h3></div>
            <span class="reward-stamp"><small>Reward</small><strong>${available.reward}</strong><span>shells</span></span>
          </div>
          <ol class="job-route" aria-label="Job steps">
            <li><span>1</span><div><small>Catch</small><strong>${FISH[available.species].name}</strong></div></li>
            <li><span>2</span><div><small>Keep it</small><strong>${available.minimumFreshness}% fresh</strong></div></li>
            <li><span>3</span><div><small>Deliver to</small><strong>${harborById(available.destination).name}</strong></div></li>
          </ol>
          <button class="primary-button mission-button" type="button" data-action="accept-contract" aria-label="Accept contract">
            <span><strong>Take this job</strong></span><b aria-hidden="true">→</b>
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
              : `<p class="next-step"><strong>Next:</strong> Leave the harbor and follow the orange destination marker across the lake.</p>`}
          </div>`
        : `<div class="contract-card empty-job"><span class="card-kicker">No job posted</span><h3>You are free to explore</h3><p>Head onto the lake, fish for cargo, or return later for new delivery work.</p></div>`;

    const cargoMarkup = this.simulation.cargo.length === 0
      ? `<p class="empty-state">The hold is empty.</p>`
      : this.simulation.cargo.map((item, index) => `<div class="cargo-row"><span>${FISH[item.species].name}<small>${Math.ceil(item.freshness)}% fresh</small></span><button class="small-button" type="button" data-action="discard" data-index="${index}">Discard</button></div>`).join("");

    return `
      <section class="screen-overlay harbor-screen" role="dialog" aria-labelledby="harbor-title">
        <div class="art-panel harbor-panel side-sheet">
          <header class="panel-heading">
            <div><h2 id="harbor-title">${harbor.name}</h2><p>${harbor.subtitle}</p></div>
            <span class="shell-balance"><span class="ui-icon icon-shells" aria-hidden="true"></span><span><small>Your money</small><strong>${this.simulation.progress.money} shells</strong></span></span>
          </header>
          <div class="harbor-intro">
            <div><span class="panel-eyebrow">Current task</span><h3>${available ? "Choose the posted delivery" : deliverable ? "Hand in your catch" : contract ? "Continue your delivery" : "Prepare for the lake"}</h3></div>
            <p>${available ? "Take the job below. The game will point you to the right fish, then to the delivery harbor." : deliverable ? "Your requested fish is ready. Complete the delivery to get paid." : contract ? "Your current job stays active until it is delivered." : "There is no active delivery, so you can explore or improve your boat."}</p>
          </div>
          <div class="harbor-grid">
            <section class="mission-section" aria-labelledby="contract-heading"><h3 id="contract-heading" class="section-title">Delivery job</h3>${contractMarkup}</section>
            <aside class="cargo-section" aria-labelledby="cargo-heading">
              <div class="section-heading"><h3 id="cargo-heading" class="section-title">Your cargo</h3><span>${this.simulation.cargo.length} / ${cargoCapacity(this.simulation)} spaces</span></div>
              <div class="cargo-list">${cargoMarkup}</div>
              <p class="cargo-help">Fish lose freshness while you travel. Deliver the requested catch before it drops below the job minimum.</p>
            </aside>
          </div>
          <section class="services" aria-labelledby="service-heading">
            <div class="section-heading"><div><h3 id="service-heading" class="section-title">Dock services</h3><p>Permanent boat improvements and repairs.</p></div></div>
            <div class="service-grid">
              ${this.upgradeCard("cargo", "Cargo hold", "Carry one more fish per tier.")}
              ${this.upgradeCard("engine", "Engine", "16% more forward speed per tier.")}
              ${this.upgradeCard("lamp", "Lamp", "Wider readable water at night.")}
              <article class="service-card"><span class="ui-icon icon-repair" aria-hidden="true"></span><div><h4>Repair hull</h4><p>${Math.ceil(this.simulation.boat.damage)} damage · ${repairCost(this.simulation)} shells</p></div><button class="small-button" type="button" data-action="repair" ${this.simulation.boat.damage <= 0 || this.simulation.progress.money <= 0 ? "disabled" : ""}>Repair</button></article>
              ${harborId === "gloam" ? `<article class="service-card"><span class="ui-icon icon-permit" aria-hidden="true"></span><div><h4>Outer Gloam permit</h4><p>${this.simulation.progress.outerUnlocked ? "Granted" : `${BALANCE.permitCost} shells`}</p></div><button class="small-button" type="button" data-action="buy-permit" ${this.simulation.progress.outerUnlocked || this.simulation.progress.money < BALANCE.permitCost ? "disabled" : ""}>${this.simulation.progress.outerUnlocked ? "Owned" : "Buy"}</button></article>` : ""}
            </div>
          </section>
          <footer class="panel-actions"><button class="text-button" type="button" data-action="open-help">How to play</button><button class="leave-button" type="button" data-action="undock" aria-label="Back to lake →"><span>Return to open water</span><strong>Back to lake</strong><b aria-hidden="true">→</b></button></footer>
        </div>
      </section>`;
  }

  private upgradeCard(upgrade: UpgradeId, title: string, detail: string): string {
    const tier = this.simulation.progress.upgrades[upgrade];
    const maximum = tier >= BALANCE.maxUpgradeTier;
    const cost = upgradeCost(upgrade, tier);
    return `<article class="service-card"><span class="ui-icon icon-${upgrade}" aria-hidden="true"></span><div><h4>${title} · T${tier}</h4><p>${maximum ? "Maximum tier" : `${detail} ${cost} shells`}</p></div><button class="small-button" type="button" data-action="buy-upgrade" data-upgrade="${upgrade}" ${maximum || this.simulation.progress.money < cost ? "disabled" : ""}>${maximum ? "Max" : "Upgrade"}</button></article>`;
  }

  private pauseScreen(): string {
    return `
      <section class="screen-overlay sheet-overlay" role="dialog" aria-labelledby="pause-title">
        <div class="art-panel compact-panel side-sheet"><h2 id="pause-title">Paused</h2><p>The lake, cargo, and clock are stopped.</p>
          <div class="stacked-actions"><button class="primary-button" type="button" data-action="resume">Return to water</button><button class="text-button" type="button" data-action="open-settings">Settings</button><button class="text-button" type="button" data-action="open-help">How to play</button><button class="text-button" type="button" data-action="title">Title screen</button></div>
        </div>
      </section>`;
  }

  private settingsScreen(): string {
    const settings = this.save.settings;
    return `
      <section class="screen-overlay sheet-overlay" role="dialog" aria-labelledby="settings-title">
        <div class="art-panel compact-panel side-sheet"><h2 id="settings-title">Settings</h2>
          <label class="toggle-row"><span><strong>Mute</strong><small>Silence all game audio.</small></span><input type="checkbox" data-setting="muted" ${settings.muted ? "checked" : ""}></label>
          <label class="range-row"><span><strong>Volume</strong><small>Overall game volume.</small></span><input type="range" min="0" max="1" step="0.05" value="${settings.volume}" data-setting="volume"></label>
          <label class="toggle-row"><span><strong>High contrast</strong><small>Brighter markers and stronger outlines.</small></span><input type="checkbox" data-setting="highContrast" ${settings.highContrast ? "checked" : ""}></label>
          <label class="toggle-row"><span><strong>Reduced motion</strong><small>Stops decorative pulses and drifting threats.</small></span><input type="checkbox" data-setting="reducedMotion" ${settings.reducedMotion ? "checked" : ""}></label>
          <button class="settings-link" type="button" data-action="open-controls"><span><strong>Controls</strong></span><span aria-hidden="true">→</span></button>
          <button class="primary-button" type="button" data-action="back">Done</button>
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
      <section class="screen-overlay sheet-overlay" role="dialog" aria-labelledby="controls-title">
        <div class="art-panel controls-panel side-sheet"><h2 id="controls-title">Controls</h2>
          <p class="binding-help">Choose an action, then press its new key. If that key is already used, the two actions swap.</p>
          <div class="binding-list">${rows}</div>
          <div class="controls-actions">
            <button class="text-button" type="button" data-action="reset-controls">Reset defaults</button>
            <button class="primary-button" type="button" data-action="close-controls">Done</button>
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
        title: "Catch the right fish",
        body: "Steer the hook with the movement keys or touch pad until it meets the requested fish silhouette.",
      },
      {
        title: "Deliver it fresh",
        body: "Follow the orange harbor marker and dock. Fish lose freshness on the way, so do not linger.",
      },
    ];
    const step = steps[this.helpStep] ?? steps[0];
    const progress = steps.map((_, index) => `<span class="${index === this.helpStep ? "is-current" : ""}" aria-hidden="true"></span>`).join("");
    return `
      <section class="screen-overlay sheet-overlay" role="dialog" aria-labelledby="help-title">
        <div class="art-panel help-panel side-sheet"><h2 id="help-title">How to play</h2>
          <p class="help-intro">Take a delivery job, catch the requested fish, and get it to the other harbor while it is still fresh.</p>
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

  private setOverlay(next: OverlayScreen): void {
    const wasPlaying = this.started && this.overlay === null;
    const willPlay = this.started && next === null;
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
    if (this.simulation.dockedAt) this.setOverlay("harbor");
    else this.setOverlay(null);
  }

  private syncSave(): void {
    this.save.progress = {
      money: this.simulation.progress.money,
      upgrades: { ...this.simulation.progress.upgrades },
      outerUnlocked: this.simulation.progress.outerUnlocked,
      completedContracts: this.simulation.progress.completedContracts,
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
      case "title": this.started = false; this.setOverlay("title"); break;
      case "undock": undock(this.simulation); this.setOverlay(null); break;
      case "accept-contract":
        if (acceptAvailableContract(this.simulation)) {
          this.syncSave();
          undock(this.simulation);
          this.setOverlay(null);
          this.showToast("Contract accepted. Follow the orange route marker.");
        }
        break;
      case "deliver":
        if (deliverContract(this.simulation) !== null) {
          this.handleSimulationEvents();
          this.renderOverlay();
        }
        break;
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
      case "repair":
        if (repairBoat(this.simulation) > 0) {
          this.syncSave();
          this.renderOverlay();
          this.showToast("The shipwright sets the hull true.");
        }
        break;
      case "discard": {
        const index = Number(target.dataset.index);
        if (discardCargo(this.simulation, index)) this.renderOverlay();
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
  return { cargo: "Cargo hold", engine: "Engine", lamp: "Lamp" }[upgrade];
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
