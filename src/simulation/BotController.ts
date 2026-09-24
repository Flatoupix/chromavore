/**
 * Deterministic, renderer-independent navigation policy for headless runs.
 *
 * This is a deterministic policy for the renderer-independent campaign model.
 * It does not itself simulate movement, combat, XP, or skill effects.
 */

export type BotDirection = { x: -1 | 0 | 1; y: -1 | 0 | 1 };

export interface BotCell {
  x: number;
  y: number;
}

export interface BotGhost extends BotCell {
  /** True only when contact with this ghost is currently dangerous. */
  dangerous: boolean;
  frightened?: boolean;
}

export type BotStrategy = 'cautious' | 'collector' | 'hunter';

export interface BotSnapshot {
  cols: number;
  rows: number;
  /** Walkability indexed as [row][column]. */
  walkable: boolean[][];
  /** Remaining collectibles indexed as [row][column]. */
  collectibles: Array<Array<boolean | number>>;
  player: BotCell;
  ghosts: BotGhost[];
  /** Deterministic tie-break seed, advanced by the caller once per decision. */
  decisionIndex: number;
}

export interface BotDecision {
  direction: BotDirection;
  useDash: boolean;
  target: BotCell | null;
  reason: 'collect' | 'hunt' | 'escape' | 'explore' | 'trapped';
}

const DIRECTIONS: readonly BotDirection[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 }
];

const keyOf = (x: number, y: number) => `${x},${y}`;

function wrapX(x: number, cols: number): number {
  return (x + cols) % cols;
}

function isWalkable(snapshot: BotSnapshot, x: number, y: number): boolean {
  if (y < 0 || y >= snapshot.rows) return false;
  return snapshot.walkable[y]?.[wrapX(x, snapshot.cols)] === true;
}

function navigationFrom(snapshot: BotSnapshot, start: BotCell) {
  const distances = new Map<string, number>();
  const firstSteps = new Map<string, BotDirection>();
  const queue: BotCell[] = [];
  const sx = wrapX(start.x, snapshot.cols);
  if (!isWalkable(snapshot, sx, start.y)) return { distances, firstSteps };

  distances.set(keyOf(sx, start.y), 0);
  queue.push({ x: sx, y: start.y });

  for (let cursor = 0; cursor < queue.length; cursor++) {
    const cell = queue[cursor];
    const distance = distances.get(keyOf(cell.x, cell.y))!;
    for (const dir of DIRECTIONS) {
      const x = wrapX(cell.x + dir.x, snapshot.cols);
      const y = cell.y + dir.y;
      const key = keyOf(x, y);
      if (!isWalkable(snapshot, x, y) || distances.has(key)) continue;
      distances.set(key, distance + 1);
      firstSteps.set(key, distance === 0 ? dir : firstSteps.get(keyOf(cell.x, cell.y))!);
      queue.push({ x, y });
    }
  }
  return { distances, firstSteps };
}

function escapeDirection(snapshot: BotSnapshot, distances: Map<string, number>): BotDirection | null {
  const threats = snapshot.ghosts.filter(ghost => ghost.dangerous);
  if (threats.length === 0) return null;

  const candidates = DIRECTIONS.flatMap(dir => {
    const x = wrapX(snapshot.player.x + dir.x, snapshot.cols);
    const y = snapshot.player.y + dir.y;
    if (!isWalkable(snapshot, x, y)) return [];

    const pathDistance = distances.get(keyOf(x, y)) ?? 0;
    const minThreatDistance = Math.min(...threats.map(ghost => {
      const dx = Math.min(Math.abs(x - ghost.x), snapshot.cols - Math.abs(x - ghost.x));
      return dx + Math.abs(y - ghost.y);
    }));
    const exits = DIRECTIONS.filter(next => isWalkable(snapshot, x + next.x, y + next.y)).length;
    return [{ dir, score: minThreatDistance * 3 + exits * 1.5 + pathDistance * 0.05 }];
  });

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.dir ?? null;
}

/**
 * Pick a safe next tile with shortest-path routing to a remaining collectible.
 * Stable tie-breaking makes runs reproducible for the same snapshot sequence.
 */
export function chooseBotAction(snapshot: BotSnapshot, strategy: BotStrategy = 'collector', invincible = false): BotDecision {
  const { distances, firstSteps } = navigationFrom(snapshot, snapshot.player);
  const escape = escapeDirection(snapshot, distances);
  const closestThreat = snapshot.ghosts
    .filter(ghost => ghost.dangerous)
    .reduce((min, ghost) => Math.min(min,
      Math.min(Math.abs(snapshot.player.x - ghost.x), snapshot.cols - Math.abs(snapshot.player.x - ghost.x)) +
      Math.abs(snapshot.player.y - ghost.y)),
    Infinity);

  const escapeThreshold = strategy === 'cautious' ? 4 : strategy === 'hunter' ? 1 : 2;
  if (!invincible && escape && closestThreat <= escapeThreshold) {
    return { direction: escape, useDash: closestThreat <= 1, target: null, reason: 'escape' };
  }

  if (strategy === 'hunter') {
    const prey = snapshot.ghosts
      .filter(ghost => ghost.frightened)
      .map(cell => ({ cell, distance: distances.get(keyOf(cell.x, cell.y)) }))
      .filter((entry): entry is { cell: BotGhost; distance: number } => entry.distance !== undefined)
      .sort((a, b) => a.distance - b.distance)[0];
    if (prey) {
      const direction = firstSteps.get(keyOf(prey.cell.x, prey.cell.y));
      if (direction) return { direction, useDash: false, target: prey.cell, reason: 'hunt' };
    }
  }

  const targets: Array<{ cell: BotCell; distance: number }> = [];
  for (let y = 0; y < snapshot.rows; y++) {
    for (let x = 0; x < snapshot.cols; x++) {
      if (!snapshot.collectibles[y]?.[x]) continue;
      const distance = distances.get(keyOf(x, y));
      if (distance !== undefined) targets.push({ cell: { x, y }, distance });
    }
  }

  targets.sort((a, b) => a.distance - b.distance ||
    ((a.cell.x * 31 + a.cell.y * 17 + snapshot.decisionIndex) % 97) -
    ((b.cell.x * 31 + b.cell.y * 17 + snapshot.decisionIndex) % 97));

  const target = targets[0]?.cell ?? null;
  if (target) {
    const firstStep = firstSteps.get(keyOf(target.x, target.y));
    if (firstStep) return { direction: firstStep, useDash: false, target, reason: 'collect' };
  }

  if (escape) return { direction: escape, useDash: false, target: null, reason: 'explore' };
  return { direction: { x: 0, y: 0 }, useDash: false, target: null, reason: 'trapped' };
}
