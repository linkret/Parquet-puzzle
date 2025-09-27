const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const dbFile = 'db/dev.db';

// Delete the database file if it exists
if (fs.existsSync(dbFile)) {
  fs.unlinkSync(dbFile);
  console.log('Existing dev.db deleted.');
}

const db = new sqlite3.Database(dbFile);

db.serialize(() => {
  // Enable foreign key support in SQLite
  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS difficulties (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    )
  `);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE
  )`);

  db.run(`
    CREATE TABLE IF NOT EXISTS scoreboard (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      score REAL NOT NULL,
      game_id INTEGER NOT NULL,
      difficulty_id INTEGER NOT NULL,
      time REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (game_id) REFERENCES games(id),
      FOREIGN KEY (difficulty_id) REFERENCES difficulties(id)
    )
  `);

  // Insert some dummy data
  db.run(`INSERT INTO games (id, name) VALUES (1, 'Parquezzle')`);
  db.run(`INSERT INTO games (id, name) VALUES (2, 'Sudokuzzle')`);

  db.run(`INSERT INTO difficulties (id, name) VALUES (1, 'Easy')`);
  db.run(`INSERT INTO difficulties (id, name) VALUES (2, 'Medium')`);
  db.run(`INSERT INTO difficulties (id, name) VALUES (3, 'Hard')`);

  db.run(`INSERT INTO users (username) VALUES ('Guest')`);

  db.run(`INSERT INTO scoreboard (username, user_id, score, game_id, difficulty_id, time) VALUES ('Alic3', 1, 312.67, 1, 2, 121.87)`);
  db.run(`INSERT INTO scoreboard (username, user_id, score, game_id, difficulty_id, time) VALUES ('Bo8', 1, 255.14, 1, 2, 90.55)`);
  db.run(`INSERT INTO scoreboard (username, user_id, score, game_id, difficulty_id, time) VALUES ('Candic33', 1, 432.91, 1, 2, 257.32)`);
});

db.close();
console.log('SQLite DB setup complete!');