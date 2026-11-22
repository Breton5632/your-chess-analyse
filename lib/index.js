// Host half of Chess Insight: wires settings → store → sync → analysis (Stockfish WASM) → coach → demo → routes.
// Everything local; the only outbound host is api.chess.com. Timers and the engine live in ctx.effect.
import { readFileSync } from 'node:fs';
import * as settingsModule from './settings.js';
import * as store from './store.js';
import * as engine from './engine/index.js';
import { createPublisher } from './publish.js';
import { createSyncService } from './sync/index.js';
import { createAnalysisService } from './analysis/index.js';
import { createCoachService } from './coach/index.js';
import { createDemoService } from './demo/index.js';
import { registerRoutes } from './routes.js';

export const name = 'chess-coach';
export const inject = ['settings'];

function readVersion() {
  try {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    return String(pkg.version || '1.0.0');
  } catch { return '1.0.0'; }
}

/** @param {import('@timon-ai/sdk').PluginContext} ctx */
export function apply(ctx) {
  const version = readVersion();
  const sql = ctx.sql;
  const log = {
    info: (...a) => ctx.log?.info?.(...a),
    warn: (...a) => ctx.log?.warn?.(...a),
    error: (...a) => ctx.log?.error?.(...a),
  };
  const publish = createPublisher(ctx);
  const getSettings = (userId) => settingsModule.getSettings(ctx, userId);
  const now = typeof ctx.__now === 'function' ? ctx.__now : Date.now;

  const sync = createSyncService({
    sql, fetch: ctx.fetch, getSettings, publish, userAgent: settingsModule.userAgent, version, now, sleep: ctx.__sleep, log,
  });
  const analysis = createAnalysisService({
    sql, engineFactory: (s) => (ctx.__engineFactory || engine.createEngine)(s), publish, getSettings, now, log: (...a) => log.warn(...a),
  });
  const coach = createCoachService({ ctx, sql, analysis, getSettings, now, publish, log });
  const demo = createDemoService({ sql, now });

  // Lifecycle: disabling the plugin stops the sync, the queue loop and the engine worker.
  ctx.effect(() => {
    analysis.start();
    return async () => {
      sync.stop();
      await analysis.stop();
      publish.close();
    };
  });

  registerRoutes({
    ctx, router: ctx.router(), services: { settings: settingsModule, analysis, sync, coach, store, demo, version, engine },
  });
}
