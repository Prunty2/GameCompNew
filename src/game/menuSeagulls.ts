import seagullFlightAssetUrl from "../assets/seagull-flight.png";

export const seagullFlightUrl = seagullFlightAssetUrl;

const MIN_FLOCK_SIZE = 2;
const MAX_FLOCK_SIZE = 5;
const FIRST_FLOCK_DELAY_MS = 900;
const MIN_FLOCK_GAP_MS = 7_000;
const FLOCK_GAP_VARIANCE_MS = 7_000;

export interface SeagullFlightPlan {
  delayMs: number;
  durationMs: number;
  flapDelayMs: number;
  size: number;
  keyframes: Keyframe[];
}

export interface SeagullFlockPlan {
  direction: -1 | 1;
  flights: SeagullFlightPlan[];
}

function randomBetween(random: () => number, minimum: number, maximum: number): number {
  return minimum + random() * (maximum - minimum);
}

export function createSeagullFlockPlan(
  width: number,
  height: number,
  random: () => number = Math.random,
): SeagullFlockPlan {
  const count = MIN_FLOCK_SIZE + Math.floor(random() * (MAX_FLOCK_SIZE - MIN_FLOCK_SIZE + 1));
  const direction: -1 | 1 = random() < 0.5 ? 1 : -1;
  const baseY = randomBetween(random, height * 0.06, height * 0.21);
  const groupDuration = randomBetween(random, 9_000, 13_000);
  const flights = Array.from({ length: count }, (_, index): SeagullFlightPlan => {
    const size = randomBetween(random, 46, Math.min(78, Math.max(52, width * 0.065)));
    const laneOffset = (index - (count - 1) / 2) * randomBetween(random, 12, 22);
    const drift = randomBetween(random, -22, 22);
    const wobble = randomBetween(random, 9, 22);
    const startX = direction === 1 ? -size * 1.35 : width + size * 1.35;
    const endX = direction === 1 ? width + size * 1.35 : -size * 1.35;
    const xAt = (progress: number): number => startX + (endX - startX) * progress;
    const yAt = (progress: number, deviation = 0): number => (
      baseY + laneOffset + drift * progress + deviation
    );
    const rotationDirection = direction === 1 ? 1 : -1;

    return {
      delayMs: index * randomBetween(random, 80, 230) + randomBetween(random, 0, 180),
      durationMs: groupDuration * randomBetween(random, 0.88, 1.12),
      flapDelayMs: -randomBetween(random, 0, 620),
      size,
      keyframes: [
        { opacity: 0, transform: `translate3d(${startX}px, ${yAt(0)}px, 0) rotate(0deg)` },
        { opacity: 0.92, offset: 0.08 },
        {
          transform: `translate3d(${xAt(0.27)}px, ${yAt(0.27, wobble)}px, 0) rotate(${rotationDirection * 2.4}deg)`,
          offset: 0.27,
        },
        {
          transform: `translate3d(${xAt(0.53)}px, ${yAt(0.53, -wobble * 0.65)}px, 0) rotate(${-rotationDirection * 1.8}deg)`,
          offset: 0.53,
        },
        {
          transform: `translate3d(${xAt(0.78)}px, ${yAt(0.78, wobble * 0.4)}px, 0) rotate(${rotationDirection * 1.2}deg)`,
          offset: 0.78,
        },
        { opacity: 0.92, offset: 0.92 },
        { opacity: 0, transform: `translate3d(${endX}px, ${yAt(1)}px, 0) rotate(0deg)` },
      ],
    };
  });

  return { direction, flights };
}

export class MenuSeagulls {
  private container: HTMLElement | null = null;
  private flockTimer: number | undefined;
  private animations: Animation[] = [];
  private readonly motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  private settingReducedMotion = false;

  private readonly onMotionPreferenceChange = (): void => {
    if (this.motionQuery.matches) {
      this.clearFlockTimer();
      this.clearFlights();
    } else {
      this.scheduleFlock(FIRST_FLOCK_DELAY_MS);
    }
  };

  start(container: HTMLElement, settingReducedMotion: boolean): void {
    this.stop();
    this.container = container;
    this.settingReducedMotion = settingReducedMotion;
    this.motionQuery.addEventListener("change", this.onMotionPreferenceChange);
    if (!this.motionDisabled()) this.scheduleFlock(FIRST_FLOCK_DELAY_MS);
  }

  stop(): void {
    this.clearFlockTimer();
    this.motionQuery.removeEventListener("change", this.onMotionPreferenceChange);
    this.clearFlights();
    this.container = null;
  }

  private motionDisabled(): boolean {
    return this.settingReducedMotion || this.motionQuery.matches;
  }

  private clearFlockTimer(): void {
    if (this.flockTimer === undefined) return;
    window.clearTimeout(this.flockTimer);
    this.flockTimer = undefined;
  }

  private scheduleFlock(delayMs: number): void {
    if (!this.container || this.motionDisabled() || this.flockTimer !== undefined) return;
    this.flockTimer = window.setTimeout(() => {
      this.flockTimer = undefined;
      this.releaseFlock();
      this.scheduleFlock(MIN_FLOCK_GAP_MS + Math.random() * FLOCK_GAP_VARIANCE_MS);
    }, delayMs);
  }

  private releaseFlock(): void {
    if (!this.container || this.motionDisabled()) return;
    const bounds = this.container.getBoundingClientRect();
    const plan = createSeagullFlockPlan(bounds.width, bounds.height);
    const flock = document.createElement("div");
    flock.className = `menu-seagull-flock is-flying-${plan.direction === 1 ? "right" : "left"}`;
    flock.dataset.flockSize = String(plan.flights.length);
    flock.setAttribute("aria-hidden", "true");
    let activeFlights = plan.flights.length;

    plan.flights.forEach((flight, index) => {
      const bird = document.createElement("span");
      bird.className = "menu-seagull";
      bird.style.setProperty("--seagull-flight-art", `url(${JSON.stringify(seagullFlightUrl)})`);
      bird.style.setProperty("--seagull-size", `${flight.size}px`);
      bird.style.setProperty("--seagull-flap-delay", `${flight.flapDelayMs}ms`);
      bird.style.zIndex = String(plan.flights.length - index);
      flock.append(bird);

      const animation = bird.animate(flight.keyframes, {
        delay: flight.delayMs,
        duration: flight.durationMs,
        easing: "linear",
        fill: "both",
      });
      animation.onfinish = () => {
        this.animations = this.animations.filter((candidate) => candidate !== animation);
        activeFlights -= 1;
        if (activeFlights === 0) flock.remove();
      };
      this.animations.push(animation);
    });

    this.container.append(flock);
  }

  private clearFlights(): void {
    this.animations.forEach((animation) => animation.cancel());
    this.animations = [];
    this.container?.replaceChildren();
  }
}
