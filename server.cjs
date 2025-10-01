
require('module-alias/register');
const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');

let randomFunc = Math.random;
if (process.env.DEBUG || process.argv.includes('--debug')) {
  // Only require seedrandom in dev/debug mode
  const seedrandom = require('seedrandom');
  randomFunc = seedrandom('4321');
}
global.random = randomFunc;

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.argv.includes('--debug') ? '127.0.0.1' : '0.0.0.0';


// Body size limit to avoid abuse
app.use(express.json({ limit: '10kb' }));

// Simple CORS allowlist (browser-only protection)
const ALLOWED_ORIGINS = [
  process.env.WEB_ORIGIN || 'https://www.daily-puzzle.net',
  'https://daily-puzzle.net'
];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Rate-limit API (tune numbers as needed)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 60,             // 60 requests/min per IP for all API routes
});

app.use('/api', apiLimiter);

//// Redirect www to non-www for SEO
// app.use((req, res, next) => {
//   if (req.headers.host && req.headers.host.startsWith('www.')) {
//     const newHost = req.headers.host.slice(4); // Remove 'www.'
//     return res.redirect(301, `${req.protocol}://${newHost}${req.originalUrl}`);
//   }
//   next();
// });

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

// Serve static informational pages from /static/
const staticPath = path.join(__dirname, 'static');
app.get('/about', (req, res) => {
  res.sendFile(path.join(staticPath, 'about.html'));
});
app.get('/contact', (req, res) => {
  res.sendFile(path.join(staticPath, 'contact.html'));
});
app.get('/faq', (req, res) => {
  res.sendFile(path.join(staticPath, 'faq.html'));
});
app.get('/game-picker', (req, res) => {
  res.sendFile(path.join(staticPath, 'game-picker.html'));
});

// Use parquet router for API endpoints
app.use('/api/parquet', require('./routes/parquet.cjs'));

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
