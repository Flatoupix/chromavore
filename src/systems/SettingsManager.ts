// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — SETTINGS & VISUAL FX CONFIGURATION MANAGER
// ═══════════════════════════════════════════════════════════════

import { sounds } from '../audio/SoundManager';

export interface GameSettings {
  freezeFrame: boolean;
  screenShake: boolean;
  screenFlash: boolean;
  crtScanlines: boolean;
  synthwaveGrid: boolean;
  paintSplats: boolean;
  particleDensity: 'max' | 'reduced';
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
}

export type PauseButtonId =
  | 'freezeFrame'
  | 'screenShake'
  | 'screenFlash'
  | 'crtScanlines'
  | 'particleDensity'
  | 'volMaster'
  | 'volMusic'
  | 'volSfx'
  | 'audio'
  | 'wipeData'
  | 'resume'
  | 'restart'
  | 'home';

export interface PauseButtonRect {
  id: PauseButtonId;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const PAUSE_BUTTONS: PauseButtonRect[] = [
  { id: 'freezeFrame',     x: 74, y: 142, w: 440, h: 30 },
  { id: 'screenShake',     x: 74, y: 178, w: 440, h: 30 },
  { id: 'screenFlash',     x: 74, y: 214, w: 440, h: 30 },
  { id: 'crtScanlines',    x: 74, y: 250, w: 440, h: 30 },
  { id: 'particleDensity', x: 74, y: 286, w: 440, h: 30 },
  { id: 'volMaster',       x: 74, y: 322, w: 440, h: 30 },
  { id: 'volMusic',        x: 74, y: 358, w: 440, h: 30 },
  { id: 'volSfx',          x: 74, y: 394, w: 440, h: 30 },
  { id: 'audio',           x: 74, y: 430, w: 440, h: 30 },
  { id: 'wipeData',        x: 74, y: 466, w: 440, h: 30 },
  { id: 'resume',          x: 64, y: 508, w: 145, h: 40 },
  { id: 'restart',         x: 219, y: 508, w: 150, h: 40 },
  { id: 'home',            x: 379, y: 508, w: 125, h: 40 },
];

export function updatePauseButtonPositions(cw: number, isFromMenu: boolean = false) {
  const cardW = Math.min(500, cw - 20);
  const cardX = Math.floor((cw - cardW) / 2);
  const pad = 16;
  const availW = cardW - pad * 2;
  const startX = cardX + pad;

  // Options & Sliders (0 to 9)
  const rowH = 30;
  const gap = 6;
  const startY = 142;

  for (let i = 0; i < 10; i++) {
    PAUSE_BUTTONS[i].x = startX;
    PAUSE_BUTTONS[i].y = startY + i * (rowH + gap);
    PAUSE_BUTTONS[i].w = availW;
    PAUSE_BUTTONS[i].h = rowH;
  }

  const actionY = startY + 10 * (rowH + gap) + 4; // ~506
  const actionH = 40;

  if (isFromMenu) {
    PAUSE_BUTTONS[10].x = -999; PAUSE_BUTTONS[10].w = 0; // resume hidden
    PAUSE_BUTTONS[11].x = -999; PAUSE_BUTTONS[11].w = 0; // restart hidden
    PAUSE_BUTTONS[12].x = startX; PAUSE_BUTTONS[12].y = actionY; PAUSE_BUTTONS[12].w = availW; PAUSE_BUTTONS[12].h = actionH; // home
  } else {
    const btnGap = 10;
    const btnW = Math.floor((availW - btnGap * 2) / 3);

    // Resume (10)
    PAUSE_BUTTONS[10].x = startX;
    PAUSE_BUTTONS[10].y = actionY;
    PAUSE_BUTTONS[10].w = btnW;
    PAUSE_BUTTONS[10].h = actionH;

    // Restart (11)
    PAUSE_BUTTONS[11].x = startX + btnW + btnGap;
    PAUSE_BUTTONS[11].y = actionY;
    PAUSE_BUTTONS[11].w = btnW;
    PAUSE_BUTTONS[11].h = actionH;

    // Home / Accueil (12)
    PAUSE_BUTTONS[12].x = startX + (btnW + btnGap) * 2;
    PAUSE_BUTTONS[12].y = actionY;
    PAUSE_BUTTONS[12].w = availW - (btnW + btnGap) * 2;
    PAUSE_BUTTONS[12].h = actionH;
  }
}

const STORAGE_KEY = 'chv_visual_settings';

export class SettingsManager {
  public settings: GameSettings = {
    freezeFrame: true,
    screenShake: true,
    screenFlash: true,
    crtScanlines: true,
    synthwaveGrid: true,
    paintSplats: true,
    particleDensity: 'max',
    masterVolume: Math.round(sounds.getMasterVolume() * 100),
    musicVolume: Math.round(sounds.getMusicVolume() * 100),
    sfxVolume: Math.round(sounds.getSfxVolume() * 100),
  };

  constructor() {
    this.load();
    // Synchronize sounds with saved or default settings
    sounds.setMasterVolume(this.settings.masterVolume / 100);
    sounds.setMusicVolume(this.settings.musicVolume / 100);
    sounds.setSfxVolume(this.settings.sfxVolume / 100);
  }

  public load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch {}
  }

  public save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {}
  }

  public setMasterVolume(vol: number) {
    this.settings.masterVolume = Math.max(0, Math.min(100, Math.round(vol)));
    sounds.setMasterVolume(this.settings.masterVolume / 100);
    this.save();
  }

  public setMusicVolume(vol: number) {
    this.settings.musicVolume = Math.max(0, Math.min(100, Math.round(vol)));
    sounds.setMusicVolume(this.settings.musicVolume / 100);
    this.save();
  }

  public setSfxVolume(vol: number) {
    this.settings.sfxVolume = Math.max(0, Math.min(100, Math.round(vol)));
    sounds.setSfxVolume(this.settings.sfxVolume / 100);
    this.save();
  }

  public adjustVolume(id: 'volMaster' | 'volMusic' | 'volSfx', delta: number) {
    if (id === 'volMaster') this.setMasterVolume(this.settings.masterVolume + delta);
    else if (id === 'volMusic') this.setMusicVolume(this.settings.musicVolume + delta);
    else if (id === 'volSfx') this.setSfxVolume(this.settings.sfxVolume + delta);
  }

  public toggleFreezeFrame(): boolean {
    this.settings.freezeFrame = !this.settings.freezeFrame;
    this.save();
    return this.settings.freezeFrame;
  }

  public toggleScreenShake(): boolean {
    this.settings.screenShake = !this.settings.screenShake;
    this.save();
    return this.settings.screenShake;
  }

  public toggleScreenFlash(): boolean {
    this.settings.screenFlash = !this.settings.screenFlash;
    this.save();
    return this.settings.screenFlash;
  }

  public toggleCrtScanlines(): boolean {
    this.settings.crtScanlines = !this.settings.crtScanlines;
    this.save();
    return this.settings.crtScanlines;
  }

  public toggleSynthwaveGrid(): boolean {
    this.settings.synthwaveGrid = !this.settings.synthwaveGrid;
    this.save();
    return this.settings.synthwaveGrid;
  }

  public toggleParticleDensity(): string {
    this.settings.particleDensity = this.settings.particleDensity === 'max' ? 'reduced' : 'max';
    this.save();
    return this.settings.particleDensity;
  }
}

export const settingsManager = new SettingsManager();
