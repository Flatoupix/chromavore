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

// Neon Color Palette
export const C_BG = '#07070f';
export const C_WALL = '#0c1424';
export const C_GLOW = '#00b4ff';
export const C_DOT = '#ffd700';
export const C_PELLET = '#ff5555';
export const C_PLAYER = '#ffffff';
export const C_DOOR = '#ff80ab';

// Enemy colors
export const EC: Record<string, string> = {
  stalker: '#ff3344',
  orbiter: '#22eeff',
  rusher: '#ff8833',
  phaser: '#bb44ff',
  titan: '#ff0055'
};

// Power-up definitions
export const PC: Record<string, string> = {
  phase: '#3399ff',
  nova: '#ffdd33',
  timewarp: '#33ff99',
  magnet: '#ff44ff'
};

export const PN: Record<string, string> = {
  phase: 'PHASE SHIFT',
  nova: 'NOVA BURST',
  timewarp: 'TIME WARP',
  magnet: 'MAGNET'
};

export const PI_: Record<string, string> = {
  phase: '◇',
  nova: '✦',
  timewarp: '◎',
  magnet: '⊛'
};

// Combo settings
export const CT = [0, 5, 12, 25, 50];
export const CM = [1, 2, 4, 8, 16];
export const CC = ['#ffffff', '#ffee44', '#ff8833', '#ff44aa', '#ff44ff'];
export const COMBO_DECAY = 1.8;

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
