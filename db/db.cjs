const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/dev.db');

// Get difficulty ID by name
function getDifficultyId(name) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM difficulties WHERE name = ?', [name], (err, row) => {
      if (err) return reject(err);
      if (!row) return reject(new Error('Difficulty not found'));
      resolve(row.id);
    });
  });
}

// Get game ID by name
function getGameId(name) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM games WHERE name = ?', [name], (err, row) => {
      if (err) return reject(err);
      if (!row) return reject(new Error('Game not found'));
      resolve(row.id);
    });
  });
}

// Insert score into scoreboard 
function insertScore({ username, user_id, score, game_id, difficulty_id, time }) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO scoreboard (username, user_id, score, game_id, difficulty_id, time) VALUES (?, ?, ?, ?, ?, ?)',
      [username, user_id, score, game_id, difficulty_id, time],
      function (err) {
        console.log('Inserting row:', { username, user_id, score, game_id, difficulty_id, time });
        if (err) {
            console.error('Insert error:', err);
            return reject(err);
        }
        resolve(this.lastID);
      }
    );
  });
}

module.exports = {
    db,
    getDifficultyId,
    getGameId,
    insertScore
};