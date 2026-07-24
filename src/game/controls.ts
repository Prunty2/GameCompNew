export const CONTROL_ACTIONS = ["left", "right", "brake", "boost", "action", "pause"] as const;

export type ControlAction = typeof CONTROL_ACTIONS[number];

export type ControlBindings = Record<ControlAction, string>;

export const DEFAULT_CONTROL_BINDINGS: ControlBindings = {
  left: "KeyA",
  right: "KeyD",
  brake: "KeyS",
  boost: "KeyW",
  action: "KeyE",
  pause: "KeyP",
};

export const CONTROL_LABELS: Record<ControlAction, { label: string; detail: string }> = {
  left: { label: "Travel left", detail: "Thrust or steer the hook left." },
  right: { label: "Travel right", detail: "Thrust or steer the hook right." },
  brake: { label: "Brake / down", detail: "Brake the boat or steer the hook down." },
  boost: { label: "Boost / up", detail: "Boost the engine or steer the hook up." },
  action: { label: "Interact", detail: "Dock, cast, and use nearby actions." },
  pause: { label: "Pause", detail: "Pause or resume while on the lake." },
};

export function isBindableCode(code: unknown): code is string {
  return typeof code === "string" && (
    /^Key[A-Z]$/.test(code)
    || /^Digit[0-9]$/.test(code)
    || /^Numpad[0-9]$/.test(code)
    || ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "Enter"].includes(code)
  );
}

export function formatKey(code: string): string {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^Numpad[0-9]$/.test(code)) return `Numpad ${code.slice(6)}`;
  return {
    ArrowLeft: "←",
    ArrowRight: "→",
    ArrowUp: "↑",
    ArrowDown: "↓",
    Space: "Space",
    Enter: "Enter",
  }[code] ?? code;
}

export function rebindControl(bindings: ControlBindings, action: ControlAction, code: string): ControlBindings {
  const next = { ...bindings };
  const conflictingAction = CONTROL_ACTIONS.find((candidate) => candidate !== action && next[candidate] === code);
  if (conflictingAction) next[conflictingAction] = next[action];
  next[action] = code;
  return next;
}
