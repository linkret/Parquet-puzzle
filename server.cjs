const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.argv.includes('--debug') ? '127.0.0.1' : '0.0.0.0';

// Serve static assets from public/
app.use(express.static(path.join(__dirname, 'public')));

// Serve Vite build output from dist/
const viteDistPath = path.join(__dirname, 'dist');
app.use(express.static(viteDistPath));

// Serve main index.html (landing page)
app.get('/', (req, res) => {
  res.sendFile(path.join(viteDistPath, 'index.html'));
});

// Serve Parquet Puzzle entry (multi-page Vite build)
app.get('/parquet-puzzle', (req, res) => {
  res.sendFile(path.join(viteDistPath, 'games/parquet-puzzle/parquet-puzzle.html'));
});

// Use parquet router for API endpoints
app.use('/api/parquet', require('./routes/parquet.cjs'));

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
