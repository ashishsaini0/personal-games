// 6 fruit types with distinct visual identities
export const FRUIT_TYPES = [
  { id: 0, color: '#EF5350', name: 'apple' },
  { id: 1, color: '#FF9800', name: 'orange' },
  { id: 2, color: '#FDD835', name: 'banana' },
  { id: 3, color: '#AB47BC', name: 'grape' },
  { id: 4, color: '#66BB6A', name: 'watermelon' },
  { id: 5, color: '#26C6DA', name: 'kiwi' },
];

const BOARD_SIZE = 8;

let nextCandyId = 1;
let nextObstacleId = 1;

export function emptyObstacles() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

function createObstacle(kind, row, col, extra) {
  return { id: nextObstacleId++, kind, row, col, ...extra };
}

function placeObstacles(rng, board, levelNum) {
  const obstacles = emptyObstacles();

  // Levels 1-15: no obstacles
  if (levelNum <= 15) return obstacles;

  // Linear obstacle scaling from level 16-100
  const t = (levelNum - 16) / 84; // 0..1
  let vineCount = 0, stoneCount = 0, portalCount = 0;

  vineCount = 1 + Math.floor(t * 4);     // 1 → 5
  if (levelNum >= 35) stoneCount = Math.floor((t - 0.22) * 4); // 0 → 3
  if (levelNum >= 55) portalCount = Math.floor((t - 0.46) * 3); // 0 → 2

  // Candidate positions (avoid board edges so gravity/spawning always has room)
  const candidates = [];
  for (let r = 1; r < BOARD_SIZE - 1; r++) {
    for (let c = 1; c < BOARD_SIZE - 1; c++) {
      candidates.push([r, c]);
    }
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const usedCells = new Set();
  let candidateIdx = 0;

  // Enforce minimum spacing between obstacles so segments remain large enough
  const nextCandidate = (minSpacing = 1) => {
    while (candidateIdx < candidates.length) {
      const [r, c] = candidates[candidateIdx++];
      const key = r * BOARD_SIZE + c;
      if (usedCells.has(key)) continue;
      let tooClose = false;
      for (let dr = -minSpacing; dr <= minSpacing && !tooClose; dr++) {
        for (let dc = -minSpacing; dc <= minSpacing && !tooClose; dc++) {
          if (dr === 0 && dc === 0) continue;
          tooClose = usedCells.has((r + dr) * BOARD_SIZE + (c + dc));
        }
      }
      if (!tooClose) {
        usedCells.add(key);
        return [r, c];
      }
    }
    return null;
  };

  for (let i = 0; i < vineCount; i++) {
    const pos = nextCandidate();
    if (!pos) break;
    const [r, c] = pos;
    const vineHp = levelNum >= 70 ? 3 : 2;
    obstacles[r][c] = createObstacle('vine', r, c, { hp: vineHp });
    board[r][c] = null;
  }

  for (let i = 0; i < stoneCount; i++) {
    const pos = nextCandidate();
    if (!pos) break;
    const [r, c] = pos;
    obstacles[r][c] = createObstacle('stone', r, c, {});
    board[r][c] = null;
  }

  for (let i = 0; i < portalCount; i++) {
    // Portals don't clear board cells — fruits sit on top
    const pos1 = nextCandidate();
    const pos2 = nextCandidate();
    if (!pos1 || !pos2) break;
    const [r1, c1] = pos1;
    const [r2, c2] = pos2;
    obstacles[r1][c1] = createObstacle('portal', r1, c1, { partnerRow: r2, partnerCol: c2 });
    obstacles[r2][c2] = createObstacle('portal', r2, c2, { partnerRow: r1, partnerCol: c1 });
  }

  return obstacles;
}

function placeGravityOrb(board, rng) {
  const candidates = [];
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++)
      if (board[r][c]) candidates.push([r, c]);
  if (candidates.length === 0) return;
  const [r, c] = candidates[Math.floor(rng() * candidates.length)];
  board[r][c] = { ...board[r][c], special: 'gravity-orb' };
}

export function createFruit(type, row, col, special = null) {
  return { id: nextCandyId++, type, row, col, special };
}

function seededRandom(seed) {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Check if placing candy `type` at (row, col) creates a 3-in-a-row.
 */
function wouldMatch(board, row, col, type) {
  if (
    col >= 2 &&
    board[row][col - 1]?.type === type &&
    board[row][col - 2]?.type === type
  ) {
    return true;
  }
  if (
    row >= 2 &&
    board[row - 1][col]?.type === type &&
    board[row - 2][col]?.type === type
  ) {
    return true;
  }
  return false;
}

/**
 * Find all matches of 3+ on a board. Returns a Set of "row,col" keys.
 */
function findMatchesOnBoard(board) {
  const matched = new Set();
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const candy = board[row][col];
      if (!candy) continue;
      const t = candy.type;

      if (col <= BOARD_SIZE - 3) {
        if (board[row][col + 1]?.type === t && board[row][col + 2]?.type === t) {
          let end = col + 2;
          while (end + 1 < BOARD_SIZE && board[row][end + 1]?.type === t) end++;
          for (let c = col; c <= end; c++) matched.add(`${row},${c}`);
        }
      }
      if (row <= BOARD_SIZE - 3) {
        if (board[row + 1]?.[col]?.type === t && board[row + 2]?.[col]?.type === t) {
          let end = row + 2;
          while (end + 1 < BOARD_SIZE && board[end + 1]?.[col]?.type === t) end++;
          for (let r = row; r <= end; r++) matched.add(`${r},${col}`);
        }
      }
    }
  }
  return matched;
}

/**
 * Check if the board has at least one valid swap that produces a match.
 * Skips null cells (obstacle positions) as they cannot be swapped.
 */
function boardHasValidMove(board) {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (!board[row][col]) continue;
      if (col < BOARD_SIZE - 1 && board[row][col + 1]) {
        [board[row][col], board[row][col + 1]] = [board[row][col + 1], board[row][col]];
        const has = findMatchesOnBoard(board).size > 0;
        [board[row][col], board[row][col + 1]] = [board[row][col + 1], board[row][col]];
        if (has) return true;
      }
      if (row < BOARD_SIZE - 1 && board[row + 1][col]) {
        [board[row][col], board[row + 1][col]] = [board[row + 1][col], board[row][col]];
        const has = findMatchesOnBoard(board).size > 0;
        [board[row][col], board[row + 1][col]] = [board[row + 1][col], board[row][col]];
        if (has) return true;
      }
    }
  }
  return false;
}

/**
 * Generate an 8x8 board with no initial matches.
 * Validates that at least one valid move exists.
 * Retries up to maxAttempts times if the board is stuck.
 */
function generateBoard(rng, candyTypes, maxAttempts = 20) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const board = Array.from({ length: BOARD_SIZE }, () =>
      Array(BOARD_SIZE).fill(null)
    );

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        let type;
        let tries = 0;
        do {
          type = candyTypes[Math.floor(rng() * candyTypes.length)];
          tries++;
          if (tries > 50) break;
        } while (wouldMatch(board, row, col, type));
        board[row][col] = createFruit(type, row, col);
      }
    }

    if (boardHasValidMove(board)) return board;
  }

  // Fallback: return the last generated board (extremely rare edge case)
  const board = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(null)
  );
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      let type;
      let tries = 0;
      do {
        type = candyTypes[Math.floor(rng() * candyTypes.length)];
        tries++;
        if (tries > 50) break;
      } while (wouldMatch(board, row, col, type));
      board[row][col] = createFruit(type, row, col);
    }
  }
  return board;
}

/**
 * Generate a fresh random board for reshuffling during gameplay.
 * Uses Math.random (not seeded) since it's a runtime reshuffle.
 */
export function generateRandomBoard(candyTypes) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const board = Array.from({ length: BOARD_SIZE }, () =>
      Array(BOARD_SIZE).fill(null)
    );

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        let type;
        let tries = 0;
        do {
          type = candyTypes[Math.floor(Math.random() * candyTypes.length)];
          tries++;
          if (tries > 50) break;
        } while (wouldMatch(board, row, col, type));
        board[row][col] = createFruit(type, row, col);
      }
    }

    if (boardHasValidMove(board)) return board;
  }

  // Fallback: return last attempt
  const board = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(null)
  );
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const type = candyTypes[Math.floor(Math.random() * candyTypes.length)];
      board[row][col] = createFruit(type, row, col);
    }
  }
  return board;
}

/**
 * Pick a random subset of fruit type indices.
 * count: how many types to pick (3-6).
 */
function pickFruitSubset(rng, count) {
  const all = [0, 1, 2, 3, 4, 5];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, count).sort((a, b) => a - b);
}

/**
 * Random int in [min, max] inclusive using the provided rng.
 */
function randRange(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/**
 * Generate 100 levels with progressive difficulty scaling.
 *
 * Levels  1-20 (Easy):   3-4 fruit types, 35-50 moves, no obstacles, target 500-1200
 * Levels 21-60 (Medium): 4-5 fruit types, 22-35 moves, Vine Blockers only, target 1000-2800
 * Levels 61-100 (Hard):  5-6 fruit types, 16-27 moves, Vines+Stones+Portals, target 1800-4500
 *
 * All generated boards are validated to have at least one valid move AFTER
 * obstacles are placed, with up to 8 retries per level before falling back.
 */
export function generateLevels() {
  const masterSeed = Date.now();
  const levels = [];

  for (let i = 0; i < 100; i++) {
    let callCount = 0;
    const rand = () => {
      callCount++;
      return seededRandom(masterSeed + i * 997 + callCount);
    };

    const levelNum = i + 1;
    let fruitCount, movesMin, movesMax, scoreMin, scoreMax;

    // Linear difficulty curve across all 100 levels
    const t = (levelNum - 1) / 99; // 0..1 across all levels

    // Fruit types: 4 → 6 linearly
    if (levelNum <= 15)      fruitCount = 4;
    else if (levelNum <= 40) fruitCount = 5;
    else                     fruitCount = 6;

    // Moves: 30 → 12 linearly
    movesMin = Math.round(30 - t * 18);  // 30 → 12
    movesMax = movesMin + 3;

    // Target score: 300 → 2000 linearly (calibrated to halved scoring)
    scoreMin = Math.round(300 + t * 1700);   // 300 → 2000
    scoreMax = Math.round(scoreMin * 1.15);   // +15% variance

    const fruitTypes = pickFruitSubset(rand, fruitCount);
    const moves = randRange(rand, movesMin, movesMax);
    const targetScore = randRange(rand, scoreMin, scoreMax);

    // Generate board + obstacles, retrying until the post-obstacle board is solvable
    let board, obstacles;
    let attempts = 0;
    do {
      board = generateBoard(rand, fruitTypes);
      obstacles = placeObstacles(rand, board, levelNum);
      attempts++;
    } while (attempts < 8 && !boardHasValidMove(board));

    // Every 5th level gets a pre-placed gravity-orb as a reward
    if (levelNum % 5 === 0) placeGravityOrb(board, rand);

    levels.push({
      level: levelNum,
      targetScore,
      moves,
      candyTypes: fruitTypes,
      board,
      obstacles,
    });
  }

  return levels;
}
