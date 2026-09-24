import { E_SPEED, P_SPEED } from '../config/constants';
import { MazeManager } from '../levels/levels';
import { chooseBotAction, type BotDirection, type BotGhost } from './BotController';

export interface HeadlessRunOptions {
  seed: number;
  maxSeconds?: number;
  widescreen?: boolean;
}

export interface HeadlessRunMetrics {
  seed: number;
  simulatedSeconds: number;
  ticks: number;
  dotsCollected: number;
  xpEarned: number;
  deaths: number;
  ghostsSpawned: number;
  level: number;
  gameOver: boolean;
}

interface SimGhost extends BotGhost {
  moveIn: number;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

const DIRS: BotDirection[] = [
  { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }
];
const wrap = (x: number, cols: number) => (x + cols) % cols;

function swarmProfile(kills: number) {
  if (kills >= 250) return { cap: 96, interval: 0.22, burst: 4 };
  if (kills >= 150) return { cap: 76, interval: 0.30, burst: 3 };
  if (kills >= 80) return { cap: 58, interval: 0.40, burst: 3 };
  if (kills >= 45) return { cap: 40, interval: 0.55, burst: 2 };
  if (kills >= 25) return { cap: 28, interval: 0.75, burst: 2 };
  if (kills >= 12) return { cap: 20, interval: 0.95, burst: 2 };
  if (kills >= 5) return { cap: 14, interval: 1.20, burst: 2 };
  return { cap: 10, interval: 1.50, burst: 1 };
}

function nextGhostTile(maze: MazeManager, ghost: SimGhost, player: { x: number; y: number }): { x: number; y: number } {
  const queue = [{ x: player.x, y: player.y }];
  const seen = new Set([`${player.x},${player.y}`]);
  const next = new Map<string, { x: number; y: number }>();
  for (let i = 0; i < queue.length; i++) {
    const point = queue[i];
    if (point.x === ghost.x && point.y === ghost.y) break;
    for (const dir of DIRS) {
      const x = wrap(point.x + dir.x, maze.cols), y = point.y + dir.y;
      const key = `${x},${y}`;
      if (!maze.isWalkable(x, y, true) || seen.has(key)) continue;
      seen.add(key);
      next.set(key, point);
      queue.push({ x, y });
    }
  }
  // BFS grows outward from the player, so this predecessor is already the
  // ghost's first step toward its target.
  return next.get(`${ghost.x},${ghost.y}`) ?? { x: ghost.x, y: ghost.y };
}

/**
 * Minimal no-render run: uses the production maze and collectible maps, while
 * intentionally omitting audio, particles, UI, items, combat and skill effects.
 * Ghost chasing and tile-by-tile movement are approximations, not the production
 * continuous-time EnemyManager/Player update. Treat metrics as bot/hazard
 * baselines until that movement logic is extracted into a shared pure core.
 */
export function runHeadlessGame(options: HeadlessRunOptions): HeadlessRunMetrics {
  const random = seededRandom(options.seed);
  const maze = new MazeManager(false);
  maze.build(0, options.widescreen ?? false);
  const dots = maze.dotMap.map(row => row.map(value => value === 2 || value === 3));
  const spawn = maze.getSpawn();
  let player = { ...spawn };
  let playerMoveIn = 0;
  let elapsed = 0;
  let spawnIn = 2.0;
  let deaths = 0;
  let lives = 3;
  let xp = 0;
  let level = 1;
  let currentLevelXp = 0;
  let dotCount = 0;
  let decisionIndex = 0;
  let ticks = 0;
  let ghostsSpawned = 0;
  let invulnerability = 2.0;
  let kills = 0;
  const ghosts: SimGhost[] = [];
  const fixedDt = 0.1;
  const maxSeconds = options.maxSeconds ?? 300;
  const baseWalkable = maze.map.map((row, y) => row.map((_, x) => maze.isWalkable(x, y, false)));

  while (elapsed < maxSeconds && lives > 0) {
    ticks++;
    elapsed += fixedDt;
    invulnerability = Math.max(0, invulnerability - fixedDt);
    playerMoveIn -= fixedDt;

    if (playerMoveIn <= 0) {
      const snapshotGhosts = ghosts.map(ghost => ({ x: ghost.x, y: ghost.y, dangerous: ghost.dangerous }));
      const decision = chooseBotAction({
        cols: maze.cols, rows: maze.rows, walkable: baseWalkable, collectibles: dots,
        player, ghosts: snapshotGhosts, decisionIndex: decisionIndex++
      });
      const x = wrap(player.x + decision.direction.x, maze.cols);
      const y = player.y + decision.direction.y;
      if (maze.isWalkable(x, y, false)) player = { x, y };
      playerMoveIn = 1 / P_SPEED;

      if (dots[player.y]?.[player.x]) {
        dots[player.y][player.x] = false;
        dotCount++;
        xp += 2;
        currentLevelXp += 2;
        while (currentLevelXp >= Math.floor(420 * Math.pow(level, 1.48))) {
          currentLevelXp -= Math.floor(420 * Math.pow(level, 1.48));
          level++;
          lives = Math.min(5, lives + 1);
        }
      }
    }

    const profile = swarmProfile(kills);
    spawnIn -= fixedDt;
    const threatCount = ghosts.filter(ghost => ghost.dangerous).length;
    if (spawnIn <= 0 && threatCount < profile.cap) {
      const centerX = Math.floor(maze.cols / 2);
      for (let i = 0; i < profile.burst && ghosts.filter(ghost => ghost.dangerous).length < profile.cap; i++) {
        const candidates = [
          { x: centerX, y: 8 },
          { x: Math.round(maze.cols * 0.24), y: 10 },
          { x: Math.round(maze.cols * 0.76), y: 10 }
        ].filter(point => maze.isWalkable(point.x, point.y, true));
        if (!candidates.length) break;
        const point = candidates[Math.floor(random() * candidates.length)];
        ghosts.push({ ...point, dangerous: true, moveIn: 1 / E_SPEED });
        ghostsSpawned++;
      }
      spawnIn = profile.interval;
    }

    for (const ghost of ghosts) {
      ghost.moveIn -= fixedDt;
      if (ghost.moveIn <= 0) {
        const point = nextGhostTile(maze, ghost, player);
        ghost.x = point.x;
        ghost.y = point.y;
        ghost.moveIn = 1 / E_SPEED;
      }
    }

    if (invulnerability <= 0 && ghosts.some(ghost => ghost.dangerous && ghost.x === player.x && ghost.y === player.y)) {
      deaths++;
      lives--;
      ghosts.length = 0;
      player = { ...spawn };
      invulnerability = 2.0;
      spawnIn = 1.5;
    }
  }

  return {
    seed: options.seed, simulatedSeconds: elapsed, ticks, dotsCollected: dotCount,
    xpEarned: xp, deaths, ghostsSpawned, level, gameOver: lives <= 0
  };
}
