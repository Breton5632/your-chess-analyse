// Scripted fake UCI engine used as a transport for createUciEngine (no process, no WASM).
// Behaviours: normal | silent (never answers `go`) | ignoreStop | noUciok | crashOnGo | malformed | slow.
import { Chess } from '../../vendor/chess.js';

const keyOf = (fen) => fen.split(' ').slice(0, 4).join(' ');

/** Default evaluation: first legal move at cp 0, second at -10 (side-to-move POV). */
export function defaultLines(fen) {
  let moves = [];
  try { moves = new Chess(fen).moves({ verbose: true }); } catch { /* ignore */ }
  return moves.slice(0, 2).map((m, i) => ({ cp: -10 * i, pv: [`${m.from}${m.to}${m.promotion ?? ''}`] }));
}

/**
 * @param {object} [cfg]
 * @param {(fen:string)=>Array<{cp?:number,mate?:number,pv:string[]}>} [cfg.evalFor] scripted lines for a position
 * @param {object} [cfg.behavior] initial behaviour flags (see below)
 * @param {number} [cfg.goDelayMs] time a normal search takes
 */
export function createFakeUci({ evalFor = defaultLines, goDelayMs = 0, name = 'Fake Stockfish 19' } = {}) {
  const state = {
    behavior: { mode: 'normal', hangFens: new Set(), crashFens: new Set(), delayFor: new Map() },
    commands: [],       // every line sent to any engine instance, in order
    spawns: 0,
    terminated: 0,
    activeSearches: 0,
    maxActiveSearches: 0,
    goLog: [],          // { fen, depth, multipv }
  };

  function spawnLine({ onLine, onExit }) {
    state.spawns++;
    const inst = { fen: null, multipv: 1, timer: null, searching: false, dead: false, depth: 0 };
    const emit = (line) => { if (!inst.dead) queueMicrotask(() => { if (!inst.dead) onLine(line); }); };

    function finishSearch(lines, depth, { silent = false } = {}) {
      inst.searching = false;
      state.activeSearches--;
      for (let d = Math.max(1, depth - 1); d <= depth; d++) {
        lines.slice(0, inst.multipv).forEach((l, i) => {
          const score = l.mate !== undefined ? `mate ${l.mate}` : `cp ${l.cp}`;
          emit(`info depth ${d} seldepth ${d + 2} multipv ${i + 1} score ${score} nodes 1000 nps 50000 time 5 pv ${l.pv.join(' ')}`);
        });
      }
      if (!silent) emit(lines.length ? `bestmove ${lines[0].pv[0]}` : 'bestmove (none)');
    }

    function go(depth) {
      const mode = state.behavior.mode;
      state.goLog.push({ fen: inst.fen, depth, multipv: inst.multipv });
      inst.searching = true;
      state.activeSearches++;
      state.maxActiveSearches = Math.max(state.maxActiveSearches, state.activeSearches);
      const key = keyOf(inst.fen);
      if (mode === 'silent' || state.behavior.hangFens.has(key)) return; // never answers
      if (mode === 'crashOnGo' || state.behavior.crashFens.has(key)) {
        inst.dead = true;
        state.activeSearches--;
        setImmediate(() => onExit(new Error('segfault (simulated)')));
        return;
      }
      const lines = evalFor(inst.fen) ?? [];
      const delay = state.behavior.delayFor.get(key) ?? goDelayMs;
      const run = () => {
        if (inst.dead || !inst.searching) return;
        if (mode === 'malformed') {
          emit('');
          emit('info');
          emit('info depth');
          emit('info depth x score cp y pv e2e4');
          emit('info depth 3 score cp abc');
          emit('totally not uci \u0000 ??');
          emit('info depth 2 multipv 1 score cp 15 pv e2e4 zz99 e7e5'); // pv cut at the first invalid token
          emit('info string some free text depth 99 score cp 9999');
        }
        finishSearch(lines, depth);
      };
      if (delay > 0) inst.timer = setTimeout(run, delay); else setImmediate(run);
    }

    const transport = {
      send(line) {
        if (inst.dead) return;
        state.commands.push(line);
        if (line === 'uci') {
          if (state.behavior.mode === 'noUciok') return;
          emit(`id name ${name}`);
          emit('id author the fake');
          emit('option name Threads type spin default 1 min 1 max 1024');
          emit('option name Hash type spin default 16 min 1 max 2048');
          emit('option name MultiPV type spin default 1 min 1 max 256');
          emit('option name UCI_AnalyseMode type check default false');
          emit('uciok');
        } else if (line === 'isready') {
          emit('readyok');
        } else if (line.startsWith('setoption name MultiPV value ')) {
          inst.multipv = Number(line.split(' ').pop());
        } else if (line.startsWith('position fen ')) {
          inst.fen = line.slice('position fen '.length);
        } else if (line.startsWith('go depth ')) {
          go(Number(line.split(' ').pop()));
        } else if (line === 'stop') {
          if (!inst.searching || state.behavior.mode === 'ignoreStop') return;
          clearTimeout(inst.timer);
          const lines = evalFor(inst.fen) ?? [];
          finishSearch(lines, 1);
        }
      },
      terminate() {
        state.terminated++;
        inst.dead = true;
        clearTimeout(inst.timer);
        if (inst.searching) { inst.searching = false; state.activeSearches--; }
        setImmediate(() => onExit(undefined)); // real workers emit 'exit' after terminate: must be ignored
      },
    };
    return transport;
  }

  return { spawnLine, state, setMode: (mode) => { state.behavior.mode = mode; } };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
