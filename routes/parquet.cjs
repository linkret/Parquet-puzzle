const express = require('express');
const router = express.Router();
const { getRandomTiling, validateGrid } = require('../games/parquet-puzzle/parquet.cjs');

router.get('/random-tiling', (req, res) => {
  const result = getRandomTiling();
  if (!result) return res.status(500).json({ error: 'No patterns available' });
  res.json(result);
});

router.post('/submit-grid', express.json(), (req, res) => {
  const { grid, pattern } = req.body;
  const result = validateGrid(grid, pattern);
  res.json(result);
});

module.exports = router;
