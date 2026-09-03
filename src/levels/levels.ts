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
  [1,2,2,2,2,2,2,2,2,2,1],[1,1,2,1,1,2,1,1,2,2,2],[1,3,2,1,2,2,2,1,2,3,1],
  [1,2,1,1,2,1,2,1,1,2,1],[1,2,2,2,2,1,2,2,2,2,1],[1,2,2,2,2,2,2,2,2,2,2],
  [1,1,1,1,1,1,1,1,1,1,1]
];

export const ML4: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1],[1,3,2,2,2,2,1,2,2,3,1],[1,2,1,1,1,2,1,2,1,2,1],
  [1,2,1,2,2,2,2,2,1,2,1],[1,2,2,2,1,1,1,2,2,2,2],[1,1,1,2,2,1,2,2,1,1,1],
  [1,2,2,2,2,1,2,2,2,2,1],[1,2,1,1,2,2,2,1,1,2,1],[0,0,0,1,2,2,2,2,2,2,2],
  [1,1,1,1,2,1,4,1,1,6,4],[8,4,4,4,2,4,4,1,5,5,5],[1,1,1,1,2,1,4,1,1,1,1],
  [0,0,0,1,2,2,2,2,2,2,2],[1,2,1,1,2,2,2,1,1,2,1],[1,2,2,2,2,1,2,2,2,2,1],
  [1,1,1,2,2,1,2,2,1,1,1],[1,2,2,2,1,1,1,2,2,2,2],[1,2,1,2,2,2,2,2,1,2,1],
  [1,2,1,1,1,2,1,2,1,2,1],[1,3,2,2,2,2,1,2,2,3,1],[1,2,2,2,2,2,2,2,2,2,2],
  [1,1,1,1,1,1,1,1,1,1,1]
];

export const LEVELS: LevelDef[] = [
  {
    name: 'NEON SUNSET',
    glowColor: '#ff007f',
    dotColor: '#00f0ff',
    pelletColor: '#ffd700',
    wallColor: '#250838',
    bg: '#0c0218',
    layout: ML1
  },
  {
    name: 'MIAMI NIGHTS',
    glowColor: '#00f0ff',
    dotColor: '#ff007f',
    pelletColor: '#ffe600',
    wallColor: '#081c32',
    bg: '#040b17',
    layout: ML2
  },
  {
    name: 'SYNTH HIGHWAY',
    glowColor: '#b000ff',
    dotColor: '#00ffff',
    pelletColor: '#ff0055',
    wallColor: '#20083a',
    bg: '#090214',
    layout: ML3
  },
  {
    name: 'OUTRUN 1984',
    glowColor: '#ff6600',
    dotColor: '#ff007f',
    pelletColor: '#00ffff',
    wallColor: '#361008',
    bg: '#140402',
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

  public findNearestWalkable(c: number, r: number, isEnemy: boolean = false): { x: number; y: number } {
    if (this.isWalkable(c, r, isEnemy)) return { x: c, y: r };
    for (let dist = 1; dist <= 8; dist++) {
      for (let dy = -dist; dy <= dist; dy++) {
        for (let dx = -dist; dx <= dist; dx++) {
          if (Math.abs(dx) === dist || Math.abs(dy) === dist) {
            const tx = (c + dx + COLS) % COLS;
            const ty = r + dy;
            if (this.isWalkable(tx, ty, isEnemy)) {
              return { x: tx, y: ty };
            }
          }
        }
      }
    }
    return { x: 10, y: 16 };
  }

  public getRandomWalkable(isEnemy: boolean = false): { x: number; y: number } {
    const valid: { x: number; y: number }[] = [];
    for (let r = 2; r < ROWS - 2; r++) {
      for (let c = 1; c < COLS - 1; c++) {
        if (this.isWalkable(c, r, isEnemy) && this.map[r][c] !== WALL && this.map[r][c] !== VOID) {
          valid.push({ x: c, y: r });
        }
      }
    }
    if (valid.length) return valid[(Math.random() * valid.length) | 0];
    return { x: 10, y: 16 };
  }

  public renderOffscreen() {
    const lvl = LEVELS[this.currentLevel];
    const c = this.mc;
    c.clearRect(0, 0, COLS * T, ROWS * T);
    c.fillStyle = lvl.bg;
    c.fillRect(0, 0, COLS * T, ROWS * T);

    // Retro wireframe grid
    c.strokeStyle = 'rgba(255, 0, 128, 0.05)';
    c.lineWidth = 1;
    for (let x = 0; x < COLS * T; x += T) {
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, ROWS * T); c.stroke();
    }
    for (let y = 0; y < ROWS * T; y += T) {
      c.beginPath(); c.moveTo(0, y); c.lineTo(COLS * T, y); c.stroke();
    }

    // Walls with glowing dual contour
    c.save();
    c.shadowColor = lvl.glowColor;
    c.shadowBlur = 12;
    c.lineWidth = 1.5;
    for (let r = 0; r < ROWS; r++) {
      for (let col = 0; col < COLS; col++) {
        if (this.map[r][col] === WALL) {
          const x = col * T, y = r * T;
          c.fillStyle = lvl.wallColor;
          c.fillRect(x + 1, y + 1, T - 2, T - 2);
          c.strokeStyle = lvl.glowColor;
          c.strokeRect(x + 1.5, y + 1.5, T - 3, T - 3);
        } else if (this.map[r][col] === DOOR) {
          const x = col * T, y = r * T;
          c.fillStyle = 'rgba(255, 0, 128, 0.5)';
          c.fillRect(x, y + T / 2 - 2, T, 4);
        }
      }
    }
    c.restore();
  }
}
