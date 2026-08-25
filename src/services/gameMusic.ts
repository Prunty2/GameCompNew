import gameMusicUrl from "../audio/Game Music.mp3";

export const GAME_MUSIC_URL = gameMusicUrl;
export const GAME_MUSIC_GAIN = 0.06;

export interface MusicSettings {
  muted: boolean;
  musicVolume: number;
}

export function musicShouldPlay(settings: MusicSettings, hidden: boolean, mainMenuActive: boolean): boolean {
  return mainMenuActive && !hidden && !settings.muted && settings.musicVolume > 0;
}

export function musicOutputVolume(settings: MusicSettings): number {
  return settings.muted ? 0 : clamp(settings.musicVolume, 0, 1) * GAME_MUSIC_GAIN;
}

export interface GameMusicElement {
  paused: boolean;
  muted: boolean;
  volume: number;
  currentTime: number;
  play(): Promise<void>;
  pause(): void;
}

export function createGameMusicElement(): HTMLAudioElement {
  const music = new Audio(GAME_MUSIC_URL);
  music.loop = true;
  music.preload = "auto";
  music.hidden = true;
  music.setAttribute("aria-hidden", "true");
  music.dataset.gameMusic = "";
  return music;
}

export function syncGameMusic(
  music: GameMusicElement,
  settings: MusicSettings,
  hidden: boolean,
  mainMenuActive: boolean,
): void {
  const shouldPlay = musicShouldPlay(settings, hidden, mainMenuActive);
  music.muted = settings.muted || hidden || !mainMenuActive;
  music.volume = mainMenuActive ? musicOutputVolume(settings) : 0;
  if (shouldPlay) {
    if (music.paused) void music.play().catch(() => undefined);
    return;
  }
  if (!music.paused) music.pause();
  if (!mainMenuActive) music.currentTime = 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
