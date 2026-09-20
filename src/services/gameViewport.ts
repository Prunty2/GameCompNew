export type AspectRatioMode = "ask" | "16:9" | "fill";

export interface ViewportRect {
  width: number;
  height: number;
  left: number;
  top: number;
}

const RECOMMENDED_RATIO = 16 / 9;

export function isAspectRatioMode(value: unknown): value is AspectRatioMode {
  return value === "ask" || value === "16:9" || value === "fill";
}

export function needsAspectRatioNotice(width: number, height: number): boolean {
  return width > 0 && height > 0 && Math.abs(width / height / RECOMMENDED_RATIO - 1) > 0.02;
}

export function gameViewportRect(width: number, height: number, mode: AspectRatioMode): ViewportRect {
  const viewportWidth = mode === "16:9" ? Math.min(width, height * RECOMMENDED_RATIO) : width;
  const viewportHeight = mode === "16:9" ? viewportWidth / RECOMMENDED_RATIO : height;
  return {
    width: viewportWidth,
    height: viewportHeight,
    left: (width - viewportWidth) / 2,
    top: (height - viewportHeight) / 2,
  };
}

export class GameViewport {
  private active = false;
  private noticeTimer: number | undefined;
  private readonly notice: HTMLDialogElement;
  private returnFocus: HTMLElement | null = null;

  constructor(
    private readonly root: HTMLElement,
    private mode: AspectRatioMode,
    private readonly onChoice: (mode: AspectRatioMode) => void,
    private readonly onNoticeChange: (open: boolean) => void,
  ) {
    this.notice = document.createElement("dialog");
    this.notice.className = "aspect-ratio-notice";
    this.notice.setAttribute("aria-labelledby", "aspect-ratio-heading");
    this.notice.setAttribute("aria-describedby", "aspect-ratio-description");
    this.notice.innerHTML = `
      <h2 id="aspect-ratio-heading">Best played in 16:9</h2>
      <p id="aspect-ratio-description">FSHING is recommended to be played in a 16:9 aspect ratio. Your current window has a different shape, which can expose the edges of the scenery.</p>
      <p>Use 16:9 to keep the intended view with black bars. You can change this in Settings → Display.</p>
      <div class="aspect-ratio-actions">
        <button type="button" data-aspect-choice="16:9" autofocus>Use 16:9</button>
        <button type="button" data-aspect-choice="fill">Keep current ratio</button>
      </div>`;
    this.notice.addEventListener("click", (event) => {
      const choice = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-aspect-choice]")?.dataset.aspectChoice;
      if (isAspectRatioMode(choice)) this.choose(choice);
    });
    this.notice.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.choose("fill");
    });
    document.body.append(this.notice);
    window.addEventListener("resize", this.resize);
    this.resize();
  }

  get noticeOpen(): boolean {
    return this.notice.open;
  }

  get size(): { width: number; height: number } {
    // A native resize can change innerWidth before its resize event is delivered.
    // New fishing sessions must use the current intended canvas size immediately.
    const { width, height } = gameViewportRect(window.innerWidth, window.innerHeight, this.mode);
    return { width: Math.round(width), height: Math.round(height) };
  }

  start(): void {
    this.active = true;
    this.resize();
  }

  setMode(mode: AspectRatioMode): void {
    this.mode = mode;
    this.resize();
  }

  private choose(mode: AspectRatioMode): void {
    this.setMode(mode);
    this.onChoice(mode);
    this.closeNotice();
  }

  private closeNotice(): void {
    if (!this.notice.open) return;
    this.notice.close();
    this.onNoticeChange(false);
    if (this.returnFocus?.isConnected) this.returnFocus.focus({ preventScroll: true });
  }

  private readonly resize = (): void => {
    const { width, height, left, top } = gameViewportRect(window.innerWidth, window.innerHeight, this.mode);
    Object.assign(this.root.style, {
      width: `${width}px`, height: `${height}px`, left: `${left}px`, top: `${top}px`,
    });
    this.root.dataset.aspectRatio = this.mode;
    window.clearTimeout(this.noticeTimer);
    if (this.mode !== "ask" || !needsAspectRatioNotice(window.innerWidth, window.innerHeight)) {
      this.closeNotice();
      return;
    }
    if (!this.active || this.notice.open) return;
    // Wait for native fullscreen/window resizing to settle before asking.
    this.noticeTimer = window.setTimeout(() => {
      this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      this.onNoticeChange(true);
      this.notice.showModal();
    }, 250);
  };
}
