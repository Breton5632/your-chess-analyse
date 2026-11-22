-- 002-coach: reports, chat_messages, agent_state.

CREATE TABLE reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL,
  game_id TEXT,                                   -- NULL for kind 'trend'
  kind TEXT NOT NULL,                             -- 'game'|'trend'
  state TEXT NOT NULL,                            -- 'queued'|'sent'|'ready'|'timeout'|'error'
  msg_id TEXT, markdown TEXT, flagged_json TEXT, error TEXT, language TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, sent_at TEXT
);
CREATE INDEX reports_user_game ON reports (user_id, game_id);

CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL,
  request_id TEXT NOT NULL,                       -- public id returned by coach/ask (random, url-safe)
  game_id TEXT, role TEXT NOT NULL,               -- 'user'|'assistant'
  content TEXT, flagged_json TEXT, msg_id TEXT,
  state TEXT NOT NULL,                            -- 'pending'|'done'|'timeout'|'error'
  created_at TEXT NOT NULL
);
CREATE INDEX chat_user_request ON chat_messages (user_id, request_id);

CREATE TABLE agent_state (
  user_id TEXT NOT NULL, agent TEXT NOT NULL, prompt_hash TEXT, updated_at TEXT,
  PRIMARY KEY (user_id, agent)
);
