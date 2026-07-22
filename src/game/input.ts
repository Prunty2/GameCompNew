import type { InputState } from "./simulation";

export class InputController {
  private readonly pressed = new Set<string>();

  constructor() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  }

  read(): InputState {
    return {
      x: Number(this.has("ArrowRight", "KeyD")) - Number(this.has("ArrowLeft", "KeyA")),
      y: Number(this.has("ArrowDown", "KeyS")) - Number(this.has("ArrowUp", "KeyW")),
    };
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
  }

  private has(...codes: string[]): boolean {
    return codes.some((code) => this.pressed.has(code));
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code.startsWith("Arrow")) event.preventDefault();
    this.pressed.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.pressed.delete(event.code);
  };

  private readonly onBlur = (): void => {
    this.pressed.clear();
  };
}

