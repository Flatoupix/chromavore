import { CM, COMBO_DECAY, COMBO_DECAY_WIDE, E_SPEED, GOD_MODE_DURATION, HALF, HIT_DIST, NM_DIST, P_MADNESS_BASE_SPEED, P_SPEED, SINGULARITY_DURATION, SINGULARITY_TRIGGER_KILLS, T, getComboTier } from '../config/constants';
import { MazeManager } from '../levels/levels';
import { chooseBotAction, type BotDirection, type BotGhost, type BotStrategy } from './BotController';

export type SimulatedSkillPolicy = 'none' | 'pellet-focus' | 'dash-focus' | 'balanced';

export interface HeadlessProfile {
  careerGhosts: number;
  accountLevel: number;
  accountXp: number;
  skillPoints: number;
  skillUpgrades: Record<string, number>;
}

export interface HeadlessRunOptions {
  seed: number;
  maxSeconds?: number;
  widescreen?: boolean;
  botStrategy?: BotStrategy;
  skillPolicy?: SimulatedSkillPolicy;
  /** Candidate balance knobs; defaults mirror the current production XP rules. */
  ghostXpComboCap?: number;
  xpGainMultiplier?: number;
  xpCurveMultiplier?: number;
  /** Diagnostic override; the default uses the production 200-kill threshold. */
  singularityTriggerKills?: number;
  profile?: Partial<HeadlessProfile>;
}

export interface HeadlessRunMetrics {
  seed: number;
  simulatedSeconds: number;
  ticks: number;
  dotsCollected: number;
  ghostsKilled: number;
  xpEarned: number;
  deaths: number;
  ghostsSpawned: number;
  level: number;
  gameOver: boolean;
  dashes: number;
  singularityTriggered: boolean;
  ghostXpComboCap: number;
  xpGainMultiplier: number;
  xpCurveMultiplier: number;
  singularityTriggerKills: number;
  skillRanks: Record<string, number>;
  profile: HeadlessProfile;
}

export interface HeadlessCampaignOptions extends Omit<HeadlessRunOptions, 'profile'> {
  games: number;
  profile?: Partial<HeadlessProfile>;
}

export interface HeadlessCampaignMetrics {
  games: number;
  botStrategy: BotStrategy;
  skillPolicy: SimulatedSkillPolicy;
  averageRunSeconds: number;
  medianRunSeconds: number;
  p90RunSeconds: number;
  medianRunXp: number;
  p90RunXp: number;
  averageRunXp: number;
  totalCampaignXp: number;
  totalCampaignSeconds: number;
  campaignXpPerMinute: number;
  averageRunKills: number;
  averageRunDeaths: number;
  averageDotsCollected: number;
  singularityRunRate: number;
  gameOverRate: number;
  timeToLevelSeconds: Record<number, number | null>;
  finalProfile: HeadlessProfile;
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

function unlockedDashLevel(careerGhosts: number): number {
  const thresholds = [10, 1600, 4500, 8000, 12000];
  return thresholds.reduce((level, threshold) => careerGhosts >= threshold ? level + 1 : level, 0);
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
 * Minimal no-render run: uses the production maze, collectible map, movement,
 * contact, combo, XP and spawn constants. Rendering and audio are omitted.
 * Steering cadence and ghost behavior remain deliberate approximations.
 */
export function runHeadlessGame(options: HeadlessRunOptions): HeadlessRunMetrics {
  const random = seededRandom(options.seed);
  let careerGhosts = options.profile?.careerGhosts ?? 0;
  const widescreen = options.widescreen ?? (careerGhosts >= 1600);
  const maze = new MazeManager(false);
  maze.build(0, widescreen);
  const dots = maze.dotMap.map(row => row.slice());
  const spawn = maze.getSpawn();
  let player = { ...spawn };
  let playerMoveIn = 0;
  let elapsed = 0;
  let spawnIn = 0;
  let readyTimer = 1.5;
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
  let singularityIntroTimer = 0;
  let singularityTimer = 0;
  let singularityTriggered = false;
  let lifeKills = 0;
  let dotCount = 0;
  let decisionIndex = 0;
  let ticks = 0;
  let ghostsSpawned = 0;
  let dashes = 0;
  let dashCooldown = 0;
  let invulnerability = 2.0;
  let playerMove = { fromX: player.x, fromY: player.y, x: player.x, y: player.y, progress: 1, dx: 0, dy: 0 };
  let kills = 0;
  let skillPoints = options.profile?.skillPoints ?? 0;
  const skillRanks: Record<string, number> = { ...(options.profile?.skillUpgrades ?? {}) };
  const skillPolicy = options.skillPolicy ?? 'none';
  const botStrategy = options.botStrategy ?? 'collector';
  const ghostXpComboCap = Math.max(1, options.ghostXpComboCap ?? 16);
  const xpGainMultiplier = Math.max(0, options.xpGainMultiplier ?? 1);
  const xpCurveMultiplier = Math.max(0.01, options.xpCurveMultiplier ?? 1);
  const singularityTriggerKills = Math.max(1, Math.floor(options.singularityTriggerKills ?? SINGULARITY_TRIGGER_KILLS));
  let skillsBought = 0;
  const accountLevel = options.profile?.accountLevel ?? 1;
  level = accountLevel;
  currentLevelXp = options.profile?.accountXp ?? 0;
  const ghosts: SimGhost[] = [];
  const fixedDt = 1 / 30;
  const playerSpeed = widescreen ? P_MADNESS_BASE_SPEED + 4.3 : P_SPEED;
  const maxSeconds = options.maxSeconds ?? 300;
  const baseWalkable = maze.map.map((row, y) => row.map((_, x) => maze.isWalkable(x, y, false)));
  const isWide = maze.cols > 21;
  const comboDecay = isWide ? COMBO_DECAY_WIDE : COMBO_DECAY;
  const buyAvailableSkill = () => {
    if (skillPolicy === 'none') return;
    const priorities = skillPolicy === 'pellet-focus'
      ? ['pellet_resonance', 'dash_reflex']
      : skillPolicy === 'dash-focus'
        ? ['dash_reflex', 'pellet_resonance']
        : (skillsBought % 2 === 0 ? ['dash_reflex', 'pellet_resonance'] : ['pellet_resonance', 'dash_reflex']);
    for (const id of priorities) {
      const rank = skillRanks[id] ?? 0;
      const maxRank = id === 'pellet_resonance' ? 5 : 5;
      if (rank < maxRank && skillPoints >= 1) {
        skillRanks[id] = rank + 1;
        skillPoints--;
        skillsBought++;
        return;
      }
    }
  };
  const awardXp = (baseAmount: number) => {
    if (level >= 100) return;
    const amount = Math.round(baseAmount * xpGainMultiplier * (levelUpsThisLife > 0 ? 2 : 1));
    xp += amount;
    currentLevelXp += amount;
    while (level < 100 && currentLevelXp >= Math.floor(420 * Math.pow(level, 1.48) * xpCurveMultiplier)) {
      currentLevelXp -= Math.floor(420 * Math.pow(level, 1.48) * xpCurveMultiplier);
      level++;
      levelUpsThisLife++;
      skillPoints++;
      lives = Math.min(5, lives + 1);
      buyAvailableSkill();
    }
  };
  const collectAt = (x: number, y: number) => {
    const collectible = dots[y]?.[x];
    if (!collectible) return;
    dots[y][x] = 0;
    dotCount++;
    const previousMultiplier = comboMultiplier;
    if (collectible === 3) {
      frightenedTimer = 7 + (skillRanks.pellet_resonance ?? 0) * 1.2;
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
    if (comboMultiplier < 64) {
      comboMultiplier = CM[getComboTier(comboCount, isWide)];
      if (comboMultiplier >= 32 && previousMultiplier < 32) comboTimer = GOD_MODE_DURATION;
      else if (comboMultiplier < 32) comboTimer = comboDecay;
    }
  };
  const killGhost = (ghost: SimGhost) => {
    if (!ghost.dangerous && !ghost.frightened) return;
    ghost.dangerous = false;
    ghost.frightened = false;
    kills++;
    careerGhosts++;
    lifeKills++;
    if (!singularityTriggered && (lifeKills >= singularityTriggerKills || kills >= singularityTriggerKills)) {
      singularityTriggered = true;
      singularityIntroTimer = 5;
      comboMultiplier = 64;
      comboTimer = SINGULARITY_DURATION;
    }
    awardXp(Math.round(30 + 10 * Math.min(ghostXpComboCap, Math.max(1, comboMultiplier))));
  };
  const spawnGhost = (point: { x: number; y: number }, threatIndex: number) => {
    const type = (['stalker', 'rusher', 'orbiter', 'phaser'] as const)[Math.floor(random() * 4)];
    const speed = (E_SPEED + Math.min(2.5, kills * 0.015)) * (type === 'rusher' ? 1.3 : type === 'orbiter' ? 1.1 : 1);
    const dx = threatIndex % 2 === 0 ? 1 : -1;
    ghosts.push({ ...point, dangerous: true, fromX: point.x, fromY: point.y, progress: 1, dx, dy: 0, speed, type, frightened: false, nearMiss: false });
    ghostsSpawned++;
  };
  const centerCol = Math.floor(maze.cols / 2);
  const centralExit = maze.isWalkable(centerCol, 8, true)
    ? { x: centerCol, y: 8 }
    : maze.findNearestWalkable(centerCol, 8, true);
  const initialCount = Math.min(10, 4 + Math.floor(careerGhosts / 50));
  for (let index = 0; index < initialCount; index++) {
    let point = centralExit;
    if (widescreen && index % 3 !== 0) {
      const nestX = index % 3 === 1 ? Math.round(maze.cols * 0.24) : Math.round(maze.cols * 0.76);
      const candidate = { x: nestX + Math.floor(random() * 3) - 1, y: 10 + Math.floor(random() * 3) - 1 };
      point = maze.isWalkable(candidate.x, candidate.y, true)
        ? candidate
        : maze.findNearestWalkable(nestX, 10, true);
    }
    spawnGhost(point, index);
  }

  while (elapsed < maxSeconds && (lives > 0 || deathTimer > 0)) {
    ticks++;
    elapsed += fixedDt;
    if (readyTimer > 0) {
      readyTimer = Math.max(0, readyTimer - fixedDt);
      continue;
    }
    if (singularityIntroTimer > 0) {
      singularityIntroTimer = Math.max(0, singularityIntroTimer - fixedDt);
      if (singularityIntroTimer === 0) {
        for (const ghost of ghosts) killGhost(ghost);
        singularityTimer = SINGULARITY_DURATION;
        comboMultiplier = 64;
        comboTimer = SINGULARITY_DURATION;
        invulnerability = Math.max(invulnerability, 1.5);
      }
      continue;
    }
    if (deathTimer > 0) {
      deathTimer = Math.max(0, deathTimer - fixedDt);
      if (deathTimer === 0 && lives > 0) {
        player = { ...spawn };
        playerMove = { fromX: player.x, fromY: player.y, x: player.x, y: player.y, progress: 1, dx: 0, dy: 0 };
        playerMoveIn = 0;
        invulnerability = 2.0;
        levelUpsThisLife = 0;
        lifeKills = 0;
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
    dashCooldown = Math.max(0, dashCooldown - fixedDt);
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
    if (singularityTimer > 0) {
      singularityTimer = Math.max(0, singularityTimer - fixedDt);
      if (singularityTimer === 0) {
        comboCount = 0;
        comboMultiplier = 1;
        comboTimer = 0;
      }
    }
    playerMoveIn -= fixedDt;

    if (playerMove.progress >= 1 && playerMoveIn <= 0) {
      const snapshotGhosts = ghosts.map(ghost => ({ x: ghost.x, y: ghost.y, dangerous: ghost.dangerous, frightened: ghost.frightened }));
      const decision = chooseBotAction({
        cols: maze.cols, rows: maze.rows, walkable: baseWalkable, collectibles: dots,
        player, ghosts: snapshotGhosts, decisionIndex: decisionIndex++
      }, botStrategy, comboMultiplier >= 32);
      const direction = decision.direction;
      const dashLevel = unlockedDashLevel(careerGhosts);
      if (decision.useDash && dashLevel > 0 && dashCooldown <= 0 && (direction.x !== 0 || direction.y !== 0)) {
        collectAt(player.x, player.y);
        const dashDistance = 3 + Math.min(4, Math.max(0, dashLevel - 1));
        for (let i = 0; i < dashDistance; i++) {
          const x = wrap(player.x + direction.x, maze.cols), y = player.y + direction.y;
          if (!maze.isWalkable(x, y, false)) break;
          player = { x, y };
          collectAt(x, y);
          for (const ghost of ghosts) {
            if (!ghost.dangerous && !ghost.frightened) continue;
            const pos = actorPosition(ghost, maze.cols);
            const dx = Math.min(Math.abs(pos.x - (x * T + HALF)), maze.cols * T - Math.abs(pos.x - (x * T + HALF)));
            if (Math.hypot(dx, pos.y - (y * T + HALF)) < T * 1.2) {
              killGhost(ghost);
            }
          }
        }
        playerMove = { fromX: player.x, fromY: player.y, x: player.x, y: player.y, progress: 1, dx: 0, dy: 0 };
        const cooldownFactor = (dashLevel >= 2 ? 0.75 : 1) * (1 - (skillRanks.dash_reflex ?? 0) * 0.12);
        dashCooldown = 1.6 * Math.max(0.25, cooldownFactor);
        const phaseRank = skillRanks.phase_shift ?? 0;
        invulnerability = Math.max(invulnerability, 0.35 + (phaseRank > 0 ? 0.3 + (phaseRank - 1) * 0.15 : 0));
        playerMoveIn = 1 / playerSpeed;
        dashes++;
      } else {
        const x = wrap(player.x + direction.x, maze.cols), y = player.y + direction.y;
        if (maze.isWalkable(x, y, false) && (direction.x !== 0 || direction.y !== 0)) {
          playerMove = { fromX: player.x, fromY: player.y, x, y, progress: 0, dx: direction.x, dy: direction.y };
        }
        playerMoveIn = 1 / playerSpeed;
      }
    }

    if (playerMove.progress < 1) {
      playerMove.progress = Math.min(1, playerMove.progress + fixedDt * playerSpeed);
      if (playerMove.progress >= 1) {
        player = { x: playerMove.x, y: playerMove.y };
        playerMove.fromX = player.x;
        playerMove.fromY = player.y;
        playerMove.dx = 0;
        playerMove.dy = 0;
        collectAt(player.x, player.y);
      }
    }

    const profile = swarmProfile(kills);
    spawnIn -= fixedDt;
    const threatCount = ghosts.filter(ghost => ghost.dangerous).length;
    if (spawnIn <= 0 && threatCount < profile.cap) {
      const centerX = Math.floor(maze.cols / 2);
      for (let i = 0; i < profile.burst && ghosts.filter(ghost => ghost.dangerous).length < profile.cap; i++) {
        const candidates = widescreen
          ? [
              { x: centerX, y: 8 },
              { x: Math.round(maze.cols * 0.24), y: 10 },
              { x: Math.round(maze.cols * 0.76), y: 10 }
            ].filter(point => maze.isWalkable(point.x, point.y, true))
          : [{ x: centerX, y: 8 }].filter(point => maze.isWalkable(point.x, point.y, true));
        if (!candidates.length) break;
        const point = candidates[Math.floor(random() * candidates.length)];
        spawnGhost(point, threatCount + i);
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
        if (invulnerability > 0) continue;
        if (comboMultiplier >= 32 || ghost.frightened) {
          killGhost(ghost);
          continue;
        }
        if (!ghost.dangerous) continue;
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
      lifeKills = 0;
      comboCount = 0;
      comboMultiplier = 1;
      comboTimer = 0;
      frightenedTimer = 0;
      deathTimer = 1.5;
      playerMoveIn = 0;
    }
  }

  return {
    seed: options.seed, simulatedSeconds: elapsed, ticks, dotsCollected: dotCount, ghostsKilled: kills,
    xpEarned: xp, deaths, ghostsSpawned, level, gameOver: lives <= 0, dashes, singularityTriggered,
    ghostXpComboCap, xpGainMultiplier, xpCurveMultiplier, singularityTriggerKills,
    skillRanks,
    profile: { careerGhosts, accountLevel: level, accountXp: currentLevelXp, skillPoints, skillUpgrades: skillRanks }
  };
}

/** Runs seeded games as one persistent account; skill purchases are simulated
 * at level-up according to the selected counterfactual policy. */
export function runHeadlessCampaign(options: HeadlessCampaignOptions): HeadlessCampaignMetrics {
  const runCount = Math.max(0, Math.floor(options.games));
  const strategy = options.botStrategy ?? 'collector';
  const skillPolicy = options.skillPolicy ?? 'none';
  let profile: HeadlessProfile = {
    careerGhosts: options.profile?.careerGhosts ?? 0,
    accountLevel: options.profile?.accountLevel ?? 1,
    accountXp: options.profile?.accountXp ?? 0,
    skillPoints: options.profile?.skillPoints ?? 0,
    skillUpgrades: { ...(options.profile?.skillUpgrades ?? {}) }
  };
  const durations: number[] = [];
  const xpByRun: number[] = [];
  const killsByRun: number[] = [];
  const deathsByRun: number[] = [];
  const dotsByRun: number[] = [];
  let singularityRuns = 0;
  const milestones: Record<number, number | null> = { 5: null, 10: null, 20: null, 35: null, 50: null, 75: null, 100: null };
  let campaignSeconds = 0;
  let gameOvers = 0;
  for (const target of Object.keys(milestones).map(Number)) {
    if (profile.accountLevel >= target) milestones[target] = 0;
  }

  for (let index = 0; index < runCount; index++) {
    const run = runHeadlessGame({
      ...options,
      seed: (options.seed + index) >>> 0,
      botStrategy: strategy,
      skillPolicy,
      profile
    });
    durations.push(run.simulatedSeconds);
    xpByRun.push(run.xpEarned);
    killsByRun.push(run.ghostsKilled);
    deathsByRun.push(run.deaths);
    dotsByRun.push(run.dotsCollected);
    if (run.singularityTriggered) singularityRuns++;
    campaignSeconds += run.simulatedSeconds;
    if (run.gameOver) gameOvers++;
    profile = run.profile;
    for (const target of Object.keys(milestones).map(Number)) {
      if (milestones[target] === null && profile.accountLevel >= target) milestones[target] = campaignSeconds;
    }
  }

  const percentile = (values: number[], fraction: number) => {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1)];
  };
  const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const totalCampaignXp = xpByRun.reduce((sum, value) => sum + value, 0);

  return {
    games: runCount,
    botStrategy: strategy,
    skillPolicy,
    averageRunSeconds: average(durations),
    medianRunSeconds: percentile(durations, 0.5),
    p90RunSeconds: percentile(durations, 0.9),
    medianRunXp: percentile(xpByRun, 0.5),
    p90RunXp: percentile(xpByRun, 0.9),
    averageRunXp: average(xpByRun),
    totalCampaignXp,
    totalCampaignSeconds: campaignSeconds,
    campaignXpPerMinute: campaignSeconds > 0 ? totalCampaignXp / (campaignSeconds / 60) : 0,
    averageRunKills: average(killsByRun),
    averageRunDeaths: average(deathsByRun),
    averageDotsCollected: average(dotsByRun),
    singularityRunRate: runCount ? singularityRuns / runCount : 0,
    gameOverRate: runCount ? gameOvers / runCount : 0,
    timeToLevelSeconds: milestones,
    finalProfile: profile
  };
}
