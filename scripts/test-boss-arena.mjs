// scripts/test-boss-arena.mjs
// Test script to validate the wide, open MM10_MACRO (4:3) and MM10_169_MACRO (16:9)

const WALL = 1;
const DOT = 2;
const PELLET = 3;
const EMPTY = 4;
const GHOST = 5;
const DOOR = 6;
const SPAWN = 7;
const TUNNEL = 8;

// MM10_MACRO (35 rows × 21 half-width cols -> 41 full cols) - 85%+ Open Space
export const MM10_MACRO = [
  // 0-4: Top perimeter speedway
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 0: Outer border
  [1,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 1: Outer highway 1
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 2: Outer highway 2
  [1,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 3: Corner bracket top
  [1,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 4
  // 5-9: NW Relay chamber & Ghost House
  [1,2,2,2,2,4,4,4,2,2,2,2,2,2,2,2,2,2,2,2,2], // 5: NW Relay (col 6, row 6)
  [1,2,1,1,2,4,4,4,2,1,1,2,2,2,2,2,2,2,2,2,2], // 6: NW Relay core + pylon
  [1,2,1,1,2,4,4,4,2,1,1,2,2,2,2,2,2,2,2,2,2], // 7: Pylon
  [8,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,6,1], // 8: Tunnel + Ghost house door
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,4,5,5], // 9: Ghost house interior
  // 10-14: Vast Central Sanctum (Core at row 17, col 20)
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,4,4,4], // 10: Ghost house base
  [1,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,1], // 11: Mid pylon
  [1,2,2,1,1,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4], // 12: Core open plaza entry
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4], // 13: Core open plaza
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4], // 14: Core open plaza
  // 15-19: Core Open Arena
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4], // 15: Core open plaza
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4], // 16: Core open plaza
  [8,2,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4], // 17: Center Tunnel + Core center!
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4], // 18: Core open plaza
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4], // 19: Core open plaza
  // 20-24: Core exit & Mid south
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4], // 20: Core open plaza
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4], // 21: Core open plaza
  [1,2,2,1,1,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4], // 22: Core open plaza exit
  [1,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 23: Mid south pylon
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 24
  // 25-29: SW Relay & Player spawn (row 26, col 20)
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 25
  [8,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 26: Tunnel + Player spawn
  [1,2,1,1,2,4,4,4,2,1,1,2,2,2,2,2,2,2,2,2,2], // 27: SW Relay pylon
  [1,2,1,1,2,4,4,4,2,1,1,2,2,2,2,2,2,2,2,2,2], // 28: SW Relay core
  [1,2,2,2,2,4,4,4,2,2,2,2,2,2,2,2,2,2,2,2,2], // 29: SW Relay
  // 30-34: Bottom perimeter speedway
  [1,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 30: Corner bracket bottom
  [1,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 31
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 32: Outer highway
  [1,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 33: Outer highway with Pellet
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]  // 34: Bottom border
];

// MM10_169_MACRO (35 rows × 33 half-width cols -> 65 full cols) - 85%+ Open Space
export const MM10_169_MACRO = [
  // 0-4
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 0
  [1,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 1
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 2
  [1,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 3
  [1,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 4
  // 5-9: NW Relay (col 6, row 6) & Ghost House
  [1,2,2,2,2,4,4,4,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 5
  [1,2,1,1,2,4,4,4,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 6
  [1,2,1,1,2,4,4,4,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 7
  [8,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,6,1], // 8: Tunnel + Door
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,4,5,5], // 9: Ghost house
  // 10-14: Core Amphitheater Entry
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,4,4,4], // 10
  [1,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,1], // 11
  [1,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4], // 12
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4], // 13
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4], // 14
  // 15-19: Core Open Plaza (Core at col 32, row 17)
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4], // 15
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4], // 16
  [8,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4], // 17: Tunnel + Core
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4], // 18
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4], // 19
  // 20-24
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4], // 20
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4], // 21
  [1,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4], // 22
  [1,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 23
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 24
  // 25-29: SW Relay & Player spawn
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 25
  [8,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 26: Tunnel + Spawn
  [1,2,1,1,2,4,4,4,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 27
  [1,2,1,1,2,4,4,4,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 28
  [1,2,2,2,2,4,4,4,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 29
  // 30-34
  [1,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 30
  [1,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 31
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 32
  [1,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // 33
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]  // 34
];

function buildFullMap(half, halfWidth, fullCols, rows) {
  const map = [];
  for (let r = 0; r < rows; r++) {
    map[r] = [];
    const rowHalf = half[r];
    for (let c = 0; c < halfWidth; c++) {
      const val = rowHalf[c];
      map[r][c] = val;
      if (c < halfWidth - 1) {
        const mirCol = (fullCols - 1) - c;
        map[r][mirCol] = val === TUNNEL ? TUNNEL : val === DOOR ? DOOR : val;
      }
    }
  }
  return map;
}

function testMap(name, half, halfWidth, fullCols, rows) {
  console.log(`Testing ${name}: ${rows} rows × ${fullCols} cols (halfWidth: ${halfWidth})`);
  if (half.length !== rows) {
    throw new Error(`Row count mismatch: expected ${rows}, got ${half.length}`);
  }
  for (let r = 0; r < rows; r++) {
    if (half[r].length !== halfWidth) {
      throw new Error(`Row ${r} length mismatch: expected ${halfWidth}, got ${half[r].length}`);
    }
  }

  const map = buildFullMap(half, halfWidth, fullCols, rows);
  const totalCells = rows * fullCols;
  let wallCount = 0;
  let walkableCount = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < fullCols; c++) {
      if (map[r][c] === WALL) wallCount++;
      else walkableCount++;
    }
  }

  const openRatio = (walkableCount / totalCells) * 100;
  console.log(`Open space ratio: ${openRatio.toFixed(1)}% (${walkableCount}/${totalCells} tiles open, ${wallCount} walls)`);

  const spawnX = Math.floor(fullCols / 2);
  const spawnY = 26;
  console.log(`Spawn point: (${spawnX}, ${spawnY}) tile=${map[spawnY][spawnX]}`);

  const visited = Array.from({ length: rows }, () => new Array(fullCols).fill(false));
  const queue = [{ x: spawnX, y: spawnY }];
  visited[spawnY][spawnX] = true;

  const isWalkable = (x, y) => {
    if (y < 0 || y >= rows) return false;
    let wx = x;
    if (wx < 0) wx = fullCols - 1;
    if (wx >= fullCols) wx = 0;
    const v = map[y][wx];
    return v !== WALL;
  };

  let head = 0;
  while (head < queue.length) {
    const { x, y } = queue[head++];
    const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
    for (const d of dirs) {
      let nx = x + d.x;
      const ny = y + d.y;
      if (nx < 0) nx = fullCols - 1;
      if (nx >= fullCols) nx = 0;
      if (isWalkable(nx, ny) && !visited[ny][nx]) {
        visited[ny][nx] = true;
        queue.push({ x: nx, y: ny });
      }
    }
  }

  let totalDots = 0;
  let unreachDots = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < fullCols; c++) {
      if (map[r][c] === DOT || map[r][c] === PELLET) {
        totalDots++;
        if (!visited[r][c]) {
          unreachDots++;
          console.error(`Unreachable dot at (${c}, ${r})`);
        }
      }
    }
  }

  console.log(`Total dots/pellets: ${totalDots}, Unreachable: ${unreachDots}`);
  if (unreachDots > 0) throw new Error(`${unreachDots} unreachable dots in ${name}!`);
  console.log(`✓ ${name} PASSED!\n`);
}

testMap('MM10_MACRO (4:3)', MM10_MACRO, 21, 41, 35);
testMap('MM10_169_MACRO (16:9)', MM10_169_MACRO, 33, 65, 35);
