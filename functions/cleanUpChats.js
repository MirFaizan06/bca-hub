import { onSchedule } from 'firebase-functions/v2/scheduler';
import { db } from './firebaseAdmin.js';
import { logger } from 'firebase-functions';

export const cleanupOldChats = onSchedule('every 24 hours', async () => {
  const now = Date.now();
  const cutoff = now - 7 * 24 * 60 * 60 * 1000;

  const oldChatsQuery = db.collection('chats').where('timestamp', '<', cutoff);

  try {
    const snapshot = await oldChatsQuery.get();
    const deletions = [];

    snapshot.forEach(doc => deletions.push(doc.ref.delete()));
    await Promise.all(deletions);
    logger.info(`Deleted ${deletions.length} old chats.`);
  } catch (error) {
    logger.error('Error cleaning up old chats:', error);
  }
});
