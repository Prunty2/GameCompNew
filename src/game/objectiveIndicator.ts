export type ObjectiveIndicatorDirection = "left" | "right" | "down";

export interface ObjectiveIndicatorLayout {
  direction: ObjectiveIndicatorDirection;
  panelX: number;
  panelY: number;
  panelWidth: number;
  panelHeight: number;
  markerX: number;
  markerY: number;
  textCenterX: number;
}

const EDGE_INSET = 16;
const PANEL_HEIGHT = 64;
const MARKER_OFFSET = 32;

export function objectiveIndicatorLayout(
  goalScreenX: number,
  viewportWidth: number,
  viewportHeight: number,
  labelWidth: number,
): ObjectiveIndicatorLayout {
  const direction: ObjectiveIndicatorDirection = goalScreenX < 0
    ? "left"
    : goalScreenX > viewportWidth
      ? "right"
      : "down";
  const panelWidth = Math.min(280, Math.max(200, labelWidth + 104));
  const panelY = viewportHeight * 0.27 - PANEL_HEIGHT / 2;
  const panelX = direction === "left"
    ? EDGE_INSET
    : direction === "right"
      ? viewportWidth - EDGE_INSET - panelWidth
      : Math.min(
        viewportWidth - EDGE_INSET - panelWidth,
        Math.max(EDGE_INSET, goalScreenX - panelWidth / 2),
      );
  const markerX = direction === "right"
    ? panelX + panelWidth - MARKER_OFFSET
    : panelX + MARKER_OFFSET;
  const textStart = direction === "right" ? panelX + 10 : panelX + 64;
  const textEnd = direction === "right" ? panelX + panelWidth - 64 : panelX + panelWidth - 10;

  return {
    direction,
    panelX,
    panelY,
    panelWidth,
    panelHeight: PANEL_HEIGHT,
    markerX,
    markerY: panelY + PANEL_HEIGHT / 2,
    textCenterX: (textStart + textEnd) / 2,
  };
}
