import { CM, COMBO_DECAY, COMBO_DECAY_WIDE, E_SPEED, GOD_MODE_DURATION, HALF, HIT_DIST, NM_DIST, P_MADNESS_BASE_SPEED, P_SPEED, T, getComboTier } from '../config/constants';
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
  fromX: number;
  fromY: number;
  progress: number;
  dx: number;
  dy: number;
  speed: number;
  type: 'stalker' | 'rusher' | 'orbiter' | 'phaser';
  frightened: boolean;
  nearMiss: boolean;
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

function decideGhostStep(maze: MazeManager, ghost: SimGhost, player: { x: number; y: number }) {
  const valid = DIRS.filter(dir => {
    const x = wrap(ghost.x + dir.x, maze.cols), y = ghost.y + dir.y;
    const reverse = dir.x === -ghost.dx && dir.y === -ghost.dy;
    const hasAlternative = DIRS.some(other =>
      (other.x !== dir.x || other.y !== dir.y) && maze.isWalkable(wrap(ghost.x + other.x, maze.cols), ghost.y + other.y, true)
    );
    return !(reverse && hasAlternative) && maze.isWalkable(x, y, true) && !maze.isInGhostHouse(x, y);
  });
  if (!valid.length) return { x: ghost.dx, y: ghost.dy };

  let target = { x: Math.floor(player.x), y: Math.floor(player.y) };
  if (ghost.type === 'rusher') target = { x: target.x + ghost.dx * 3, y: target.y + ghost.dy * 3 };
  if (ghost.type === 'orbiter') target = { x: (target.x + 5) % maze.cols, y: (target.y + 4) % maze.rows };
  if (ghost.type === 'phaser') target = {
    x: (target.x - ghost.dx * 2 + maze.cols) % maze.cols,
    y: Math.max(1, Math.min(maze.rows - 2, target.y - ghost.dy * 2))
  };
  if (ghost.frightened) target = { x: maze.cols - 1 - target.x, y: maze.rows - 1 - target.y };

  let best = valid[0], bestDistance = Infinity;
  for (const dir of valid) {
    const x = wrap(ghost.x + dir.x, maze.cols), y = ghost.y + dir.y;
    const distance = (x - target.x) ** 2 + (y - target.y) ** 2;
    if (distance < bestDistance) { bestDistance = distance; best = dir; }
  }
  return best;
}

function actorPosition(actor: { fromX: number; fromY: number; x: number; y: number; progress: number }, cols: number) {
  let x0 = actor.fromX, x1 = actor.x;
  if (Math.abs(x1 - x0) > cols / 2) {
    if (x1 > x0) x0 += cols;
    else x1 += cols;
  }
  return {
    x: wrap(x0 + (x1 - x0) * actor.progress, cols) * T + HALF,
    y: (actor.fromY + (actor.y - actor.fromY) * actor.progress) * T + HALF
  };
}

/**
 * Minimal no-render run: uses the production maze and collectible maps, while
 * intentionally omitting audio, particles, UI, items, combat and skill effects.
 * Movement interpolation, maze collision and contact radius follow production
 * constants. Player steering cadence and the simplified ghost director remain
 * approximations; this is a calibration harness, not a full engine port.
 */
export function runHeadlessGame(options: HeadlessRunOptions): HeadlessRunMetrics {
  const random = seededRandom(options.seed);
  const maze = new MazeManager(false);
  maze.build(0, options.widescreen ?? false);
  const dots = maze.dotMap.map(row => row.slice());
  const spawn = maze.getSpawn();
  let player = { ...spawn };
  let playerMoveIn = 0;
  let elapsed = 0;
  let spawnIn = 2.0;
  let deaths = 0;
  let lives = 3;
  let deathTimer = 0;
  let xp = 0;
  let level = 1;
  let currentLevelXp = 0;
  let levelUpsThisLife = 0;
  let comboCount = 0;
  let comboMultiplier = 1;
  let comboTimer = 0;
  let frightenedTimer = 0;
  let dotCount = 0;
  let decisionIndex = 0;
  let ticks = 0;
  let ghostsSpawned = 0;
  let invulnerability = 2.0;
  let playerMove = { fromX: player.x, fromY: player.y, x: player.x, y: player.y, progress: 1, dx: 0, dy: 0 };
  let kills = 0;
  const ghosts: SimGhost[] = [];
  const fixedDt = 1 / 30;
  const playerSpeed = options.widescreen ? P_MADNESS_BASE_SPEED + 4.3 : P_SPEED;
  const maxSeconds = options.maxSeconds ?? 300;
  const baseWalkable = maze.map.map((row, y) => row.map((_, x) => maze.isWalkable(x, y, false)));
  const isWide = maze.cols > 21;
  const comboDecay = isWide ? COMBO_DECAY_WIDE : COMBO_DECAY;
  const awardXp = (baseAmount: number) => {
    if (level >= 100) return;
    const amount = Math.round(baseAmount * (levelUpsThisLife > 0 ? 2 : 1));
    xp += amount;
    currentLevelXp += amount;
    while (level < 100 && currentLevelXp >= Math.floor(420 * Math.pow(level, 1.48))) {
      currentLevelXp -= Math.floor(420 * Math.pow(level, 1.48));
      level++;
      levelUpsThisLife++;
      lives = Math.min(5, lives + 1);
    }
  };

  while (elapsed < maxSeconds && (lives > 0 || deathTimer > 0)) {
    ticks++;
    elapsed += fixedDt;
    if (deathTimer > 0) {
      deathTimer = Math.max(0, deathTimer - fixedDt);
      if (deathTimer === 0 && lives > 0) {
        player = { ...spawn };
        playerMove = { fromX: player.x, fromY: player.y, x: player.x, y: player.y, progress: 1, dx: 0, dy: 0 };
        playerMoveIn = 0;
        invulnerability = 2.0;
        levelUpsThisLife = 0;
        comboCount = 0;
        comboMultiplier = 1;
        comboTimer = 0;
        frightenedTimer = 0;
        for (const ghost of ghosts) {
          if (ghost.frightened) { ghost.frightened = false; ghost.dangerous = true; }
        }
      }
      continue;
    }
    invulnerability = Math.max(0, invulnerability - fixedDt);
    if (frightenedTimer > 0) {
      frightenedTimer = Math.max(0, frightenedTimer - fixedDt);
      if (frightenedTimer === 0) {
        for (const ghost of ghosts) {
          if (ghost.frightened) { ghost.frightened = false; ghost.dangerous = true; }
        }
      }
    }
    if (comboTimer > 0) {
      comboTimer = Math.max(0, comboTimer - fixedDt);
      if (comboTimer === 0) {
        comboCount = 0;
        comboMultiplier = 1;
      } else if (comboMultiplier < 32) {
        comboMultiplier = CM[getComboTier(comboCount, isWide)];
      }
    }
    playerMoveIn -= fixedDt;

    if (playerMove.progress >= 1 && playerMoveIn <= 0) {
      const snapshotGhosts = ghosts.map(ghost => ({ x: ghost.x, y: ghost.y, dangerous: ghost.dangerous }));
      const decision = chooseBotAction({
        cols: maze.cols, rows: maze.rows, walkable: baseWalkable, collectibles: dots.map(row => row.map(Boolean)),
        player, ghosts: snapshotGhosts, decisionIndex: decisionIndex++
      });
      const direction = decision.direction;
      const x = wrap(player.x + direction.x, maze.cols), y = player.y + direction.y;
      if (maze.isWalkable(x, y, false) && (direction.x !== 0 || direction.y !== 0)) {
        playerMove = { fromX: player.x, fromY: player.y, x, y, progress: 0, dx: direction.x, dy: direction.y };
      }
      playerMoveIn = 1 / playerSpeed;

    }

    if (playerMove.progress < 1) {
      playerMove.progress = Math.min(1, playerMove.progress + fixedDt * playerSpeed);
      if (playerMove.progress >= 1) {
        player = { x: playerMove.x, y: playerMove.y };
        playerMove.fromX = player.x;
        playerMove.fromY = player.y;
        playerMove.dx = 0;
        playerMove.dy = 0;
        if (dots[player.y]?.[player.x]) {
          const collectible = dots[player.y][player.x];
          dots[player.y][player.x] = 0;
          dotCount++;
          const previousMultiplier = comboMultiplier;
          if (collectible === 3) {
            frightenedTimer = 7;
            for (const ghost of ghosts) {
              if (ghost.dangerous) {
                ghost.frightened = true;
                ghost.dangerous = false;
              }
            }
            comboCount += 4;
            awardXp(15);
          } else {
            comboCount++;
            awardXp(2);
          }
          comboMultiplier = CM[getComboTier(comboCount, isWide)];
          if (comboMultiplier >= 32 && previousMultiplier < 32) comboTimer = GOD_MODE_DURATION;
          else if (comboMultiplier < 32) comboTimer = comboDecay;
        }
      }
    }

    const profile = swarmProfile(kills);
    spawnIn -= fixedDt;
    const threatCount = ghosts.filter(ghost => ghost.dangerous).length;
    if (spawnIn <= 0 && threatCount < profile.cap) {
      const centerX = Math.floor(maze.cols / 2);
      for (let i = 0; i < profile.burst && ghosts.filter(ghost => ghost.dangerous).length < profile.cap; i++) {
        const candidates = options.widescreen
          ? [
              { x: centerX, y: 8 },
              { x: Math.round(maze.cols * 0.24), y: 10 },
              { x: Math.round(maze.cols * 0.76), y: 10 }
            ].filter(point => maze.isWalkable(point.x, point.y, true))
          : [{ x: centerX, y: 8 }].filter(point => maze.isWalkable(point.x, point.y, true));
        if (!candidates.length) break;
        const point = candidates[Math.floor(random() * candidates.length)];
        const type = (['stalker', 'rusher', 'orbiter', 'phaser'] as const)[Math.floor(random() * 4)];
        const speed = (E_SPEED + Math.min(2.5, kills * 0.015)) * (type === 'rusher' ? 1.3 : type === 'orbiter' ? 1.1 : 1);
        const dx = ghostsSpawned % 2 === 0 ? 1 : -1;
        ghosts.push({ ...point, dangerous: true, fromX: point.x, fromY: point.y, progress: 1, dx, dy: 0, speed, type, frightened: false, nearMiss: false });
        ghostsSpawned++;
      }
      spawnIn = profile.interval;
    }

    for (const ghost of ghosts) {
      if (!ghost.dangerous && !ghost.frightened) continue;
      if (ghost.progress < 1) {
        ghost.progress = Math.min(1, ghost.progress + fixedDt * ghost.speed * (ghost.frightened ? 0.55 : 1));
        if (ghost.progress >= 1) {
          ghost.fromX = ghost.x;
          ghost.fromY = ghost.y;
        }
      } else {
        const direction = decideGhostStep(maze, ghost, player);
        const x = wrap(ghost.x + direction.x, maze.cols), y = ghost.y + direction.y;
        if (maze.isWalkable(x, y, true)) {
          ghost.dx = direction.x;
          ghost.dy = direction.y;
          ghost.fromX = ghost.x;
          ghost.fromY = ghost.y;
          ghost.x = x;
          ghost.y = y;
          ghost.progress = 0;
        }
      }
    }

    const playerPos = actorPosition(playerMove, maze.cols);
    let diedThisFrame = false;
    for (const ghost of ghosts) {
      const ghostPos = actorPosition(ghost, maze.cols);
      const dx = Math.abs(playerPos.x - ghostPos.x);
      const wrappedDx = Math.min(dx, maze.cols * T - dx);
      const distance = Math.hypot(wrappedDx, playerPos.y - ghostPos.y);
      if (distance < HIT_DIST) {
        if (invulnerability > 0 || !ghost.dangerous) continue;
        if (comboMultiplier >= 32 || ghost.frightened) {
          ghost.dangerous = false;
          ghost.frightened = false;
          kills++;
          awardXp(Math.round(30 + 10 * Math.min(16, Math.max(1, comboMultiplier))));
          continue;
        }
        diedThisFrame = true;
        break;
      }
      if (distance < NM_DIST && ghost.dangerous && !ghost.nearMiss) {
        ghost.nearMiss = true;
        awardXp(25);
      } else if (distance >= NM_DIST) {
        ghost.nearMiss = false;
      }
    }

    if (diedThisFrame) {
      deaths++;
      lives--;
      levelUpsThisLife = 0;
      comboCount = 0;
      comboMultiplier = 1;
      comboTimer = 0;
      frightenedTimer = 0;
      deathTimer = 1.5;
      playerMoveIn = 0;
    }
  }

  return {
    seed: options.seed, simulatedSeconds: elapsed, ticks, dotsCollected: dotCount,
    xpEarned: xp, deaths, ghostsSpawned, level, gameOver: lives <= 0
  };
}
