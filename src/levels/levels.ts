// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — LEVEL MAPS & MAZE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

import { T, COLS, ROWS, WALL, DOT, PELLET, EMPTY, GHOST, DOOR, SPAWN, TUNNEL, VOID, C_WALL } from '../config/constants';

export interface LevelDef {
  name: string;
  glowColor: string;
  dotColor: string;
  pelletColor: string;
  wallColor: string;
  bg: string;
  layout: number[][];
}

export const ML1: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1],[1,2,2,2,2,2,2,2,2,2,1],[1,2,1,1,1,2,1,1,1,2,1],
  [1,3,1,1,1,2,2,2,2,2,2],[1,2,2,2,2,2,2,2,2,2,2],[1,2,1,1,2,1,2,1,1,1,1],
  [1,2,2,2,2,1,2,2,2,2,1],[1,1,1,1,2,1,1,1,1,2,1],[0,0,0,1,2,2,2,2,2,2,2],
  [1,1,1,1,2,1,4,1,1,6,4],[8,4,4,4,2,4,4,1,5,5,5],[1,1,1,1,2,1,4,1,1,1,1],
  [0,0,0,1,2,2,2,2,2,2,2],[1,1,1,1,2,1,1,1,1,2,1],[1,2,2,2,2,2,2,2,2,2,2],
  [1,2,1,1,1,2,1,1,1,2,1],[1,3,2,2,1,2,2,2,2,2,2],[1,1,1,2,1,2,1,2,1,1,1],
  [1,2,2,2,2,2,1,2,2,2,1],[1,2,1,1,1,1,1,1,1,2,1],[1,2,2,2,2,2,2,2,2,2,2],
  [1,1,1,1,1,1,1,1,1,1,1]
];

export const ML2: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1],[1,3,2,2,2,2,2,2,2,2,1],[1,2,1,1,2,1,1,1,2,2,1],
  [1,2,1,1,2,1,1,1,2,2,1],[1,2,2,2,2,2,2,2,2,2,2],[1,2,1,1,2,2,2,2,2,2,2],
  [1,2,2,2,2,2,2,2,2,2,2],[1,1,1,2,2,1,1,1,1,2,1],[0,0,1,2,2,2,2,2,2,2,2],
  [1,1,1,2,2,1,4,1,1,6,4],[8,4,4,4,2,4,4,1,5,5,5],[1,1,1,2,2,1,4,1,1,1,1],
  [0,0,1,2,2,2,2,2,2,2,2],[1,1,1,2,2,1,1,1,1,2,1],[1,2,2,2,2,2,2,2,2,2,2],
  [1,2,1,1,2,2,2,2,2,2,2],[1,3,1,1,2,2,2,2,2,2,2],[1,2,2,2,2,1,1,1,2,2,1],
  [1,2,1,1,2,1,1,1,2,2,1],[1,2,2,2,2,2,2,2,2,2,1],[1,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1]
];

export const ML3: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1],[1,2,2,2,2,1,2,2,2,2,1],[1,2,1,1,2,1,2,1,1,2,1],
  [1,3,2,1,2,2,2,1,2,3,1],[1,1,2,1,1,2,1,1,2,1,1],[1,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,2,1,1,2,1],[1,2,2,2,2,1,2,2,2,2,1],[0,0,0,1,2,2,2,2,2,2,2],
  [1,1,1,1,2,1,4,1,1,6,4],[8,4,4,4,2,4,4,1,5,5,5],[1,1,1,1,2,1,4,1,1,1,1],
  [0,0,0,1,2,2,2,2,2,2,2],[1,2,2,2,2,1,2,2,2,2,1],[1,2,1,1,2,1,2,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,1],[1,1,2,1,1,2,1,1,2,1,1],[1,3,2,1,2,2,2,1,2,3,1],
  [1,2,1,1,2,1,2,1,1,2,1],[1,2,2,2,2,1,2,2,2,2,1],[1,2,2,2,2,2,2,2,2,2,2],
  [1,1,1,1,1,1,1,1,1,1,1]
];

export const ML4: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1],[1,3,2,2,2,2,1,2,2,3,1],[1,2,1,1,1,2,1,2,1,2,1],
  [1,2,1,2,2,2,2,2,1,2,1],[1,2,2,2,1,1,1,2,2,2,2],[1,1,1,2,2,1,2,2,1,1,1],
  [1,2,2,2,2,1,2,2,2,2,1],[1,2,1,1,2,2,2,1,1,2,1],[0,0,0,1,2,2,2,1,0,0,0],
  [1,1,1,1,2,1,4,1,1,6,4],[8,4,4,4,2,4,4,1,5,5,5],[1,1,1,1,2,1,4,1,1,1,1],
  [0,0,0,1,2,2,2,1,0,0,0],[1,2,1,1,2,2,2,1,1,2,1],[1,2,2,2,2,1,2,2,2,2,1],
  [1,1,1,2,2,1,2,2,1,1,1],[1,2,2,2,1,1,1,2,2,2,2],[1,2,1,2,2,2,2,2,1,2,1],
  [1,2,1,1,1,2,1,2,1,2,1],[1,3,2,2,2,2,1,2,2,3,1],[1,2,2,2,2,2,2,2,2,2,2],
  [1,1,1,1,1,1,1,1,1,1,1]
];

export const LEVELS: LevelDef[] = [
  {
    name: 'THE CIRCUIT',
    glowColor: '#00d4ff',
    dotColor: '#ffd700',
    pelletColor: '#ff0055',
    wallColor: '#0c1a2e',
    bg: '#050811',
    layout: ML1
  },
  {
    name: 'THE CRUCIBLE',
    glowColor: '#ff0077',
    dotColor: '#00ffff',
    pelletColor: '#ffd700',
    wallColor: '#200b18',
    bg: '#0c040a',
    layout: ML2
  },
  {
    name: 'THE MATRIX',
    glowColor: '#00ff88',
    dotColor: '#ff44aa',
    pelletColor: '#00ffff',
    wallColor: '#091c12',
    bg: '#040d08',
    layout: ML3
  },
  {
    name: 'THE CORE',
    glowColor: '#ff8800',
    dotColor: '#00e5ff',
    pelletColor: '#ff0044',
    wallColor: '#241208',
    bg: '#0d0703',
    layout: ML4
  }
];

export class MazeManager {
  public map: number[][] = [];
  public dotMap: number[][] = [];
  public totalDots: number = 0;
  public remainingDots: number = 0;
  public currentLevel: number = 0;
  public mOff: HTMLCanvasElement;
  private mc: CanvasRenderingContext2D;

  constructor() {
    this.mOff = document.createElement('canvas');
    this.mOff.width = COLS * T;
    this.mOff.height = ROWS * T;
    this.mc = this.mOff.getContext('2d')!;
    this.build(0);
  }

  public build(lvlIndex: number) {
    this.currentLevel = lvlIndex % LEVELS.length;
    const half = LEVELS[this.currentLevel].layout;
    this.map = [];
    this.dotMap = [];
    this.totalDots = 0;

    for (let r = 0; r < ROWS; r++) {
      this.map[r] = [];
      this.dotMap[r] = [];
      const rowHalf = half[r];
      for (let c = 0; c < 11; c++) {
        const val = rowHalf[c];
        this.map[r][c] = val;
        if (c < 10) {
          const mirCol = 20 - c;
          this.map[r][mirCol] = val === TUNNEL ? TUNNEL : val === DOOR ? DOOR : val;
        }
      }
      for (let c = 0; c < COLS; c++) {
        const v = this.map[r][c];
        if (v === DOT || v === PELLET) {
          this.dotMap[r][c] = v;
          this.totalDots++;
        } else {
          this.dotMap[r][c] = 0;
        }
      }
    }
    this.remainingDots = this.totalDots;
    this.renderOffscreen();
  }

  public isWalkable(c: number, r: number, isEnemy: boolean = false, isPhaser: boolean = false): boolean {
    if (r < 0 || r >= ROWS) return false;
    if (c < 0 || c >= COLS) return true; // Tunnels
    const v = this.map[r][c];
    if (v === WALL) return isPhaser;
    if (v === DOOR) return isEnemy;
    if (v === VOID) return false;
    return true;
  }

  public renderOffscreen() {
    const lvl = LEVELS[this.currentLevel];
    const c = this.mc;
    c.clearRect(0, 0, COLS * T, ROWS * T);
    c.fillStyle = lvl.bg;
    c.fillRect(0, 0, COLS * T, ROWS * T);

    // Subtle grid
    c.strokeStyle = 'rgba(255,255,255,0.025)';
    c.lineWidth = 1;
    for (let x = 0; x < COLS * T; x += T) {
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, ROWS * T); c.stroke();
    }
    for (let y = 0; y < ROWS * T; y += T) {
      c.beginPath(); c.moveTo(0, y); c.lineTo(COLS * T, y); c.stroke();
    }

    // Walls
    c.save();
    c.shadowColor = lvl.glowColor;
    c.shadowBlur = 10;
    c.lineWidth = 2;
    for (let r = 0; r < ROWS; r++) {
      for (let col = 0; col < COLS; col++) {
        if (this.map[r][col] === WALL) {
          const x = col * T, y = r * T;
          c.fillStyle = lvl.wallColor;
          c.fillRect(x + 1, y + 1, T - 2, T - 2);
          c.strokeStyle = lvl.glowColor;
          c.strokeRect(x + 1, y + 1, T - 2, T - 2);
        } else if (this.map[r][col] === DOOR) {
          const x = col * T, y = r * T;
          c.fillStyle = 'rgba(255, 128, 171, 0.3)';
          c.fillRect(x, y + T / 2 - 2, T, 4);
        }
      }
    }
    c.restore();
  }
}
