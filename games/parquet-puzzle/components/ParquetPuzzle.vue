<template>
  <div class="heading">
    <!--span class="heading-title"-->
      <u> Parquet Puzzle </u>
    <!--/span-->
  </div>
  <details class="rules-details">
    <summary class="rules-summary">Rules & Scoring</summary>
    <div class="rules-content">
      <b>RULES:</b> Fill the grid with numbers from 1 to 9 so that each colored segment bordered by a thick line contains 3 different numbers. The number in the middle must be the largest. Same digits must not touch anywhere, not even diagonally.<br><br>
      <b>SCORING:</b> All numbers in the grid are added up. Your final result is reduced by the time spent in seconds divided by 10.
    </div>
  </details>
  <div class="wrap">
    <div id="statusbox" class="statusbox">
      <span id="status" class="status-label">
        Status:
        <span id="statusval" class="statusval">{{ status }}</span>
      </span>
      <span id="timer" class="timer-label">
        Time:
        <span id="timerval" class="timerval">{{ timer.toFixed(1) }}s</span>
      </span>
      <span id="score" class="score-label">
        Score:
        <span id="scoreval" class="scoreval">
          {{ liveScore }} /
          <span v-if="optimalRevealed">{{ Math.round(currentOptimalScore) }}</span>
          <span v-else @click="revealOptimal" class="reveal-optimal">???</span>
        </span>
      </span>
    </div>
    <div class="grid">
      <template v-for="r in 9" :key="r">
        <template v-for="c in 9" :key="c">
          <div class="cell-wrapper" style="position: relative; display: inline-block;">
            <input
              v-model="cells[r-1][c-1]"
              maxlength="1"
              class="cell"
              :id="'cell-' + (r-1) + '-' + (c-1)"
              @input="onCellInput()"
              @keydown="handleCellKey($event, r-1, c-1)"
              :style="{
                ...cellStyles[r-1][c-1],
                background:
                  errorHighlighting
                  && invalidCells.has(`${r-1}-${c-1}`)
                  && typeof cellStyles[r-1][c-1].background === 'string'
                  ? alterHSL(cellStyles[r-1][c-1].background)
                  : cellStyles[r-1][c-1].background,
              }"
              type="tel"
              inputmode="numeric"
              pattern="[1-9]"
            />
            <div
              v-if="errorHighlighting && invalidCells.has(`${r-1}-${c-1}`)"
              class="error-overlay"
            ></div>
          </div>
        </template>
      </template>
    </div>
  </div>
  <div class="actions">
    <div class="button-row">
      <button @click="newGame">New Game</button>
      <button @click="clearBoard">Clear</button>
      <button
        @click="submit"
        :disabled="showOptimalUsed || (status !== 'Valid' && status !== 'Optimal')"
        :class="{ disabled: showOptimalUsed || (status !== 'Valid' && status !== 'Optimal') }"
      >
        Submit
      </button>
    </div>
    <div class="button-row">
      <button @click="copyBoard">{{ copyButtonText }}</button>
      <button @click="pasteBoard">{{ pasteButtonText }}</button>
    </div>
    <div class="button-row button-row-col">
      <button @click="showOptimal">Show Optimal</button>
      <span v-if="optimalNote" class="optimal-note">
        (Users old solution has been copied to the clipboard. Click "Paste" to return back to your solution.)
      </span>
    </div>
  </div>
</template>

<script>
import '../../../public/main.css';
import '../css/main.css';

// 27 visually distinct colors for tile labels a-z and A (for 27 tiles)
const TILE_COLORS = {
  a: 'hsl(320, 75%, 60%)',  // pink
  b: 'hsl(27, 75%, 60%)',   // orange
  c: 'hsl(147, 75%, 60%)',  // green
  d: 'hsl(80, 75%, 60%)',   // yellow-green
  e: 'hsl(347, 75%, 60%)',  // magenta
  f: 'hsl(267, 75%, 60%)',  // purple
  g: 'hsl(213, 75%, 60%)',  // blue
  h: 'hsl(93, 75%, 60%)',   // lime
  k: 'hsl(187, 75%, 60%)',  // cyan
  i: 'hsl(253, 75%, 60%)',  // violet
  l: 'hsl(333, 75%, 60%)',  // pink
  j: 'hsl(133, 75%, 60%)',  // green
  m: 'hsl(53, 75%, 60%)',   // yellow
  n: 'hsl(240, 75%, 60%)',  // blue
  q: 'hsl(200, 75%, 60%)',  // blue
  o: 'hsl(107, 75%, 60%)',  // green
  r: 'hsl(307, 75%, 60%)',  // purple
  s: 'hsl(227, 75%, 60%)',  // blue
  p: 'hsl(0, 75%, 60%)',    // red
  t: 'hsl(160, 75%, 60%)',  // teal
  u: 'hsl(40, 75%, 60%)',   // orange
  w: 'hsl(293, 75%, 60%)',  // magenta
  v: 'hsl(173, 75%, 60%)',  // green
  x: 'hsl(13, 75%, 60%)',   // orange-red
  y: 'hsl(120, 75%, 60%)',  // green
  z: 'hsl(67, 75%, 60%)',   // yellow-green
  A: 'hsl(280, 75%, 60%)',  // purple
};

export default {
  name: 'ParquetPuzzle',
  data() {
    const makeGrid = () => Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => ''));
    const makeStyles = () => Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => ({ }))); 
    return {
      cells: makeGrid(),
      cellStyles: makeStyles(),
      status: 'Empty',
      score: '0',
      timer: 0.0,
      timerInterval: null,
      timerActive: false,
      showOptimalUsed: false,
      optimalRevealed: false,
      optimalNote: false,
      copyButtonText: 'Copy',
      pasteButtonText: 'Paste',
      currentPattern: '',
      currentOptimalCSV: '',
      currentOptimalScore: 0,
      errorHighlighting: true, // Toggle for error-highlighting
      invalidCells: new Set(),
      copiedBoard81: null,
    };
  },
  computed: {
    liveScore() {
      return this.cells.flat().reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    },
  },
  methods: {
    async newGame() {
      this.cells = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => ''));
      this.cellStyles = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => ({ })));
      this.status = 'Empty';
      this.score = '0';
      this.timer = 0.0;
      this.timerInterval = null;
      this.timerActive = false;
      this.optimalNote = false;
      this.optimalRevealed = false;
      this.showOptimalUsed = false;
      try {
        const res = await fetch('/api/parquet/random-tiling');
        if (!res.ok) throw new Error('new game failed');
        const data = await res.json();
        this.currentPattern = data.pattern;
        this.currentOptimalCSV = data.csv;
        this.currentOptimalScore = data.score;
        this.fillFromPattern(data.pattern);
        this.startTimer();
      } catch (e) {
        console.error('New Game error:', e);
      }
    },
    alterHSL(hsl, increase = -20) {
      // Remove 'hsl(' and ')', then split by ','
      let s = hsl.trim();
      if (!s.startsWith('hsl(') || !s.endsWith(')')) return hsl;
      s = s.slice(4, -1); // remove 'hsl(' and ')'
      const parts = s.split(',').map(x => x.trim());
      if (parts.length !== 3) return hsl;
      const h = parts[0];
      const sVal = parts[1];
      let lVal = parts[2];
      if (!lVal.endsWith('%')) return hsl;
      lVal = lVal.slice(0, -1);
      let l = Math.min(100, parseFloat(lVal) + increase);
      return `hsl(${h}, ${sVal}, ${l}%)`;
    },
    validateGrid(grid, pattern) {
      const invalid = new Set();
      if (!grid || !pattern) {
        this.invalidCells = invalid;
        return { ok: false, msg: 'Missing grid or pattern' };
      }
      if (!Array.isArray(grid) || grid.length !== 9 || grid.some(row => !Array.isArray(row) || row.length !== 9)) {
        this.invalidCells = invalid;
        return { ok: false, msg: 'Grid must be 9x9 array.' };
      }
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
      // Adjacent same digits (including diagonals)
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
                  invalid.add(`${i}-${j}`);
                  invalid.add(`${ni}-${nj}`);
                }
              }
            }
          }
        }
      }
      const rows = pattern.split('\n').map(row => row.trim());
      if (rows.length !== 9 || rows.some(r => r.length !== 9)) {
        this.invalidCells = invalid;
        return { ok: false, msg: 'Pattern must be 9x9 string.' };
      }
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
        const isHoriz = coords[0][0] === coords[1][0] && coords[1][0] === coords[2][0];
        const isVert = coords[0][1] === coords[1][1] && coords[1][1] === coords[2][1];
        if (!(isHoriz || isVert)) continue;
        const valsTile = coords.map(([i, j]) => vals[i][j]);
        if (valsTile.some(x => x == null)) continue;
        let coordsSorted;
        if (isHoriz) coordsSorted = coords.slice().sort((a, b) => a[1] - b[1]);
        else coordsSorted = coords.slice().sort((a, b) => a[0] - b[0]);
        const [v1, v2, v3] = coordsSorted.map(([i, j]) => vals[i][j]);
        if (!(v2 > v1 && v2 > v3)) {
          coordsSorted.forEach(([i, j]) => invalid.add(`${i}-${j}`));
        }
        if (v1 === v3) {
          coordsSorted.forEach(([i, j]) => invalid.add(`${i}-${j}`));
        }
      }
      this.invalidCells = invalid;
      let s = 0, incomplete = false, filled = 0;
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
          if (vals[i][j] == null) incomplete = true;
          else { s += vals[i][j]; filled++; }
        }
      }
      if (incomplete && filled === 0) {
        return { ok: true, sum: s, msg: 'Empty' };
      } else if (incomplete) {
        return { ok: true, sum: s, msg: `Valid, but incomplete. Current score: ${s}` };
      } else {
        return { ok: true, sum: s, msg: `Valid solution! Score: ${s}` };
      }
    },
    handleCellKey(e, row, col) {
      // If key is a digit 1-9, replace the cell value
      if (e.key >= '1' && e.key <= '9') {
        this.cells[row][col] = e.key;
        e.preventDefault(); // Prevent default input behavior
        this.onCellInput();
      }
      
      // Allow navigation keys, backspace, etc.
      let newRow = row, newCol = col;
      if (e.key === 'ArrowUp')    newRow = Math.max(0, row - 1);
      if (e.key === 'ArrowDown')  newRow = Math.min(8, row + 1);
      if (e.key === 'ArrowLeft')  newCol = Math.max(0, col - 1);
      if (e.key === 'ArrowRight') newCol = Math.min(8, col + 1);

      if (newRow !== row || newCol !== col) {
        e.preventDefault();
        const nextId = `cell-${newRow}-${newCol}`;
        const next = document.getElementById(nextId);
        if (next) next.focus();
      }
    },
    onCellInput() {
      const grid = this.cells.map(row => row.map(v => v.trim()));
      try {
        let data = this.validateGrid(grid, this.currentPattern);
        let status = 'Invalid';
        let scoreText = '0';

        // Check for invalid cells first!
        if (this.invalidCells && this.invalidCells.size > 0) {
          status = 'Invalid';
          scoreText = '0';
        } else if (data.ok) {
          if (data.msg === 'Empty') {
            status = 'Empty';
            scoreText = '0';
          } else {
            status = 'Valid';
            if (data.msg && data.msg.toLowerCase().includes('incomplete')) status = 'Partial';
            if (this.currentOptimalScore && Math.round(data.sum) === Math.round(this.currentOptimalScore)) {
              status = 'Optimal';
              scoreText = data.sum + ' / ' + Math.round(this.currentOptimalScore);
            } else {
              scoreText = data.sum;
            }
          }
        }
        this.status = status;
        this.score = scoreText;
        //this.optimalNote = false;
      } catch (e) {
        this.status = 'Error';
        this.score = '0';
      }
    },
    async submit() {
      if (this.showOptimalUsed) return;
      const grid = this.cells.map(row => row.map(v => v.trim()));
      const timeTaken = this.timer;
      const score = this.liveScore;
      
      const username = 'Guest';
      const user_id = 1;
      const game = 'Parquezzle'; // must match games table
      const difficulty = 'Normal'; // must match difficulties table

      try {
        let finalScore = Math.max(0, score - timeTaken / 10);
        const res = await fetch('/api/parquet/submit-grid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grid,
            pattern: this.currentPattern,
            username,
            user_id,
            game,
            score: finalScore,
            time: timeTaken,
            difficulty
          })
        });
        if (!res.ok) {
          const errMsg = await res.text();
          alert('Submission failed: ' + errMsg);
          return;
        }
        const data = await res.json();
        if (data.ok) {
          this.stopTimer();
          alert(`Valid! Sum of cells: ${data.validation.sum}\nTime taken: ${timeTaken.toFixed(1)}s\nFinal Score: ${finalScore.toFixed(1)}`);
        } else {
          alert(`Invalid: ${data.msg || 'Unknown error.'}`);
        }
      } catch (e) {
        alert('Submission failed: ' + (e.message || e));
      }
    },
    fillFromPattern(pattern) {
      const rows = pattern.split('\n').map(r => r.trim());
      if (rows.length !== 9 || rows.some(r => r.length !== 9)) return;
      for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
          Object.assign(this.cellStyles[r][c], {
            borderTopWidth: '1px', borderRightWidth: '1px',
            borderBottomWidth: '1px', borderLeftWidth: '1px',
            borderTopColor: '#000', borderRightColor: '#000',
            borderBottomColor: '#000', borderLeftColor: '#000'
          });
      const groups = {};
      for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
          (groups[rows[r][c]] ??= []).push([r, c]);
      const labels = Object.keys(groups);
      labels.forEach((label) => {
        const color = TILE_COLORS[label] || '#ccc';
        const coords = groups[label];
        coords.forEach(([r, c]) => { this.cellStyles[r][c].background = color; });
        if (coords.length === 3) {
          const thick = '3px', dark = '#000';
          coords.forEach(([r, c]) => {
            if (r === 0 || !coords.some(([rr, cc]) => rr === r - 1 && cc === c))
              this.cellStyles[r][c].borderTopWidth = thick, this.cellStyles[r][c].borderTopColor = dark;
            if (r === 8 || !coords.some(([rr, cc]) => rr === r + 1 && cc === c))
              this.cellStyles[r][c].borderBottomWidth = thick, this.cellStyles[r][c].borderBottomColor = dark;
            if (c === 0 || !coords.some(([rr, cc]) => rr === r && cc === c - 1))
              this.cellStyles[r][c].borderLeftWidth = thick, this.cellStyles[r][c].borderLeftColor = dark;
            if (c === 8 || !coords.some(([rr, cc]) => rr === r && cc === c + 1))
              this.cellStyles[r][c].borderRightWidth = thick, this.cellStyles[r][c].borderRightColor = dark;
          });
        }
      });
    },
    clearBoard() {
      this.cells = Array.from({ length: 9 }, () => Array(9).fill(''));
      this.onCellInput();
    },
    showOptimal() {
      const userCSV = this.cells.flat().map(v => v.trim()).join(',');
      try {
        this.copyBoard();
      } catch (e) {
        this.status = 'Copy failed';
        return;
      }
      if (!this.currentOptimalCSV || !this.currentOptimalScore) {
        this.status = 'No optimal solution available for this pattern.';
        return;
      }
      const valsOpt = this.currentOptimalCSV.split(',');
      if (valsOpt.length !== 81) {
        this.status = 'Optimal solution is invalid.';
        return;
      }
      let k = 0;
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++, k++) {
          this.cells[r][c] = valsOpt[k];
        }
      }
      this.optimalNote = true;
      this.optimalRevealed = true;
      this.showOptimalUsed = true;
      this.stopTimer();
      this.onCellInput();
    },
    revealOptimal() {
      this.optimalRevealed = true;
    },
    copyBoard() {
      this.copiedBoard81 = this.cells.map(row => row.slice());
      this.copyButtonText = 'Copied';
      setTimeout(() => { this.copyButtonText = 'Copy'; }, 500);
    },
    pasteBoard() {
      this.optimalNote = false;
      const b = this.copiedBoard81;
      // Basic validation of copied board. Allows empty cells and single digits only
      if (
        !Array.isArray(b) ||
        b.length !== 9 ||
        b.some(row =>
          !Array.isArray(row) ||
          row.length !== 9 ||
          row.some(cell =>
            !(cell === '' || (typeof cell === 'string' && cell.length === 1 && cell >= '1' && cell <= '9'))
          )
        )
      ) {
        console.log('Paste failed: Invalid board format.');
        return;
      }
      this.cells = this.copiedBoard81.map(row => row.slice());
      this.onCellInput();
      this.pasteButtonText = 'Pasted';
      setTimeout(() => { this.pasteButtonText = 'Paste'; }, 500);
    },
    startTimer() {
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.timer = 0.0;
      this.timerActive = true;
      this.timerInterval = setInterval(() => {
        if (this.timerActive) this.timer += 0.1;
      }, 100);
    },
    stopTimer() {
      this.timerActive = false;
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.timerInterval = null;
    },
  },
  mounted() {
    this.newGame();
    window.pp = this;
  },
};
</script>
