// Three cargo-menu variants, switchable via ?cargoPrototype=, on the existing game route.
import dockBackdropUrl from "../assets/dock-brindle-day.jpg";
import padlockUrl from "../assets/padlock-icon.png";
import wordmarkUrl from "../assets/fshing-wordmark.png";
import "./cargoPrototype.css";

type VariantKey = "A" | "B" | "C";
type HarborSection = "market" | "cargo" | "services";

interface CargoItem {
  freshness: number;
  name: string;
  slot: number;
}

interface PrototypeState {
  cargo: CargoItem[];
  capacity: number;
  section: HarborSection;
  selectedSlot: number;
  helpOpen: boolean;
  returned: boolean;
  undoItem: CargoItem | null;
}

const VARIANTS: ReadonlyArray<{ key: VariantKey; name: string }> = [
  { key: "A", name: "Hold manifest" },
  { key: "B", name: "Deck plan" },
  { key: "C", name: "Crate ledger" },
];

const SAMPLE_CARGO: CargoItem[] = [
  { freshness: 88, name: "River perch", slot: 1 },
  { freshness: 61, name: "Silver bream", slot: 2 },
];

const icon = (name: "cargo" | "help" | "market" | "services" | "shell" | "boat"): string => ({
  cargo: "▣",
  help: "✦",
  market: "↗",
  services: "⌁",
  shell: "◒",
  boat: "➟",
})[name];

function readVariant(): VariantKey {
  const value = new URLSearchParams(window.location.search).get("cargoPrototype")?.toUpperCase();
  return value === "B" || value === "C" ? value : "A";
}

function freshnessClass(freshness: number): string {
  if (freshness >= 75) return "is-fresh";
  if (freshness >= 45) return "is-fading";
  return "is-low";
}

function freshnessMarkup(item: CargoItem): string {
  return `<span class="cp-freshness ${freshnessClass(item.freshness)}"><i style="--freshness:${item.freshness}%"></i><strong>${item.freshness}%</strong></span>`;
}

function releaseButton(item: CargoItem, label = "Release"): string {
  return `<button class="cp-release" type="button" data-action="release" data-slot="${item.slot}" aria-label="Release ${item.name} from cargo"><span aria-hidden="true">↗</span>${label}</button>`;
}

function VariantA(state: PrototypeState): string {
  const openSlots = Array.from({ length: state.capacity }, (_, index) => index + 1);
  const manifest = openSlots.map((slot) => {
    const item = state.cargo.find((entry) => entry.slot === slot);
    if (!item) {
      return `<li class="cp-manifest-row is-empty"><span class="cp-slot-tag">${String(slot).padStart(2, "0")}</span><span class="cp-fish-mark" aria-hidden="true">＋</span><div><strong>Ready for catch</strong><small>Empty · chilled hold</small></div><span class="cp-status-chip">AVAILABLE</span></li>`;
    }
    return `<li class="cp-manifest-row"><span class="cp-slot-tag">${String(slot).padStart(2, "0")}</span><span class="cp-fish-mark" aria-hidden="true">◖≈</span><div><strong>${item.name}</strong><small>Caught today · hold ${slot}</small></div>${freshnessMarkup(item)}${releaseButton(item)}</li>`;
  }).join("");

  return `<section class="cp-variant cp-variant-a" aria-labelledby="cp-cargo-heading">
    <aside class="cp-hold-summary">
      <span class="cp-eyebrow">BOAT HOLD</span>
      <h3 id="cp-cargo-heading">Cargo manifest</h3>
      <div class="cp-gauge" style="--used:${state.cargo.length};--capacity:${state.capacity}">
        <strong>${state.cargo.length}<small> / ${state.capacity}</small></strong><span>slots used</span>
      </div>
      <dl class="cp-stat-list">
        <div><dt>Freshest catch</dt><dd>${Math.max(...state.cargo.map((item) => item.freshness), 0)}%</dd></div>
        <div><dt>Reserve space</dt><dd>${state.capacity - state.cargo.length}</dd></div>
        <div><dt>Maximum hold</dt><dd>10</dd></div>
      </dl>
      <button class="cp-upgrade-link" type="button" data-action="upgrade">Upgrade hold <span>→</span></button>
    </aside>
    <div class="cp-manifest">
      <div class="cp-section-heading"><div><span class="cp-eyebrow">TODAY'S CATCH</span><h4>Loaded cargo</h4></div><span>${state.cargo.length} carried · ${state.capacity} unlocked</span></div>
      <ol>${manifest}</ol>
      <button class="cp-locked-summary" type="button" data-action="upgrade"><img src="${padlockUrl}" alt="" /><span><strong>${10 - state.capacity} locked slots</strong><small>Expand the hold in Services</small></span><b>VIEW UPGRADE</b></button>
    </div>
  </section>`;
}

function deckSlot(state: PrototypeState, slot: number): string {
  const item = state.cargo.find((entry) => entry.slot === slot);
  if (item) {
    return `<button class="cp-deck-slot is-loaded ${freshnessClass(item.freshness)}" type="button" data-action="select" data-slot="${slot}" aria-label="Slot ${slot}, ${item.name}, ${item.freshness}% fresh"><span>${String(slot).padStart(2, "0")}</span><b aria-hidden="true">◖≈</b><small>${item.freshness}%</small></button>`;
  }
  if (slot <= state.capacity) {
    return `<div class="cp-deck-slot is-open" aria-label="Slot ${slot}, empty"><span>${String(slot).padStart(2, "0")}</span><b aria-hidden="true">＋</b><small>OPEN</small></div>`;
  }
  return `<button class="cp-deck-slot is-locked" type="button" data-action="upgrade" aria-label="Slot ${slot} locked. Open cargo upgrades"><span>${String(slot).padStart(2, "0")}</span><img src="${padlockUrl}" alt="" /><small>LOCKED</small></button>`;
}

function VariantB(state: PrototypeState): string {
  const selected = state.cargo.find((item) => item.slot === state.selectedSlot) ?? state.cargo[0];
  return `<section class="cp-variant cp-variant-b" aria-labelledby="cp-deck-heading">
    <div class="cp-deck-copy"><span class="cp-eyebrow">DECK PLAN · LIVE HOLD STATUS</span><h3 id="cp-deck-heading">Your boat at a glance</h3><p>Each bay maps to a physical space below deck. Loaded catches glow by freshness.</p></div>
    <div class="cp-boat-plan">
      <span class="cp-bow-label">BOW</span><div class="cp-cabin"><span aria-hidden="true">⌂</span><small>WHEELHOUSE</small></div>
      <div class="cp-hold-bays">${Array.from({ length: 10 }, (_, index) => deckSlot(state, index + 1)).join("")}</div>
      <div class="cp-stern"><span>ENGINE</span><i></i><i></i><i></i></div><span class="cp-stern-label">STERN</span>
    </div>
    <aside class="cp-deck-inspector">
      ${selected ? `<div><span class="cp-eyebrow">SELECTED BAY ${String(selected.slot).padStart(2, "0")}</span><h4>${selected.name}</h4><p>Freshness is holding. Selling sooner protects the realised price.</p></div><div class="cp-inspector-fresh"><strong>${selected.freshness}%</strong><span>FRESH</span></div>${releaseButton(selected, "Release catch")}` : `<div><span class="cp-eyebrow">HOLD EMPTY</span><h4>Ready to fish</h4><p>Your next catch will load into bay one.</p></div>`}
      <button class="cp-upgrade-link" type="button" data-action="upgrade">${10 - state.capacity} bays locked <span>Open Services →</span></button>
    </aside>
  </section>`;
}

function VariantC(state: PrototypeState): string {
  const selected = state.cargo.find((item) => item.slot === state.selectedSlot) ?? state.cargo[0] ?? null;
  const rail = Array.from({ length: 10 }, (_, index) => {
    const slot = index + 1;
    const item = state.cargo.find((entry) => entry.slot === slot);
    const selectedClass = selected?.slot === slot ? " is-selected" : "";
    if (item) return `<button class="cp-rail-slot is-loaded${selectedClass}" type="button" data-action="select" data-slot="${slot}"><b>${String(slot).padStart(2, "0")}</b><span aria-hidden="true">◖≈</span><small>${item.freshness}%</small></button>`;
    if (slot <= state.capacity) return `<button class="cp-rail-slot is-open${selectedClass}" type="button" data-action="select" data-slot="${slot}"><b>${String(slot).padStart(2, "0")}</b><span aria-hidden="true">＋</span><small>EMPTY</small></button>`;
    return `<button class="cp-rail-slot is-locked" type="button" data-action="upgrade"><b>${String(slot).padStart(2, "0")}</b><img src="${padlockUrl}" alt="" /><small>LOCKED</small></button>`;
  }).join("");

  return `<section class="cp-variant cp-variant-c" aria-labelledby="cp-ledger-heading">
    <div class="cp-ledger-heading"><div><span class="cp-eyebrow">CARGO LEDGER</span><h3 id="cp-ledger-heading">${state.cargo.length} catches aboard</h3></div><div class="cp-ledger-capacity"><span>HOLD</span><strong>${state.cargo.length} / ${state.capacity}</strong></div></div>
    <nav class="cp-slot-rail" aria-label="Cargo slots">${rail}</nav>
    <div class="cp-crate-stage">
      ${selected ? `<div class="cp-crate-art" aria-hidden="true"><span>${String(selected.slot).padStart(2, "0")}</span><b>◖≈</b><i></i></div><div class="cp-crate-copy"><span class="cp-eyebrow">CRATE ${String(selected.slot).padStart(2, "0")}</span><h4>${selected.name}</h4><p>Caught today at Mosswater Pool. Keep chilled or release it safely.</p><div class="cp-freshness-large"><span><strong>${selected.freshness}%</strong> fresh</span><i><b style="width:${selected.freshness}%"></b></i></div></div><div class="cp-crate-actions">${releaseButton(selected, "Release to lake")}<small>This action can be undone.</small></div>` : `<div class="cp-empty-ledger"><b>＋</b><h4>No catch selected</h4><p>Choose an occupied crate above.</p></div>`}
    </div>
    <div class="cp-capacity-track"><span style="--unlocked:${state.capacity * 10}%"></span><strong>${state.capacity} unlocked</strong><small>${10 - state.capacity} available through cargo upgrades</small><button type="button" data-action="upgrade">EXPAND HOLD →</button></div>
  </section>`;
}

function PrototypeSwitcher(variant: VariantKey): string {
  const meta = VARIANTS.find((entry) => entry.key === variant) ?? VARIANTS[0];
  return `<div class="cp-switcher" role="group" aria-label="Cargo prototype variants"><button type="button" data-action="previous-variant" aria-label="Previous variant">←</button><span><small>PROTOTYPE</small><strong>${meta.key} · ${meta.name}</strong></span><button type="button" data-action="next-variant" aria-label="Next variant">→</button></div>`;
}

function harborTabs(section: HarborSection): string {
  const tabs: Array<{ id: HarborSection; icon: "market" | "cargo" | "services"; label: string }> = [
    { id: "market", icon: "market", label: "Market" },
    { id: "cargo", icon: "cargo", label: "Cargo" },
    { id: "services", icon: "services", label: "Services" },
  ];
  return `<nav class="cp-tabs" aria-label="Harbor sections">${tabs.map((tab) => `<button class="${section === tab.id ? "is-active" : ""}" type="button" data-action="tab" data-section="${tab.id}" aria-pressed="${section === tab.id}"><span aria-hidden="true">${icon(tab.icon)}</span>${tab.label}</button>`).join("")}</nav>`;
}

function placeholder(section: Exclude<HarborSection, "cargo">): string {
  return `<section class="cp-placeholder"><span aria-hidden="true">${section === "market" ? icon("market") : icon("services")}</span><p>The ${section} screen is unchanged in this prototype.</p><button type="button" data-action="tab" data-section="cargo">Return to Cargo</button></section>`;
}

function render(root: HTMLElement, state: PrototypeState): void {
  const variant = readVariant();
  const content = state.section === "cargo"
    ? variant === "A" ? VariantA(state) : variant === "B" ? VariantB(state) : VariantC(state)
    : placeholder(state.section);

  root.innerHTML = `<div class="cargo-prototype" style="--cp-backdrop:url(&quot;${dockBackdropUrl}&quot;)">
    ${state.returned ? `<section class="cp-returned"><span aria-hidden="true">${icon("boat")}</span><h1>Back on the lake</h1><p>Return-to-lake behavior is unchanged.</p><button type="button" data-action="reopen">Reopen cargo prototype</button></section>` : `<section class="cp-panel" role="dialog" aria-labelledby="cp-harbor-title">
      <header class="cp-header"><div><img src="${wordmarkUrl}" alt="FSHING" /><i></i><h2 id="cp-harbor-title">Brindle Harbor</h2></div><span class="cp-shells" aria-label="296 shells"><b aria-hidden="true">${icon("shell")}</b><strong>296</strong></span></header>
      ${harborTabs(state.section)}
      <main class="cp-content">${content}</main>
      <footer class="cp-footer"><button type="button" data-action="help"><span aria-hidden="true">${icon("help")}</span>Help</button><button class="cp-return" type="button" data-action="return"><span aria-hidden="true">${icon("boat")}</span>Return to Lake</button></footer>
    </section>`}
    ${state.helpOpen ? `<div class="cp-modal-backdrop"><section class="cp-modal" role="dialog" aria-modal="true" aria-labelledby="cp-help-title"><span class="cp-eyebrow">CARGO HELP</span><h2 id="cp-help-title">Manage your catch</h2><p>Freshness falls while you travel. Release a catch to free its slot, or visit Services to unlock more hold space.</p><button type="button" data-action="close-help">Back to cargo</button></section></div>` : ""}
    ${state.undoItem ? `<div class="cp-toast" role="status"><span>${state.undoItem.name} released to the lake.</span><button type="button" data-action="undo">Undo</button></div>` : ""}
    ${PrototypeSwitcher(variant)}
  </div>`;
}

function cycleVariant(direction: -1 | 1, root: HTMLElement, state: PrototypeState): void {
  const current = VARIANTS.findIndex((entry) => entry.key === readVariant());
  const next = VARIANTS[(current + direction + VARIANTS.length) % VARIANTS.length];
  const url = new URL(window.location.href);
  url.searchParams.set("cargoPrototype", next.key);
  window.history.replaceState({}, "", url);
  render(root, state);
}

export function mountCargoPrototype(root: HTMLElement): void {
  const state: PrototypeState = {
    cargo: SAMPLE_CARGO.map((item) => ({ ...item })),
    capacity: 4,
    section: "cargo",
    selectedSlot: 1,
    helpOpen: false,
    returned: false,
    undoItem: null,
  };
  root.classList.add("cargo-prototype-root");
  render(root, state);

  root.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    if (action === "previous-variant" || action === "next-variant") {
      cycleVariant(action === "previous-variant" ? -1 : 1, root, state);
      return;
    }
    if (action === "tab") state.section = (target.dataset.section as HarborSection | undefined) ?? "cargo";
    if (action === "upgrade") state.section = "services";
    if (action === "select") state.selectedSlot = Number(target.dataset.slot ?? 1);
    if (action === "help") state.helpOpen = true;
    if (action === "close-help") state.helpOpen = false;
    if (action === "return") state.returned = true;
    if (action === "reopen") state.returned = false;
    if (action === "release") {
      const slot = Number(target.dataset.slot);
      const item = state.cargo.find((entry) => entry.slot === slot) ?? null;
      if (item) {
        state.undoItem = { ...item };
        state.cargo = state.cargo.filter((entry) => entry.slot !== slot);
        state.selectedSlot = state.cargo[0]?.slot ?? 1;
      }
    }
    if (action === "undo" && state.undoItem) {
      state.cargo = [...state.cargo, state.undoItem].sort((a, b) => a.slot - b.slot);
      state.selectedSlot = state.undoItem.slot;
      state.undoItem = null;
    }
    render(root, state);
  });

  window.addEventListener("keydown", (event) => {
    const active = document.activeElement;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active?.getAttribute("contenteditable") === "true") return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    cycleVariant(event.key === "ArrowLeft" ? -1 : 1, root, state);
  });
}
