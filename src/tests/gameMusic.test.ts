import { describe, expect, it } from "vitest";
import {
  GAME_MUSIC_GAIN,
  MAIN_MENU_MUSIC_GAIN,
  MUSIC_FADE_DURATION,
  mainMenuMusicOutputVolume,
  musicOutputVolume,
  musicSceneShouldPlay,
} from "../services/gameMusic";

describe("scene music playback rules", () => {
  it("plays the selected scene when audible settings are active and the tab is visible", () => {
    const settings = { muted: false, musicVolume: 0.75 };
    expect(musicSceneShouldPlay(settings, false, "menu")).toBe(true);
    expect(musicSceneShouldPlay(settings, false, "game")).toBe(true);
  });

  it("does not play while muted, silent, hidden, or between scenes", () => {
    expect(musicSceneShouldPlay({ muted: true, musicVolume: 0.75 }, false, "menu")).toBe(false);
    expect(musicSceneShouldPlay({ muted: false, musicVolume: 0 }, false, "game")).toBe(false);
    expect(musicSceneShouldPlay({ muted: false, musicVolume: 0.75 }, true, "game")).toBe(false);
    expect(musicSceneShouldPlay({ muted: false, musicVolume: 0.75 }, false, null)).toBe(false);
  });

  it("scales both tracks by the music gain and saved volume", () => {
    expect(GAME_MUSIC_GAIN).toBeLessThanOrEqual(0.08);
    expect(MAIN_MENU_MUSIC_GAIN).toBeLessThanOrEqual(0.08);
    expect(MUSIC_FADE_DURATION).toBeGreaterThan(0);
    expect(musicOutputVolume({ muted: false, musicVolume: 1 })).toBeCloseTo(GAME_MUSIC_GAIN);
    expect(mainMenuMusicOutputVolume({ muted: false, musicVolume: 1 })).toBeCloseTo(MAIN_MENU_MUSIC_GAIN);
    expect(musicOutputVolume({ muted: false, musicVolume: 0.75 })).toBeCloseTo(GAME_MUSIC_GAIN * 0.75);
    expect(mainMenuMusicOutputVolume({ muted: false, musicVolume: 0.75 })).toBeCloseTo(MAIN_MENU_MUSIC_GAIN * 0.75);
    expect(musicOutputVolume({ muted: false, musicVolume: 0.5 })).toBeCloseTo(GAME_MUSIC_GAIN * 0.5);
    expect(musicOutputVolume({ muted: true, musicVolume: 1 })).toBe(0);
    expect(musicOutputVolume({ muted: false, musicVolume: 4 })).toBeCloseTo(GAME_MUSIC_GAIN);
  });
});
