const fs = require('fs');
const path = require('path');
const db = require('@db');

// Load parquet solutions
const solutionsPath = path.join(__dirname, 'parquet_solutions.txt');
const parquetSolutions = JSON.parse(fs.readFileSync(solutionsPath, 'utf8'));

function getRandomTiling() {
  const patterns = Object.keys(parquetSolutions);
  if (patterns.length === 0) return null;
  const rand = typeof global.random === 'function' ? global.random : Math.random; // Use seeded random if available
  const pat = patterns[Math.floor(rand() * patterns.length)];
  const [score, csv] = parquetSolutions[pat];
  return { pattern: pat, score, csv };
}

function validateGrid(grid, pattern) {
  if (!grid || !pattern) return { ok: false, msg: 'Missing grid or pattern' };
  if (!Array.isArray(grid) || grid.length !== 9 || grid.some(row => !Array.isArray(row) || row.length !== 9)) {
    return { ok: false, msg: 'Grid must be 9x9 array.' };
  }
  // Convert grid to numbers/null
  const vals = Array.from({ length: 9 }, (_, i) =>
    Array.from({ length: 9 }, (_, j) => {
      const x = grid[i][j];
      if (x === null || x === '') return null;
      if (typeof x === 'number' && x >= 1 && x <= 9) return x;
      if (typeof x === 'string') {
        const v = parseInt(x);
        if (v >= 1 && v <= 9) return v;
      }
      return null;
    })
  );
  // Adjacency check (including diagonals)
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const v = vals[i][j];
      if (v == null) continue;
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          if (di === 0 && dj === 0) continue;
          const ni = i + di, nj = j + dj;
          if (ni >= 0 && ni < 9 && nj >= 0 && nj < 9) {
            if (vals[ni][nj] === v) {
              return { ok: false, msg: 'Adjacent cells (including diagonals) cannot have the same value' };
            }
          }
        }
      }
    }
  }
  // Parse pattern into 9x9 array
  const rows = pattern.split('\n').map(row => row.trim());
  if (rows.length !== 9 || rows.some(r => r.length !== 9)) {
    return { ok: false, msg: 'Pattern must be 9x9 string.' };
  }
  // Group by label
  const labelCoords = {};
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const ch = rows[i][j];
      if (!labelCoords[ch]) labelCoords[ch] = [];
      labelCoords[ch].push([i, j]);
    }
  }
  for (const coords of Object.values(labelCoords)) {
    if (coords.length !== 3) continue;
    // Check if tile is horizontal or vertical
    const isHoriz = coords[0][0] === coords[1][0] && coords[1][0] === coords[2][0];
    const isVert = coords[0][1] === coords[1][1] && coords[1][1] === coords[2][1];
    if (!(isHoriz || isVert)) {
      return { ok: false, msg: 'Invalid tile shape' };
    }
    // Get the three cell values
    const valsTile = coords.map(([i, j]) => vals[i][j]);
    if (valsTile.some(x => x == null)) continue; // skip incomplete tiles
    // Find middle cell index
    let coordsSorted;
    if (isHoriz) coordsSorted = coords.sort((a, b) => a[1] - b[1]);
    else coordsSorted = coords.sort((a, b) => a[0] - b[0]);
    const [v1, v2, v3] = coordsSorted.map(([i, j]) => vals[i][j]);
    if (!(v2 > v1 && v2 > v3)) {
      return { ok: false, msg: 'Middle cell of each tile must be largest' };
    }
    if (v1 === v3) {
      return { ok: false, msg: 'Ends of each tile must be different' };
    }
  }
  // Compute sum and check completeness
  let s = 0, incomplete = false;
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (vals[i][j] == null) incomplete = true;
      else s += vals[i][j];
    }
  }
  if (incomplete) {
    return { ok: false, sum: s, msg: `Valid, but incomplete. Current sum: ${s}` };
  } else {
    return { ok: true, sum: s, msg: `Valid solution! Sum of cells: ${s}` };
  }
}

function isValidUsername(username) {
  if (typeof username !== 'string' || username.length < 1 || username.length > 15) return false;
  // Only ASCII letters, then optional digits, no letters after digits
  let seenDigit = false;
  for (let i = 0; i < username.length; ++i) {
    const c = username[i];
    if (c >= '0' && c <= '9') {
      seenDigit = true;
    } else if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')) {
      if (seenDigit) return false; // letter after digit
    } else {
      return false; // not a letter or digit
    }
  }
  return true;
}

async function submitScore(username, user_id, game, score, time, difficulty) {
  // Validate username
  if (!isValidUsername(username)) {
    return { ok: false, msg: 'Invalid username format.' };
  }
  // Validate types and lengths
  if (
    typeof score !== 'number' ||
    typeof time !== 'number' ||
    typeof game !== 'string' ||
    typeof difficulty !== 'string' ||
    game.length < 1 || game.length > 15 ||
    difficulty.length < 1 || difficulty.length > 15
  ) {
    return { ok: false, msg: 'Missing or invalid score/time/game/difficulty.' };
  }

  try {
    const difficulty_id = await db.getDifficultyId(difficulty);
    const game_id = await db.getGameId(game);
    const id = await db.insertScore({ username, user_id, score, game_id, difficulty_id, time });
    return { ok: true, id };
  } catch (err) {
    return { ok: false, msg: err.message };
  }
}

module.exports = { getRandomTiling, validateGrid, submitScore };
