const express = require('express');
const router = express.Router();
const { getRandomTiling, validateGrid, submitScore } = require('../games/parquet-puzzle/parquet.cjs');

router.get('/random-tiling', (req, res) => {
  const result = getRandomTiling();
  if (!result) return res.status(500).json({ error: 'No patterns available' });
  res.json(result);
});

router.post('/submit-grid', express.json(), async (req, res) => {
  const { grid, pattern, username, user_id, game, score, time, difficulty } = req.body;
  const validation = validateGrid(grid, pattern);

  if (!validation || !validation.ok) {
    return res.status(400).json({ ok: false, msg: validation.msg, validation });
  }

  try {
    const result = await submitScore(username, user_id, game, score, time, difficulty);

    if (!result.ok) {
      return res.status(400).json({ ok: false, msg: result.msg, validation });
    }

    res.json({ ok: true, validation, scoreResult: result });
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message, validation });
  }
});

module.exports = router;