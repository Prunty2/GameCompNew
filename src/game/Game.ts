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
  private toastTimer: number | undefined;
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
        <div class="tutorial-callout" id="tutorial-callout" role="status"></div>
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
      case "collision":
        this.feedback.cue("collision");
        this.pulseFeedback("collision");
        this.renderer.flashCollision();
        this.showToast(`Rock impact · +${event.damage} hull damage`);
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
      tutorial.textContent = tutorialText ?? "";
      tutorial.hidden = !tutorialText || this.overlay !== null;
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
            <button class="primary-button title-play-button" type="button" data-action="start">Play</button>
            <button class="menu-button" type="button" data-action="open-settings">Settings</button>
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
      ? `<div class="contract-card">
          <span class="card-kicker">Available contract</span>
          <h3>${available.title}</h3>
          <dl><div><dt>Catch</dt><dd>${FISH[available.species].name}</dd></div><div><dt>Deliver</dt><dd>${harborById(available.destination).name}</dd></div><div><dt>Minimum</dt><dd>${available.minimumFreshness}% fresh</dd></div><div><dt>Reward</dt><dd>${available.reward} shells</dd></div></dl>
          <button class="primary-button" type="button" data-action="accept-contract">Accept contract</button>
        </div>`
      : contract
        ? `<div class="contract-card ${deliverable ? "is-ready" : ""}">
            <span class="card-kicker">Active contract</span>
            <h3>${contract.title}</h3>
            <p>${FISH[contract.species].name} to ${harborById(contract.destination).name} · ${contract.minimumFreshness}% minimum</p>
            ${contract.destination === harborId
              ? `<button class="primary-button" type="button" data-action="deliver" ${deliverable ? "" : "disabled"}>${deliverable ? "Complete delivery" : "Required fresh catch missing"}</button>`
              : `<p class="route-note">Your destination lies across the lake.</p>`}
          </div>`
        : `<div class="contract-card"><span class="card-kicker">Contract board</span><p>No new work is posted here yet.</p></div>`;

    const cargoMarkup = this.simulation.cargo.length === 0
      ? `<p class="empty-state">The hold is empty.</p>`
      : this.simulation.cargo.map((item, index) => `<div class="cargo-row"><span>${FISH[item.species].name}<small>${Math.ceil(item.freshness)}% fresh</small></span><button class="small-button" type="button" data-action="discard" data-index="${index}">Discard</button></div>`).join("");

    return `
      <section class="screen-overlay harbor-screen" role="dialog" aria-labelledby="harbor-title">
        <div class="art-panel harbor-panel side-sheet">
          <header class="panel-heading">
            <div><span class="panel-eyebrow">${harborId === "brindle" ? "LEFT SHORE / 01" : "RIGHT SHORE / 02"}</span><h2 id="harbor-title">${harbor.name}</h2><p>${harbor.subtitle}</p></div>
            <span class="shell-balance"><span class="ui-icon icon-shells" aria-hidden="true"></span>${this.simulation.progress.money}</span>
          </header>
          <p class="dialogue">${harborId === "brindle" ? "“Read the water. The lamp can lie.”" : "“The outer water remembers every boat.”"}</p>
          <div class="harbor-grid">
            <section aria-labelledby="contract-heading"><h3 id="contract-heading" class="section-title">Delivery board</h3>${contractMarkup}</section>
            <section aria-labelledby="cargo-heading"><h3 id="cargo-heading" class="section-title">Cargo · ${this.simulation.cargo.length}/${cargoCapacity(this.simulation)}</h3><div class="cargo-list">${cargoMarkup}</div></section>
          </div>
          <section class="services" aria-labelledby="service-heading">
            <h3 id="service-heading" class="section-title">Shipwright & permits</h3>
            <div class="service-grid">
              ${this.upgradeCard("cargo", "Cargo hold", "Carry one more fish per tier.")}
              ${this.upgradeCard("engine", "Engine", "16% more forward speed per tier.")}
              ${this.upgradeCard("lamp", "Lamp", "Wider readable water at night.")}
              <article class="service-card"><span class="ui-icon icon-repair" aria-hidden="true"></span><div><h4>Repair hull</h4><p>${Math.ceil(this.simulation.boat.damage)} damage · ${repairCost(this.simulation)} shells</p></div><button class="small-button" type="button" data-action="repair" ${this.simulation.boat.damage <= 0 || this.simulation.progress.money <= 0 ? "disabled" : ""}>Repair</button></article>
              ${harborId === "gloam" ? `<article class="service-card"><span class="ui-icon icon-permit" aria-hidden="true"></span><div><h4>Outer Gloam permit</h4><p>${this.simulation.progress.outerUnlocked ? "Granted" : `${BALANCE.permitCost} shells`}</p></div><button class="small-button" type="button" data-action="buy-permit" ${this.simulation.progress.outerUnlocked || this.simulation.progress.money < BALANCE.permitCost ? "disabled" : ""}>${this.simulation.progress.outerUnlocked ? "Owned" : "Buy"}</button></article>` : ""}
            </div>
          </section>
          <footer class="panel-actions"><button class="text-button" type="button" data-action="open-help">How to play</button><button class="primary-button" type="button" data-action="undock">Back to lake →</button></footer>
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
        <div class="art-panel compact-panel side-sheet"><span class="panel-eyebrow">RUN SUSPENDED</span><h2 id="pause-title">Paused</h2><p>The lake, cargo, and clock are stopped.</p>
          <div class="stacked-actions"><button class="primary-button" type="button" data-action="resume">Return to water</button><button class="text-button" type="button" data-action="open-settings">Settings</button><button class="text-button" type="button" data-action="open-help">How to play</button><button class="text-button" type="button" data-action="title">Title screen</button></div>
        </div>
      </section>`;
  }

  private settingsScreen(): string {
    const settings = this.save.settings;
    return `
      <section class="screen-overlay sheet-overlay" role="dialog" aria-labelledby="settings-title">
        <div class="art-panel compact-panel side-sheet"><span class="panel-eyebrow">ACCESS / AUDIO</span><h2 id="settings-title">Settings</h2>
          <label class="toggle-row"><span><strong>Mute</strong><small>Silence all game audio.</small></span><input type="checkbox" data-setting="muted" ${settings.muted ? "checked" : ""}></label>
          <label class="range-row"><span><strong>Volume</strong><small>Overall game volume.</small></span><input type="range" min="0" max="1" step="0.05" value="${settings.volume}" data-setting="volume"></label>
          <label class="toggle-row"><span><strong>High contrast</strong><small>Brighter markers and stronger outlines.</small></span><input type="checkbox" data-setting="highContrast" ${settings.highContrast ? "checked" : ""}></label>
          <label class="toggle-row"><span><strong>Reduced motion</strong><small>Stops decorative pulses and drifting threats.</small></span><input type="checkbox" data-setting="reducedMotion" ${settings.reducedMotion ? "checked" : ""}></label>
          <button class="settings-link" type="button" data-action="open-controls"><span><strong>Controls</strong><small>Rebind keyboard actions.</small></span><span aria-hidden="true">→</span></button>
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
        <div class="art-panel controls-panel side-sheet"><span class="panel-eyebrow">SETTINGS / INPUT</span><h2 id="controls-title">Controls</h2>
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
    return `
      <section class="screen-overlay sheet-overlay" role="dialog" aria-labelledby="help-title">
        <div class="art-panel help-panel side-sheet"><span class="panel-eyebrow">FIELD NOTES / CONTROLS</span><h2 id="help-title">How to play</h2>
          <div class="help-grid">
            <article><h3>Travel</h3><p><kbd>${formatKey(this.save.settings.controls.left)}</kbd> and <kbd>${formatKey(this.save.settings.controls.right)}</kbd> apply horizontal thrust. Release to coast, <kbd>${formatKey(this.save.settings.controls.brake)}</kbd> brakes, and <kbd>${formatKey(this.save.settings.controls.boost)}</kbd> boosts.</p></article>
            <article><h3>Stop</h3><p>Brake beneath a hanging fishing marker or beside a dock, then press <kbd>${formatKey(this.save.settings.controls.action)}</kbd>. Crossing rocks quickly damages the hull.</p></article>
            <article><h3>Fish</h3><p>Guide the hook in two axes with the same directions or drag the touch pad. Catch the requested silhouette.</p></article>
            <article><h3>Deliver</h3><p>Freshness falls as you travel. Dock at the requested harbor before the catch drops below its minimum.</p></article>
            <article><h3>Survive</h3><p>Rocks damage the hull. At critical damage, rescue costs up to 20 shells and loses cargo—but never your whole save.</p></article>
            <article><h3>Night</h3><p>After dusk, trust the bearing and lamp. Fog and distant wakes reduce information without hiding critical HUD details.</p></article>
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
    if (next !== null) requestAnimationFrame(() => this.uiRoot.querySelector<HTMLElement>("#overlay-host button")?.focus());
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
      case "open-help": this.overlayReturn = this.overlay; this.setOverlay("help"); break;
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
