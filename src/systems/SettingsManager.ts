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

export function updatePauseButtonPositions(cw: number, isFromMenu: boolean = false) {
  const cardW = Math.min(500, cw - 20);
  const cardX = Math.floor((cw - cardW) / 2);
  const pad = 16;
  const availW = cardW - pad * 2;
  const startX = cardX + pad;

  // Options buttons (0 to 6)
  PAUSE_BUTTONS[0].x = startX; PAUSE_BUTTONS[0].y = 155; PAUSE_BUTTONS[0].w = availW; PAUSE_BUTTONS[0].h = 34; // freezeFrame
  PAUSE_BUTTONS[1].x = startX; PAUSE_BUTTONS[1].y = 197; PAUSE_BUTTONS[1].w = availW; PAUSE_BUTTONS[1].h = 34; // screenShake
  PAUSE_BUTTONS[2].x = startX; PAUSE_BUTTONS[2].y = 239; PAUSE_BUTTONS[2].w = availW; PAUSE_BUTTONS[2].h = 34; // screenFlash
  PAUSE_BUTTONS[3].x = startX; PAUSE_BUTTONS[3].y = 281; PAUSE_BUTTONS[3].w = availW; PAUSE_BUTTONS[3].h = 34; // crtScanlines
  PAUSE_BUTTONS[4].x = startX; PAUSE_BUTTONS[4].y = 323; PAUSE_BUTTONS[4].w = availW; PAUSE_BUTTONS[4].h = 34; // particleDensity
  PAUSE_BUTTONS[5].x = startX; PAUSE_BUTTONS[5].y = 365; PAUSE_BUTTONS[5].w = availW; PAUSE_BUTTONS[5].h = 34; // audio
  PAUSE_BUTTONS[6].x = startX; PAUSE_BUTTONS[6].y = 407; PAUSE_BUTTONS[6].w = availW; PAUSE_BUTTONS[6].h = 34; // wipeData

  if (isFromMenu) {
    PAUSE_BUTTONS[7].x = -999; PAUSE_BUTTONS[7].w = 0; // resume hidden
    PAUSE_BUTTONS[8].x = -999; PAUSE_BUTTONS[8].w = 0; // restart hidden
    PAUSE_BUTTONS[9].x = startX; PAUSE_BUTTONS[9].y = 456; PAUSE_BUTTONS[9].w = availW; PAUSE_BUTTONS[9].h = 42; // home
  } else {
    const gap = 10;
    const btnW = Math.floor((availW - gap * 2) / 3);

    // Resume (7)
    PAUSE_BUTTONS[7].x = startX;
    PAUSE_BUTTONS[7].y = 456;
    PAUSE_BUTTONS[7].w = btnW;
    PAUSE_BUTTONS[7].h = 42;

    // Restart (8)
    PAUSE_BUTTONS[8].x = startX + btnW + gap;
    PAUSE_BUTTONS[8].y = 456;
    PAUSE_BUTTONS[8].w = btnW;
    PAUSE_BUTTONS[8].h = 42;

    // Home / Accueil (9)
    PAUSE_BUTTONS[9].x = startX + (btnW + gap) * 2;
    PAUSE_BUTTONS[9].y = 456;
    PAUSE_BUTTONS[9].w = availW - (btnW + gap) * 2;
    PAUSE_BUTTONS[9].h = 42;
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
