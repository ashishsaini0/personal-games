import { useState, useCallback, useRef, useEffect } from 'react';
import { createFruit, generateRandomBoard, emptyObstacles } from '../utils/generateLevels';

const GRAVITY_DIRS = ['DOWN', 'UP', 'LEFT', 'RIGHT'];

export const GRAVITY_ARROWS = { DOWN: '↓', UP: '↑', LEFT: '←', RIGHT: '→' };

const BOARD_SIZE = 8;

// ─── helpers ────────────────────────────────────────────────────────────────

function cloneBoard(board) {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function cloneObstacles(obs) {
  return obs.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

// Check if a special type is lightning
const isLightningSpecial = (s) => s === 'lightning';

// Clear a single row, return cells removed × 5
function clearRow(board, row) {
  let count = 0;
  for (let c = 0; c < BOARD_SIZE; c++) if (board[row][c]) { board[row][c] = null; count++; }
  return count * 5;
}

// Clear row + column at (row,col), return cells removed × 5
function clearRowAndCol(board, row, col) {
  let count = 0;
  for (let c = 0; c < BOARD_SIZE; c++) if (board[row][c]) { board[row][c] = null; count++; }
  for (let r = 0; r < BOARD_SIZE; r++) if (board[r][col]) { board[r][col] = null; count++; }
  return count * 5;
}

// Clear radius×radius area centred at (row,col)
function clearArea(board, row, col, radius) {
  let count = 0;
  for (let r = Math.max(0, row - radius); r <= Math.min(BOARD_SIZE - 1, row + radius); r++) {
    for (let c = Math.max(0, col - radius); c <= Math.min(BOARD_SIZE - 1, col + radius); c++) {
      if (board[r][c]) { board[r][c] = null; count++; }
    }
  }
  return count * 5;
}

// Clear every fruit on the board
function clearAll(board) {
  let count = 0;
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++)
      if (board[r][c]) { board[r][c] = null; count++; }
  return count * 5;
}

// Remove up to 10 random fruits from the board
function removeTenRandom(board) {
  const candidates = [];
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++)
      if (board[r][c] && !board[r][c].special) candidates.push([r, c]);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const count = Math.min(10, candidates.length);
  for (let i = 0; i < count; i++) {
    const [r, c] = candidates[i];
    board[r][c] = null;
  }
  return count * 5;
}

// Shuffle all fruits on the board in-place
function shuffleBoard(board) {
  const fruits = [];
  const positions = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c]) {
        fruits.push(board[r][c]);
        positions.push([r, c]);
        board[r][c] = null;
      }
    }
  }
  for (let i = fruits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fruits[i], fruits[j]] = [fruits[j], fruits[i]];
  }
  for (let i = 0; i < fruits.length; i++) {
    const [r, c] = positions[i];
    fruits[i].row = r;
    fruits[i].col = c;
    board[r][c] = fruits[i];
  }
}

// ─── fusion ─────────────────────────────────────────────────────────────────

const FUSION_DISPLAY = {
  'cross-lightning':   'Cross Lightning!',
  'thunder-bomb':      'Thunder Bomb!',
  'mega-blast':        'Mega Blast!',
  'wind-surge':        'Wind Surge!',
  'gravity-strike':    'Gravity Strike!',
  'void-storm':        'Void Storm!',
  'orchard-storm':     'Orchard Storm!',
  'dimensional-rift':  'Dimensional Rift!',
};

function getFusionType(sp1, sp2) {
  if (sp1 === sp2) {
    if (sp1 === 'lightning') return 'cross-lightning';
    if (sp1 === 'bomb') return 'mega-blast';
    if (sp1 === 'tornado') return 'void-storm';
    if (sp1 === 'gravity-orb') return 'orchard-storm';
  }
  const pair = [sp1, sp2].sort().join('+');
  if (pair === 'bomb+lightning') return 'thunder-bomb';
  if (pair === 'gravity-orb+tornado') return 'dimensional-rift';
  if (pair === 'lightning+tornado' || pair === 'bomb+tornado') return 'wind-surge';
  if (pair === 'gravity-orb+lightning' || pair === 'bomb+gravity-orb') return 'gravity-strike';
  return 'cross-lightning';
}

// Apply a fusion effect to the board. Returns { score, type, hasTornado, hasGravityOrb }.
function applyFusion(board, r1, c1, r2, c2, sp1, sp2) {
  const type = getFusionType(sp1, sp2);
  board[r1][c1] = null;
  board[r2][c2] = null;
  let score = 100;
  let hasTornado = false;
  let hasGravityOrb = false;

  if (type === 'cross-lightning') {
    score += clearRow(board, r1);
    score += clearRow(board, r2);
  } else if (type === 'thunder-bomb') {
    const lr = sp1 === 'lightning' ? r1 : r2;
    const [br, bc] = sp1 === 'bomb' ? [r1, c1] : [r2, c2];
    score += clearRow(board, lr);
    score += clearArea(board, br, bc, 2);
  } else if (type === 'mega-blast') {
    const cr = Math.floor((r1 + r2) / 2);
    const cc = Math.floor((c1 + c2) / 2);
    score += clearArea(board, cr, cc, 2);
  } else if (type === 'wind-surge') {
    hasTornado = true; // removes 10 random
    const [nr, nc, nsp] = sp1 === 'tornado' ? [r2, c2, sp2] : [r1, c1, sp1];
    if (nsp === 'lightning') score += clearRow(board, nr);
    else if (nsp === 'bomb') score += clearArea(board, nr, nc, 1);
  } else if (type === 'gravity-strike') {
    hasGravityOrb = true;
    const [nr, nc, nsp] = sp1 === 'gravity-orb' ? [r2, c2, sp2] : [r1, c1, sp1];
    if (nsp === 'lightning') score += clearRow(board, nr);
    else if (nsp === 'bomb') score += clearArea(board, nr, nc, 1);
  } else if (type === 'void-storm') {
    hasTornado = true; // removes 10 random
    hasGravityOrb = true;
  } else if (type === 'orchard-storm') {
    score += clearAll(board);
    hasGravityOrb = true;
  } else if (type === 'dimensional-rift') {
    hasTornado = true; // removes 10 random
    hasGravityOrb = true;
    score += clearArea(board, r1, c1, 1);
    score += clearArea(board, r2, c2, 1);
  }

  return { score, type, name: FUSION_DISPLAY[type] ?? 'Fusion!', hasTornado, hasGravityOrb };
}

// ─── match finding ────────────────────────────────────────────────────────

function findMatches(board, matchGroups, hCells, vCells) {
  const matched = [];
  const seen = new Uint8Array(64);

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const candy = board[row][col];
      if (candy === null) continue;
      const t = candy.type;

      if (col <= BOARD_SIZE - 3 &&
          board[row][col + 1]?.type === t &&
          board[row][col + 2]?.type === t) {
        let end = col + 2;
        while (end + 1 < BOARD_SIZE && board[row][end + 1]?.type === t) end++;
        const len = end - col + 1;
        const group = [];
        for (let c = col; c <= end; c++) {
          const idx = row * BOARD_SIZE + c;
          group.push(idx);
          if (!seen[idx]) { seen[idx] = 1; matched.push(idx); }
          if (hCells) hCells.add(idx);
        }
        if (matchGroups && len >= 4) {
          const centerCol = col + Math.floor(len / 2);
          matchGroups.push({ positions: group, length: len, type: t, direction: 'horizontal', centerRow: row, centerCol });
        }
      }

      if (row <= BOARD_SIZE - 3 &&
          board[row + 1]?.[col]?.type === t &&
          board[row + 2]?.[col]?.type === t) {
        let end = row + 2;
        while (end + 1 < BOARD_SIZE && board[end + 1]?.[col]?.type === t) end++;
        const len = end - row + 1;
        const group = [];
        for (let r = row; r <= end; r++) {
          const idx = r * BOARD_SIZE + col;
          group.push(idx);
          if (!seen[idx]) { seen[idx] = 1; matched.push(idx); }
          if (vCells) vCells.add(idx);
        }
        if (matchGroups && len >= 4) {
          const centerRow = row + Math.floor(len / 2);
          matchGroups.push({ positions: group, length: len, type: t, direction: 'vertical', centerRow, centerCol: col });
        }
      }
    }
  }

  return matched;
}

// ─── special-candy targeting ─────────────────────────────────────────────

function getSpecialTargets(board, row, col, special) {
  const targets = new Set();
  if (special === 'lightning') {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[row][c]) targets.add(row * BOARD_SIZE + c);
    }
  }
  if (special === 'bomb') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = row + dr, nc = col + dc;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc]) {
          targets.add(nr * BOARD_SIZE + nc);
        }
      }
    }
  }
  // tornado + gravity-orb have board-level effects, handled elsewhere
  return targets;
}

// ─── match removal ────────────────────────────────────────────────────────

// Mutates board + obstacles. Returns score. Populates lightningCells and effects.
function removeMatches(board, obstacles, matched, matchGroups, lightningCells, hCells, vCells, effects) {
  let score = 0;

  // Detect tornado / gravity-orb effects BEFORE clearing; push to lightningCells for visual activation
  for (const idx of matched) {
    const r = (idx / BOARD_SIZE) | 0;
    const c = idx % BOARD_SIZE;
    const sp = board[r][c]?.special;
    if (sp === 'tornado' && effects) {
      effects.hasTornado = true;
      if (lightningCells) lightningCells.push({ row: r, col: c, special: 'tornado' });
    }
    if (sp === 'gravity-orb' && effects) {
      effects.hasGravityOrb = true;
      if (lightningCells) lightningCells.push({ row: r, col: c, special: 'gravity-orb' });
    }
  }

  // Expand targets via specials
  const extraTargets = new Set();
  for (const idx of matched) {
    const r = (idx / BOARD_SIZE) | 0;
    const c = idx % BOARD_SIZE;
    const candy = board[r][c];
    if (candy?.special && candy.special !== 'tornado' && candy.special !== 'gravity-orb') {
      const targets = getSpecialTargets(board, r, c, candy.special);
      for (const t of targets) extraTargets.add(t);
      if (lightningCells) lightningCells.push({ row: r, col: c, special: candy.special });
    }
  }

  const allTargets = new Set(matched);
  for (const t of extraTargets) allTargets.add(t);

  // Chain-trigger specials caught by first wave
  for (const idx of extraTargets) {
    const r = (idx / BOARD_SIZE) | 0;
    const c = idx % BOARD_SIZE;
    const candy = board[r][c];
    if (candy?.special && candy.special !== 'tornado' && candy.special !== 'gravity-orb' && !matched.includes(idx)) {
      const targets = getSpecialTargets(board, r, c, candy.special);
      for (const t of targets) allTargets.add(t);
      if (lightningCells) lightningCells.push({ row: r, col: c, special: candy.special });
    }
  }

  // Remove fruits
  for (const idx of allTargets) {
    const r = (idx / BOARD_SIZE) | 0;
    const c = idx % BOARD_SIZE;
    if (board[r][c]) { board[r][c] = null; score += 5; }
  }
  if (allTargets.size > 3) score += (allTargets.size - 3) * 8;

  // Place power-ups from 4+ match groups: match 5+ → bomb, match 4 → lightning
  if (matchGroups) {
    for (const group of matchGroups) {
      const { length, type, centerRow, centerCol } = group;
      if (board[centerRow][centerCol] === null) {
        let special;
        if (length >= 5) special = 'bomb';
        else if (length === 4) special = 'lightning';
        if (special) board[centerRow][centerCol] = createFruit(type, centerRow, centerCol, special);
      }
    }
  }

  // Damage vines adjacent to removed fruits and along lightning sweep paths
  if (obstacles) {
    const vineDamagePositions = new Set();
    for (const idx of allTargets) {
      const r = (idx / BOARD_SIZE) | 0;
      const c = idx % BOARD_SIZE;
      vineDamagePositions.add((r - 1) * BOARD_SIZE + c);
      vineDamagePositions.add((r + 1) * BOARD_SIZE + c);
      vineDamagePositions.add(r * BOARD_SIZE + (c - 1));
      vineDamagePositions.add(r * BOARD_SIZE + (c + 1));
    }
    for (const lc of (lightningCells || [])) {
      if (lc.special === 'lightning') {
        for (let c = 0; c < BOARD_SIZE; c++) vineDamagePositions.add(lc.row * BOARD_SIZE + c);
      }
    }
    const damagedVines = new Set();
    for (const idx of vineDamagePositions) {
      const r = (idx / BOARD_SIZE) | 0;
      const c = idx % BOARD_SIZE;
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) continue;
      const obs = obstacles[r][c];
      if (obs?.kind === 'vine' && !damagedVines.has(idx)) {
        damagedVines.add(idx);
        obs.hp -= 1;
        if (obs.hp <= 0) { obstacles[r][c] = null; score += 20; }
      }
    }
  }

  return score;
}

// ─── gravity ─────────────────────────────────────────────────────────────

function applyGravity(board, obstacles, direction = 'DOWN') {
  const isWall = (r, c) => {
    const o = obstacles?.[r]?.[c];
    return o?.kind === 'vine' || o?.kind === 'stone';
  };

  if (direction === 'DOWN') {
    for (let col = 0; col < BOARD_SIZE; col++) {
      let segStart = 0;
      for (let row = 0; row <= BOARD_SIZE; row++) {
        if (row === BOARD_SIZE || isWall(row, col)) {
          const segEnd = row - 1;
          if (segEnd >= segStart) {
            const fruits = [];
            for (let r = segEnd; r >= segStart; r--) {
              if (board[r][col]) fruits.push(board[r][col]);
              board[r][col] = null;
            }
            for (let i = 0; i < fruits.length; i++) {
              const newRow = segEnd - i;
              const dist = newRow - fruits[i].row;
              fruits[i].row = newRow; fruits[i].col = col;
              if (dist > 0) { fruits[i].fallDistance = dist; fruits[i].fallDirX = 0; fruits[i].fallDirY = -1; }
              else { fruits[i].fallDistance = 0; }
              board[newRow][col] = fruits[i];
            }
          }
          segStart = row + 1;
        }
      }
    }
  } else if (direction === 'UP') {
    for (let col = 0; col < BOARD_SIZE; col++) {
      let segStart = 0;
      for (let row = 0; row <= BOARD_SIZE; row++) {
        if (row === BOARD_SIZE || isWall(row, col)) {
          const segEnd = row - 1;
          if (segEnd >= segStart) {
            const fruits = [];
            for (let r = segStart; r <= segEnd; r++) {
              if (board[r][col]) fruits.push(board[r][col]);
              board[r][col] = null;
            }
            for (let i = 0; i < fruits.length; i++) {
              const newRow = segStart + i;
              const dist = fruits[i].row - newRow;
              fruits[i].row = newRow; fruits[i].col = col;
              if (dist > 0) { fruits[i].fallDistance = dist; fruits[i].fallDirX = 0; fruits[i].fallDirY = 1; }
              else { fruits[i].fallDistance = 0; }
              board[newRow][col] = fruits[i];
            }
          }
          segStart = row + 1;
        }
      }
    }
  } else if (direction === 'LEFT') {
    for (let row = 0; row < BOARD_SIZE; row++) {
      let segStart = 0;
      for (let col = 0; col <= BOARD_SIZE; col++) {
        if (col === BOARD_SIZE || isWall(row, col)) {
          const segEnd = col - 1;
          if (segEnd >= segStart) {
            const fruits = [];
            for (let c = segStart; c <= segEnd; c++) {
              if (board[row][c]) fruits.push(board[row][c]);
              board[row][c] = null;
            }
            for (let i = 0; i < fruits.length; i++) {
              const newCol = segStart + i;
              const dist = fruits[i].col - newCol;
              fruits[i].row = row; fruits[i].col = newCol;
              if (dist > 0) { fruits[i].fallDistance = dist; fruits[i].fallDirX = 1; fruits[i].fallDirY = 0; }
              else { fruits[i].fallDistance = 0; }
              board[row][newCol] = fruits[i];
            }
          }
          segStart = col + 1;
        }
      }
    }
  } else { // RIGHT
    for (let row = 0; row < BOARD_SIZE; row++) {
      let segStart = 0;
      for (let col = 0; col <= BOARD_SIZE; col++) {
        if (col === BOARD_SIZE || isWall(row, col)) {
          const segEnd = col - 1;
          if (segEnd >= segStart) {
            const fruits = [];
            for (let c = segEnd; c >= segStart; c--) {
              if (board[row][c]) fruits.push(board[row][c]);
              board[row][c] = null;
            }
            for (let i = 0; i < fruits.length; i++) {
              const newCol = segEnd - i;
              const dist = newCol - fruits[i].col;
              fruits[i].row = row; fruits[i].col = newCol;
              if (dist > 0) { fruits[i].fallDistance = dist; fruits[i].fallDirX = -1; fruits[i].fallDirY = 0; }
              else { fruits[i].fallDistance = 0; }
              board[row][newCol] = fruits[i];
            }
          }
          segStart = col + 1;
        }
      }
    }
  }
}

// ─── spawn ───────────────────────────────────────────────────────────────

function spawnFruits(board, obstacles, fruitTypes, direction = 'DOWN') {
  const isWall = (r, c) => {
    const o = obstacles?.[r]?.[c];
    return o?.kind === 'vine' || o?.kind === 'stone';
  };
  const dirX = direction === 'LEFT' ? 1 : direction === 'RIGHT' ? -1 : 0;
  const dirY = direction === 'DOWN' ? -1 : direction === 'UP' ? 1 : 0;

  if (direction === 'DOWN' || direction === 'UP') {
    for (let col = 0; col < BOARD_SIZE; col++) {
      let segStart = 0;
      for (let row = 0; row <= BOARD_SIZE; row++) {
        if (row === BOARD_SIZE || isWall(row, col)) {
          const segEnd = row - 1;
          if (segEnd >= segStart) {
            let emptyCount = 0;
            for (let r = segStart; r <= segEnd; r++) if (board[r][col] === null) emptyCount++;
            for (let r = segStart; r <= segEnd; r++) {
              if (board[r][col] === null) {
                const type = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
                const fruit = createFruit(type, r, col);
                fruit.fallDistance = emptyCount; fruit.fallDirX = dirX; fruit.fallDirY = dirY;
                board[r][col] = fruit;
              }
            }
          }
          segStart = row + 1;
        }
      }
    }
  } else {
    for (let row = 0; row < BOARD_SIZE; row++) {
      let segStart = 0;
      for (let col = 0; col <= BOARD_SIZE; col++) {
        if (col === BOARD_SIZE || isWall(row, col)) {
          const segEnd = col - 1;
          if (segEnd >= segStart) {
            let emptyCount = 0;
            for (let c = segStart; c <= segEnd; c++) if (board[row][c] === null) emptyCount++;
            for (let c = segStart; c <= segEnd; c++) {
              if (board[row][c] === null) {
                const type = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
                const fruit = createFruit(type, row, c);
                fruit.fallDistance = emptyCount; fruit.fallDirX = dirX; fruit.fallDirY = dirY;
                board[row][c] = fruit;
              }
            }
          }
          segStart = col + 1;
        }
      }
    }
  }
}

// ─── obstacles ───────────────────────────────────────────────────────────

function moveStones(board, obstacles) {
  const MOVE_DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  const newObstacles = cloneObstacles(obstacles);
  const reservedTo = new Set();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (obstacles[r][c]?.kind !== 'stone') continue;
      const dirs = [...MOVE_DIRS].sort(() => Math.random() - 0.5);
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
        const targetKey = nr * BOARD_SIZE + nc;
        if (reservedTo.has(targetKey)) continue;
        const targetObs = obstacles[nr][nc];
        if (targetObs?.kind === 'vine' || targetObs?.kind === 'stone') continue;
        reservedTo.add(targetKey);
        newObstacles[r][c] = null;
        newObstacles[nr][nc] = { ...obstacles[r][c], row: nr, col: nc };
        if (board[nr][nc]) board[nr][nc] = null;
        board[r][c] = null;
        break;
      }
    }
  }
  return newObstacles;
}

function applyPortalTeleport(board, obstacles) {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const obs = obstacles?.[r]?.[c];
      if (obs?.kind !== 'portal') continue;
      const fruit = board[r][c];
      if (!fruit) continue;
      const { partnerRow: pr, partnerCol: pc } = obs;
      if (pr === undefined || pc === undefined) continue;
      if (!board[pr][pc]) {
        board[pr][pc] = { ...fruit, row: pr, col: pc, fallDistance: 0 };
        board[r][c] = null;
      }
    }
  }
}

// ─── valid-move check ─────────────────────────────────────────────────────

function hasValidMoves(board, obstacles) {
  const isWall = (r, c) => {
    const o = obstacles?.[r]?.[c];
    return o?.kind === 'vine' || o?.kind === 'stone';
  };
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (isWall(row, col)) continue;
      if (col < BOARD_SIZE - 1 && !isWall(row, col + 1)) {
        [board[row][col], board[row][col + 1]] = [board[row][col + 1], board[row][col]];
        const has = findMatches(board).length > 0;
        [board[row][col], board[row][col + 1]] = [board[row][col + 1], board[row][col]];
        if (has) return true;
      }
      if (row < BOARD_SIZE - 1 && !isWall(row + 1, col)) {
        [board[row][col], board[row + 1][col]] = [board[row + 1][col], board[row][col]];
        const has = findMatches(board).length > 0;
        [board[row][col], board[row + 1][col]] = [board[row + 1][col], board[row][col]];
        if (has) return true;
      }
    }
  }
  return false;
}

// ─── bonus spawning ───────────────────────────────────────────────────────

const BONUS_SPECIAL_TYPES = ['tornado', 'gravity-orb'];

function spawnBonusPowerUp(board) {
  const candidates = [];
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++)
      if (board[r][c] && !board[r][c].special) candidates.push([r, c]);
  if (candidates.length === 0) return;
  const [r, c] = candidates[Math.floor(Math.random() * candidates.length)];
  const sp = BONUS_SPECIAL_TYPES[Math.floor(Math.random() * BONUS_SPECIAL_TYPES.length)];
  board[r][c] = { ...board[r][c], special: sp };
}

// Spawn a gravity-orb somewhere on the board (reward for gravity shift trigger)
function spawnGravityOrbBonus(board) {
  if (Math.random() > 0.15) return; // only 15% of the time
  const candidates = [];
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++)
      if (board[r][c] && !board[r][c].special) candidates.push([r, c]);
  if (candidates.length === 0) return;
  const [r, c] = candidates[Math.floor(Math.random() * candidates.length)];
  board[r][c] = { ...board[r][c], special: 'gravity-orb' };
}

// ─── combo messages ───────────────────────────────────────────────────────

const COMBO_MESSAGES = [
  { message: 'Harvest Combo!', level: 1 },
  { message: 'Fruit Cascade!', level: 2 },
  { message: 'Orchard Storm!', level: 3 },
];

// ─── misc helpers ─────────────────────────────────────────────────────────

function matchedToSet(matched) {
  const set = new Set();
  for (let i = 0; i < matched.length; i++) set.add(matched[i]);
  return set;
}

function scheduleFrame(callback, delayMs) {
  return setTimeout(() => requestAnimationFrame(callback), delayMs);
}

const EMPTY_SET = new Set();

// ─── hook ─────────────────────────────────────────────────────────────────

export function useGameLogic(levels, callbacks = {}, startLevel = 0) {
  const [currentLevel, setCurrentLevel] = useState(startLevel);
  const [levelVersion, setLevelVersion] = useState(0);
  const [prevLevelKey, setPrevLevelKey] = useState('init');
  const [board, setBoard] = useState([]);
  const [obstacles, setObstacles] = useState(() => emptyObstacles());
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [movesLeft, setMovesLeft] = useState(0);
  const [gameState, setGameState] = useState('playing');
  const [selectedCandy, setSelectedCandy] = useState(null);
  const [animatingCells, setAnimatingCells] = useState(EMPTY_SET);
  const [shakeCell, setShakeCell] = useState(null);
  const [lightningEffect, setLightningEffect] = useState(null);
  const [paused, setPaused] = useState(false);
  const [gravityDir, setGravityDir] = useState('DOWN');
  const [movesUntilShift, setMovesUntilShift] = useState(2);
  const [gravityShifting, setGravityShifting] = useState(false);
  const [comboNotification, setComboNotification] = useState(null);
  const [fusionNotification, setFusionNotification] = useState(null);
  const [swappingCells, setSwappingCells] = useState(EMPTY_SET);

  const isProcessing = useRef(false);
  const fruitTypesRef = useRef([0, 1, 2, 3]);
  const obstaclesRef = useRef(emptyObstacles());
  const gravityDirRef = useRef('DOWN');
  const movesUntilShiftRef = useRef(5);
  const pendingGravityShiftRef = useRef(false);
  const bonusSpawnedRef = useRef(false);
  const cbRef = useRef(callbacks);
  const cascadeRef = useRef(null);
  const timersRef = useRef([]);

  useEffect(() => { cbRef.current = callbacks; });

  const clearAllTimers = useCallback(() => {
    const timers = timersRef.current;
    for (let i = 0; i < timers.length; i++) clearTimeout(timers[i]);
    timers.length = 0;
  }, []);

  const addTimer = useCallback((callback, delayMs) => {
    const id = scheduleFrame(callback, delayMs);
    timersRef.current.push(id);
    return id;
  }, []);

  useEffect(() => clearAllTimers, [clearAllTimers]);

  // Reset state when level/version changes
  const levelKey = `${currentLevel}-${levelVersion}`;
  if (levelKey !== prevLevelKey && levels?.[currentLevel]) {
    setPrevLevelKey(levelKey);
    const level = levels[currentLevel];
    setBoard(cloneBoard(level.board));
    setObstacles(cloneObstacles(level.obstacles || emptyObstacles()));
    setScore(0);
    setMovesLeft(level.moves);
    setGameState('playing');
    setSelectedCandy(null);
    setAnimatingCells(EMPTY_SET);
    setShakeCell(null);
    setComboNotification(null);
    setFusionNotification(null);
    setSwappingCells(EMPTY_SET);
  }

  // Sync refs when level changes
  useEffect(() => {
    if (levels?.[currentLevel]) {
      clearAllTimers();
      fruitTypesRef.current = levels[currentLevel].candyTypes;
      obstaclesRef.current = cloneObstacles(levels[currentLevel].obstacles || emptyObstacles());
      isProcessing.current = false;
      gravityDirRef.current = 'DOWN';
      setGravityDir('DOWN');
      movesUntilShiftRef.current = 2;
      setMovesUntilShift(5);
      pendingGravityShiftRef.current = false;
      setGravityShifting(false);
    }
  }, [currentLevel, levelVersion, levels, clearAllTimers]);

  const processCascade = useCallback(
    (currentBoard, currentObstacles, runningScore, currentMovesLeft, comboCount = 0) => {
      const matchGroups = [];
      const hCells = new Set();
      const vCells = new Set();
      const matched = findMatches(currentBoard, matchGroups, hCells, vCells);

      if (matched.length === 0) {
        isProcessing.current = false;
        setAnimatingCells(EMPTY_SET);
        setLightningEffect(null);
        setComboNotification(null);
        setFusionNotification(null);

        if (!hasValidMoves(currentBoard, currentObstacles)) {
          const freshBoard = generateRandomBoard(fruitTypesRef.current);
          setBoard(freshBoard);
        }
        return;
      }

      // Show combo notification on 2nd chain and beyond
      if (comboCount >= 1) {
        const info = COMBO_MESSAGES[Math.min(comboCount - 1, COMBO_MESSAGES.length - 1)];
        setComboNotification({ ...info, key: Date.now() + comboCount });
      }

      cbRef.current.onMatch?.();
      setAnimatingCells(matchedToSet(matched));

      addTimer(() => {
        const newBoard = cloneBoard(currentBoard);
        const newObstacles = cloneObstacles(currentObstacles);
        const lightningCells = [];
        const effects = { hasTornado: false, hasGravityOrb: false };
        const rawGained = removeMatches(
          newBoard, newObstacles, matched, matchGroups,
          lightningCells, hCells, vCells, effects
        );

        // Combo score multiplier
        const multiplier = Math.min(comboCount + 1, 3);
        const gained = rawGained * multiplier;

        // Bonus power-up at combo 4+
        if (comboCount >= 3 && !bonusSpawnedRef.current) {
          bonusSpawnedRef.current = true;
          spawnBonusPowerUp(newBoard);
        }

        const newScore = runningScore + gained;
        setScore(newScore);
        setTotalScore((prev) => prev + gained);

        if (lightningCells.length > 0) {
          setLightningEffect(lightningCells);
          cbRef.current.onLightning?.();
        }

        addTimer(() => {
          setLightningEffect(null);

          // Gravity shift from 5-move countdown
          if (pendingGravityShiftRef.current) {
            pendingGravityShiftRef.current = false;
            const dirs = GRAVITY_DIRS.filter(d => d !== gravityDirRef.current);
            const newDir = dirs[Math.floor(Math.random() * dirs.length)];
            gravityDirRef.current = newDir;
            setGravityDir(newDir);
            setGravityShifting(true);
            setMovesUntilShift(5);
            addTimer(() => setGravityShifting(false), 700);
            spawnGravityOrbBonus(newBoard);
          }

          // Gravity-orb matched — trigger an extra shift
          if (effects.hasGravityOrb) {
            const dirs = GRAVITY_DIRS.filter(d => d !== gravityDirRef.current);
            const newDir = dirs[Math.floor(Math.random() * dirs.length)];
            gravityDirRef.current = newDir;
            setGravityDir(newDir);
            setGravityShifting(true);
            addTimer(() => setGravityShifting(false), 700);
          }

          applyGravity(newBoard, newObstacles, gravityDirRef.current);

          // Tornado matched — shuffle after gravity settles
          if (effects.hasTornado) removeTenRandom(newBoard);

          const rolledObstacles = moveStones(newBoard, newObstacles);
          applyPortalTeleport(newBoard, rolledObstacles);
          spawnFruits(newBoard, rolledObstacles, fruitTypesRef.current, gravityDirRef.current);

          obstaclesRef.current = rolledObstacles;
          setObstacles(cloneObstacles(rolledObstacles));
          setBoard(cloneBoard(newBoard));
          setAnimatingCells(EMPTY_SET);

          const level = levels[currentLevel];
          if (newScore >= level.targetScore) {
            setGameState('won');
            setComboNotification(null);
            setFusionNotification(null);
            isProcessing.current = false;
            cbRef.current.onLevelComplete?.();
            return;
          }
          if (currentMovesLeft <= 0 && newScore < level.targetScore) {
            setGameState('lost');
            setComboNotification(null);
            setFusionNotification(null);
            isProcessing.current = false;
            cbRef.current.onFail?.();
            return;
          }

          addTimer(() => {
            cascadeRef.current(newBoard, rolledObstacles, newScore, currentMovesLeft, comboCount + 1);
          }, 180);
        }, 300);
      }, 260);
    },
    [levels, currentLevel, addTimer]
  );

  useEffect(() => { cascadeRef.current = processCascade; });

  const swapCandies = useCallback(
    (row1, col1, row2, col2) => {
      if (isProcessing.current || paused) return;
      if (gameState !== 'playing') return;

      const rowDiff = Math.abs(row1 - row2);
      const colDiff = Math.abs(col1 - col2);
      if (rowDiff + colDiff !== 1) return;

      // Block swaps involving vine or stone cells
      const obs1 = obstaclesRef.current[row1]?.[col1];
      const obs2 = obstaclesRef.current[row2]?.[col2];
      if (obs1?.kind === 'vine' || obs1?.kind === 'stone') return;
      if (obs2?.kind === 'vine' || obs2?.kind === 'stone') return;

      const fruit1 = board[row1][col1];
      const fruit2 = board[row2][col2];

      // ── Fusion: both cells are special ────────────────────────────────
      if (fruit1?.special && fruit2?.special) {
        cbRef.current.onSwap?.();

        const newMoves = movesLeft - 1;
        setMovesLeft(newMoves);

        // Gravity shift counter
        const newMovesUntilShift = movesUntilShiftRef.current - 1;
        if (newMovesUntilShift <= 0) {
          pendingGravityShiftRef.current = true;
          movesUntilShiftRef.current = 2;
          setMovesUntilShift(0);
        } else {
          movesUntilShiftRef.current = newMovesUntilShift;
          setMovesUntilShift(newMovesUntilShift);
        }

        const newBoard = cloneBoard(board);
        const fusionResult = applyFusion(newBoard, row1, col1, row2, col2, fruit1.special, fruit2.special);

        if (fusionResult.hasTornado) removeTenRandom(newBoard);
        if (fusionResult.hasGravityOrb) {
          const dirs = GRAVITY_DIRS.filter(d => d !== gravityDirRef.current);
          const newDir = dirs[Math.floor(Math.random() * dirs.length)];
          gravityDirRef.current = newDir;
          setGravityDir(newDir);
          setGravityShifting(true);
          addTimer(() => setGravityShifting(false), 700);
        }

        const fusionScore = fusionResult.score;
        const newScore = score + fusionScore;
        setScore(newScore);
        setTotalScore((prev) => prev + fusionScore);
        setFusionNotification({ name: fusionResult.name, type: fusionResult.type, key: Date.now() });

        applyGravity(newBoard, obstaclesRef.current, gravityDirRef.current);
        const rolledObstacles = moveStones(newBoard, obstaclesRef.current);
        applyPortalTeleport(newBoard, rolledObstacles);
        spawnFruits(newBoard, rolledObstacles, fruitTypesRef.current, gravityDirRef.current);

        obstaclesRef.current = rolledObstacles;
        setObstacles(cloneObstacles(rolledObstacles));
        setBoard(cloneBoard(newBoard));
        isProcessing.current = true;
        bonusSpawnedRef.current = false;

        addTimer(() => {
          processCascade(newBoard, rolledObstacles, newScore, newMoves, 0);
        }, 100);
        return;
      }

      // ── Normal swap ────────────────────────────────────────────────────
      const newBoard = cloneBoard(board);
      [newBoard[row1][col1], newBoard[row2][col2]] = [newBoard[row2][col2], newBoard[row1][col1]];
      if (newBoard[row1][col1]) { newBoard[row1][col1].row = row1; newBoard[row1][col1].col = col1; }
      if (newBoard[row2][col2]) { newBoard[row2][col2].row = row2; newBoard[row2][col2].col = col2; }

      const matched = findMatches(newBoard, null);
      if (matched.length === 0) {
        setShakeCell({ row: row1, col: col1 });
        addTimer(() => setShakeCell(null), 380);
        return;
      }

      cbRef.current.onSwap?.();

      const newMoves = movesLeft - 1;
      setMovesLeft(newMoves);

      const newMovesUntilShift = movesUntilShiftRef.current - 1;
      if (newMovesUntilShift <= 0) {
        pendingGravityShiftRef.current = true;
        movesUntilShiftRef.current = 2;
        setMovesUntilShift(0);
      } else {
        movesUntilShiftRef.current = newMovesUntilShift;
        setMovesUntilShift(newMovesUntilShift);
      }

      isProcessing.current = true;
      bonusSpawnedRef.current = false;

      // Animate swap first, then commit the board update and begin cascade
      setSwappingCells(new Set([row1 * BOARD_SIZE + col1, row2 * BOARD_SIZE + col2]));
      addTimer(() => {
        setSwappingCells(EMPTY_SET);
        setBoard(newBoard);
        addTimer(() => {
          processCascade(newBoard, obstaclesRef.current, score, newMoves, 0);
        }, 60);
      }, 120);
    },
    [board, movesLeft, score, gameState, paused, processCascade, addTimer]
  );

  const handleCandyClick = useCallback(
    (row, col) => {
      if (isProcessing.current || paused || gameState !== 'playing') return;
      if (selectedCandy) {
        swapCandies(selectedCandy.row, selectedCandy.col, row, col);
        setSelectedCandy(null);
      } else {
        setSelectedCandy({ row, col });
      }
    },
    [selectedCandy, gameState, paused, swapCandies]
  );

  const handleDragSwap = useCallback(
    (fromRow, fromCol, toRow, toCol) => {
      if (isProcessing.current || paused || gameState !== 'playing') return;
      setSelectedCandy(null);
      swapCandies(fromRow, fromCol, toRow, toCol);
    },
    [gameState, paused, swapCandies]
  );

  const nextLevel = useCallback(() => {
    if (currentLevel < 99) setCurrentLevel((prev) => prev + 1);
  }, [currentLevel]);

  const retryLevel = useCallback(() => { setLevelVersion((v) => v + 1); }, []);

  const goToLevel = useCallback((levelIndex) => {
    setCurrentLevel(levelIndex);
    setTotalScore(0);
    setLevelVersion((v) => v + 1);
  }, []);

  const restartGame = useCallback(() => { goToLevel(0); }, [goToLevel]);

  const togglePause = useCallback(() => {
    if (gameState === 'playing') setPaused((p) => !p);
  }, [gameState]);

  return {
    board,
    obstacles,
    score,
    totalScore,
    movesLeft,
    gameState,
    currentLevel,
    selectedCandy,
    animatingCells,
    shakeCell,
    lightningEffect,
    paused,
    gravityDir,
    movesUntilShift,
    gravityShifting,
    comboNotification,
    fusionNotification,
    swappingCells,
    targetScore: levels?.[currentLevel]?.targetScore ?? 0,
    handleCandyClick,
    handleDragSwap,
    nextLevel,
    retryLevel,
    restartGame,
    goToLevel,
    togglePause,
  };
}
