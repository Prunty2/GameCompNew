import { BALANCE } from "./balance";
import {
  cheapestAffordableUpgrade,
  getInteractionPrompt,
  isLineDepthTutorialExploration,
  isUpgradeTutorialActive,
  navigationGuidance,
  type MarketTutorialStep,
  type Simulation,
} from "./simulation";

export type QuestOverlay =
  | "title"
  | "harbor"
  | "pause"
  | "settings"
  | "credits"
  | "controls"
  | "help"
  | "seasonReport"
  | null;

export type QuestHarborSection = "market" | "cargo" | "upgrades";
export type QuestUiArrowSide = "left" | "right" | "above" | "below";

export interface QuestViewContext {
  started: boolean;
  overlay: QuestOverlay;
  harborSection: QuestHarborSection;
  marketDetailOpen: boolean;
}

export interface QuestRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type QuestGuideStep = MarketTutorialStep
  | "upgrade-open"
  | "upgrade-buy"
  | "upgrade-return"
  | "upgrade-sail"
  | "upgrade-fish";

export interface QuestPresentation {
  active: boolean;
  hidden: boolean;
  step: QuestGuideStep;
  heading: string;
  title: string;
  index: number;
  totalSteps: number;
  uiTargetSelector: string | null;
  worldFollow: boolean;
  hookFollow: boolean;
}

export interface QuestFollowArrow {
  x: number;
  direction: -1 | 1;
}

export interface QuestUiArrowLayout {
  left: number;
  top: number;
  rotation: number;
}

const FOLLOW_SPACING = 0.048;
const FOLLOW_START = 0.052;
const FOLLOW_END_PADDING = 0.018;
const FOLLOW_MAX = 14;
const WORLD_ARRIVAL_PADDING = 0.002;
const HOOK_ARRIVAL_DISTANCE = 0.064;
export const QUEST_UI_ARROW_SIZE = 56;
const QUEST_UI_ARROW_GAP = 12;

const QUEST_COPY: Record<Exclude<MarketTutorialStep, "done">, { index: number; title: string }> = {
  inspect: { index: 1, title: "Choose Bluegill" },
  track: { index: 2, title: "Track catch" },
  catch: { index: 3, title: "Catch Bluegill" },
  sell: { index: 4, title: "Sell catch" },
  complete: { index: 5, title: "Sale complete" },
};

export function questPresentation(
  simulation: Simulation,
  view: QuestViewContext,
): QuestPresentation {
  const assignmentStep = simulation.progress.marketTutorialStep;
  const screenHidden = isQuestScreenHidden(view);
  if (
    assignmentStep === "inspect"
    || assignmentStep === "track"
    || assignmentStep === "catch"
    || assignmentStep === "sell"
  ) {
    const copy = QUEST_COPY[assignmentStep];
    if (screenHidden) {
      return {
        active: false,
        hidden: true,
        step: assignmentStep,
        heading: "Tutorial",
        title: copy.title,
        index: copy.index,
        totalSteps: 4,
        uiTargetSelector: null,
        worldFollow: false,
        hookFollow: false,
      };
    }
    return {
      active: true,
      hidden: false,
      step: assignmentStep,
      heading: "Tutorial",
      title: copy.title,
      index: copy.index,
      totalSteps: 4,
      uiTargetSelector: questUiTargetSelector(simulation, view, assignmentStep),
      worldFollow: shouldFollowWorld(simulation, view),
      hookFollow: shouldFollowHook(simulation),
    };
  }

  if (!isUpgradeTutorialActive(simulation) || screenHidden) {
    return idlePresentation("done", true);
  }

  if (isLineDepthTutorialExploration(simulation)) {
    const prompt = getInteractionPrompt(simulation);
    const atMosswater = prompt?.kind === "fishing" && prompt.spot === "mosswaterPool";
    const step: QuestGuideStep = simulation.dockedAt
      ? "upgrade-return"
      : atMosswater
        ? "upgrade-fish"
        : "upgrade-sail";
    return {
      active: true,
      hidden: false,
      step,
      heading: "Tutorial",
      title: step === "upgrade-return"
        ? "Return to lake"
        : step === "upgrade-fish"
          ? "Drop the line"
          : "Sail to Mosswater",
      index: step === "upgrade-return" ? 3 : step === "upgrade-sail" ? 4 : 5,
      totalSteps: 5,
      uiTargetSelector: upgradeUiTargetSelector(simulation, view, step, null),
      worldFollow: shouldFollowWorld(simulation, view),
      hookFollow: false,
    };
  }

  const upgrade = cheapestAffordableUpgrade(simulation);
  const onUpgrades = view.overlay === "harbor" && view.harborSection === "upgrades";
  const step: QuestGuideStep = onUpgrades || simulation.progress.upgradeTutorialStep === "buy"
    ? "upgrade-buy"
    : "upgrade-open";
  const onLake = view.overlay === null;
  return {
    active: true,
    hidden: false,
    step,
    heading: "Tutorial",
    title: step === "upgrade-buy" ? "Buy line depth" : onLake ? "Dock harbor" : "Open upgrades",
    index: step === "upgrade-buy" ? 2 : 1,
    totalSteps: 5,
    uiTargetSelector: upgradeUiTargetSelector(simulation, view, step, upgrade),
    worldFollow: shouldFollowWorld(simulation, view),
    hookFollow: false,
  };
}

export function questFollowArrows(simulation: Simulation): QuestFollowArrow[] {
  if (simulation.dockedAt) return [];
  if (!isUpgradeTutorialActive(simulation) && !isWorldFollowStep(simulation.progress.marketTutorialStep)) {
    return [];
  }
  if (simulation.mode !== "cruising") return [];
  const goal = navigationGuidance(simulation);
  if (!goal) return [];
  const from = simulation.boat.x;
  const to = goal.point.x;
  const span = to - from;
  if (Math.abs(span) <= worldArrivalRadius(simulation)) return [];
  const direction: -1 | 1 = span > 0 ? 1 : -1;
  const start = from + direction * FOLLOW_START;
  const end = to - direction * FOLLOW_END_PADDING;
  const ahead = direction > 0 ? start < end : start > end;
  if (!ahead) {
    const lead = Math.min(FOLLOW_START, Math.max(0.028, Math.abs(span) * 0.75));
    return [{ x: from + direction * lead, direction }];
  }
  const arrows: QuestFollowArrow[] = [];
  const step = direction * FOLLOW_SPACING;
  for (let x = start; direction > 0 ? x < end : x > end; x += step) {
    arrows.push({ x, direction });
    if (arrows.length >= FOLLOW_MAX) break;
  }
  return arrows;
}

export function questHookTargetIndex(simulation: Simulation): number | null {
  if (!shouldFollowHook(simulation)) return null;
  const fishing = simulation.fishing;
  if (!fishing) return null;
  const targetSpecies = simulation.progress.marketTarget ?? "bluegill";
  let best: { index: number; distance: number } | null = null;
  for (const [index, target] of fishing.targets.entries()) {
    if (target.species !== targetSpecies) continue;
    const distance = Math.hypot(target.x - fishing.hook.x, target.y - fishing.hook.y);
    if (!best || distance < best.distance) best = { index, distance };
  }
  if (!best || best.distance <= HOOK_ARRIVAL_DISTANCE) return null;
  return best.index;
}

export function questUiArrowLayout(
  target: QuestRect,
  side: QuestUiArrowSide,
  size = QUEST_UI_ARROW_SIZE,
  gap = QUEST_UI_ARROW_GAP,
): QuestUiArrowLayout {
  const centerX = target.left + target.width / 2;
  const centerY = target.top + target.height / 2;
  switch (side) {
    case "left":
      return { left: target.left - gap - size, top: centerY - size / 2, rotation: 0 };
    case "right":
      return { left: target.left + target.width + gap, top: centerY - size / 2, rotation: 180 };
    case "above":
      return { left: centerX - size / 2, top: target.top - gap - size, rotation: 90 };
    case "below":
      return { left: centerX - size / 2, top: target.top + target.height + gap, rotation: -90 };
  }
}

export function chooseQuestArrowSide(
  target: QuestRect,
  viewport: { width: number; height: number },
  avoid: QuestRect | null = null,
  size = QUEST_UI_ARROW_SIZE,
): QuestUiArrowSide {
  const centerX = target.left + target.width / 2;
  const ranked: QuestUiArrowSide[] = centerX > viewport.width * 0.55
    ? ["left", "below", "above", "right"]
    : centerX < viewport.width * 0.38
      ? ["right", "below", "left", "above"]
      : target.top + target.height / 2 > viewport.height * 0.62
        ? ["above", "left", "right", "below"]
        : ["below", "left", "right", "above"];
  for (const side of ranked) {
    const layout = questUiArrowLayout(target, side, size);
    const arrow = { left: layout.left, top: layout.top, width: size, height: size };
    if (!isOnscreen(arrow, viewport, 8)) continue;
    if (avoid && rectsOverlap(arrow, avoid, 8)) continue;
    return side;
  }
  return ranked[0] ?? "left";
}

function questUiTargetSelector(
  simulation: Simulation,
  view: QuestViewContext,
  step: Exclude<MarketTutorialStep, "done">,
): string | null {
  if (view.overlay === "harbor") {
    if (view.harborSection !== "market" && step !== "complete") {
      return '[data-action="harbor-section"][data-harbor-section="market"]';
    }
    switch (step) {
      case "inspect":
        return '[data-action="select-market-fish"][data-species="bluegill"]';
      case "track":
        return view.marketDetailOpen
          ? '[data-action="track-market-fish"][data-species="bluegill"]'
          : '[data-action="select-market-fish"][data-species="bluegill"]';
      case "catch":
        return view.marketDetailOpen
          ? '[data-action="close-market-fish-detail"]'
          : '[data-action="undock"]';
      case "sell":
        return view.marketDetailOpen
          ? '[data-action="sell-market-fish"][data-species="bluegill"]'
          : '[data-action="select-market-fish"][data-species="bluegill"]';
      case "complete":
        return null;
    }
  }

  if (view.overlay === null && simulation.mode === "cruising") {
    const prompt = getInteractionPrompt(simulation);
    if (step === "catch" && prompt?.kind === "fishing" && prompt.spot === "sunwardShoal") {
      return "#context-action";
    }
    if (step === "sell" && prompt?.kind === "harbor") {
      return "#context-action";
    }
    if ((step === "inspect" || step === "track") && prompt?.kind === "harbor") {
      return "#context-action";
    }
  }

  return null;
}

function upgradeUiTargetSelector(
  simulation: Simulation,
  view: QuestViewContext,
  step: QuestGuideStep,
  upgrade: ReturnType<typeof cheapestAffordableUpgrade>,
): string | null {
  if (view.overlay === "harbor") {
    if (step === "upgrade-return") {
      return '[data-action="undock"]';
    }
    if (step === "upgrade-buy" && upgrade) {
      return `[data-action="buy-upgrade"][data-upgrade="${upgrade}"]`;
    }
    if (view.harborSection !== "upgrades") {
      return '[data-action="harbor-section"][data-harbor-section="upgrades"]';
    }
  }
  if (view.overlay === null && simulation.mode === "cruising") {
    const prompt = getInteractionPrompt(simulation);
    if (step === "upgrade-fish" && prompt?.kind === "fishing" && prompt.spot === "mosswaterPool") {
      return "#context-action";
    }
    if (prompt?.kind === "harbor") return "#context-action";
  }
  return null;
}

function shouldFollowWorld(simulation: Simulation, view: QuestViewContext): boolean {
  if (view.overlay !== null || simulation.mode !== "cruising" || simulation.dockedAt) return false;
  if (isUpgradeTutorialActive(simulation) || isWorldFollowStep(simulation.progress.marketTutorialStep)) {
    const goal = navigationGuidance(simulation);
    return goal !== null && Math.abs(goal.point.x - simulation.boat.x) > worldArrivalRadius(simulation);
  }
  return false;
}

function worldArrivalRadius(simulation: Simulation): number {
  const goal = navigationGuidance(simulation);
  const radius = goal?.kicker === "FISH AT" ? BALANCE.fishingRadius : BALANCE.dockRadius;
  return radius + WORLD_ARRIVAL_PADDING;
}

function shouldFollowHook(simulation: Simulation): boolean {
  return simulation.progress.marketTutorialStep === "catch"
    && simulation.mode === "fishing"
    && simulation.fishing !== null
    && simulation.fishing.reeling === null
    && simulation.fishing.exitingAt === null;
}

function isWorldFollowStep(step: MarketTutorialStep): boolean {
  return step === "inspect" || step === "track" || step === "catch" || step === "sell";
}

function isQuestScreenHidden(view: QuestViewContext): boolean {
  return !view.started
    || view.overlay === "title"
    || view.overlay === "pause"
    || view.overlay === "settings"
    || view.overlay === "credits"
    || view.overlay === "controls"
    || view.overlay === "help"
    || view.overlay === "seasonReport";
}

function idlePresentation(step: QuestGuideStep, hidden: boolean): QuestPresentation {
  return {
    active: false,
    hidden,
    step,
    heading: "",
    title: "",
    index: 0,
    totalSteps: 0,
    uiTargetSelector: null,
    worldFollow: false,
    hookFollow: false,
  };
}

function isOnscreen(rect: QuestRect, viewport: { width: number; height: number }, inset: number): boolean {
  return rect.left >= inset
    && rect.top >= inset
    && rect.left + rect.width <= viewport.width - inset
    && rect.top + rect.height <= viewport.height - inset;
}

function rectsOverlap(first: QuestRect, second: QuestRect, padding = 0): boolean {
  return first.left < second.left + second.width + padding
    && first.left + first.width + padding > second.left
    && first.top < second.top + second.height + padding
    && first.top + first.height + padding > second.top;
}
