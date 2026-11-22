-- 003-trainer: trainer_items, trainer_attempts.

CREATE TABLE trainer_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL,
  game_id TEXT NOT NULL, ply INTEGER NOT NULL,
  fen TEXT NOT NULL,                              -- position BEFORE the mistake
  played_san TEXT, best_uci TEXT NOT NULL, best_san TEXT NOT NULL,
  loss REAL NOT NULL, classification TEXT NOT NULL,
  solved INTEGER NOT NULL DEFAULT 0, attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, game_id, ply)
);
CREATE TABLE trainer_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, item_id INTEGER NOT NULL,
  answer_uci TEXT NOT NULL, correct INTEGER NOT NULL, loss REAL, created_at TEXT NOT NULL
);
