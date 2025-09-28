const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/dev.db');

db.all('SELECT * FROM scoreboard', (err, rows) => {
  if (err) {
    console.error('Error:', err.message);
  } else {
    console.log('Scoreboard rows:');
    console.table(rows);
  }
  db.close();
});