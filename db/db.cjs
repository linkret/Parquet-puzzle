// Load envs: example -> .env.local (local overrides)
require('dotenv').config({ path: '.env.example' }); // defaults (no secrets)
require('dotenv').config({ path: '.env.local', override: true }); // local overrides
console.log('FIRESTORE_EMULATOR_HOST:', JSON.stringify(process.env.FIRESTORE_EMULATOR_HOST));

const { Firestore, Timestamp } = require('@google-cloud/firestore');

const projectId =
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  'parquet-puzzle';

// Emulator vs Cloud (multi-DB only in Cloud)
const emulatorHost = (process.env.FIRESTORE_EMULATOR_HOST || '').trim();
const isEmulator = emulatorHost.length > 0;
const databaseId = isEmulator ? '(default)' : (process.env.FIRESTORE_DATABASE_ID || 'daily-puzzle');

const settings = isEmulator
  ? { projectId, databaseId, host: emulatorHost, ssl: false }
  : { projectId, databaseId };

const firestore = new Firestore(settings);
console.log(`[db] Firestore target: ${isEmulator ? `EMULATOR ${emulatorHost}` : `CLOUD`} | project=${projectId} | databaseId=${databaseId}`);

const scoreboardCol = firestore.collection('scoreboard');

// Validate only difficulty (keep games flexible for future additions)
const ALLOWED_DIFFICULTIES = new Set(['Easy', 'Normal', 'Hard']);
function validateDifficulty(difficulty) {
  if (!ALLOWED_DIFFICULTIES.has(difficulty)) {
    throw new Error(`Difficulty not allowed: ${difficulty}`);
  }
  return difficulty;
}

// Insert score using display strings
async function insertScore({ username, user_id, score, game, difficulty, time }) {
  const validDifficulty = validateDifficulty(difficulty);
  const ref = await scoreboardCol.add({
    username,
    user_id,
    score,
    game, // display string (e.g., "Parquezzle", "Sudoku")
    difficulty: validDifficulty, // "Easy" | "Normal" | "Hard"
    time,
    createdAt: Timestamp.now()
  });
  return ref.id;
}

module.exports = {
  db: firestore,
  firestore,
  insertScore
};