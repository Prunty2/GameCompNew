import mainMenuMusicUrl from "../audio/Intro music.mp3";
import gameMusicUrl from "../audio/Game Music.mp3";

export type MusicScene = "menu" | "game";

export const MAIN_MENU_MUSIC_URL = mainMenuMusicUrl;
export const GAME_MUSIC_URL = gameMusicUrl;
export const MAIN_MENU_MUSIC_GAIN = 0.078;
export const GAME_MUSIC_GAIN = 0.078;
export const MAIN_MENU_MUSIC_START_TIME = 5;
export const MUSIC_FADE_DURATION = 0.75;

export interface MusicSettings {
  muted: boolean;
  musicVolume: number;
}

export function musicSceneShouldPlay(
  settings: MusicSettings,
  hidden: boolean,
  scene: MusicScene | null,
): boolean {
  return scene !== null && !hidden && !settings.muted && settings.musicVolume > 0;
}

export function musicOutputVolume(settings: MusicSettings): number {
  return settings.muted ? 0 : clamp(settings.musicVolume, 0, 1) * GAME_MUSIC_GAIN;
}

export function mainMenuMusicOutputVolume(settings: MusicSettings): number {
  return settings.muted ? 0 : clamp(settings.musicVolume, 0, 1) * MAIN_MENU_MUSIC_GAIN;
}

export function musicSceneStartTime(scene: MusicScene): number {
  return scene === "menu" ? MAIN_MENU_MUSIC_START_TIME : 0;
}

export function createMainMenuMusicElement(): HTMLAudioElement {
  return createMusicElement(MAIN_MENU_MUSIC_URL, "menu");
}

export function createGameMusicElement(): HTMLAudioElement {
  return createMusicElement(GAME_MUSIC_URL, "game");
}

function createMusicElement(url: string, scene: MusicScene): HTMLAudioElement {
  const music = new Audio(url);
  music.loop = true;
  music.preload = "auto";
  music.hidden = true;
  music.setAttribute("aria-hidden", "true");
  music.dataset.musicScene = scene;
  if (scene === "game") music.dataset.gameMusic = "";
  return music;
}

export class MusicMixer {
  private readonly tracks: Record<MusicScene, HTMLAudioElement>;
  private scene: MusicScene | null = null;
  private fadeFrame: number | undefined;
  private fadeStartedAt = 0;
  private fadeFrom: Record<MusicScene, number> = { menu: 0, game: 0 };
  private fadeTo: Record<MusicScene, number> = { menu: 0, game: 0 };

  constructor(private settings: MusicSettings) {
    this.tracks = {
      menu: createMainMenuMusicElement(),
      game: createGameMusicElement(),
    };
    document.body.append(this.tracks.menu, this.tracks.game);
    this.sync();
  }

  updateSettings(settings: MusicSettings): void {
    this.settings = settings;
    this.sync();
  }

  setScene(scene: MusicScene | null): void {
    this.scene = scene;
    this.sync();
  }

  sync(): void {
    const hidden = document.hidden;
    if (!musicSceneShouldPlay(this.settings, hidden, this.scene)) {
      this.cancelFade();
      for (const track of Object.values(this.tracks)) {
        track.pause();
        track.volume = 0;
        track.muted = this.settings.muted || hidden || this.scene === null;
        if (this.scene === null) track.currentTime = musicSceneStartTime(track.dataset.musicScene as MusicScene);
      }
      return;
    }

    const targetVolumes: Record<MusicScene, number> = {
      menu: this.scene === "menu" ? mainMenuMusicOutputVolume(this.settings) : 0,
      game: this.scene === "game" ? musicOutputVolume(this.settings) : 0,
    };
    const needsFade = (Object.keys(this.tracks) as MusicScene[]).some((trackScene) => (
      Math.abs(this.tracks[trackScene].volume - targetVolumes[trackScene]) > 0.0001
    ));

    for (const trackScene of Object.keys(this.tracks) as MusicScene[]) {
      const track = this.tracks[trackScene];
      if (trackScene === this.scene || track.volume > 0) track.muted = false;
      if (trackScene === this.scene && track.paused) {
        if (track.currentTime === 0) track.currentTime = musicSceneStartTime(trackScene);
        void track.play().catch(() => undefined);
      }
    }

    if (!needsFade) return;
    this.cancelFade();
    this.fadeStartedAt = performance.now();
    this.fadeFrom = {
      menu: this.tracks.menu.volume,
      game: this.tracks.game.volume,
    };
    this.fadeTo = targetVolumes;
    this.fadeFrame = window.requestAnimationFrame(this.advanceFade);
  }

  private readonly advanceFade = (time: number): void => {
    const progress = Math.max(0, Math.min(1, (time - this.fadeStartedAt) / (MUSIC_FADE_DURATION * 1_000)));
    const eased = progress * (2 - progress);
    for (const trackScene of Object.keys(this.tracks) as MusicScene[]) {
      const track = this.tracks[trackScene];
      track.volume = this.fadeFrom[trackScene]
        + (this.fadeTo[trackScene] - this.fadeFrom[trackScene]) * eased;
    }

    if (progress < 1) {
      this.fadeFrame = window.requestAnimationFrame(this.advanceFade);
      return;
    }

    this.fadeFrame = undefined;
    for (const trackScene of Object.keys(this.tracks) as MusicScene[]) {
      const track = this.tracks[trackScene];
      if (this.fadeTo[trackScene] !== 0) continue;
      track.pause();
      track.muted = true;
      track.currentTime = musicSceneStartTime(trackScene);
    }
  };

  private cancelFade(): void {
    if (this.fadeFrame === undefined) return;
    window.cancelAnimationFrame(this.fadeFrame);
    this.fadeFrame = undefined;
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
