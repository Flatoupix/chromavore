// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — CONSTANTS & CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const T = 28;
export const COLS = 21;
export const ROWS = 22;
export const HUD_H = 56;
export const CW = COLS * T;
export const CH = ROWS * T + HUD_H;
export const HALF = T / 2;
export const PI2 = Math.PI * 2;
export const PI = Math.PI;

// Tile types
export const VOID = 0;
export const WALL = 1;
export const DOT = 2;
export const PELLET = 3;
export const EMPTY = 4;
export const GHOST = 5;
export const DOOR = 6;
export const SPAWN = 7;
export const TUNNEL = 8;

// Retro Synthwave 80s Color Palette
export const C_BG = '#090117';
export const C_WALL = '#240838';
export const C_GLOW = '#ff007f';
export const C_DOT = '#00f0ff';
export const C_PELLET = '#ffd700';
export const C_PLAYER = '#ffe600';
export const C_DOOR = '#ff007f';

// Enemy colors (Synthwave Spectrum)
export const EC: Record<string, string> = {
  stalker: '#ff0055',
  orbiter: '#00f0ff',
  rusher: '#ff8800',
  phaser: '#b000ff',
  titan: '#ff007f'
};

// Power-up definitions
export const PC: Record<string, string> = {
  phase: '#00f0ff',
  nova: '#ffd700',
  timewarp: '#00ffaa',
  magnet: '#ff007f',
  overdrive: '#00ffcc'
};

export const PN: Record<string, string> = {
  phase: 'PHASE SHIFT',
  nova: 'NOVA BURST',
  timewarp: 'TIME WARP',
  magnet: 'FORCE FIELD',
  overdrive: 'DASH INFINI'
};

export const PI_: Record<string, string> = {
  phase: '◇',
  nova: '✦',
  timewarp: '◎',
  magnet: '◈',
  overdrive: '⚡'
};

// Combo settings
export const CT = [0, 5, 12, 25, 50, 90];
export const CM = [1, 2, 4, 8, 16, 32];
export const CC = ['#ffffff', '#ffee44', '#ff8833', '#ff44aa', '#ff00aa', '#00ffff'];
export const COMBO_DECAY = 1.8;

export function getComboTier(n: number): number {
  for (let i = CT.length - 1; i >= 0; i--) {
    if (n >= CT[i]) return i;
  }
  return 0;
}

// Game physics
export const P_SPEED = 5.5;
export const P_MADNESS_SPEED = 14.5;
export const P_RAD = T * 0.38;
export const E_SPEED = 3.8;
export const HIT_DIST = T * 0.65;
export const NM_DIST = T * 1.5;
export const INVULN = 2;

// Dash settings
export const DASH_DIST = 3;
export const DASH_CD = 2.8;
export const DASH_MADNESS_CD = 0.6;
export const DASH_BTN = { x: CW - 38, y: ROWS * T - 26, r: 24 };

// Spawn coords
export const SPAWN_X = 10;
export const SPAWN_Y = 16;

// Game Version & Git Build ID
declare const __APP_VERSION__: string | undefined;
declare const __COMMIT_HASH__: string | undefined;
declare const __VERSION_NUM__: string | undefined;

export const GAME_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'v2.6.0';
export const COMMIT_HASH = typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : '';
export const VERSION_NUM = typeof __VERSION_NUM__ !== 'undefined' ? __VERSION_NUM__ : 'v2.6.0';
