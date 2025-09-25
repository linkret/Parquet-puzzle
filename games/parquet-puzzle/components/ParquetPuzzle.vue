<template>
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
          <span id="statusval" class="statusval">{{ status }}</span>
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
            <input
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
</template>

<script>
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
    // ...existing code...
  },
  // ...existing code...
};
</script>

<style scoped>
/* ...existing styles... */
</style>
