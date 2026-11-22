-- Synthetic schema-v1 fixture: the 001-init schema as first released, plus fictional rows.
-- No real game, no real player.

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

INSERT INTO games (user_id, id, url, pgn, time_class, time_control, rated, rules, end_time, white_name, white_rating, white_result, black_name, black_rating, black_result, color, my_rating, opp_name, opp_rating, result, termination, eco_code, opening, plies, analyzed, demo, created_at)
VALUES
 ('u1', '1001', 'https://example.invalid/game/1001', '[Event "Fixture"]\n\n1. e4 e5 1-0', 'rapid', '600', 1, 'chess', 1700000000, 'FixtureA', 1500, 'win', 'FixtureB', 1490, 'resigned', 'white', 1500, 'FixtureB', 1490, 'win', 'resigned', 'C20', 'Kings Pawn Game', 2, 1, 0, '2026-01-01T00:00:00.000Z'),
 ('u1', '1002', 'https://example.invalid/game/1002', '[Event "Fixture"]\n\n1. d4 d5 1/2-1/2', 'blitz', '180', 1, 'chess', 1700000500, 'FixtureB', 1495, 'agreed', 'FixtureA', 1505, 'agreed', 'black', 1505, 'FixtureB', 1495, 'draw', 'agreed', 'D00', 'Queens Pawn Game', 2, 0, 0, '2026-01-01T00:00:00.000Z'),
 ('u2', '1001', 'https://example.invalid/game/1001', '[Event "Fixture"]\n\n1. c4 c5 0-1', 'bullet', '60', 0, 'chess', 1700001000, 'FixtureC', 1200, 'resigned', 'FixtureD', 1210, 'win', 'black', 1210, 'FixtureC', 1200, 'win', 'resigned', 'A30', 'English Opening', 2, 0, 0, '2026-01-01T00:00:00.000Z');

INSERT INTO archives (user_id, url, month, etag, last_modified, fetched_at, games, complete)
VALUES ('u1', 'https://example.invalid/archive/2026/01', '2026-01', 'W/"abc"', 'Thu, 01 Jan 2026 00:00:00 GMT', '2026-02-01T00:00:00.000Z', 2, 1);

INSERT INTO evals (user_id, fen_key, depth, multipv_json, engine, created_at)
VALUES ('u1', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -', 14, '[{"multipv":1,"depth":14,"scoreCp":20,"pv":["e2e4"]}]', 'FixtureEngine', '2026-01-01T00:00:00.000Z');

INSERT INTO analyses (user_id, game_id, state, engine_name, depth_fast, depth_deep, acc_white, acc_black, counts_json, critical_json, initial_json, started_at, finished_at)
VALUES ('u1', '1001', 'ready', 'FixtureEngine', 14, 20, 90.5, 80.25, '{}', '[]', '{}', '2026-01-01T00:00:00.000Z', '2026-01-01T00:01:00.000Z');

INSERT INTO move_analyses (user_id, game_id, ply, san, uci, color, fen_before, fen_after, eval_cp, best_uci, best_san, loss, classification, accuracy, phase)
VALUES ('u1', '1001', 1, 'e4', 'e2e4', 'white', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', 25, 'e2e4', 'e4', 0, 'best', 100, 'opening');

INSERT INTO analysis_queue (user_id, game_id, priority, state, done, total, enqueued_at, updated_at)
VALUES ('u1', '1002', 0, 'queued', 0, 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');

INSERT INTO kv (user_id, key, value) VALUES ('u1', 'setting:username', '"fixtureuser"'), ('u2', 'setting:username', '"otherfixture"');
