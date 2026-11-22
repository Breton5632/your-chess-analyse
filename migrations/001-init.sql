-- 001-init: games, archives, evals, analyses, move_analyses, analysis_queue, kv (docs/CONTRACT.md section 3).

CREATE TABLE games (
  user_id TEXT NOT NULL, id TEXT NOT NULL,          -- id = numeric id at the end of the chess.com URL
  url TEXT NOT NULL, pgn TEXT NOT NULL,
  time_class TEXT, time_control TEXT, rated INTEGER NOT NULL DEFAULT 0, rules TEXT NOT NULL DEFAULT 'chess',
  end_time INTEGER NOT NULL,
  white_name TEXT, white_rating INTEGER, white_result TEXT,
  black_name TEXT, black_rating INTEGER, black_result TEXT,
  color TEXT,                     -- 'white'|'black' (case-insensitive match with the configured username)
  my_rating INTEGER, opp_name TEXT, opp_rating INTEGER,
  result TEXT,                    -- 'win'|'loss'|'draw' from the user's side
  termination TEXT,               -- chess.com result code of the side that did not win (checkmated, resigned, timeout, agreed, repetition, stalemate, insufficient, timevsinsufficient, 50move, abandoned…)
  eco_code TEXT, opening TEXT, eco_url TEXT,
  acc_white REAL, acc_black REAL, -- chess.com "accuracies" if the archive has them (labelled "chess.com")
  plies INTEGER,
  analyzed INTEGER NOT NULL DEFAULT 0,          -- 1 when analyses.state in ('ready','partial')
  demo INTEGER NOT NULL DEFAULT 0,
  archive_url TEXT, created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX games_user_end ON games (user_id, end_time);
CREATE INDEX games_user_analyzed ON games (user_id, analyzed);

CREATE TABLE archives (
  user_id TEXT NOT NULL, url TEXT NOT NULL, month TEXT NOT NULL,   -- 'YYYY-MM'
  etag TEXT, last_modified TEXT, fetched_at TEXT, games INTEGER NOT NULL DEFAULT 0,
  complete INTEGER NOT NULL DEFAULT 0,           -- 1 = past month fully downloaded: never fetched again
  PRIMARY KEY (user_id, url)
);

CREATE TABLE evals (
  user_id TEXT NOT NULL, fen_key TEXT NOT NULL, depth INTEGER NOT NULL,
  multipv_json TEXT NOT NULL,                     -- [{ multipv, depth, scoreCp?, mate?, pv:[uci] }] side-to-move POV, raw
  engine TEXT, created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, fen_key)                  -- keeps the deepest evaluation only
);
CREATE INDEX evals_fen_depth ON evals (fen_key, depth);

CREATE TABLE analyses (
  user_id TEXT NOT NULL, game_id TEXT NOT NULL,
  state TEXT NOT NULL,                            -- 'ready'|'partial'|'invalid'|'failed'
  engine_name TEXT, depth_fast INTEGER, depth_deep INTEGER,
  acc_white REAL, acc_black REAL,
  counts_json TEXT, critical_json TEXT, initial_json TEXT,   -- initial_json = { eval, lines } of the start position
  error TEXT, started_at TEXT, finished_at TEXT,
  PRIMARY KEY (user_id, game_id)
);

CREATE TABLE move_analyses (
  user_id TEXT NOT NULL, game_id TEXT NOT NULL, ply INTEGER NOT NULL,
  san TEXT NOT NULL, uci TEXT NOT NULL, color TEXT NOT NULL,
  fen_before TEXT NOT NULL, fen_after TEXT NOT NULL,
  eval_cp INTEGER, eval_mate INTEGER,             -- evalAfter, WHITE POV
  best_uci TEXT, best_san TEXT, second_san TEXT,
  loss REAL, classification TEXT, accuracy REAL, phase TEXT,  -- phase: 'opening'|'middlegame'|'endgame'
  line_json TEXT,                                 -- best line from fen_before, SAN (≤ 6), validated
  top_json TEXT,                                  -- top-2 lines of fen_after: [{ eval:{cp|mate}, san:[≤6] }] WHITE POV
  failed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, game_id, ply)
);

CREATE TABLE analysis_queue (
  user_id TEXT NOT NULL, game_id TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL,                            -- 'queued'|'running'|'done'|'cancelled'|'failed'
  phase TEXT, done INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL DEFAULT 0,
  enqueued_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, game_id)
);

CREATE TABLE kv (
  user_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT,
  PRIMARY KEY (user_id, key)
);
