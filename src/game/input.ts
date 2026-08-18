import type { InputState } from "./simulation";
import type { ControlAction, ControlBindings } from "./controls";

type VirtualControl = "left" | "right" | "boost" | "action";
export type DebugTimeJump = "transition-start" | "night-start";

export class InputController {
  private readonly pressed = new Set<string>();
  private readonly virtualPressed = new Set<VirtualControl>();
  private actionQueued = false;
  private escapeQueued = false;
  private pauseQueued = false;
  private debugTimeJumpQueued: DebugTimeJump | null = null;
  private debugBoostUnlockQueued = false;
  private hookPointer = { x: 0, y: 0 };
  private bindings = new AbortController();
  private pendingRebind: { action: ControlAction; callback: (code: string | null) => void } | null = null;

  constructor(private controlBindings: ControlBindings) {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  }

  read(): InputState {
    const travel = Number(this.hasAction("right") || this.virtualPressed.has("right"))
      - Number(this.hasAction("left") || this.virtualPressed.has("left"));
    const vertical = Number(this.hasAction("down")) - Number(this.hasAction("up"));
    return {
      travel,
      boost: this.hasAction("boost") || this.virtualPressed.has("boost"),
      hookX: this.hookPointer.x || travel,
      hookY: this.hookPointer.y || vertical,
    };
  }

  bindVirtualControls(root: HTMLElement): void {
    this.bindings.abort();
    this.bindings = new AbortController();
    const { signal } = this.bindings;
    for (const control of root.querySelectorAll<HTMLElement>("[data-control]")) {
      const name = control.dataset.control as VirtualControl | undefined;
      if (!name) continue;
      const press = (event: PointerEvent): void => {
        event.preventDefault();
        control.setPointerCapture(event.pointerId);
        control.classList.add("is-pressed");
        if (name === "action") this.actionQueued = true;
        else this.virtualPressed.add(name);
      };
      const release = (event: PointerEvent): void => {
        if (control.hasPointerCapture(event.pointerId)) control.releasePointerCapture(event.pointerId);
        control.classList.remove("is-pressed");
        this.virtualPressed.delete(name);
      };
      control.addEventListener("pointerdown", press, { signal });
      control.addEventListener("pointerup", release, { signal });
      control.addEventListener("pointercancel", release, { signal });
      control.addEventListener("contextmenu", (event) => event.preventDefault(), { signal });
    }

    const hookPad = root.querySelector<HTMLElement>("[data-hook-pad]");
    if (hookPad) this.bindHookPad(hookPad, signal);
  }

  consumeAction(): boolean {
    const queued = this.actionQueued;
    this.actionQueued = false;
    return queued;
  }

  consumeEscape(): boolean {
    const queued = this.escapeQueued;
    this.escapeQueued = false;
    return queued;
  }

  consumePause(): boolean {
    const queued = this.pauseQueued;
    this.pauseQueued = false;
    return queued;
  }

  consumeDebugTimeJump(): DebugTimeJump | null {
    const queued = this.debugTimeJumpQueued;
    this.debugTimeJumpQueued = null;
    return queued;
  }

  consumeDebugBoostUnlock(): boolean {
    const queued = this.debugBoostUnlockQueued;
    this.debugBoostUnlockQueued = false;
    return queued;
  }

  setControlBindings(bindings: ControlBindings): void {
    this.controlBindings = bindings;
    this.pressed.clear();
  }

  beginRebind(action: ControlAction, callback: (code: string | null) => void): void {
    this.pendingRebind = { action, callback };
    this.pressed.clear();
  }

  destroy(): void {
    this.bindings.abort();
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
  }

  private bindHookPad(hookPad: HTMLElement, signal: AbortSignal): void {
    const updateHook = (event: PointerEvent): void => {
      const bounds = hookPad.getBoundingClientRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      const radius = Math.max(1, Math.min(bounds.width, bounds.height) * 0.38);
      this.hookPointer = {
        x: clampUnit((event.clientX - centerX) / radius),
        y: clampUnit((event.clientY - centerY) / radius),
      };
      hookPad.style.setProperty("--stick-x", `${this.hookPointer.x * 30}px`);
      hookPad.style.setProperty("--stick-y", `${this.hookPointer.y * 30}px`);
    };
    const start = (event: PointerEvent): void => {
      event.preventDefault();
      hookPad.setPointerCapture(event.pointerId);
      updateHook(event);
    };
    const stop = (event: PointerEvent): void => {
      if (hookPad.hasPointerCapture(event.pointerId)) hookPad.releasePointerCapture(event.pointerId);
      this.hookPointer = { x: 0, y: 0 };
      hookPad.style.setProperty("--stick-x", "0px");
      hookPad.style.setProperty("--stick-y", "0px");
    };
    hookPad.addEventListener("pointerdown", start, { signal });
    hookPad.addEventListener("pointermove", (event) => {
      if (hookPad.hasPointerCapture(event.pointerId)) updateHook(event);
    }, { signal });
    hookPad.addEventListener("pointerup", stop, { signal });
    hookPad.addEventListener("pointercancel", stop, { signal });
  }

  private hasAction(action: ControlAction): boolean {
    return this.pressed.has(this.controlBindings[action]);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.pendingRebind) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const pending = this.pendingRebind;
      this.pendingRebind = null;
      pending.callback(event.code === "Escape" ? null : event.code);
      return;
    }
    const newlyPressed = !event.repeat && !this.pressed.has(event.code);
    this.pressed.add(event.code);
    if (import.meta.env.DEV && newlyPressed) {
      const debugTimeJump = debugTimeJumpForCode(event.code);
      if (debugTimeJump) {
        event.preventDefault();
        this.debugTimeJumpQueued = debugTimeJump;
        return;
      }
    }
    if (newlyPressed && event.code === "KeyB") {
      event.preventDefault();
      this.debugBoostUnlockQueued = true;
      return;
    }
    if (event.code.startsWith("Arrow") || event.code === "Space") event.preventDefault();
    if (newlyPressed && event.code === this.controlBindings.action) this.actionQueued = true;
    if (newlyPressed && event.code === "Escape") this.escapeQueued = true;
    if (newlyPressed && event.code === this.controlBindings.pause) this.pauseQueued = true;
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.pressed.delete(event.code);
  };

  private readonly onBlur = (): void => {
    this.pressed.clear();
    this.virtualPressed.clear();
    this.hookPointer = { x: 0, y: 0 };
  };
}

export function debugTimeJumpForCode(code: string): DebugTimeJump | null {
  if (code === "KeyG") return "transition-start";
  if (code === "KeyH") return "night-start";
  return null;
}

function clampUnit(value: number): number {
  return Math.max(-1, Math.min(1, value));
}
