import { describe, expect, it } from "vitest";
import { GAME_MUSIC_GAIN, musicOutputVolume, musicShouldPlay, syncGameMusic } from "../services/gameMusic";

describe("game music playback rules", () => {
  it("plays when audible settings are active and the tab is visible", () => {
    expect(musicShouldPlay({ muted: false, musicVolume: 0.75 }, false, true)).toBe(true);
  });

  it("does not play while muted, silent, hidden, or away from the menu", () => {
    expect(musicShouldPlay({ muted: true, musicVolume: 0.75 }, false, true)).toBe(false);
    expect(musicShouldPlay({ muted: false, musicVolume: 0 }, false, true)).toBe(false);
    expect(musicShouldPlay({ muted: false, musicVolume: 0.75 }, true, true)).toBe(false);
    expect(musicShouldPlay({ muted: false, musicVolume: 0.75 }, false, false)).toBe(false);
  });

  it("scales output by the music gain and saved volume", () => {
    expect(GAME_MUSIC_GAIN).toBeLessThanOrEqual(0.08);
    expect(musicOutputVolume({ muted: false, musicVolume: 1 })).toBeCloseTo(GAME_MUSIC_GAIN);
    expect(musicOutputVolume({ muted: false, musicVolume: 0.75 })).toBeCloseTo(GAME_MUSIC_GAIN * 0.75);
    expect(musicOutputVolume({ muted: false, musicVolume: 0.5 })).toBeCloseTo(GAME_MUSIC_GAIN * 0.5);
    expect(musicOutputVolume({ muted: true, musicVolume: 1 })).toBe(0);
    expect(musicOutputVolume({ muted: false, musicVolume: 4 })).toBeCloseTo(GAME_MUSIC_GAIN);
  });

  it("starts and pauses a music element from the current settings", async () => {
    const music = {
      paused: true,
      muted: false,
      volume: 1,
      currentTime: 12,
      async play() { this.paused = false; },
      pause() { this.paused = true; },
    };

    syncGameMusic(music, { muted: false, musicVolume: 0.5 }, false, true);
    await Promise.resolve();
    expect(music.paused).toBe(false);
    expect(music.muted).toBe(false);
    expect(music.volume).toBeCloseTo(GAME_MUSIC_GAIN * 0.5);

    syncGameMusic(music, { muted: true, musicVolume: 0.5 }, false, true);
    expect(music.paused).toBe(true);
    expect(music.muted).toBe(true);
    expect(music.volume).toBe(0);
    expect(music.currentTime).toBe(12);

    syncGameMusic(music, { muted: false, musicVolume: 0.5 }, false, false);
    expect(music.paused).toBe(true);
    expect(music.muted).toBe(true);
    expect(music.volume).toBe(0);
    expect(music.currentTime).toBe(0);
  });
});
