const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.argv.includes('--debug') ? '127.0.0.1' : '0.0.0.0';

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/games', express.static(path.join(__dirname, 'games')));

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve Parquet Puzzle game at /parquet-puzzle
app.get('/parquet-puzzle', (req, res) => {
  res.sendFile(path.join(__dirname, 'games', 'parquet-puzzle', 'index.html'));
});

// Use parquet router for API endpoints
app.use('/api/parquet', require('./routes/parquet'));

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
