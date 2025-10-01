require('module-alias/register'); // TODO: can preregister with `node -r` globally
const { Timestamp } = require('@google-cloud/firestore');
const { firestore } = require('@db/db.cjs');

async function main() {
  const snap = await firestore
    .collection('scoreboard')
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get();

  if (snap.empty) {
    console.log('Scoreboard rows: (none)');
    return;
  }

  const rows = snap.docs.map(doc => {
    const d = doc.data();
    return {
      id: doc.id,
      username: d.username ?? null,
      user_id: d.user_id ?? null,
      score: d.score ?? null,
      game_id: d.game_id ?? null,
      difficulty_id: d.difficulty_id ?? null,
      time: d.time ?? null,
      createdAt:
        d.createdAt instanceof Timestamp
          ? d.createdAt.toDate().toISOString()
          : d.createdAt ?? null
    };
  });

  console.log('Scoreboard rows:');
  console.table(rows);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});