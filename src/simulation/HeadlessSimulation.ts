import { CM, COMBO_DECAY, COMBO_DECAY_WIDE, E_SPEED, GOD_MODE_DURATION, HALF, HIT_DIST, KILL_STREAK_DECAY_WINDOW, NM_DIST, P_MADNESS_BASE_SPEED, P_SPEED, SINGULARITY_DURATION, SINGULARITY_TRIGGER_STREAK, T, getComboTier } from '../config/constants';
import { MADNESS_LEVELS_16_9, MADNESS_LEVELS_4_3, MazeManager } from '../levels/levels';
import { chooseBotAction, type BotDirection, type BotGhost, type BotStrategy } from './BotController';
import { SKILL_NODES } from '../config/skillTree';

export type SimulatedSkillPolicy = 'none' | 'mobility' | 'control' | 'defense' | 'singularity' | 'pellet-focus' | 'dash-focus' | 'balanced';

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
  /** Diagnostic override; the default uses the production x200 ghost-streak threshold. */
  singularityTriggerKills?: number;
  profile?: Partial<HeadlessProfile>;
}

export interface HeadlessRunMetrics {
  seed: number;
  simulatedSeconds: number;
  ticks: number;
  dotsCollected: number;
  ghostsKilled: number;
  mazesCleared: number;
  xpEarned: number;
  deaths: number;
  ghostsSpawned: number;
  level: number;
  gameOver: boolean;
  dashes: number;
  empUses: number;
  bastionUses: number;
  laserKills: number;
  novaUses: number;
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
  averageMazesCleared: number;
  averageRunDeaths: number;
  averageDotsCollected: number;
  averageDashes: number;
  averageEmpUses: number;
  averageBastionUses: number;
  averageLaserKills: number;
  averageNovaUses: number;
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
  frozen?: boolean;
  frozenTimer?: number;
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
  const mazeList = widescreen ? MADNESS_LEVELS_16_9 : MADNESS_LEVELS_4_3;
  const maze = new MazeManager(false);
  let mazeIndex = 0;
  maze.build(mazeIndex, widescreen);
  let dots = maze.dotMap.map(row => row.slice());
  let baseWalkable = maze.map.map((row, y) => row.map((_, x) => maze.isWalkable(x, y, false)));
  let comboDecay = maze.cols > 21 ? COMBO_DECAY_WIDE : COMBO_DECAY;
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
  let killStreak = 0;
  let killStreakTimer = 0;
  let dotCount = 0;
  let decisionIndex = 0;
  let ticks = 0;
  let ghostsSpawned = 0;
  let dashes = 0;
  let empUses = 0;
  let bastionUses = 0;
  let laserKills = 0;
  let novaUses = 0;
  let mazesCleared = 0;
  let loopCount = 0;
  let dashCooldown = 0;
  let dashCharges = 1;
  let dashChargeCooldown = 0;
  let empCooldown = 0;
  let bastionCooldown = 0;
  let laserCooldown = 0;
  let novaCooldown = 0;
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
  const singularityTriggerKills = Math.max(1, Math.floor(options.singularityTriggerKills ?? SINGULARITY_TRIGGER_STREAK));
  let skillsBought = 0;
  const accountLevel = options.profile?.accountLevel ?? 1;
  level = accountLevel;
  currentLevelXp = options.profile?.accountXp ?? 0;
  dashCharges = 1 + (skillRanks.multi_dash ?? 0);
  const ghosts: SimGhost[] = [];
  const fixedDt = 1 / 30;
  const basePlayerSpeed = widescreen ? P_MADNESS_BASE_SPEED + 4.3 : P_SPEED;
  const maxSeconds = options.maxSeconds ?? 300;
  const playerSpeed = () => {
    const nitroBonus = (skillRanks.hyper_nitro ?? 0) * 0.08;
    return basePlayerSpeed * (1 + loopCount * 0.1) * (1 + nitroBonus);
  };

  const getNodePriorities = (policy: SimulatedSkillPolicy, count: number): string[] => {
    switch (policy) {
      case 'mobility':
        return ['dash_reflex', 'multi_dash', 'hyper_nitro', 'phase_shift', 'quantum_laser'];
      case 'control':
        return ['chrono_tank', 'emp_overcharge', 'deep_freeze', 'magnetic_core', 'kinetic_bastion'];
      case 'defense':
        return ['chrono_tank', 'emp_overcharge', 'magnetic_core', 'dash_reflex', 'phase_shift', 'deep_freeze', 'kinetic_bastion'];
      case 'singularity':
        return ['pellet_resonance', 'titan_breaker', 'super_frequency', 'singularity_mastery', 'singularity_nova'];
      case 'dash-focus':
        return ['dash_reflex', 'multi_dash', 'phase_shift', 'hyper_nitro'];
      case 'pellet-focus':
        return ['pellet_resonance', 'titan_breaker', 'super_frequency', 'singularity_mastery'];
      case 'balanced':
      default:
        return count % 3 === 0
          ? ['dash_reflex', 'pellet_resonance', 'chrono_tank', 'multi_dash', 'emp_overcharge', 'magnetic_core', 'titan_breaker', 'phase_shift', 'deep_freeze', 'super_frequency']
          : count % 3 === 1
            ? ['pellet_resonance', 'chrono_tank', 'dash_reflex', 'titan_breaker', 'magnetic_core', 'multi_dash', 'super_frequency', 'emp_overcharge', 'singularity_mastery', 'phase_shift']
            : ['chrono_tank', 'dash_reflex', 'pellet_resonance', 'emp_overcharge', 'multi_dash', 'magnetic_core', 'deep_freeze', 'phase_shift', 'titan_breaker', 'super_frequency'];
    }
  };

  const buyAvailableSkill = () => {
    if (skillPolicy === 'none') return;
    const priorities = getNodePriorities(skillPolicy, skillsBought);
    for (const id of priorities) {
      const node = SKILL_NODES.find(n => n.id === id);
      if (!node) continue;
      const rank = skillRanks[id] ?? 0;
      if (rank >= node.maxRank) continue;
      if (skillPoints < node.costPerRank) continue;
      if (node.reqSkillId && (skillRanks[node.reqSkillId] ?? 0) === 0) continue;
      if (node.isUltimate) {
        const branchNodes = SKILL_NODES.filter(n => n.branch === node.branch && n.id !== node.id);
        const branchPointsSpent = branchNodes.reduce((acc, n) => acc + ((skillRanks[n.id] ?? 0) * n.costPerRank), 0);
        const prereqRank = node.reqSkillId ? (skillRanks[node.reqSkillId] ?? 0) : 0;
        if (prereqRank < 1 && branchPointsSpent < 10) continue;
      }
      skillRanks[id] = rank + 1;
      skillPoints -= node.costPerRank;
      skillsBought++;
      return;
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
    maze.remainingDots = Math.max(0, maze.remainingDots - 1);
    dotCount++;
    const previousMultiplier = comboMultiplier;
    if (collectible === 3) {
      frightenedTimer = 7 + (skillRanks.pellet_resonance ?? 0) * 1.4;
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
      comboMultiplier = CM[getComboTier(comboCount, maze.cols > 21)];
      if (comboMultiplier >= 32 && previousMultiplier < 32) comboTimer = GOD_MODE_DURATION;
      else if (comboMultiplier < 32) comboTimer = comboDecay + (skillRanks.singularity_mastery ?? 0) * 0.4;
    }
  };
  const checkMagneticPull = () => {
    const magRank = skillRanks.magnetic_core ?? 0;
    if (magRank <= 0) return;
    const magRadius = 1.5 + (magRank - 1) * 1.0;
    const range = Math.ceil(magRadius);
    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (Math.hypot(dx, dy) <= magRadius) {
          const nx = wrap(player.x + dx, maze.cols);
          const ny = player.y + dy;
          if (dots[ny]?.[nx]) {
            collectAt(nx, ny);
          }
        }
      }
    }
  };
  const killGhost = (ghost: SimGhost, countForStreak = true) => {
    if (!ghost.dangerous && !ghost.frightened) return;
    ghost.dangerous = false;
    ghost.frightened = false;
    ghost.frozen = false;
    kills++;
    careerGhosts++;
    if (countForStreak) {
      killStreak++;
      killStreakTimer = KILL_STREAK_DECAY_WINDOW + (skillRanks.singularity_mastery ?? 0) * 0.4;
      if (!singularityTriggered && killStreak >= singularityTriggerKills) {
        singularityTriggered = true;
        singularityIntroTimer = 5;
        comboMultiplier = 64;
        comboTimer = SINGULARITY_DURATION + (skillRanks.singularity_mastery ?? 0) * 2;
      }
    }
    const pelletScoreMult = (skillRanks.pellet_resonance ?? 0) >= 4 ? 1.25 : 1.0;
    awardXp(Math.round((30 + 10 * Math.min(ghostXpComboCap, Math.max(1, comboMultiplier))) * pelletScoreMult));
  };
  const spawnGhost = (point: { x: number; y: number }, threatIndex: number) => {
    const type = (['stalker', 'rusher', 'orbiter', 'phaser'] as const)[Math.floor(random() * 4)];
    const speed = (E_SPEED + Math.min(2.5, kills * 0.015)) * (type === 'rusher' ? 1.3 : type === 'orbiter' ? 1.1 : 1);
    const dx = threatIndex % 2 === 0 ? 1 : -1;
    ghosts.push({ ...point, dangerous: true, fromX: point.x, fromY: point.y, progress: 1, dx, dy: 0, speed, type, frightened: false, nearMiss: false });
    ghostsSpawned++;
  };
  const spawnInitialGhosts = () => {
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
  };
  spawnInitialGhosts();
  const advanceMaze = () => {
    mazesCleared++;
    const previousIndex = mazeIndex;
    mazeIndex = (mazeIndex + 1) % mazeList.length;
    if (previousIndex === mazeList.length - 1) loopCount++;
    awardXp(400);
    maze.build(mazeIndex, widescreen);
    dots = maze.dotMap.map(row => row.slice());
    baseWalkable = maze.map.map((row, y) => row.map((_, x) => maze.isWalkable(x, y, false)));
    comboDecay = maze.cols > 21 ? COMBO_DECAY_WIDE : COMBO_DECAY;
    const safeSpawn = maze.getSpawn();
    player = { ...safeSpawn };
    playerMove = { fromX: player.x, fromY: player.y, x: player.x, y: player.y, progress: 1, dx: 0, dy: 0 };
    playerMoveIn = 0;
    invulnerability = Math.max(invulnerability, 1.8);
    spawnIn = Math.min(spawnIn, 0.8);
    const targetSwarm = Math.min(swarmProfile(kills).cap, Math.max(8 + mazeIndex * 2, 6 + mazeIndex * 3 + loopCount * 4 + Math.min(6, Math.floor(careerGhosts / 50)) + Math.floor(kills / 6)));
    const living = ghosts.filter(ghost => ghost.dangerous || ghost.frightened).length;
    for (const ghost of ghosts) {
      if ((ghost.dangerous || ghost.frightened) && !maze.isWalkable(ghost.x, ghost.y, true)) {
        const safe = maze.findNearestWalkable(ghost.x, ghost.y, true);
        ghost.x = ghost.fromX = safe.x;
        ghost.y = ghost.fromY = safe.y;
        ghost.progress = 1;
      }
    }
    for (let i = living; i < targetSwarm; i++) {
      const center = Math.floor(maze.cols / 2);
      const point = maze.isWalkable(center, 8, true) ? { x: center, y: 8 } : maze.findNearestWalkable(center, 8, true);
      spawnGhost(point, living + i);
    }
  };

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
        for (const ghost of ghosts) killGhost(ghost, false);
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
        killStreak = 0;
        killStreakTimer = 0;
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
    killStreakTimer = Math.max(0, killStreakTimer - fixedDt);
    if (killStreakTimer === 0) killStreak = 0;
    invulnerability = Math.max(0, invulnerability - fixedDt);
    const maxDashCharges = 1 + (skillRanks.multi_dash ?? 0);
    dashChargeCooldown = Math.max(0, dashChargeCooldown - fixedDt);
    if (dashCharges < maxDashCharges && dashChargeCooldown <= 0) {
      dashCharges++;
      const rechargeTime = 2.0 * Math.max(0.35, 1 - (skillRanks.dash_reflex ?? 0) * 0.12);
      dashChargeCooldown = rechargeTime;
    }
    dashCooldown = Math.max(0, dashCooldown - fixedDt);
    empCooldown = Math.max(0, empCooldown - fixedDt);
    bastionCooldown = Math.max(0, bastionCooldown - fixedDt);
    laserCooldown = Math.max(0, laserCooldown - fixedDt);
    novaCooldown = Math.max(0, novaCooldown - fixedDt);
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
        comboMultiplier = CM[getComboTier(comboCount, maze.cols > 21)];
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

    // Laser trigger check
    const laserRank = skillRanks.quantum_laser ?? 0;
    if (laserRank > 0 && laserCooldown <= 0) {
      const aligned = ghosts.filter(g => (g.dangerous || g.frightened) && (g.x === player.x || g.y === player.y));
      if (aligned.length >= 2) {
        laserCooldown = 18 - (laserRank - 1) * 4;
        for (const g of aligned) {
          killGhost(g);
          laserKills++;
        }
      }
    }

    // Singularity nova trigger check
    const novaRank = skillRanks.singularity_nova ?? 0;
    if (novaRank > 0 && novaCooldown <= 0) {
      const dangerousGhosts = ghosts.filter(g => g.dangerous);
      if (dangerousGhosts.length >= 6) {
        novaCooldown = 38;
        novaUses++;
        let count = 0;
        for (const g of dangerousGhosts) {
          killGhost(g);
          count++;
          if (count >= 8) break;
        }
        comboMultiplier = 64;
        comboTimer = 8;
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
      if (decision.useDash && dashLevel > 0 && dashCharges > 0 && dashCooldown <= 0 && (direction.x !== 0 || direction.y !== 0)) {
        dashCharges--;
        dashes++;
        collectAt(player.x, player.y);
        checkMagneticPull();
        const dashDistance = 3 + Math.min(4, Math.max(0, dashLevel - 1));
        for (let i = 0; i < dashDistance; i++) {
          const x = wrap(player.x + direction.x, maze.cols), y = player.y + direction.y;
          if (!maze.isWalkable(x, y, false)) break;
          player = { x, y };
          collectAt(x, y);
          checkMagneticPull();
          for (const ghost of ghosts) {
            if (!ghost.dangerous && !ghost.frightened) continue;
            const pos = actorPosition(ghost, maze.cols);
            const dx = Math.min(Math.abs(pos.x - (x * T + HALF)), maze.cols * T - Math.abs(pos.x - (x * T + HALF)));
            if (Math.hypot(dx, pos.y - (y * T + HALF)) < T * 1.2) {
              killGhost(ghost);
            }
          }
        }
        if (maze.remainingDots <= 0) advanceMaze();
        playerMove = { fromX: player.x, fromY: player.y, x: player.x, y: player.y, progress: 1, dx: 0, dy: 0 };
        const phaseRank = skillRanks.phase_shift ?? 0;
        invulnerability = Math.max(invulnerability, 0.35 + (phaseRank > 0 ? 0.3 + (phaseRank - 1) * 0.15 : 0));
        playerMoveIn = 1 / playerSpeed();
        if (dashCharges > 0) {
          dashCooldown = 0.28;
        } else {
          dashCooldown = dashChargeCooldown;
        }
      } else {
        const x = wrap(player.x + direction.x, maze.cols), y = player.y + direction.y;
        if (maze.isWalkable(x, y, false) && (direction.x !== 0 || direction.y !== 0)) {
          playerMove = { fromX: player.x, fromY: player.y, x, y, progress: 0, dx: direction.x, dy: direction.y };
        }
        playerMoveIn = 1 / playerSpeed();
      }
    }

    if (playerMove.progress < 1) {
      playerMove.progress = Math.min(1, playerMove.progress + fixedDt * playerSpeed());
      if (playerMove.progress >= 1) {
        player = { x: playerMove.x, y: playerMove.y };
        playerMove.fromX = player.x;
        playerMove.fromY = player.y;
        playerMove.dx = 0;
        playerMove.dy = 0;
        collectAt(player.x, player.y);
        checkMagneticPull();
        if (maze.remainingDots <= 0) advanceMaze();
      }
    }

    // EMP Overcharge trigger check
    const empRank = skillRanks.emp_overcharge ?? 0;
    if (empRank > 0 && empCooldown <= 0) {
      const nearDangerous = ghosts.filter(g => g.dangerous && Math.hypot(g.x - player.x, g.y - player.y) < 3.2);
      if (nearDangerous.length >= 2) {
        empCooldown = 20;
        empUses++;
        const freezeDur = 2.5 + (skillRanks.deep_freeze ?? 0) * 1.2;
        const empRadius = 3.0 + empRank * 0.8;
        for (const g of ghosts) {
          if (Math.hypot(g.x - player.x, g.y - player.y) <= empRadius) {
            g.frozen = true;
            g.frozenTimer = freezeDur;
          }
        }
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
      if (ghost.frozen) {
        if (ghost.frozenTimer !== undefined && ghost.frozenTimer > 0) {
          ghost.frozenTimer -= fixedDt;
          if (ghost.frozenTimer <= 0) {
            ghost.frozen = false;
            ghost.frozenTimer = 0;
          }
        }
        continue;
      }
      const chronoSlow = (skillRanks.chrono_tank ?? 0) > 0 && Math.hypot(ghost.x - player.x, ghost.y - player.y) < 3.0 ? 0.6 : 1.0;
      if (ghost.progress < 1) {
        ghost.progress = Math.min(1, ghost.progress + fixedDt * ghost.speed * (ghost.frightened ? 0.55 : 1) * chronoSlow);
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
        if (ghost.frozen) continue;
        if (!ghost.dangerous) continue;
        const bastionRank = skillRanks.kinetic_bastion ?? 0;
        if (bastionRank > 0 && bastionCooldown <= 0) {
          bastionCooldown = 32 - (bastionRank - 1) * 8;
          bastionUses++;
          invulnerability = 2.0;
          for (const g of ghosts) {
            if (Math.hypot(g.x - player.x, g.y - player.y) < 4.0) {
              g.frozen = true;
              g.frozenTimer = 3.0;
            }
          }
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
      killStreak = 0;
      killStreakTimer = 0;
      comboCount = 0;
      comboMultiplier = 1;
      comboTimer = 0;
      frightenedTimer = 0;
      deathTimer = 1.5;
      playerMoveIn = 0;
    }
  }

  return {
    seed: options.seed, simulatedSeconds: elapsed, ticks, dotsCollected: dotCount, ghostsKilled: kills, mazesCleared,
    xpEarned: xp, deaths, ghostsSpawned, level, gameOver: lives <= 0, dashes,
    empUses, bastionUses, laserKills, novaUses,
    singularityTriggered,
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
  const mazesByRun: number[] = [];
  const deathsByRun: number[] = [];
  const dotsByRun: number[] = [];
  const dashesByRun: number[] = [];
  const empByRun: number[] = [];
  const bastionByRun: number[] = [];
  const laserByRun: number[] = [];
  const novaByRun: number[] = [];
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
    mazesByRun.push(run.mazesCleared);
    deathsByRun.push(run.deaths);
    dotsByRun.push(run.dotsCollected);
    dashesByRun.push(run.dashes);
    empByRun.push(run.empUses);
    bastionByRun.push(run.bastionUses);
    laserByRun.push(run.laserKills);
    novaByRun.push(run.novaUses);
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
    averageMazesCleared: average(mazesByRun),
    averageRunDeaths: average(deathsByRun),
    averageDotsCollected: average(dotsByRun),
    averageDashes: average(dashesByRun),
    averageEmpUses: average(empByRun),
    averageBastionUses: average(bastionByRun),
    averageLaserKills: average(laserByRun),
    averageNovaUses: average(novaByRun),
    singularityRunRate: runCount ? singularityRuns / runCount : 0,
    gameOverRate: runCount ? gameOvers / runCount : 0,
    timeToLevelSeconds: milestones,
    finalProfile: profile
  };
}
