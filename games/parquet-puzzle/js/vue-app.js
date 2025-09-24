const { createApp } = Vue;

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
  x: 'hsl(13, 75%, 60%)',    // orange-red
  y: 'hsl(120, 75%, 60%)',  // green
  z: 'hsl(67, 75%, 60%)',   // yellow-green
  A: 'hsl(280, 75%, 60%)',  // purple
};

createApp({
  data() {
    // Guarantee unique rows and cells
    const makeGrid = () => Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => ''));
    const makeStyles = () => Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => ({ }))); 
    return {
      cells: makeGrid(),
      cellStyles: makeStyles(),
      status: '-',
			score: '-',
			optimalRevealed: false,
			optimalNote: false,
      // Add more reactive state as needed
    };
  },
  computed: {
    // Example: live score calculation
    liveScore() {
      // Replace with your scoring logic
      return this.cells.flat().reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    },
    cellCoords() {
      const coords = [];
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          coords.push({ r, c });
        }
      }
      return coords;
    }
  },
	methods: {
    async newGame() {
      // Clear board
    	this.grid = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => ''));
      this.cellStyles = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => ({})));
      this.status = 'Empty';
      this.score = '0';
      this.optimalNote = false;
      this.optimalRevealed = false;
      try {
        const res = await fetch('/api/parquet/random-tiling');
        if (!res.ok) throw new Error('new game failed');
        const data = await res.json();
        // Store pattern and optimal solution
        this.currentPattern = data.pattern;
        this.currentOptimalCSV = data.csv;
        this.currentOptimalScore = data.score;
        // Fill grid from pattern and apply coloring/borders
        this.fillFromPattern(data.pattern);
      } catch (e) {
        console.error('New Game error:', e);
      }
    },
		validateGrid(grid, pattern) {
			// Reimplementation of parquet.js rules
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
				if (isHoriz) coordsSorted = coords.slice().sort((a, b) => a[1] - b[1]);
				else coordsSorted = coords.slice().sort((a, b) => a[0] - b[0]);
				const [v1, v2, v3] = coordsSorted.map(([i, j]) => vals[i][j]);
				if (!(v2 > v1 && v2 > v3)) {
					return { ok: false, msg: 'Middle cell of each tile must be largest' };
				}
				if (v1 === v3) {
					return { ok: false, msg: 'Ends of each tile must be different' };
				}
			}
      // Compute sum and check completeness
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
    onCellInput() {
      const grid = this.cells.map(row => row.map(v => v.trim()));
      try {
        let data = this.validateGrid(grid, this.currentPattern);
        let status = 'Invalid';
        let scoreText = '-';
        if (data.ok) {
          if (data.msg === 'Empty') {
            status = 'Empty';
            scoreText = '0';
          } else {
            status = 'Valid';
            if (data.msg && data.msg.toLowerCase().includes('incomplete')) status = 'Incomplete';
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
        this.optimalNote = false;
        // TODO: highlight invalid cells based on rule violations
      } catch (e) {
        this.status = 'Error';
        this.score = '-';
      }
    },
		async submit() {
			// Submit the grid/score using Vue data
			// TODO: implement submission logic
			const grid = this.cells.map(row => row.map(v => v.trim()));
		},
		fillFromPattern(pattern) {
			const rows = pattern.split('\n').map(r => r.trim());
			if (rows.length !== 9 || rows.some(r => r.length !== 9)) return;

			// Reset all borders
			for (let r = 0; r < 9; r++)
				for (let c = 0; c < 9; c++)
					Object.assign(this.cellStyles[r][c], {
						borderTopWidth: '1px', borderRightWidth: '1px',
						borderBottomWidth: '1px', borderLeftWidth: '1px',
						borderTopColor: '#000', borderRightColor: '#000',
						borderBottomColor: '#000', borderLeftColor: '#000'
					});

			// Group cells by label
			const groups = {};
			for (let r = 0; r < 9; r++)
				for (let c = 0; c < 9; c++)
					(groups[rows[r][c]] ??= []).push([r, c]);

			// Assign colors
			const labels = Object.keys(groups);
			labels.forEach((label) => {
				const color = TILE_COLORS[label] || '#ccc';
				const coords = groups[label];
				coords.forEach(([r, c]) => { this.cellStyles[r][c].background = color; });

				// Thick borders for 3-cell tiles
				if (coords.length === 3) {
					const thick = '2px', dark = '#000';
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
		async showOptimal() {
      // Save user's current solution to clipboard
      const userCSV = this.cells.flat().map(v => v.trim()).join(',');
      try {
				await navigator.clipboard.writeText(userCSV);
      } catch (e) {
				this.status = 'Copy failed';
				return;
      }
      // Fill grid with optimal solution
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
			this.onCellInput();
		},
    revealOptimal() {
      this.optimalRevealed = true;
    },
    async copyBoard() {
      // Copy the grid as a CSV string to clipboard
      const csv = this.cells.flat().map(v => v.trim()).join(',');
      try {
				await navigator.clipboard.writeText(csv);
      } catch (e) {
				console.error('Copy failed:', e);
      }
    },
    async pasteBoard() {
      // Paste a CSV string from clipboard into the grid, with validation
      this.optimalNote = false;
      try {
        const str = await navigator.clipboard.readText();
        if (str.length > 200) {
          console.error('Paste failed: Clipboard too long.');
          return;
        }
        const vals = str.split(',');
        if (vals.length !== 81 || !vals.every(v => v === '' || (v.length === 1 && v >= '1' && v <= '9'))
        ) {
					console.error('Paste failed: Must be 81 entries, each empty or a digit 1-9.');
					return;
        }
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
						this.cells[r][c] = vals[r * 9 + c].trim();
          }
        }
      } catch (e) {
        console.error('Paste failed:', e);
      }
			this.onCellInput();
    },
  },
  mounted: function() {
    console.log('mounted called (Vue)');
    this.newGame();
  },
template: `
    <div class="maincenter">
      <div class="heading">
        <span class="heading-title">
          <u> Parquet Puzzle </u>
        </span>
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
						<span id="statusval" class="statusval">
							{{ status }}
						</span>
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
          <template v-for="r in 9">
            <template v-for="c in 9">
              <input
                :key="'cell-' + (r-1) + '-' + (c-1)"
                v-model="cells[r-1][c-1]"
                maxlength="1"
                class="cell"
                :id="'cell-' + (r-1) + '-' + (c-1)"
                :style="cellStyles[r-1][c-1]"
                @input="onCellInput()"
              />
            </template>
          </template>
        </div>
      </div>
      <div class="actions">
        <div class="button-row">
          <button @click="newGame">New Game</button>
          <button @click="clearBoard">Clear</button>
          <button @click="submit">Submit</button>
        </div>
        <div class="button-row">
          <button @click="copyBoard">Copy</button>
          <button @click="pasteBoard">Paste</button>
        </div>
        <div class="button-row button-row-col">
          <button @click="showOptimal">Show Optimal</button>
          <span v-if="optimalNote" class="optimal-note">
            (Users old solution has been copied to the clipboard. Click "Paste" to return back to your solution.)
          </span>
        </div>
      </div>
    </div>
  `
}).mount('#app');
