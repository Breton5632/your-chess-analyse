// The demo feature was removed. Older installs may still hold demo rows (demo = 1): `purge` deletes them
// (and everything attached) the first time the user's status is read. Real games are never touched.

export function createDemoService({ sql }) {
  const demoIds = (uid) => sql.prepare('SELECT id FROM games WHERE user_id = ? AND demo = 1').all(uid).map((r) => r.id);

  function purge(userId) {
    const uid = String(userId);
    const ids = demoIds(uid);
    if (!ids.length) return { cleared: 0 };
    const marks = ids.map(() => '?').join(',');
    sql.transaction(() => {
      sql.prepare(`DELETE FROM trainer_attempts WHERE user_id = ? AND item_id IN (SELECT id FROM trainer_items WHERE user_id = ? AND game_id IN (${marks}))`).run(uid, uid, ...ids);
      for (const t of ['trainer_items', 'move_analyses', 'analyses', 'analysis_queue', 'reports', 'chat_messages']) {
        sql.prepare(`DELETE FROM ${t} WHERE user_id = ? AND game_id IN (${marks})`).run(uid, ...ids);
      }
      sql.prepare(`DELETE FROM games WHERE user_id = ? AND demo = 1 AND id IN (${marks})`).run(uid, ...ids);
    });
    return { cleared: ids.length };
  }

  return { purge };
}
