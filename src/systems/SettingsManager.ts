// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — SETTINGS & VISUAL FX CONFIGURATION MANAGER
// ═══════════════════════════════════════════════════════════════

export interface GameSettings {
  freezeFrame: boolean;
  screenShake: boolean;
  screenFlash: boolean;
  crtScanlines: boolean;
  synthwaveGrid: boolean;
  paintSplats: boolean;
  particleDensity: 'max' | 'reduced';
}

export interface PauseButtonRect {
  id: 'freezeFrame' | 'screenShake' | 'screenFlash' | 'crtScanlines' | 'particleDensity' | 'audio' | 'wipeData' | 'resume' | 'restart' | 'home';
  x: number;
  y: number;
  w: number;
  h: number;
}

export const PAUSE_BUTTONS: PauseButtonRect[] = [
  { id: 'freezeFrame',     x: 74, y: 155, w: 440, h: 34 },
  { id: 'screenShake',     x: 74, y: 197, w: 440, h: 34 },
  { id: 'screenFlash',     x: 74, y: 239, w: 440, h: 34 },
  { id: 'crtScanlines',    x: 74, y: 281, w: 440, h: 34 },
  { id: 'particleDensity', x: 74, y: 323, w: 440, h: 34 },
  { id: 'audio',           x: 74, y: 365, w: 440, h: 34 },
  { id: 'wipeData',        x: 74, y: 407, w: 440, h: 34 },
  { id: 'resume',          x: 64, y: 456, w: 145, h: 42 },
  { id: 'restart',         x: 219, y: 456, w: 150, h: 42 },
  { id: 'home',            x: 379, y: 456, w: 125, h: 42 },
];

const STORAGE_KEY = 'chv_visual_settings';

export class SettingsManager {
  public settings: GameSettings = {
    freezeFrame: true,
    screenShake: true,
    screenFlash: true,
    crtScanlines: true,
    synthwaveGrid: true,
    paintSplats: true,
    particleDensity: 'max'
  };

  constructor() {
    this.load();
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
