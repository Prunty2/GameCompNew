import { createGameMusicElement, musicOutputVolume, syncGameMusic } from "./gameMusic";

export type FeedbackCue =
  | "ui"
  | "cast"
  | "catch"
  | "collision"
  | "dock"
  | "delivery"
  | "deny"
  | "line-strain"
  | "upgrade";

export interface FeedbackSettings {
  muted: boolean;
  volume: number;
  musicVolume: number;
}

export class FeedbackService {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private engine: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private music: HTMLAudioElement | null = null;
  private menuActive = true;

  constructor(private settings: FeedbackSettings) {
    this.ensureMusic();
    window.addEventListener("pointerdown", this.unlock, { capture: true });
    window.addEventListener("keydown", this.unlock, { capture: true });
    document.addEventListener("visibilitychange", this.onVisibilityChanged);
  }

  updateSettings(settings: FeedbackSettings): void {
    this.settings = settings;
    if (this.context && this.master) {
      this.master.gain.setTargetAtTime(this.outputVolume(), this.context.currentTime, 0.025);
    }
    this.syncMusic();
  }

  setMenuActive(active: boolean): void {
    this.menuActive = active;
    this.syncMusic();
  }

  updateEngine(speedRatio: number, active: boolean): void {
    const context = this.context;
    const gain = this.engineGain;
    const engine = this.engine;
    const filter = this.engineFilter;
    if (!context || !gain || !engine || !filter) return;
    const speed = clamp(speedRatio, 0, 1);
    const targetGain = active ? 0.011 + speed * 0.007 : 0.0001;
    gain.gain.setTargetAtTime(targetGain, context.currentTime, active ? 0.14 : 0.05);
    engine.frequency.setTargetAtTime(40 + speed * 20, context.currentTime, 0.16);
    filter.frequency.setTargetAtTime(150 + speed * 70, context.currentTime, 0.18);
  }

  cue(cue: FeedbackCue): void {
    const context = this.ensureContext();
    if (!context || !this.master || this.settings.muted || this.settings.volume <= 0) {
      this.vibrate(cue);
      return;
    }
    const now = context.currentTime;
    switch (cue) {
      case "ui":
        this.tone(now, 0.045, 310, 390, 0.028, "sine");
        break;
      case "cast":
        this.noise(now, 0.12, 0.055, 620);
        this.tone(now, 0.15, 190, 105, 0.035, "sine");
        break;
      case "catch":
        this.noise(now, 0.1, 0.07, 1_300);
        this.tone(now, 0.1, 330, 510, 0.05, "triangle");
        this.tone(now + 0.075, 0.14, 510, 720, 0.042, "triangle");
        break;
      case "collision":
        this.noise(now, 0.24, 0.16, 260);
        this.tone(now, 0.22, 92, 42, 0.09, "sawtooth");
        break;
      case "dock":
        this.tone(now, 0.16, 175, 132, 0.035, "triangle");
        this.tone(now + 0.1, 0.18, 220, 165, 0.03, "triangle");
        break;
      case "delivery":
        this.tone(now, 0.16, 294, 392, 0.05, "triangle");
        this.tone(now + 0.11, 0.18, 392, 587, 0.05, "triangle");
        this.tone(now + 0.22, 0.24, 587, 784, 0.045, "sine");
        break;
      case "deny":
        this.tone(now, 0.12, 145, 105, 0.045, "square");
        break;
      case "line-strain":
        this.tone(now, 0.16, 240, 150, 0.055, "sawtooth");
        this.tone(now + 0.18, 0.16, 240, 150, 0.055, "sawtooth");
        break;
      case "upgrade":
        this.tone(now, 0.13, 220, 440, 0.045, "triangle");
        this.tone(now + 0.09, 0.19, 440, 660, 0.04, "sine");
        break;
    }
    this.vibrate(cue);
  }

  private readonly unlock = (): void => {
    const context = this.ensureContext();
    if (context?.state === "suspended") void context.resume();
    this.syncMusic();
  };

  private readonly onVisibilityChanged = (): void => {
    this.syncMusic();
  };

  private ensureMusic(): HTMLAudioElement {
    if (this.music) return this.music;
    const music = createGameMusicElement();
    music.volume = musicOutputVolume(this.settings);
    document.body.append(music);
    this.music = music;
    return music;
  }

  private syncMusic(): void {
    syncGameMusic(this.ensureMusic(), this.settings, document.hidden, this.menuActive);
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) return null;
    const context = new AudioContextConstructor();
    const master = context.createGain();
    const engine = context.createOscillator();
    const engineGain = context.createGain();
    const engineFilter = context.createBiquadFilter();

    master.gain.value = this.outputVolume();
    engine.type = "triangle";
    engine.frequency.value = 40;
    engineGain.gain.value = 0.0001;
    engineFilter.type = "lowpass";
    engineFilter.frequency.value = 150;

    engine.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(master);
    master.connect(context.destination);
    engine.start();

    this.context = context;
    this.master = master;
    this.engine = engine;
    this.engineGain = engineGain;
    this.engineFilter = engineFilter;
    return context;
  }

  private outputVolume(): number {
    return this.settings.muted ? 0 : clamp(this.settings.volume, 0, 1) * 0.55;
  }

  private tone(
    start: number,
    duration: number,
    startFrequency: number,
    endFrequency: number,
    volume: number,
    type: OscillatorType,
  ): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  private noise(start: number, duration: number, volume: number, cutoff: number): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master) return;
    const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
  }

  private vibrate(cue: FeedbackCue): void {
    if (!("vibrate" in navigator)) return;
    const pattern: Record<FeedbackCue, number | number[]> = {
      ui: 6,
      cast: 12,
      catch: [18, 28, 24],
      collision: [42, 30, 34],
      dock: 16,
      delivery: [18, 35, 18],
      deny: [10, 30, 10],
      "line-strain": [24, 35, 24],
      upgrade: [12, 25, 20],
    };
    navigator.vibrate(pattern[cue]);
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
