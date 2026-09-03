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
  id: 'freezeFrame' | 'screenShake' | 'screenFlash' | 'crtScanlines' | 'particleDensity' | 'audio' | 'resume';
  x: number;
  y: number;
  w: number;
  h: number;
}

export const PAUSE_BUTTONS: PauseButtonRect[] = [
  { id: 'freezeFrame', x: 74, y: 175, w: 440, h: 36 },
  { id: 'screenShake', x: 74, y: 220, w: 440, h: 36 },
  { id: 'screenFlash', x: 74, y: 265, w: 440, h: 36 },
  { id: 'crtScanlines', x: 74, y: 310, w: 440, h: 36 },
  { id: 'particleDensity', x: 74, y: 355, w: 440, h: 36 },
  { id: 'audio', x: 74, y: 400, w: 440, h: 36 },
  { id: 'resume', x: 154, y: 460, w: 280, h: 44 }
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
