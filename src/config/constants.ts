// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — CONSTANTS & CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const T = 28;
export const CLASSIC_COLS = 21;
export const MADNESS_COLS = 39;
export const COLS = CLASSIC_COLS;
export const ROWS = 22;
export const HUD_H = 56;
export const CW = COLS * T;
export const MADNESS_CW = MADNESS_COLS * T;
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
  overdrive: '#00ffcc',
  portal: '#d946ef'
};

export const PN: Record<string, string> = {
  phase: 'PHASE SHIFT',
  nova: 'NOVA BURST',
  timewarp: 'TIME WARP',
  magnet: 'FORCE FIELD',
  overdrive: 'DASH INFINI',
  portal: 'VORTEX RAMPAGE'
};

export const PI_: Record<string, string> = {
  phase: 'phase',
  nova: 'nova',
  timewarp: 'chrono',
  magnet: 'magnet',
  overdrive: 'overdrive',
  portal: 'vortex_portal'
};

// Bonus Stage Hyper-Swarm Settings
export const BONUS_DURATION = 15.0;
export const BONUS_SWARM_MAX = 520;
export const BONUS_FORCE_FIELD_BASE_RAD = 28; // Starts small, grows with kills!
export const BONUS_FORCE_FIELD_MAX_RAD = 115; // Massive singularity radius at climax!
export const BONUS_ARENA_W = 860;
export const BONUS_ARENA_H = 920;

// Combo settings: Clear progression with distinct x4, x8, x16, and extended 95-dot x16 gauntlet to reach x32 (180 dots)
export const CT = [0, 8, 22, 48, 85, 180];
export const CM = [1, 2, 4, 8, 16, 32];
export const CC = ['#ffffff', '#ffee44', '#ff8833', '#ff44aa', '#ff00aa', '#00ffff'];
export const COMBO_DECAY = 0.5; // Strictly 0.5s between pellets (gap without pellets resets combo)
export const GOD_MODE_DURATION = 15.0; // 15.0s God Mode duration when triggered
export const MADNESS_UNLOCK_KILLS = 1600; // Unlocked with Cyber Dash V2 at 1600 career ghost kills
export const HD_AUDIO_UNLOCK_KILLS = 3000; // Unlocked at 3000 career ghost kills (HD Dark Synthwave Studio OST)

// Bullet Time (Chrono-Shift) settings
export const CHRONO_MAX = 100;
export const CHRONO_DRAIN = 28; // % drained per second (~3.6s active duration)
export const CHRONO_TIMESCALE = 0.18; // V1 Time dilated to 18% speed (~5.5x slowdown)
export const CHRONO_TIMESCALE_V2 = 0.12; // V2 Time dilated to 12% speed (~8.3x slowdown)
export const CHRONO_PASSIVE_RECHARGE = 3.2; // % per second passive recharge
export const CHRONO_DOT_RECHARGE = 0.8; // % per dot eaten
export const CHRONO_NM_RECHARGE = 6.0; // % per Near-Miss dodge

export function getComboTier(n: number): number {
  for (let i = CT.length - 1; i >= 0; i--) {
    if (n >= CT[i]) return i;
  }
  return 0;
}

// Game physics
export const P_SPEED = 6.0;
export const P_MADNESS_BASE_SPEED = 10.2;
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

export const GAME_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'v3.4.1';
export const COMMIT_HASH = typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : '';
export const VERSION_NUM = typeof __VERSION_NUM__ !== 'undefined' ? __VERSION_NUM__ : 'v3.4.1';

// ─────────────────────────────────────────────────────────────────
//  CHROMA AWAKENING — Visual Progression Tiers (career ghost kills)
//  Fantômes : toujours en couleur (source de lumière du monde)
//  Environnement + Chromavore : progressent du monochrome au néon
// ─────────────────────────────────────────────────────────────────
export const CHROMA_TIERS = [0, 10, 50, 200, 600, 1600] as const;
export type ChromaTier = 0 | 1 | 2 | 3 | 4 | 5;

export function getChromaTier(careerGhosts: number): ChromaTier {
  let tier: ChromaTier = 0;
  for (let i = 0; i < CHROMA_TIERS.length; i++) {
    if (careerGhosts >= CHROMA_TIERS[i]) tier = i as ChromaTier;
  }
  return tier;
}

// Tier 0 = blanc pur / noir  →  Tier 5 = plein néon synthwave (actuel)
export const CHROMA_WALL   = ['#e8e8e8', '#c0c8d8', '#2a2a3a', '#1a0830', '#1e0535', '#240838'] as const;
export const CHROMA_DOT    = ['#ffffff', '#d0d8ee', '#88aacc', '#22aacc', '#00ddee', '#00f0ff'] as const;
export const CHROMA_PELLET = ['#dddddd', '#ccddff', '#99aaff', '#ffcc33', '#ffdd00', '#ffd700'] as const;
export const CHROMA_BG     = ['#000000', '#050510', '#07080f', '#090117', '#090117', '#090117'] as const;
export const CHROMA_GLOW   = ['#aaaaaa', '#4466aa', '#2255bb', '#0077cc', '#00bbff', '#ff007f'] as const;
// Couleur du flash de transition de tier
export const CHROMA_FLASH  = ['#cccccc', '#88aacc', '#00aacc', '#00ccdd', '#00eeff', '#ff007f'] as const;
