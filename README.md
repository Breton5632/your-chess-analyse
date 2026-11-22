# Chess Insight (Timon plugin)

Download your public chess.com games, analyse them **locally** with Stockfish, review them move by move
(chess.com-style game review) and get written coaching from a Timon agent. Nothing leaves your machine except
read-only requests to the public chess.com API.

Page `/chess`, two screens:

- **My profile**: your chess.com username, analysis speed, language of the coach, clean-up and reset buttons.
  The big **Analyse my latest game** button downloads your latest game and opens your games list.
- **My games**: your last games (at most 15 are kept). **Analyse** opens the review of a game: board with
  piece animation, evaluation bar and curve, classified moves (Brilliant to Blunder), accuracy, estimated Elo,
  openings played by White and Black, full move list (click a move to jump to it), engine variations you can try
  on the board, and a **Coach** tab with a written report.

Every evaluation, best move and classification comes from Stockfish. The coach only explains what the
engine established; the moves it quotes are checked against the engine data.

## Requirements

- Timon with plugin API 15, Node.js 22.5 or newer. Windows and macOS (and Linux) are supported: the engine is
  WebAssembly, no native binary is needed.
- This plugin is **not signed**, so Timon must be in **developer mode**.
- A model backend connected in Timon for the coach (your own subscription, no API key). The review and the
  analysis work without it.

## Install

1. Turn on developer mode: Settings › Plugins › **Developer mode** (or `"developer": { "unsignedPlugins": true }`
   in `timon.config.json`).
2. Download `timon-plugin-chess-insight-<version>.tgz` from the **Releases** page of this repository, then:
   ```
   timon plugin add ./timon-plugin-chess-insight-<version>.tgz
   timon plugin list
   ```
   `chess-coach` must be `active`. Accept the install sheet (permissions below).
3. **Operator step** (the plugin never edits your configuration): allow its only network host by adding this
   to `timon.config.json`, then restart Timon if it asks:
   ```json
   {
     "pluginPolicy": {
       "http": { "byPlugin": { "chess-coach": ["api.chess.com"] } }
     }
   }
   ```
   The setup screen shows this exact snippet when the network is blocked.
4. Open **Chess Insight**, enter your chess.com username, verify it, click **Analyse my latest game**.

To build the archive yourself: `npm run build` then `npm pack`.

## Permissions (and why)

| Permission | Why |
|---|---|
| `storage:sql` | games, analyses and reports (the plugin's own SQLite, per user) |
| `settings` | instance defaults of the settings below |
| `http:outbound` | `api.chess.com` only (public archives, read-only) |
| `agents:read`, `agents:manage` | create and refresh the plugin's own coach agents (sensitive) |
| `messages:send`, `messages:read` | send a compact request to the coach and read its reply (sensitive) |
| `backends:read` | pick the model from your connected backends (never hard-coded) |
| `realtime:publish` | progress signals to the page (sync, analysis, coach) |
| `notify` | notification when a long job ends |

No `host:exec`: nothing outside the plugin process is started. No secret, no API key, no telemetry.

## Settings

`username` (empty by default), `depthFast` 10-20 (14), `depthDeep` 16-28 (20), `threads` (0 = automatic),
`hashMb` 16-2048 (64), `contact` (optional, added to the User-Agent; empty by default), `autoAnalyse`
(analyse downloaded games once after a sync, no timer), `language` (`auto`, `en`, `fr`), `showBestArrow`.
They are edited on the **My profile** screen.

## Network and privacy

- Only `https://api.chess.com` (public player archives). One request at a time, at least 400 ms apart.
- Generic User-Agent `TimonChessCoach/<version>`; your optional contact is added only if you type one.
- Synchronisation is manual (a button), there is no timer. At most **15** real games are kept; older ones and
  their analyses are deleted. **Reset everything** (My profile) erases all data the plugin stored for you.
- You can also import one game from a PGN.

## What stops when you disable the plugin

The analysis queue and the engine worker (terminated). Enabling it again resumes the queue.

## Known limits

- The accuracy shown is the plugin's own measure computed from Stockfish, not chess.com's CAPS score.
- The Elo is an estimate from the average loss of the game (about +/-300).
- Brilliant / Great classification is heuristic and may differ from chess.com.
- The coach explains, it does not replace a human trainer; its strategic remarks can be wrong.
- Private games and non-public profiles are unreachable. Only finished games are analysed.
- Not tested on a real Mac yet.

## Development

`npm test` (node --test, fake context, no network). `npm run build` rebuilds `lib/client.js` (esbuild is a dev
tool installed in `dev/`: `cd dev && npm install`). `CHESS_REAL_ENGINE=1 node --test tests/integration/real-engine.test.js`
runs the real engine. Privacy guard: `CHESS_DENY_WORDS="word1,word2" npm test` fails if a word appears in the
shipped files.

## Licence and attributions

GPL-3.0-or-later (see `LICENSE`, the text of the GNU GPL v3 shipped with Stockfish).

- [Stockfish](https://stockfishchess.org) 19, GPL-3.0, in `vendor/stockfish/` (source: the official Stockfish
  repository and the stockfish.js build it ships with).
- [chess.js](https://github.com/jhlywa/chess.js), BSD-2-Clause.
- Chess pieces by Colin M.L. Burnett (cburnett set), GPL / BSD / GFDL.
- Openings data from [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings), CC0.

Chess Insight is an independent project, not affiliated with chess.com, Lichess or Stockfish.
