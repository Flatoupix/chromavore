/**
 * Deterministic, renderer-independent navigation policy for headless runs.
 *
 * This is deliberately only a controller: it consumes a compact snapshot and
 * returns a direction/action. It does not pretend to simulate game physics,
 * enemy AI, XP, deaths, or skill effects. Those must come from the real game
 * update loop before its output can be used for balance conclusions.
 */

export type BotDirection = { x: -1 | 0 | 1; y: -1 | 0 | 1 };

export interface BotCell {
  x: number;
  y: number;
}

export interface BotGhost extends BotCell {
  /** True only when contact with this ghost is currently dangerous. */
  dangerous: boolean;
}

export interface BotSnapshot {
  cols: number;
  rows: number;
  /** Walkability indexed as [row][column]. */
  walkable: boolean[][];
  /** Remaining collectibles indexed as [row][column]. */
  collectibles: boolean[][];
  player: BotCell;
  ghosts: BotGhost[];
  /** Deterministic tie-break seed, advanced by the caller once per decision. */
  decisionIndex: number;
}

export interface BotDecision {
  direction: BotDirection;
  useDash: boolean;
  target: BotCell | null;
  reason: 'collect' | 'escape' | 'explore' | 'trapped';
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

function distancesFrom(snapshot: BotSnapshot, start: BotCell): Map<string, number> {
  const distances = new Map<string, number>();
  const queue: BotCell[] = [];
  const sx = wrapX(start.x, snapshot.cols);
  if (!isWalkable(snapshot, sx, start.y)) return distances;

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
      queue.push({ x, y });
    }
  }
  return distances;
}

function shortestPathStep(snapshot: BotSnapshot, start: BotCell, target: BotCell): BotDirection | null {
  const targetDistances = distancesFrom(snapshot, target);
  const currentDistance = targetDistances.get(keyOf(wrapX(start.x, snapshot.cols), start.y));
  if (currentDistance === undefined || currentDistance === 0) return null;

  // Prefer safer corridors when two routes have the same length. The penalty
  // is only a tie-break; the bot still makes progress toward its target.
  const threats = snapshot.ghosts.filter(ghost => ghost.dangerous);
  const candidates = DIRECTIONS.flatMap(dir => {
    const x = wrapX(start.x + dir.x, snapshot.cols);
    const y = start.y + dir.y;
    const distance = targetDistances.get(keyOf(x, y));
    if (distance === undefined || distance !== currentDistance - 1) return [];
    const threatDistance = threats.length === 0 ? Infinity : Math.min(...threats.map(ghost => {
      const dx = Math.min(Math.abs(x - ghost.x), snapshot.cols - Math.abs(x - ghost.x));
      return dx + Math.abs(y - ghost.y);
    }));
    return [{ dir, threatDistance }];
  });
  candidates.sort((a, b) => b.threatDistance - a.threatDistance);
  return candidates[0]?.dir ?? null;
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
export function chooseBotAction(snapshot: BotSnapshot): BotDecision {
  const distances = distancesFrom(snapshot, snapshot.player);
  const escape = escapeDirection(snapshot, distances);
  const closestThreat = snapshot.ghosts
    .filter(ghost => ghost.dangerous)
    .reduce((min, ghost) => Math.min(min,
      Math.min(Math.abs(snapshot.player.x - ghost.x), snapshot.cols - Math.abs(snapshot.player.x - ghost.x)) +
      Math.abs(snapshot.player.y - ghost.y)),
    Infinity);

  // Provisional reflex policy only. Real dash availability/effects must be
  // supplied by the eventual simulation adapter.
  if (escape && closestThreat <= 2) {
    return { direction: escape, useDash: closestThreat <= 1, target: null, reason: 'escape' };
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
    const firstStep = shortestPathStep(snapshot, snapshot.player, target);
    if (firstStep) return { direction: firstStep, useDash: false, target, reason: 'collect' };
  }

  if (escape) return { direction: escape, useDash: false, target: null, reason: 'explore' };
  return { direction: { x: 0, y: 0 }, useDash: false, target: null, reason: 'trapped' };
}
