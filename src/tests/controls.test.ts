import { describe, expect, test } from "vitest";
import {
  DEFAULT_CONTROL_BINDINGS,
  isBindableCode,
  rebindControl,
} from "../game/controls";
import { debugTimeJumpForCode } from "../game/input";

describe("control bindings", () => {
  test("maps temporary dusk and night debug shortcuts", () => {
    expect(debugTimeJumpForCode("KeyG")).toBe("transition-start");
    expect(debugTimeJumpForCode("KeyH")).toBe("night-start");
    expect(debugTimeJumpForCode("KeyJ")).toBeNull();
  });

  test("uses W and S for vertical hook steering by default", () => {
    expect(DEFAULT_CONTROL_BINDINGS.up).toBe("KeyW");
    expect(DEFAULT_CONTROL_BINDINGS.down).toBe("KeyS");
  });

  test("allows W and S to be rebound and swaps occupied bindings", () => {
    expect(isBindableCode("KeyW")).toBe(true);
    expect(isBindableCode("KeyS")).toBe(true);

    const rebound = rebindControl(DEFAULT_CONTROL_BINDINGS, "action", "KeyW");
    expect(rebound.action).toBe("KeyW");
    expect(rebound.up).toBe("KeyE");
  });
});
