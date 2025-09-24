// Store optimal solution and score for current pattern
let currentOptimalCSV = null;
let currentOptimalScore = null;

const calcBtn = document.getElementById('show-optimal');
calcBtn.addEventListener('click', async function () {
  const vals = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) vals.push(cells[r][c].value.trim());
  const userStr = vals.join(',');
  try {
    await navigator.clipboard.writeText(userStr);
  } catch (e) {
    alert('Copy failed: ' + e.message);
    return;
  }
  if (!currentOptimalCSV || !currentOptimalScore) {
    alert('No optimal solution available for this pattern.');
    return;
  }
  const valsOpt = currentOptimalCSV.split(',');
  if (valsOpt.length !== 81) {
    alert('Optimal solution is invalid.');
    return;
  }
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) cells[r][c].value = valsOpt[r * 9 + c];
  recenterCells();
  setStatus('Optimal', Math.round(currentOptimalScore), true);
  optimalShown = true;
  document.getElementById('optimal-note').style.display = 'inline';
});
const grid = document.getElementById('grid');
const cells = Array.from({ length: 9 }, () => Array(9));

for (let r = 0; r < 9; r++) {
  for (let c = 0; c < 9; c++) {
    const el = document.createElement('input');
    el.type = 'text';
    el.maxLength = 1;
    el.className = 'cell';
    el.inputMode = 'numeric';
    el.pattern = '[1-9]';
    el.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^1-9]/g, '');
    });
    el.addEventListener('keydown', (e) => {
      let nr = r, nc = c;
      if (e.key === 'ArrowUp') nr = r > 0 ? r - 1 : r;
      else if (e.key === 'ArrowDown') nr = r < 8 ? r + 1 : r;
      else if (e.key === 'ArrowLeft') nc = c > 0 ? c - 1 : c;
      else if (e.key === 'ArrowRight') nc = c < 8 ? c + 1 : c;
      else return;
      if (nr !== r || nc !== c) {
        e.preventDefault();
        cells[nr][nc].focus();
      }
    });
    grid.appendChild(el);
    cells[r][c] = el;
  }
}

function recenterCells() {
  for (const row of cells) {
    for (const el of row) {
      const cs = getComputedStyle(el);
      const t = parseFloat(cs.borderTopWidth) || 0;
      const b = parseFloat(cs.borderBottomWidth) || 0;
      const pt = parseFloat(cs.paddingTop) || 0;
      const pb = parseFloat(cs.paddingBottom) || 0;
      const inner = Math.max(0, 48 - t - b - pt - pb);
      el.style.lineHeight = inner + 'px';
    }
  }
}
recenterCells();

document.getElementById('clear').addEventListener('click', () => {
  for (const row of cells) {
    for (const el of row) {
      el.value = '';
      el.title = '';
      // Only clear user input, not background or borders
    }
  }
  recenterCells();
});

function fillFromPattern(pattern) {
  const rows = pattern.split('\n');
  if (rows.length !== 9 || rows.some((r) => r.length !== 9)) return;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const el = cells[r][c];
      el.style.borderTopWidth = el.style.borderRightWidth = el.style.borderBottomWidth = el.style.borderLeftWidth = '1px';
      el.style.borderTopColor = el.style.borderRightColor = el.style.borderBottomColor = el.style.borderLeftColor = '#000';
    }
  }
  const groups = new Map();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const ch = rows[r][c];
      if (!groups.has(ch)) groups.set(ch, []);
      groups.get(ch).push([r, c]);
    }
  }
  const labels = Array.from(groups.keys());
  const n = labels.length || 1;
  const palette = [];
  for (let i = 0; i < n; ++i) {
    const h = Math.round((360 * i) / n);
    palette.push('hsl(' + h + ', 75%, 60%)');
  }
  for (let i = palette.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [palette[i], palette[j]] = [palette[j], palette[i]];
  }
  const labelToColor = {};
  labels.forEach((label, i) => {
    labelToColor[label] = palette[i];
  });
  labels.forEach((label, i) => {
    const coords = groups.get(label);
    const fill = labelToColor[label];
    coords.forEach(([r, c]) => {
      cells[r][c].style.background = fill;
    });
    if (coords.length !== 3) return;
    const thick = '2px';
    const dark = '#000';
    coords.forEach(([r, c]) => {
      if (r === 0 || !coords.some(([rr, cc]) => rr === r - 1 && cc === c)) {
        cells[r][c].style.borderTopWidth = thick;
        cells[r][c].style.borderTopColor = dark;
      }
      if (r === 8 || !coords.some(([rr, cc]) => rr === r + 1 && cc === c)) {
        cells[r][c].style.borderBottomWidth = thick;
        cells[r][c].style.borderBottomColor = dark;
      }
      if (c === 0 || !coords.some(([rr, cc]) => rr === r && cc === c - 1)) {
        cells[r][c].style.borderLeftWidth = thick;
        cells[r][c].style.borderLeftColor = dark;
      }
      if (c === 8 || !coords.some(([rr, cc]) => rr === r && cc === c + 1)) {
        cells[r][c].style.borderRightWidth = thick;
        cells[r][c].style.borderRightColor = dark;
      }
    });
  });
  recenterCells();
}

async function fetchNewGame() {
  try {
    document.getElementById('clear').click();
  const res = await fetch('/api/parquet/random-tiling');
  if (!res.ok) throw new Error('new game failed');
    const data = await res.json();
    fillFromPattern(data.pattern);
    currentOptimalCSV = data.csv;
    currentOptimalScore = data.score;
  } catch (e) {
  alert('New Game error: ' + e.message);
  }
}
document.getElementById('new-game').addEventListener('click', fetchNewGame);
fetchNewGame();

let currentPattern = null;
const origFillFromPattern = fillFromPattern;
fillFromPattern = function(pattern) {
  currentPattern = pattern;
  origFillFromPattern(pattern);
};

const statusValEl = document.getElementById('statusval');
const scoreValEl = document.getElementById('scoreval');
let userScore = null;
let optimalShown = false;
function setStatus(status, score, showOptimal=false) {
  userScore = score;
  let scoreText = '-';
  if (showOptimal && currentOptimalScore) {
    scoreText = score + ' / ' + Math.round(currentOptimalScore);
  } else if (score !== undefined && score !== null) {
    scoreText = score;
  }
  scoreValEl.textContent = scoreText;
  if (showOptimal && currentOptimalScore && Math.round(score) === Math.round(currentOptimalScore)) {
    statusValEl.textContent = 'Optimal';
  } else {
    statusValEl.textContent = status;
  }
}
setStatus('-', '-');

document.getElementById('optimal-note').style.display = 'none';

document.getElementById('submit').addEventListener('click', async function () {
  document.getElementById('optimal-note').style.display = 'none';
  const vals = [];
  for (let r = 0; r < 9; r++) {
    const row = [];
    for (let c = 0; c < 9; c++) {
      row.push(cells[r][c].value.trim());
    }
    vals.push(row);
  }
  try {
    const res = await fetch('/api/parquet/submit-grid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grid: vals, pattern: currentPattern })
    });
    const data = await res.json();
    if (data.ok) {
      let status = 'Valid';
      if (data.msg && data.msg.toLowerCase().includes('incomplete')) status = 'Incomplete';
      if (optimalShown && currentOptimalScore) {
        setStatus(status, data.sum, true);
      } else {
        setStatus(status, data.sum);
      }
    } else {
      setStatus('Invalid', '-');
    }
  } catch (e) {
    setStatus('Error', '-');
  }
});

document.getElementById('copy81').addEventListener('click', async function () {
  const btn = document.getElementById('copy81');
  const vals = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) vals.push(cells[r][c].value.trim());
  const str = vals.join(',');
  try {
    await navigator.clipboard.writeText(str);
    const oldText = btn.textContent;
    btn.textContent = 'Copied';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = oldText;
      btn.disabled = false;
    }, 500);
  } catch (e) {
    alert('Copy failed: ' + e.message);
  }
});

document.getElementById('paste81').addEventListener('click', async function () {
  try {
    const str = await navigator.clipboard.readText();
    // Programmatic validation: only 81 single digits (1-9) separated by commas
    if (str.length > 200) {
      alert('Clipboard is too long.');
      return;
    }
    const vals = str.split(',');
    if (vals.length !== 81 || !vals.every(v => v === '' || (v.length === 1 && v >= '1' && v <= '9'))) {
      alert('Clipboard must contain exactly 81 entries: each empty or a digit 1-9, separated by commas.');
      return;
    }
    let k = 0;
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++, k++) cells[r][c].value = vals[k].trim();
    recenterCells();
    const note = document.getElementById('optimal-note');
    note.style.display = 'none';
    note.hidden = true;
    document.getElementById('submit').click();
  } catch (e) {
    alert('Paste failed: ' + e.message);
  }
});
