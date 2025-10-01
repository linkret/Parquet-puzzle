require('dotenv').config();
const { firestore } = require('./db.cjs');

async function clearCollection(name) {
  const snap = await firestore.collection(name).get();
  if (snap.empty) return;
  const batch = firestore.batch();
  snap.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}

async function seedScore(score) {
  await firestore.collection('scoreboard').add({
    ...score,
    createdAt: new Date()
  });
}

(async () => {
  // Optional: remove legacy lookup collections
  await clearCollection('difficulties');
  await clearCollection('games');

  // Reset scoreboard
  await clearCollection('scoreboard');

  await seedScore({ username: 'Alic3',    user_id: 1, score: 312.67, game: 'Parquezzle', difficulty: 'Normal', time: 121.87 });
  await seedScore({ username: 'Bo8',      user_id: 1, score: 255.14, game: 'Parquezzle', difficulty: 'Normal', time: 90.55 });
  await seedScore({ username: 'Candic33', user_id: 1, score: 432.91, game: 'Parquezzle', difficulty: 'Normal', time: 257.32 });

  console.log('Seeded scoreboard with dummy values.');
})().catch(err => {
  console.error(err);
  process.exit(1);
});