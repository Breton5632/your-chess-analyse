// lib/client/index.js
import React12 from "react";
import { NavLink } from "@timon/ui";

// lib/client/app.js
import React11 from "react";
import { openInIsland } from "@timon/ui";

// lib/client/ui.js
import React from "react";

// lib/client/classes.js
var ORDER = ["brilliant", "great", "best", "excellent", "good", "book", "inaccuracy", "mistake", "miss", "blunder"];
var TOKENS = {
  brilliant: { color: "#26c2a3", glyph: "!!" },
  great: { color: "#749bbf", glyph: "!" },
  best: { color: "#81b64c", glyph: "star" },
  excellent: { color: "#96bc4b", glyph: "check" },
  good: { color: "#97af8b", glyph: "check" },
  book: { color: "#a88865", glyph: "knight" },
  inaccuracy: { color: "#f7c631", glyph: "?!" },
  mistake: { color: "#ffa459", glyph: "?" },
  miss: { color: "#ff7769", glyph: "cross" },
  blunder: { color: "#fa412d", glyph: "??" }
};
var ERRORS = /* @__PURE__ */ new Set(["inaccuracy", "mistake", "miss", "blunder"]);
var lin = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * lin(n >> 16 & 255) + 0.7152 * lin(n >> 8 & 255) + 0.0722 * lin(n & 255);
}
function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function inkFor(hex) {
  return contrast(hex, "#ffffff") >= contrast(hex, "#1b1a18") ? "#ffffff" : "#1b1a18";
}

// lib/client/i18n.js
import { createTranslator, getLocale, formatDate, formatDateTime, formatRelativeTime } from "@timon/ui";

// lib/client/locales/en.json
var en_default = {
  import: {
    open: "Import a PGN",
    title: "Import a game (PGN)",
    placeholder: "Paste the PGN of a game played anywhere\u2026",
    submit: "Import and analyse"
  },
  nav: {
    home: "My games",
    title: "Chess Insight",
    games: "Games",
    review: "Review",
    setup: "My profile",
    analyse: "Analysis",
    profile: "My profile"
  },
  common: {
    white: "White",
    black: "Black",
    loading: "Loading\u2026",
    error: "Something went wrong",
    retry: "Retry",
    cancel: "Cancel",
    dismiss: "Dismiss"
  },
  app: {
    analysing: "Analysing: {running} running, {queued} queued",
    coach: "Coach",
    coachHint: "Open coach chat on the right",
    coachHelpTitle: "Coach chat could not be opened",
    coachHelp: "Open the agent list and start a conversation with \u201C{agent}\u201D. The workspace may be too narrow or full: close a tab, then press Coach again."
  },
  class: {
    brilliant: "Brilliant",
    great: "Great",
    best: "Best",
    excellent: "Excellent",
    good: "Good",
    book: "Book",
    inaccuracy: "Inaccuracy",
    mistake: "Mistake",
    miss: "Miss",
    blunder: "Blunder"
  },
  result: {
    win: "Win",
    loss: "Loss",
    draw: "Draw"
  },
  term: {
    checkmated: "checkmate",
    resigned: "resignation",
    timeout: "on time",
    agreed: "agreed draw",
    repetition: "repetition",
    stalemate: "stalemate",
    insufficient: "insufficient material",
    timevsinsufficient: "time vs insufficient material",
    "50move": "50-move rule",
    abandoned: "abandoned",
    win: "win",
    lose: "loss"
  },
  tc: {
    bullet: "Bullet",
    blitz: "Blitz",
    rapid: "Rapid",
    daily: "Daily"
  },
  phase: {
    opening: "Opening",
    middlegame: "Middlegame",
    endgame: "Endgame"
  },
  engine: {
    idle: "Engine idle",
    starting: "Engine starting",
    ready: "Engine ready",
    busy: "Engine analysing",
    error: "Engine error",
    missing: "Engine missing"
  },
  accuracy: {
    label: "Coach accuracy",
    note: "Coach accuracy is this plugin\u2019s own measure computed from Stockfish. It is not the chess.com CAPS score and can differ from it.",
    chesscom: "chess.com: {value}"
  },
  board: {
    label: "Chessboard",
    evalBar: "Evaluation bar: {value}"
  },
  sync: {
    button: "Sync",
    hint: "Download your latest public games from chess.com",
    running: "Syncing\u2026",
    never: "Never synced",
    last: "Last sync {when}",
    rateLimited: "chess.com asked us to slow down; try again in a minute",
    notFound: "Account not found or profile not public",
    error: "Sync failed",
    games: "{count, plural, one {# game} other {# games}}",
    mode: "Download mode",
    modeRecent: "Latest games",
    modeRange: "By dates",
    count: "Number of games",
    from: "From",
    to: "To",
    rangeHint: "Games played that day (15 at most).",
    start: "Download",
    startRange: "Download the period",
    optLast: "The latest game",
    optTen: "The 10 latest",
    optDate: "Pick a date",
    day: "Day"
  },
  games: {
    title: "My games",
    filters: "Filters",
    timeClass: "Time class",
    allTimeClasses: "All time classes",
    color: "Colour",
    allColors: "Both colours",
    result: "Result",
    allResults: "All results",
    opening: "Opening",
    allOpenings: "All openings",
    period: "Period",
    anyTime: "Any time",
    last7: "Last 7 days",
    last30: "Last 30 days",
    last90: "Last 90 days",
    last365: "Last year",
    analysedOnly: "Analysed only",
    search: "Search opponent",
    sort: "Sort",
    sortNewest: "Newest first",
    sortOldest: "Oldest first",
    sortAccDesc: "Accuracy, high to low",
    sortAccAsc: "Accuracy, low to high",
    sortRating: "Opponent rating",
    clear: "Clear filters",
    rated: "rated",
    col: {
      date: "Date",
      timeClass: "Time",
      color: "Colour",
      opponent: "Opponent",
      result: "Result",
      opening: "Opening",
      accuracy: "Accuracy",
      actions: "Actions"
    },
    analyse: "Analyse",
    review: "Review",
    open: "Open",
    stateQueued: "Queued",
    stateRunning: "Analysing\u2026",
    selected: "{count, plural, one {# game selected} other {# games selected}}",
    selectPage: "Select all games on this page",
    selectOne: "Select the game against {name}",
    analyseSelection: "Analyse selection",
    trendReport: "Trend report",
    deselect: "Deselect",
    queued: "{count, plural, one {# game queued for analysis} other {# games queued for analysis}}",
    trendQueued: "Trend report requested. It will appear under Dashboard \u203A Recurring moments.",
    range: "{from}\u2013{to} of {total}",
    pageSize: "Games per page",
    prev: "Previous",
    next: "Next",
    page: "Page {page} / {pages}",
    emptyTitle: "No games yet",
    empty: "No game has been downloaded yet. Sync downloads your most recent public games from chess.com.",
    emptyNotConfigured: "Set your chess.com username first to see games here.",
    noMatchTitle: "No game matches these filters",
    noMatch: "Try removing a filter or widening the period."
  },
  review: {
    title: "Game Review",
    back: "Back to games",
    loading: "Loading the game\u2026",
    graph: "Evaluation",
    graphLabel: "Evaluation graph. Click to jump to a move.",
    classification: "Move classification",
    classTable: "Move classification counts per side",
    moves: "Moves",
    openings: "Openings",
    noOpening: "Out of book",
    eloEstimate: "\u2248 {value} Elo",
    eloNone: "Elo: too few moves",
    eloNote: "Rough estimate (\xB1 300) of playing strength, derived from the points lost per move. Not an official rating.",
    keyMoments: "Key moments",
    tabs: "Review tabs",
    tabAnalysis: "Analysis",
    tabCoach: "Coach",
    controls: "Board controls",
    first: "First move",
    prev: "Previous move",
    next: "Next move",
    last: "Last move",
    play: "Auto-play",
    pause: "Pause",
    flip: "Flip the board",
    arrow: "Best move",
    arrowToggle: "Show or hide the engine\u2019s best-move arrow",
    keys: "\u2190 \u2192 move \xB7 Home / End \xB7 F flip \xB7 Space auto-play \xB7 Esc leave variation",
    analysing: "Analysis in progress",
    progress: "Position {done} of {total}, pass {phase}",
    queued: "Waiting in the queue\u2026",
    noAnalysisTitle: "This game has not been analysed",
    noAnalysis: "Run the engine on this game to get classified moves, accuracy and the evaluation graph.",
    noAnalysisTab: "Analyse the game to see engine lines and move quality.",
    engineBlocked: "The engine is not available, so the game cannot be analysed right now. Check the engine on the Setup screen.",
    engineError: "Engine problem",
    state: {
      invalid: "This game could not be analysed",
      failed: "The analysis failed"
    },
    retryAnalysis: "Try again",
    partialTitle: "Partial analysis",
    partial: "Some positions could not be evaluated, so a few moves have no classification.",
    moveFailed: "This position could not be evaluated.",
    noMovesTitle: "This game has no moves",
    noMoves: "There is nothing to replay: the game ended before the first move.",
    startPosition: "Starting position",
    bestWas: "Best move:",
    loss: "\xB7 expected points lost: {value}%",
    engineLines: "Engine lines (click a move to try it)",
    noLines: "No engine line for this position.",
    tryHint: "Play this line on the board",
    tryBanner: "Exploring a variation. It is not saved; Esc or the button returns to the game.",
    exitTry: "Back to the game",
    winner: "{name} wins",
    drawText: "No winner",
    moveList: "Move list"
  },
  coach: {
    needAnalysisTitle: "Analyse the game first",
    needAnalysis: "The coach only explains what the engine found, so the game needs an analysis before a report can be written.",
    noneTitle: "No coach report yet",
    none: "The coach reads the engine\u2019s critical moments and explains them in plain language. It does not evaluate positions itself.",
    generate: "Write the report",
    regenerate: "Regenerate",
    waitingTitle: "The coach is writing",
    waiting: "This usually takes under two minutes. You can keep browsing; the report appears here.",
    timeoutTitle: "The coach took too long",
    timeout: "No answer arrived in time. A late answer is still accepted for an hour; you can also try again.",
    errorTitle: "The report failed",
    unverified: "Unverified move: the engine data does not contain it",
    flaggedTitle: "Unverified moves",
    flagged: "These moves were not in the engine data and are highlighted in the text: {moves}. Treat them with caution.",
    generatedAt: "Written {date}",
    askTitle: "Ask a question",
    askPlaceholder: "Ask the coach about this game\u2026",
    send: "Ask",
    thinking: "The coach is thinking\u2026",
    disclaimer: "The coach explains but does not replace a human trainer; its strategic explanations can be wrong (the moves are checked). Coach usage counts toward your subscription limits.",
    openChat: "Open coach chat"
  },
  setup: {
    title: "Set up Chess Insight",
    intro: "Three short steps, about five minutes: your public chess.com account, the engine, and your first game.",
    step1: "Your chess.com account",
    step2: "The engine",
    step3: "Your first game",
    done: "done",
    next: "Continue",
    usernameIntro: "Only your public games are read, through the public chess.com API. Nothing else is sent anywhere.",
    username: "chess.com username",
    usernamePlaceholder: "username",
    usernameFormat: "3 to 25 letters, digits, \u201C_\u201D or \u201C-\u201D.",
    checkAccount: "Check account",
    checking: "Checking\u2026",
    accountOk: "Account found",
    accountOkText: "{count, plural, one {# monthly archive was found.} other {# monthly archives were found.}}",
    accountFail: "Account check failed",
    operatorHttp: "If the network is blocked, an operator must allow the chess.com API for this plugin in Timon\u2019s configuration (check the README for the exact entry). Example:",
    engineIntro: "Stockfish runs locally inside the plugin; no installation is needed. Check that it starts.",
    detectEngine: "Check the engine",
    engineOk: "Engine ready",
    engineOkText: "{name} {version} \xB7 {nnue} \xB7 {cores} CPU cores",
    noNnue: "no NNUE",
    engineMissing: "Engine not available",
    engineHelp: "The engine ships inside the plugin package. Reinstall the plugin, or ask the operator to check the logs; then check again.",
    syncIntro: "Download your most recent games (the last 15 games), then analyse the latest one.",
    syncRecent: "Download recent games",
    syncAgain: "Download again",
    gamesFound: "{count, plural, one {# game downloaded.} other {# games downloaded.}}",
    analyseLatest: "Analyse the most recent game",
    finish: "Finish setup",
    noGames: "No game was found for this account in the last months.",
    clearGames: "Delete my downloaded games",
    clearGamesConfirm: "Delete all your downloaded games and their analyses? This cannot be undone.",
    privacy: "Only api.chess.com is contacted. Games are stored locally in the plugin database."
  },
  errors: {
    generic: "Something went wrong. Please try again.",
    network: "The network request failed.",
    user_not_found: "Account not found or profile not public.",
    invalid_username: "That username format is not valid.",
    not_configured: "Set your chess.com username first.",
    sync_running: "A sync is already running.",
    not_analyzed: "Analyse the game first.",
    rate_limited: "Too many requests; wait a moment and try again.",
    illegal_move: "That move is not legal in this position.",
    game_not_found: "Game not found.",
    invalid_setting: "That setting value is out of range.",
    agent_conflict: "An agent with the coach\u2019s name already exists and is not managed by this plugin."
  },
  profile: {
    title: "My profile",
    subtitle: "Your account, analysis speed and data \u2014 in one place.",
    noName: "Welcome",
    welcome: "Start by linking your public chess.com account: only your public games are read.",
    gamesCount: "{count, plural, one {# game kept} other {# games kept}}",
    gamesMax: "maximum 15",
    lastSync: "Last sync {when}",
    neverSynced: "Not synced yet",
    account: "chess.com account",
    accountHint: "Only your public games are read, through the public chess.com API. Nothing else is sent anywhere.",
    linked: "Account linked",
    change: "Change username",
    verify: "Verify account",
    verifying: "Checking\u2026",
    usernameLabel: "chess.com username",
    download: "Download my 15 latest games",
    downloadAgain: "Refresh my games",
    downloading: "Downloading\u2026",
    analyseLatest: "Analyse my latest game",
    goHome: "See my games",
    analysis: "Analysis",
    speed: "Speed and precision",
    presetFast: "Fast",
    presetFastText: "Depth 10 to 16. Good for a first look.",
    presetBalanced: "Balanced",
    presetBalancedText: "Depth 14 to 20. The right trade-off (recommended).",
    presetPrecise: "Precise",
    presetPreciseText: "Depth 16 to 24. Slower, more reliable on critical moves.",
    presetCustom: "Custom",
    autoAnalyse: "Analyse automatically after a download",
    autoAnalyseHint: "Once, right after the sync. No timer.",
    engine: "Engine",
    engineChecking: "Checking the engine\u2026",
    engineReady: "{name} {version} \xB7 {cores} cores",
    engineFail: "The engine does not start",
    magnus: "Your coach",
    magnusHint: "Language of the coach\u2019s explanations.",
    lang_auto: "Automatic",
    lang_fr: "Fran\xE7ais",
    lang_en: "English",
    advanced: "Advanced settings",
    threads: "Engine threads (0 = automatic)",
    hash: "Engine memory (MB)",
    contact: "Optional contact added to the User-Agent sent to chess.com",
    saved: "Saved",
    cleanTitle: "Clean the database",
    cleanUnanalysed: "Clean the database: delete unanalysed games",
    cleanAll: "Delete all downloaded games",
    cleanHint: "Keeps only what is useful: games already analysed. Deleted games can be downloaded again.",
    cleanConfirmUnanalysed: "Delete the unanalysed games? Analysed games are kept.",
    cleanDone: "{count, plural, one {# game deleted} other {# games deleted}}",
    stored: "{count, plural, one {# game stored} other {# games stored}} \xB7 {analysed} analysed",
    resetTitle: "Reset the plugin",
    resetHint: "Erases everything the plugin stored for you (username, games, analyses, settings) and returns to the first-run screen.",
    resetBtn: "Reset everything",
    resetConfirm: "Erase all your plugin data (username, games, analyses, settings)? This cannot be undone."
  }
};

// lib/client/locales/fr.json
var fr_default = {
  import: {
    open: "Importer un PGN",
    title: "Importer une partie (PGN)",
    placeholder: "Collez ici le PGN d\u2019une partie jou\xE9e n\u2019importe o\xF9\u2026",
    submit: "Importer et analyser"
  },
  nav: {
    home: "Mes parties",
    title: "Chess Insight",
    games: "Parties",
    review: "Revue",
    setup: "Mon profil",
    analyse: "Analyse",
    profile: "Mon profil"
  },
  common: {
    white: "Blancs",
    black: "Noirs",
    loading: "Chargement\u2026",
    error: "Un probl\xE8me est survenu",
    retry: "R\xE9essayer",
    cancel: "Annuler",
    dismiss: "Fermer"
  },
  app: {
    analysing: "Analyse : {running} en cours, {queued} en attente",
    coach: "Coach",
    coachHint: "Ouvrir le chat du coach \xE0 droite",
    coachHelpTitle: "Le chat du coach n\u2019a pas pu s\u2019ouvrir",
    coachHelp: "Ouvrez la liste des agents et lancez une conversation avec \xAB {agent} \xBB. L\u2019espace de travail est peut-\xEAtre trop \xE9troit ou plein : fermez un onglet, puis appuyez de nouveau sur Coach."
  },
  class: {
    brilliant: "Brillant",
    great: "Tr\xE8s bon",
    best: "Meilleur",
    excellent: "Excellent",
    good: "Bon",
    book: "Livre",
    inaccuracy: "Impr\xE9cision",
    mistake: "Erreur",
    miss: "Manqu\xE9",
    blunder: "Gaffe"
  },
  result: {
    win: "Victoire",
    loss: "D\xE9faite",
    draw: "Nulle"
  },
  term: {
    checkmated: "mat",
    resigned: "abandon",
    timeout: "au temps",
    agreed: "nulle par accord",
    repetition: "r\xE9p\xE9tition",
    stalemate: "pat",
    insufficient: "mat\xE9riel insuffisant",
    timevsinsufficient: "temps contre mat\xE9riel insuffisant",
    "50move": "r\xE8gle des 50 coups",
    abandoned: "partie abandonn\xE9e",
    win: "victoire",
    lose: "d\xE9faite"
  },
  tc: {
    bullet: "Bullet",
    blitz: "Blitz",
    rapid: "Rapide",
    daily: "Quotidien"
  },
  phase: {
    opening: "Ouverture",
    middlegame: "Milieu de partie",
    endgame: "Finale"
  },
  engine: {
    idle: "Moteur au repos",
    starting: "Moteur en d\xE9marrage",
    ready: "Moteur pr\xEAt",
    busy: "Moteur en analyse",
    error: "Erreur du moteur",
    missing: "Moteur introuvable"
  },
  accuracy: {
    label: "Pr\xE9cision du coach",
    note: "La pr\xE9cision du coach est la mesure propre de ce plugin, calcul\xE9e \xE0 partir de Stockfish. Ce n\u2019est pas le score CAPS de chess.com et elle peut en diff\xE9rer.",
    chesscom: "chess.com : {value}"
  },
  board: {
    label: "\xC9chiquier",
    evalBar: "Barre d\u2019\xE9valuation : {value}"
  },
  sync: {
    button: "Synchroniser",
    hint: "T\xE9l\xE9charger vos derni\xE8res parties publiques de chess.com",
    running: "Synchronisation\u2026",
    never: "Jamais synchronis\xE9",
    last: "Derni\xE8re synchro {when}",
    rateLimited: "chess.com demande de ralentir ; r\xE9essayez dans une minute",
    notFound: "Compte introuvable ou profil non public",
    error: "La synchronisation a \xE9chou\xE9",
    games: "{count, plural, one {# partie} other {# parties}}",
    mode: "Mode de t\xE9l\xE9chargement",
    modeRecent: "Derni\xE8res parties",
    modeRange: "Par dates",
    count: "Nombre de parties",
    from: "Du",
    to: "Au",
    rangeHint: "Les parties jou\xE9es ce jour-l\xE0 (15 au maximum).",
    start: "T\xE9l\xE9charger",
    startRange: "T\xE9l\xE9charger la p\xE9riode",
    optLast: "La derni\xE8re partie",
    optTen: "Les 10 derni\xE8res",
    optDate: "Choisir une date",
    day: "Jour"
  },
  games: {
    title: "Mes parties",
    filters: "Filtres",
    timeClass: "Cadence",
    allTimeClasses: "Toutes les cadences",
    color: "Couleur",
    allColors: "Les deux couleurs",
    result: "R\xE9sultat",
    allResults: "Tous les r\xE9sultats",
    opening: "Ouverture",
    allOpenings: "Toutes les ouvertures",
    period: "P\xE9riode",
    anyTime: "Toute la p\xE9riode",
    last7: "7 derniers jours",
    last30: "30 derniers jours",
    last90: "90 derniers jours",
    last365: "Derni\xE8re ann\xE9e",
    analysedOnly: "Analys\xE9es seulement",
    search: "Chercher un adversaire",
    sort: "Tri",
    sortNewest: "Plus r\xE9centes d\u2019abord",
    sortOldest: "Plus anciennes d\u2019abord",
    sortAccDesc: "Pr\xE9cision d\xE9croissante",
    sortAccAsc: "Pr\xE9cision croissante",
    sortRating: "Cote de l\u2019adversaire",
    clear: "Effacer les filtres",
    rated: "class\xE9e",
    col: {
      date: "Date",
      timeClass: "Cadence",
      color: "Couleur",
      opponent: "Adversaire",
      result: "R\xE9sultat",
      opening: "Ouverture",
      accuracy: "Pr\xE9cision",
      actions: "Actions"
    },
    analyse: "Analyser",
    review: "Revue",
    open: "Ouvrir",
    stateQueued: "En attente",
    stateRunning: "Analyse\u2026",
    selected: "{count, plural, one {# partie s\xE9lectionn\xE9e} other {# parties s\xE9lectionn\xE9es}}",
    selectPage: "S\xE9lectionner toutes les parties de la page",
    selectOne: "S\xE9lectionner la partie contre {name}",
    analyseSelection: "Analyser la s\xE9lection",
    trendReport: "Rapport de tendances",
    deselect: "D\xE9s\xE9lectionner",
    queued: "{count, plural, one {# partie mise en file d\u2019analyse} other {# parties mises en file d\u2019analyse}}",
    trendQueued: "Rapport de tendances demand\xE9. Il appara\xEEtra dans Tableau de bord \u203A Moments r\xE9currents.",
    range: "{from}\u2013{to} sur {total}",
    pageSize: "Parties par page",
    prev: "Pr\xE9c\xE9dent",
    next: "Suivant",
    page: "Page {page} / {pages}",
    emptyTitle: "Aucune partie pour l\u2019instant",
    empty: "Aucune partie n\u2019a encore \xE9t\xE9 t\xE9l\xE9charg\xE9e. La synchronisation r\xE9cup\xE8re vos parties publiques les plus r\xE9centes sur chess.com.",
    emptyNotConfigured: "Indiquez d\u2019abord votre pseudo chess.com pour voir des parties ici.",
    noMatchTitle: "Aucune partie ne correspond \xE0 ces filtres",
    noMatch: "Retirez un filtre ou \xE9largissez la p\xE9riode."
  },
  review: {
    title: "Revue de partie",
    back: "Retour aux parties",
    loading: "Chargement de la partie\u2026",
    graph: "\xC9valuation",
    graphLabel: "Courbe d\u2019\xE9valuation. Cliquez pour aller \xE0 un coup.",
    classification: "Classification des coups",
    classTable: "Nombre de coups par classification et par camp",
    moves: "Coups",
    openings: "Ouvertures",
    noOpening: "Hors r\xE9pertoire connu",
    eloEstimate: "\u2248 {value} Elo",
    eloNone: "Elo : trop peu de coups",
    eloNote: "Estimation indicative (\xB1 300) de la force de jeu, d\xE9duite des points perdus par coup. Ce n\u2019est pas un classement officiel.",
    keyMoments: "Moments cl\xE9s",
    tabs: "Onglets de la revue",
    tabAnalysis: "Analyse",
    tabCoach: "Coach",
    controls: "Commandes de l\u2019\xE9chiquier",
    first: "Premier coup",
    prev: "Coup pr\xE9c\xE9dent",
    next: "Coup suivant",
    last: "Dernier coup",
    play: "Lecture automatique",
    pause: "Pause",
    flip: "Retourner l\u2019\xE9chiquier",
    arrow: "Meilleur coup",
    arrowToggle: "Afficher ou masquer la fl\xE8che du meilleur coup du moteur",
    keys: "\u2190 \u2192 coup \xB7 D\xE9but / Fin \xB7 F retourner \xB7 Espace lecture \xB7 \xC9chap quitter la variante",
    analysing: "Analyse en cours",
    progress: "Position {done} sur {total}, passe {phase}",
    queued: "En attente dans la file\u2026",
    noAnalysisTitle: "Cette partie n\u2019a pas \xE9t\xE9 analys\xE9e",
    noAnalysis: "Lancez le moteur sur cette partie pour obtenir les coups class\xE9s, la pr\xE9cision et la courbe d\u2019\xE9valuation.",
    noAnalysisTab: "Analysez la partie pour voir les variantes du moteur et la qualit\xE9 des coups.",
    engineBlocked: "Le moteur n\u2019est pas disponible : la partie ne peut pas \xEAtre analys\xE9e pour le moment. V\xE9rifiez le moteur dans l\u2019\xE9cran Configuration.",
    engineError: "Probl\xE8me de moteur",
    state: {
      invalid: "Cette partie n\u2019a pas pu \xEAtre analys\xE9e",
      failed: "L\u2019analyse a \xE9chou\xE9"
    },
    retryAnalysis: "R\xE9essayer",
    partialTitle: "Analyse partielle",
    partial: "Certaines positions n\u2019ont pas pu \xEAtre \xE9valu\xE9es : quelques coups n\u2019ont donc pas de classification.",
    moveFailed: "Cette position n\u2019a pas pu \xEAtre \xE9valu\xE9e.",
    noMovesTitle: "Cette partie ne contient aucun coup",
    noMoves: "Il n\u2019y a rien \xE0 rejouer : la partie s\u2019est termin\xE9e avant le premier coup.",
    startPosition: "Position de d\xE9part",
    bestWas: "Meilleur coup :",
    loss: "\xB7 points attendus perdus : {value} %",
    engineLines: "Variantes du moteur (cliquez un coup pour l\u2019essayer)",
    noLines: "Aucune variante du moteur pour cette position.",
    tryHint: "Jouer cette variante sur l\u2019\xE9chiquier",
    tryBanner: "Exploration d\u2019une variante. Elle n\u2019est pas enregistr\xE9e ; \xC9chap ou le bouton ram\xE8ne \xE0 la partie.",
    exitTry: "Retour \xE0 la partie",
    winner: "{name} remporte la partie",
    drawText: "Aucun vainqueur",
    moveList: "Liste des coups"
  },
  coach: {
    needAnalysisTitle: "Analysez d\u2019abord la partie",
    needAnalysis: "Le coach se contente d\u2019expliquer ce que le moteur a trouv\xE9 : la partie doit \xEAtre analys\xE9e avant qu\u2019un rapport puisse \xEAtre r\xE9dig\xE9.",
    noneTitle: "Pas encore de rapport du coach",
    none: "Le coach lit les moments critiques \xE9tablis par le moteur et les explique en langage clair. Il n\u2019\xE9value jamais les positions lui-m\xEAme.",
    generate: "R\xE9diger le rapport",
    regenerate: "R\xE9g\xE9n\xE9rer",
    waitingTitle: "Le coach r\xE9dige",
    waiting: "Cela prend en g\xE9n\xE9ral moins de deux minutes. Vous pouvez continuer \xE0 naviguer ; le rapport appara\xEEtra ici.",
    timeoutTitle: "Le coach a mis trop de temps",
    timeout: "Aucune r\xE9ponse n\u2019est arriv\xE9e \xE0 temps. Une r\xE9ponse tardive reste accept\xE9e pendant une heure ; vous pouvez aussi r\xE9essayer.",
    errorTitle: "Le rapport a \xE9chou\xE9",
    unverified: "Coup non v\xE9rifi\xE9 : il ne figure pas dans les donn\xE9es du moteur",
    flaggedTitle: "Coups non v\xE9rifi\xE9s",
    flagged: "Ces coups ne figuraient pas dans les donn\xE9es du moteur et sont surlign\xE9s dans le texte : {moves}. \xC0 prendre avec prudence.",
    generatedAt: "R\xE9dig\xE9 {date}",
    askTitle: "Poser une question",
    askPlaceholder: "Posez une question au coach sur cette partie\u2026",
    send: "Demander",
    thinking: "Le coach r\xE9fl\xE9chit\u2026",
    disclaimer: "Le coach explique mais ne remplace pas un entra\xEEneur humain ; ses explications strat\xE9giques peuvent \xEAtre fausses (les coups, eux, sont v\xE9rifi\xE9s). L\u2019usage du coach compte dans les limites de votre abonnement.",
    openChat: "Ouvrir le chat du coach"
  },
  setup: {
    title: "Configurer Chess Insight",
    intro: "Trois courtes \xE9tapes, environ cinq minutes : votre compte chess.com public, le moteur, puis votre premi\xE8re partie.",
    step1: "Votre compte chess.com",
    step2: "Le moteur",
    step3: "Votre premi\xE8re partie",
    done: "termin\xE9",
    next: "Continuer",
    usernameIntro: "Seules vos parties publiques sont lues, via l\u2019API publique de chess.com. Rien d\u2019autre n\u2019est envoy\xE9 ailleurs.",
    username: "Pseudo chess.com",
    usernamePlaceholder: "pseudo",
    usernameFormat: "3 \xE0 25 lettres, chiffres, \xAB _ \xBB ou \xAB - \xBB.",
    checkAccount: "V\xE9rifier le compte",
    checking: "V\xE9rification\u2026",
    accountOk: "Compte trouv\xE9",
    accountOkText: "{count, plural, one {# archive mensuelle trouv\xE9e.} other {# archives mensuelles trouv\xE9es.}}",
    accountFail: "La v\xE9rification du compte a \xE9chou\xE9",
    operatorHttp: "Si le r\xE9seau est bloqu\xE9, un op\xE9rateur doit autoriser l\u2019API chess.com pour ce plugin dans la configuration de Timon (voir le README pour l\u2019entr\xE9e exacte). Exemple :",
    engineIntro: "Stockfish s\u2019ex\xE9cute localement dans le plugin ; aucune installation n\u2019est n\xE9cessaire. V\xE9rifiez qu\u2019il d\xE9marre.",
    detectEngine: "V\xE9rifier le moteur",
    engineOk: "Moteur pr\xEAt",
    engineOkText: "{name} {version} \xB7 {nnue} \xB7 {cores} c\u0153urs",
    noNnue: "sans NNUE",
    engineMissing: "Moteur indisponible",
    engineHelp: "Le moteur est fourni dans le paquet du plugin. R\xE9installez le plugin ou demandez \xE0 l\u2019op\xE9rateur de consulter les journaux, puis v\xE9rifiez de nouveau.",
    syncIntro: "T\xE9l\xE9chargez vos parties les plus r\xE9centes (les 15 derni\xE8res), puis analysez la derni\xE8re.",
    syncRecent: "T\xE9l\xE9charger les parties r\xE9centes",
    syncAgain: "T\xE9l\xE9charger de nouveau",
    gamesFound: "{count, plural, one {# partie t\xE9l\xE9charg\xE9e.} other {# parties t\xE9l\xE9charg\xE9es.}}",
    analyseLatest: "Analyser la partie la plus r\xE9cente",
    finish: "Terminer la configuration",
    noGames: "Aucune partie trouv\xE9e pour ce compte ces derniers mois.",
    clearGames: "Supprimer mes parties t\xE9l\xE9charg\xE9es",
    clearGamesConfirm: "Supprimer toutes vos parties t\xE9l\xE9charg\xE9es et leurs analyses ? Cette action est d\xE9finitive.",
    privacy: "Seul api.chess.com est contact\xE9. Les parties sont stock\xE9es localement dans la base du plugin."
  },
  errors: {
    generic: "Un probl\xE8me est survenu. Veuillez r\xE9essayer.",
    network: "La requ\xEAte r\xE9seau a \xE9chou\xE9.",
    user_not_found: "Compte introuvable ou profil non public.",
    invalid_username: "Ce format de pseudo n\u2019est pas valide.",
    not_configured: "Indiquez d\u2019abord votre pseudo chess.com.",
    sync_running: "Une synchronisation est d\xE9j\xE0 en cours.",
    not_analyzed: "Analysez d\u2019abord la partie.",
    rate_limited: "Trop de requ\xEAtes ; patientez un instant puis r\xE9essayez.",
    illegal_move: "Ce coup n\u2019est pas l\xE9gal dans cette position.",
    game_not_found: "Partie introuvable.",
    invalid_setting: "Cette valeur de r\xE9glage est hors limites.",
    agent_conflict: "Un agent portant le nom du coach existe d\xE9j\xE0 et n\u2019est pas g\xE9r\xE9 par ce plugin."
  },
  profile: {
    title: "Mon profil",
    subtitle: "Votre compte, la vitesse d\u2019analyse et vos donn\xE9es \u2014 au m\xEAme endroit.",
    noName: "Bienvenue",
    welcome: "Commencez par lier votre compte chess.com public : seules vos parties publiques sont lues.",
    gamesCount: "{count, plural, one {# partie conserv\xE9e} other {# parties conserv\xE9es}}",
    gamesMax: "maximum 15",
    lastSync: "Derni\xE8re synchro {when}",
    neverSynced: "Pas encore de synchro",
    account: "Compte chess.com",
    accountHint: "Seules vos parties publiques sont lues, via l\u2019API publique de chess.com. Rien d\u2019autre n\u2019est envoy\xE9 ailleurs.",
    linked: "Compte li\xE9",
    change: "Changer de pseudo",
    verify: "V\xE9rifier le compte",
    verifying: "V\xE9rification\u2026",
    usernameLabel: "Pseudo chess.com",
    download: "T\xE9l\xE9charger mes 15 derni\xE8res parties",
    downloadAgain: "Actualiser mes parties",
    downloading: "T\xE9l\xE9chargement\u2026",
    analyseLatest: "Analyser ma derni\xE8re partie",
    goHome: "Voir mes parties",
    analysis: "Analyse",
    speed: "Vitesse et pr\xE9cision",
    presetFast: "Rapide",
    presetFastText: "Profondeur 10 \xE0 16. Id\xE9al pour un premier coup d\u2019\u0153il.",
    presetBalanced: "\xC9quilibr\xE9",
    presetBalancedText: "Profondeur 14 \xE0 20. Le bon compromis (recommand\xE9).",
    presetPrecise: "Pr\xE9cis",
    presetPreciseText: "Profondeur 16 \xE0 24. Plus lent, plus fiable sur les coups critiques.",
    presetCustom: "Personnalis\xE9",
    autoAnalyse: "Analyser automatiquement apr\xE8s un t\xE9l\xE9chargement",
    autoAnalyseHint: "Une seule fois, juste apr\xE8s la synchro. Aucun minuteur.",
    engine: "Moteur",
    engineChecking: "V\xE9rification du moteur\u2026",
    engineReady: "{name} {version} \xB7 {cores} c\u0153urs",
    engineFail: "Le moteur ne d\xE9marre pas",
    magnus: "Votre coach",
    magnusHint: "Langue des explications du coach.",
    lang_auto: "Automatique",
    lang_fr: "Fran\xE7ais",
    lang_en: "English",
    advanced: "R\xE9glages avanc\xE9s",
    threads: "Threads du moteur (0 = automatique)",
    hash: "M\xE9moire du moteur (Mo)",
    contact: "Contact facultatif ajout\xE9 au User-Agent envoy\xE9 \xE0 chess.com",
    saved: "Enregistr\xE9",
    cleanTitle: "Nettoyer la base",
    cleanUnanalysed: "Nettoyer la base : supprimer les parties non analys\xE9es",
    cleanAll: "Supprimer toutes les parties t\xE9l\xE9charg\xE9es",
    cleanHint: "Garde seulement ce qui est utile : les parties d\xE9j\xE0 analys\xE9es. Les parties supprim\xE9es peuvent \xEAtre t\xE9l\xE9charg\xE9es de nouveau.",
    cleanConfirmUnanalysed: "Supprimer les parties non analys\xE9es ? Les parties analys\xE9es sont conserv\xE9es.",
    cleanDone: "{count, plural, one {# partie supprim\xE9e} other {# parties supprim\xE9es}}",
    stored: "{count, plural, one {# partie en base} other {# parties en base}} \xB7 {analysed} analys\xE9es",
    resetTitle: "R\xE9initialiser le plugin",
    resetHint: "Efface tout ce que le plugin a enregistr\xE9 pour vous (pseudo, parties, analyses, r\xE9glages) et revient \xE0 l\u2019\xE9cran de premier lancement.",
    resetBtn: "Tout r\xE9initialiser",
    resetConfirm: "Effacer toutes vos donn\xE9es du plugin (pseudo, parties, analyses, r\xE9glages) ? Cette action est d\xE9finitive."
  }
};

// lib/client/i18n.js
var MESSAGES = { en: en_default, fr: fr_default };
var t = createTranslator(MESSAGES);
var locale = () => {
  try {
    return getLocale() || "en";
  } catch {
    return "en";
  }
};
var fmtNum = (n, digits = 0) => n == null || Number.isNaN(n) ? "\u2014" : new Intl.NumberFormat(locale(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
var asDate = (sec) => new Date(Number(sec) * 1e3);
function fmtDate(sec) {
  if (sec == null) return "\u2014";
  const d = asDate(sec);
  try {
    return formatDate(d) || d.toLocaleDateString(locale());
  } catch {
    return d.toLocaleDateString(locale());
  }
}
function fmtDateTime(value) {
  if (value == null) return "\u2014";
  const d = typeof value === "number" ? asDate(value) : new Date(value);
  try {
    return formatDateTime(d) || d.toLocaleString(locale());
  } catch {
    return d.toLocaleString(locale());
  }
}
function fmtAgo(value) {
  if (value == null) return "";
  const d = typeof value === "number" ? asDate(value) : new Date(value);
  try {
    return formatRelativeTime(d) || "";
  } catch {
    return "";
  }
}

// lib/client/ui.js
var h = React.createElement;
var AppCtx = React.createContext(null);
var useApp = () => React.useContext(AppCtx);
var S = {
  card: { background: "var(--cc-panel)", border: "1px solid var(--cc-border)", borderRadius: 18, padding: 18, boxShadow: "var(--cc-shadow)" },
  muted: { color: "var(--cc-muted)" },
  row: { display: "flex", alignItems: "center", gap: 8 },
  input: { background: "var(--cc-panel2)", border: "1px solid var(--cc-border)", borderRadius: 10, padding: "8px 12px", minWidth: 0, color: "var(--cc-text)" }
};
function Btn({ primary, small, children, style, ...rest }) {
  return h("button", {
    type: "button",
    className: primary ? "cc-btn cc-primary" : "cc-btn cc-hover",
    style: {
      border: primary ? "none" : "1px solid var(--cc-border)",
      borderRadius: 999,
      cursor: "pointer",
      fontWeight: 600,
      padding: small ? "4px 10px" : "8px 16px",
      fontSize: small ? 12.5 : 14,
      whiteSpace: "nowrap",
      background: primary ? "var(--cc-accent)" : "var(--cc-panel2)",
      color: primary ? "var(--cc-accent-ink)" : "var(--cc-text)",
      ...style
    },
    ...rest
  }, children);
}
function Card({ title, actions, children, style }) {
  return h(
    "section",
    { style: { ...S.card, minWidth: 0, ...style } },
    title || actions ? h(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12 } },
      title ? h("h2", { style: { margin: 0, fontSize: 15, fontWeight: 700 } }, title) : h("span"),
      actions || null
    ) : null,
    children
  );
}
function Tabs({ options, value, onChange, label, style }) {
  const keys = options.map((o) => o[0]);
  const onKey = (e) => {
    const i = keys.indexOf(value);
    let n = null;
    if (e.key === "ArrowRight") n = keys[(i + 1) % keys.length];
    else if (e.key === "ArrowLeft") n = keys[(i - 1 + keys.length) % keys.length];
    if (n != null) {
      e.preventDefault();
      e.stopPropagation();
      onChange(n);
    }
  };
  return h(
    "div",
    { role: "tablist", "aria-label": label, onKeyDown: onKey, style: { display: "flex", gap: 2, borderBottom: "1px solid var(--cc-border)", overflowX: "auto", ...style } },
    options.map(([k, text]) => h("button", {
      key: k,
      role: "tab",
      type: "button",
      "aria-selected": k === value,
      tabIndex: k === value ? 0 : -1,
      id: `cc-tab-${k}`,
      onClick: () => onChange(k),
      className: "cc-hover",
      style: {
        border: "none",
        background: "transparent",
        cursor: "pointer",
        padding: "10px 14px",
        fontWeight: k === value ? 700 : 500,
        whiteSpace: "nowrap",
        color: k === value ? "var(--cc-text)" : "var(--cc-muted)",
        borderBottom: `3px solid ${k === value ? "var(--cc-accent)" : "transparent"}`,
        marginBottom: -1
      }
    }, text))
  );
}
function Notice({ kind = "info", title, children, action, style }) {
  const bg = kind === "error" ? "var(--cc-err-bg)" : kind === "warn" ? "var(--cc-warn-bg)" : "var(--cc-panel2)";
  const bd = kind === "error" ? "var(--cc-loss)" : kind === "warn" ? "var(--cc-warn)" : "var(--cc-border)";
  return h(
    "div",
    { role: kind === "error" ? "alert" : "status", style: { background: bg, border: `1px solid ${bd}`, borderRadius: 8, padding: "10px 14px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", ...style } },
    h("div", { style: { flex: "1 1 220px", minWidth: 0 } }, title ? h("div", { style: { fontWeight: 700, marginBottom: 2 } }, title) : null, h("div", { style: { fontSize: 13.5, lineHeight: 1.5 } }, children)),
    action || null
  );
}
function Loading({ label }) {
  return h("div", { role: "status", "aria-live": "polite", className: "cc-spin", style: { padding: 28, textAlign: "center", color: "var(--cc-muted)" } }, label || t("common.loading"));
}
function Empty({ title, children, action, icon }) {
  return h(
    "div",
    { style: { ...S.card, textAlign: "center", padding: "36px 20px", display: "grid", gap: 10, justifyItems: "center" } },
    icon || null,
    h("div", { style: { fontSize: 17, fontWeight: 700 } }, title),
    children ? h("div", { style: { color: "var(--cc-muted)", maxWidth: 520, lineHeight: 1.5, fontSize: 14 } }, children) : null,
    action || null
  );
}
function ErrorBox({ error, onRetry, text }) {
  return h(Notice, { kind: "error", title: t("common.error"), action: onRetry ? h(Btn, { small: true, onClick: onRetry }, t("common.retry")) : null }, text || error && error.message || t("errors.generic"));
}
function ProgressBar({ done, total, label }) {
  const pct = total > 0 ? Math.min(100, Math.round(done / total * 100)) : 0;
  return h(
    "div",
    { role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": pct, "aria-label": label, style: { background: "var(--cc-panel2)", border: "1px solid var(--cc-border)", borderRadius: 999, height: 10, overflow: "hidden" } },
    h("div", { style: { width: `${total > 0 ? pct : 35}%`, height: "100%", background: "var(--cc-accent)", transition: "width .3s ease" }, className: total > 0 ? void 0 : "cc-spin" })
  );
}
var Field = ({ label, children, hint }) => h("label", { style: { display: "grid", gap: 4, fontSize: 12.5, color: "var(--cc-muted)", minWidth: 0 } }, label, children, hint ? h("span", { style: { fontSize: 12 } }, hint) : null);
function Select({ value, onChange, options, label, style }) {
  return h(
    "select",
    { value, "aria-label": label, onChange: (e) => onChange(e.target.value), style: { ...S.input, ...style } },
    options.map(([k, text]) => h("option", { key: k, value: k }, text))
  );
}
var sv = (size, ...kids) => h("svg", { viewBox: "0 0 24 24", width: size, height: size, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: false }, ...kids);
var Icon = {
  first: (s = 18) => sv(s, h("path", { d: "M6 5v14" }), h("path", { d: "M19 6l-8 6 8 6z", fill: "currentColor" })),
  prev: (s = 18) => sv(s, h("path", { d: "M17 5l-9 7 9 7z", fill: "currentColor" })),
  next: (s = 18) => sv(s, h("path", { d: "M7 5l9 7-9 7z", fill: "currentColor" })),
  last: (s = 18) => sv(s, h("path", { d: "M18 5v14" }), h("path", { d: "M5 6l8 6-8 6z", fill: "currentColor" })),
  flip: (s = 18) => sv(s, h("path", { d: "M7 4v14" }), h("path", { d: "M3.5 14L7 18l3.5-4" }), h("path", { d: "M17 20V6" }), h("path", { d: "M13.5 10L17 6l3.5 4" })),
  play: (s = 18) => sv(s, h("path", { d: "M8 5l11 7-11 7z", fill: "currentColor" })),
  pause: (s = 18) => sv(s, h("path", { d: "M8 5v14M16 5v14", strokeWidth: 3 })),
  arrow: (s = 18) => sv(s, h("path", { d: "M5 19L19 5" }), h("path", { d: "M9 5h10v10" })),
  sync: (s = 16) => sv(s, h("path", { d: "M20 11a8 8 0 0 0-14-4M4 4v4h4" }), h("path", { d: "M4 13a8 8 0 0 0 14 4M20 20v-4h-4" })),
  chat: (s = 16) => sv(s, h("path", { d: "M4 5h16v11H9l-5 4z" })),
  bolt: (s = 16) => sv(s, h("path", { d: "M13 3L5 14h6l-1 7 8-11h-6z", fill: "currentColor" })),
  bullet: (s = 16) => sv(s, h("path", { d: "M5 19l3-9 5-6 4 4-6 5z", fill: "currentColor" })),
  clock: (s = 16) => sv(s, h("circle", { cx: 12, cy: 13, r: 8 }), h("path", { d: "M12 9v4l3 2M9 3h6" })),
  sun: (s = 16) => sv(s, h("circle", { cx: 12, cy: 12, r: 4 }), h("path", { d: "M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" })),
  check: (s = 16) => sv(s, h("path", { d: "M5 12l5 5 9-10", strokeWidth: 3 })),
  cross: (s = 16) => sv(s, h("path", { d: "M6 6l12 12M18 6L6 18", strokeWidth: 3 }))
};
var timeClassIcon = (tc, s) => tc === "bullet" ? Icon.bullet(s) : tc === "blitz" ? Icon.bolt(s) : tc === "daily" ? Icon.sun(s) : Icon.clock(s);
function Glyph({ g, ink }) {
  const common = { fill: "none", stroke: ink, strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (g) {
    case "star":
      return h("path", { d: "M12 4.2l2.4 5 5.4.7-4 3.8 1 5.4-4.8-2.7-4.8 2.7 1-5.4-4-3.8 5.4-.7z", fill: ink, stroke: ink, strokeWidth: 1, strokeLinejoin: "round" });
    case "check":
      return h("path", { d: "M6 12.5l4 4 8-9", ...common });
    case "cross":
      return h("path", { d: "M7 7l10 10M17 7L7 17", ...common });
    case "knight":
      return h("path", { d: "M8 19h9v-2c0-3 1-5-1-8-1-1.5-3-3-5-3l1 2-4 4 1.4 1.4 2.6-1.4c-1 2-3 3-3 5z", fill: ink, stroke: "none" });
    default:
      return h("text", { x: 12, y: 16.5, textAnchor: "middle", fontSize: g.length > 1 ? 12 : 15, fontWeight: 800, fill: ink, fontFamily: "Arial, Helvetica, sans-serif" }, g);
  }
}
function ClassBadge({ cls, size = 18, title }) {
  const tok = TOKENS[cls];
  if (!tok) return null;
  const ink = inkFor(tok.color);
  const name = title || t(`class.${cls}`);
  return h(
    "svg",
    { viewBox: "0 0 24 24", width: size, height: size, role: "img", "aria-label": name, style: { flex: "none", display: "block" } },
    h("title", null, name),
    h("circle", { cx: 12, cy: 12, r: 11, fill: tok.color }),
    h(Glyph, { g: tok.glyph, ink })
  );
}
function accuracyColor(a) {
  return a >= 90 ? "#81b64c" : a >= 80 ? "#96bc4b" : a >= 65 ? "#f7c631" : a >= 50 ? "#ffa459" : "#fa412d";
}
function Ring({ value, size = 84, label }) {
  const r = (size - 10) / 2, c = 2 * Math.PI * r;
  const v = value == null ? 0 : Math.max(0, Math.min(100, value));
  return h(
    "svg",
    { viewBox: `0 0 ${size} ${size}`, width: size, height: size, role: "img", "aria-label": `${label}: ${value == null ? "\u2014" : v.toFixed(1)}`, style: { flex: "none" } },
    h("circle", { cx: size / 2, cy: size / 2, r, fill: "none", stroke: "var(--cc-border)", strokeWidth: 7 }),
    value == null ? null : h("circle", { cx: size / 2, cy: size / 2, r, fill: "none", stroke: accuracyColor(v), strokeWidth: 7, strokeLinecap: "round", strokeDasharray: `${c * v / 100} ${c}`, transform: `rotate(-90 ${size / 2} ${size / 2})` }),
    h("text", { x: "50%", y: "50%", textAnchor: "middle", dominantBaseline: "central", fill: "var(--cc-text)", fontSize: size * 0.27, fontWeight: 800 }, value == null ? "\u2014" : v.toFixed(1))
  );
}
function Seg({ options, value, onChange, label }) {
  return h(
    "div",
    { role: "group", "aria-label": label, style: { display: "inline-flex", padding: 3, gap: 2, background: "var(--cc-panel2)", borderRadius: 999, border: "1px solid var(--cc-border)", flexWrap: "wrap" } },
    options.map(([k, text]) => h("button", {
      key: k,
      type: "button",
      "aria-pressed": value === k,
      "data-seg": k,
      onClick: () => onChange(k),
      className: "cc-btn",
      style: { border: "none", cursor: "pointer", padding: "7px 16px", borderRadius: 999, fontSize: 13.5, fontWeight: value === k ? 700 : 500, background: value === k ? "var(--cc-panel)" : "transparent", color: value === k ? "var(--cc-text)" : "var(--cc-muted)", boxShadow: value === k ? "0 1px 3px rgba(0,0,0,0.18)" : "none" }
    }, text))
  );
}

// lib/client/theme.js
import React2 from "react";
var { useState, useEffect } = React2;
var PALETTES = {
  dark: {
    "--cc-bg": "#000000",
    "--cc-panel": "#1c1c1e",
    "--cc-panel2": "#2c2c2e",
    "--cc-border": "rgba(255,255,255,0.10)",
    "--cc-text": "#f5f5f7",
    "--cc-muted": "#98989f",
    "--cc-accent": "#0a84ff",
    "--cc-accent-ink": "#ffffff",
    "--cc-accent-text": "#64b5ff",
    "--cc-win": "#32d74b",
    "--cc-loss": "#ff6961",
    "--cc-draw": "#98989f",
    "--cc-hover": "rgba(255,255,255,0.08)",
    "--cc-sel": "rgba(10,132,255,0.28)",
    "--cc-focus": "#64b5ff",
    "--cc-warn-bg": "rgba(255,214,10,0.14)",
    "--cc-warn": "#ffd60a",
    "--cc-err-bg": "rgba(255,69,58,0.16)",
    "--cc-graph-bg": "#111113",
    "--cc-graph-fill": "#f5f5f7",
    "--cc-shadow": "0 1px 2px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.35)"
  },
  light: {
    "--cc-bg": "#f5f5f7",
    "--cc-panel": "#ffffff",
    "--cc-panel2": "#f2f2f7",
    "--cc-border": "rgba(0,0,0,0.08)",
    "--cc-text": "#1d1d1f",
    "--cc-muted": "#6e6e73",
    "--cc-accent": "#0071e3",
    "--cc-accent-ink": "#ffffff",
    "--cc-accent-text": "#0066cc",
    "--cc-win": "#1f9d3a",
    "--cc-loss": "#d70015",
    "--cc-draw": "#6e6e73",
    "--cc-hover": "rgba(0,0,0,0.05)",
    "--cc-sel": "rgba(0,113,227,0.14)",
    "--cc-focus": "#0071e3",
    "--cc-warn-bg": "rgba(255,159,10,0.14)",
    "--cc-warn": "#9a5b00",
    "--cc-err-bg": "rgba(255,59,48,0.10)",
    "--cc-graph-bg": "#3a3a3c",
    "--cc-graph-fill": "#f5f5f7",
    "--cc-shadow": "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)"
  }
};
var BOARD = { light: "#f0e6d2", dark: "#a98467", last: "rgba(255,214,10,0.42)" };
function detectDark() {
  if (typeof document === "undefined") return true;
  const read = (el) => {
    const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
    return m && (m.length < 4 || Number(m[3]) > 0) ? m.map(Number) : null;
  };
  const c = read(document.body) || read(document.documentElement);
  if (c) return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] < 128;
  return !window.matchMedia || window.matchMedia("(prefers-color-scheme: dark)").matches;
}
function useDark() {
  const [dark, setDark] = useState(detectDark);
  useEffect(() => {
    const mo = new MutationObserver(() => setDark(detectDark()));
    mo.observe(document.documentElement, { attributes: true });
    mo.observe(document.body, { attributes: true });
    return () => mo.disconnect();
  }, []);
  return dark;
}
var CSS = [
  '.cc{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Segoe UI Variable","Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;letter-spacing:-0.011em;color:var(--cc-text);background:var(--cc-bg);box-sizing:border-box}',
  ".cc *,.cc *::before,.cc *::after{box-sizing:border-box}",
  ".cc button,.cc input,.cc select,.cc textarea{font:inherit;color:inherit}",
  ".cc button:focus-visible,.cc input:focus-visible,.cc select:focus-visible,.cc textarea:focus-visible,.cc [tabindex]:focus-visible,.cc a:focus-visible{outline:2px solid var(--cc-focus);outline-offset:2px}",
  ".cc button:disabled{opacity:.5;cursor:not-allowed}",
  ".cc .cc-hover:hover:not(:disabled){background:var(--cc-hover)}",
  ".cc tbody tr.cc-row:hover{background:var(--cc-hover)}",
  ".cc table{border-collapse:collapse;width:100%}",
  ".cc th{font-weight:600;color:var(--cc-muted);font-size:12px;text-align:left;padding:8px 10px;white-space:nowrap}",
  ".cc td{padding:8px 10px;border-top:1px solid var(--cc-border);vertical-align:middle}",
  ".cc .cc-evalbar-fill{transition:height .3s ease}",
  "@keyframes ccSlide{from{transform:translate(var(--dx),var(--dy))}to{transform:translate(0,0)}}",
  "@keyframes ccPop{0%{transform:scale(.6);opacity:0}100%{transform:scale(1);opacity:1}}",
  ".cc .cc-piece-move{animation:ccSlide .26s cubic-bezier(.22,.8,.3,1)}",
  ".cc .cc-badge{transform-box:fill-box;transform-origin:center;animation:ccPop .22s ease-out}",
  ".cc button,.cc [role=tab],.cc tbody tr.cc-row{transition:background-color .18s ease,color .18s ease,border-color .18s ease,box-shadow .2s ease,transform .16s cubic-bezier(.2,.8,.3,1),filter .18s ease,opacity .18s ease}",
  ".cc .cc-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 14px rgba(0,0,0,.14)}",
  ".cc .cc-btn.cc-primary:hover:not(:disabled){filter:brightness(1.08);box-shadow:0 6px 18px color-mix(in srgb,var(--cc-accent) 40%,transparent)}",
  ".cc .cc-btn:active:not(:disabled){transform:translateY(0) scale(.97);box-shadow:none;filter:brightness(.96)}",
  ".cc .cc-icon:hover:not(:disabled){transform:scale(1.1);box-shadow:0 3px 10px rgba(0,0,0,.14)}",
  ".cc button:active:not(:disabled){transform:scale(.96)}",
  "@keyframes ccFadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}",
  ".cc .cc-screen{animation:ccFadeUp .32s cubic-bezier(.22,.8,.3,1) both}",
  ".cc .cc-screen>section,.cc .cc-screen>div>section{animation:ccFadeUp .4s cubic-bezier(.22,.8,.3,1) both}",
  ".cc .cc-screen>section:nth-child(2),.cc .cc-screen>div>section:nth-child(2){animation-delay:.05s}",
  ".cc .cc-screen>section:nth-child(3),.cc .cc-screen>div>section:nth-child(3){animation-delay:.1s}",
  ".cc .cc-screen>section:nth-child(4),.cc .cc-screen>div>section:nth-child(4){animation-delay:.15s}",
  "@keyframes ccPulse{0%,100%{opacity:.5}50%{opacity:1}}",
  ".cc .cc-spin{animation:ccPulse 1.2s ease infinite}",
  "@media (prefers-reduced-motion:reduce){.cc *{animation:none!important;transition:none!important}}"
].join("");

// lib/client/api.js
import { parseApiError } from "@timon/ui";
var ApiError = class extends Error {
  constructor(message, { code = "unknown", status = 0, params } = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.params = params;
  }
};
function createApi(ctx) {
  async function call(method, path, body) {
    const init = { method, cache: "no-store" };
    if (method !== "GET") {
      init.headers = { "content-type": "application/json" };
      init.body = JSON.stringify(body ?? {});
    }
    let res;
    try {
      res = await ctx.api(path, init);
    } catch (e) {
      throw new ApiError(e && e.message ? e.message : "network error", { code: "network" });
    }
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const failure = parseApiError && parseApiError(json) || {};
      throw new ApiError(json && (json.message || json.error) || `HTTP ${res.status}`, {
        code: failure.code || json && json.code || `http_${res.status}`,
        status: res.status,
        params: failure.params || json && json.params
      });
    }
    return json;
  }
  return {
    get: (path) => call("GET", path),
    post: (path, body) => call("POST", path, body),
    put: (path, body) => call("PUT", path, body)
  };
}
function errorText(t2, e) {
  if (!e) return "";
  const key = `errors.${e.code}`;
  const text = t2(key, e.params || {});
  return text && text !== key ? text : e.message || t2("errors.generic");
}

// lib/client/games.js
import React9 from "react";

// lib/client/review.js
import React7 from "react";

// lib/client/board.js
import React3 from "react";

// vendor/chess.js
function rootNode(comment) {
  return comment !== null ? { comment, variations: [] } : { variations: [] };
}
function node(move, suffix, nag, comment, variations) {
  const node2 = { move, variations };
  if (suffix) {
    node2.suffix = suffix;
  }
  if (nag) {
    node2.nag = nag;
  }
  if (comment !== null) {
    node2.comment = comment;
  }
  return node2;
}
function lineToTree(...nodes) {
  const [root, ...rest] = nodes;
  let parent = root;
  for (const child of rest) {
    if (child !== null) {
      parent.variations = [child, ...child.variations];
      child.variations = [];
      parent = child;
    }
  }
  return root;
}
function pgn(headers, game) {
  if (game.marker && game.marker.comment) {
    let node2 = game.root;
    while (true) {
      const next = node2.variations[0];
      if (!next) {
        node2.comment = game.marker.comment;
        break;
      }
      node2 = next;
    }
  }
  return {
    headers,
    root: game.root,
    result: (game.marker && game.marker.result) ?? void 0
  };
}
function peg$subclass(child, parent) {
  function C2() {
    this.constructor = child;
  }
  C2.prototype = parent.prototype;
  child.prototype = new C2();
}
function peg$SyntaxError(message, expected, found, location) {
  var self = Error.call(this, message);
  if (Object.setPrototypeOf) {
    Object.setPrototypeOf(self, peg$SyntaxError.prototype);
  }
  self.expected = expected;
  self.found = found;
  self.location = location;
  self.name = "SyntaxError";
  return self;
}
peg$subclass(peg$SyntaxError, Error);
function peg$padEnd(str, targetLength, padString) {
  padString = padString || " ";
  if (str.length > targetLength) {
    return str;
  }
  targetLength -= str.length;
  padString += padString.repeat(targetLength);
  return str + padString.slice(0, targetLength);
}
peg$SyntaxError.prototype.format = function(sources) {
  var str = "Error: " + this.message;
  if (this.location) {
    var src = null;
    var k;
    for (k = 0; k < sources.length; k++) {
      if (sources[k].source === this.location.source) {
        src = sources[k].text.split(/\r\n|\n|\r/g);
        break;
      }
    }
    var s = this.location.start;
    var offset_s = this.location.source && typeof this.location.source.offset === "function" ? this.location.source.offset(s) : s;
    var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
    if (src) {
      var e = this.location.end;
      var filler = peg$padEnd("", offset_s.line.toString().length, " ");
      var line = src[s.line - 1];
      var last = s.line === e.line ? e.column : line.length + 1;
      var hatLen = last - s.column || 1;
      str += "\n --> " + loc + "\n" + filler + " |\n" + offset_s.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s.column - 1, " ") + peg$padEnd("", hatLen, "^");
    } else {
      str += "\n at " + loc;
    }
  }
  return str;
};
peg$SyntaxError.buildMessage = function(expected, found) {
  var DESCRIBE_EXPECTATION_FNS = {
    literal: function(expectation) {
      return '"' + literalEscape(expectation.text) + '"';
    },
    class: function(expectation) {
      var escapedParts = expectation.parts.map(function(part) {
        return Array.isArray(part) ? classEscape(part[0]) + "-" + classEscape(part[1]) : classEscape(part);
      });
      return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
    },
    any: function() {
      return "any character";
    },
    end: function() {
      return "end of input";
    },
    other: function(expectation) {
      return expectation.description;
    }
  };
  function hex(ch) {
    return ch.charCodeAt(0).toString(16).toUpperCase();
  }
  function literalEscape(s) {
    return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
      return "\\x0" + hex(ch);
    }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
      return "\\x" + hex(ch);
    });
  }
  function classEscape(s) {
    return s.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/-/g, "\\-").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
      return "\\x0" + hex(ch);
    }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
      return "\\x" + hex(ch);
    });
  }
  function describeExpectation(expectation) {
    return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
  }
  function describeExpected(expected2) {
    var descriptions = expected2.map(describeExpectation);
    var i, j;
    descriptions.sort();
    if (descriptions.length > 0) {
      for (i = 1, j = 1; i < descriptions.length; i++) {
        if (descriptions[i - 1] !== descriptions[i]) {
          descriptions[j] = descriptions[i];
          j++;
        }
      }
      descriptions.length = j;
    }
    switch (descriptions.length) {
      case 1:
        return descriptions[0];
      case 2:
        return descriptions[0] + " or " + descriptions[1];
      default:
        return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
    }
  }
  function describeFound(found2) {
    return found2 ? '"' + literalEscape(found2) + '"' : "end of input";
  }
  return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
};
function peg$parse(input, options) {
  options = options !== void 0 ? options : {};
  var peg$FAILED = {};
  var peg$source = options.grammarSource;
  var peg$startRuleFunctions = { pgn: peg$parsepgn };
  var peg$startRuleFunction = peg$parsepgn;
  var peg$c0 = "[";
  var peg$c1 = '"';
  var peg$c2 = "]";
  var peg$c3 = ".";
  var peg$c4 = "O-O-O";
  var peg$c5 = "O-O";
  var peg$c6 = "0-0-0";
  var peg$c7 = "0-0";
  var peg$c8 = "$";
  var peg$c9 = "{";
  var peg$c10 = "}";
  var peg$c11 = ";";
  var peg$c12 = "(";
  var peg$c13 = ")";
  var peg$c14 = "1-0";
  var peg$c15 = "0-1";
  var peg$c16 = "1/2-1/2";
  var peg$c17 = "*";
  var peg$r0 = /^[a-zA-Z]/;
  var peg$r1 = /^[^"]/;
  var peg$r2 = /^[0-9]/;
  var peg$r3 = /^[.]/;
  var peg$r4 = /^[a-zA-Z1-8\-=]/;
  var peg$r5 = /^[+#]/;
  var peg$r6 = /^[!?]/;
  var peg$r7 = /^[^}]/;
  var peg$r8 = /^[^\r\n]/;
  var peg$r9 = /^[ \t\r\n]/;
  var peg$e0 = peg$otherExpectation("tag pair");
  var peg$e1 = peg$literalExpectation("[", false);
  var peg$e2 = peg$literalExpectation('"', false);
  var peg$e3 = peg$literalExpectation("]", false);
  var peg$e4 = peg$otherExpectation("tag name");
  var peg$e5 = peg$classExpectation([["a", "z"], ["A", "Z"]], false, false);
  var peg$e6 = peg$otherExpectation("tag value");
  var peg$e7 = peg$classExpectation(['"'], true, false);
  var peg$e8 = peg$otherExpectation("move number");
  var peg$e9 = peg$classExpectation([["0", "9"]], false, false);
  var peg$e10 = peg$literalExpectation(".", false);
  var peg$e11 = peg$classExpectation(["."], false, false);
  var peg$e12 = peg$otherExpectation("standard algebraic notation");
  var peg$e13 = peg$literalExpectation("O-O-O", false);
  var peg$e14 = peg$literalExpectation("O-O", false);
  var peg$e15 = peg$literalExpectation("0-0-0", false);
  var peg$e16 = peg$literalExpectation("0-0", false);
  var peg$e17 = peg$classExpectation([["a", "z"], ["A", "Z"], ["1", "8"], "-", "="], false, false);
  var peg$e18 = peg$classExpectation(["+", "#"], false, false);
  var peg$e19 = peg$otherExpectation("suffix annotation");
  var peg$e20 = peg$classExpectation(["!", "?"], false, false);
  var peg$e21 = peg$otherExpectation("NAG");
  var peg$e22 = peg$literalExpectation("$", false);
  var peg$e23 = peg$otherExpectation("brace comment");
  var peg$e24 = peg$literalExpectation("{", false);
  var peg$e25 = peg$classExpectation(["}"], true, false);
  var peg$e26 = peg$literalExpectation("}", false);
  var peg$e27 = peg$otherExpectation("rest of line comment");
  var peg$e28 = peg$literalExpectation(";", false);
  var peg$e29 = peg$classExpectation(["\r", "\n"], true, false);
  var peg$e30 = peg$otherExpectation("variation");
  var peg$e31 = peg$literalExpectation("(", false);
  var peg$e32 = peg$literalExpectation(")", false);
  var peg$e33 = peg$otherExpectation("game termination marker");
  var peg$e34 = peg$literalExpectation("1-0", false);
  var peg$e35 = peg$literalExpectation("0-1", false);
  var peg$e36 = peg$literalExpectation("1/2-1/2", false);
  var peg$e37 = peg$literalExpectation("*", false);
  var peg$e38 = peg$otherExpectation("whitespace");
  var peg$e39 = peg$classExpectation([" ", "	", "\r", "\n"], false, false);
  var peg$f0 = function(headers, game) {
    return pgn(headers, game);
  };
  var peg$f1 = function(tagPairs) {
    return Object.fromEntries(tagPairs);
  };
  var peg$f2 = function(tagName, tagValue) {
    return [tagName, tagValue];
  };
  var peg$f3 = function(root, marker) {
    return { root, marker };
  };
  var peg$f4 = function(comment, moves) {
    return lineToTree(rootNode(comment), ...moves.flat());
  };
  var peg$f5 = function(san, suffix, nag, comment, variations) {
    return node(san, suffix, nag, comment, variations);
  };
  var peg$f6 = function(nag) {
    return nag;
  };
  var peg$f7 = function(comment) {
    return comment.replace(/[\r\n]+/g, " ");
  };
  var peg$f8 = function(comment) {
    return comment.trim();
  };
  var peg$f9 = function(line) {
    return line;
  };
  var peg$f10 = function(result, comment) {
    return { result, comment };
  };
  var peg$currPos = options.peg$currPos | 0;
  var peg$posDetailsCache = [{ line: 1, column: 1 }];
  var peg$maxFailPos = peg$currPos;
  var peg$maxFailExpected = options.peg$maxFailExpected || [];
  var peg$silentFails = options.peg$silentFails | 0;
  var peg$result;
  if (options.startRule) {
    if (!(options.startRule in peg$startRuleFunctions)) {
      throw new Error(`Can't start parsing from rule "` + options.startRule + '".');
    }
    peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
  }
  function peg$literalExpectation(text, ignoreCase) {
    return { type: "literal", text, ignoreCase };
  }
  function peg$classExpectation(parts, inverted, ignoreCase) {
    return { type: "class", parts, inverted, ignoreCase };
  }
  function peg$endExpectation() {
    return { type: "end" };
  }
  function peg$otherExpectation(description) {
    return { type: "other", description };
  }
  function peg$computePosDetails(pos) {
    var details = peg$posDetailsCache[pos];
    var p;
    if (details) {
      return details;
    } else {
      if (pos >= peg$posDetailsCache.length) {
        p = peg$posDetailsCache.length - 1;
      } else {
        p = pos;
        while (!peg$posDetailsCache[--p]) {
        }
      }
      details = peg$posDetailsCache[p];
      details = {
        line: details.line,
        column: details.column
      };
      while (p < pos) {
        if (input.charCodeAt(p) === 10) {
          details.line++;
          details.column = 1;
        } else {
          details.column++;
        }
        p++;
      }
      peg$posDetailsCache[pos] = details;
      return details;
    }
  }
  function peg$computeLocation(startPos, endPos, offset) {
    var startPosDetails = peg$computePosDetails(startPos);
    var endPosDetails = peg$computePosDetails(endPos);
    var res = {
      source: peg$source,
      start: {
        offset: startPos,
        line: startPosDetails.line,
        column: startPosDetails.column
      },
      end: {
        offset: endPos,
        line: endPosDetails.line,
        column: endPosDetails.column
      }
    };
    return res;
  }
  function peg$fail(expected) {
    if (peg$currPos < peg$maxFailPos) {
      return;
    }
    if (peg$currPos > peg$maxFailPos) {
      peg$maxFailPos = peg$currPos;
      peg$maxFailExpected = [];
    }
    peg$maxFailExpected.push(expected);
  }
  function peg$buildStructuredError(expected, found, location) {
    return new peg$SyntaxError(
      peg$SyntaxError.buildMessage(expected, found),
      expected,
      found,
      location
    );
  }
  function peg$parsepgn() {
    var s0, s1, s2;
    s0 = peg$currPos;
    s1 = peg$parsetagPairSection();
    s2 = peg$parsemoveTextSection();
    s0 = peg$f0(s1, s2);
    return s0;
  }
  function peg$parsetagPairSection() {
    var s0, s1, s2;
    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parsetagPair();
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      s2 = peg$parsetagPair();
    }
    s2 = peg$parse_();
    s0 = peg$f1(s1);
    return s0;
  }
  function peg$parsetagPair() {
    var s0, s2, s4, s6, s7, s8, s10;
    peg$silentFails++;
    s0 = peg$currPos;
    peg$parse_();
    if (input.charCodeAt(peg$currPos) === 91) {
      s2 = peg$c0;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e1);
      }
    }
    if (s2 !== peg$FAILED) {
      peg$parse_();
      s4 = peg$parsetagName();
      if (s4 !== peg$FAILED) {
        peg$parse_();
        if (input.charCodeAt(peg$currPos) === 34) {
          s6 = peg$c1;
          peg$currPos++;
        } else {
          s6 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e2);
          }
        }
        if (s6 !== peg$FAILED) {
          s7 = peg$parsetagValue();
          if (input.charCodeAt(peg$currPos) === 34) {
            s8 = peg$c1;
            peg$currPos++;
          } else {
            s8 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e2);
            }
          }
          if (s8 !== peg$FAILED) {
            peg$parse_();
            if (input.charCodeAt(peg$currPos) === 93) {
              s10 = peg$c2;
              peg$currPos++;
            } else {
              s10 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e3);
              }
            }
            if (s10 !== peg$FAILED) {
              s0 = peg$f2(s4, s7);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      if (peg$silentFails === 0) {
        peg$fail(peg$e0);
      }
    }
    return s0;
  }
  function peg$parsetagName() {
    var s0, s1, s2;
    peg$silentFails++;
    s0 = peg$currPos;
    s1 = [];
    s2 = input.charAt(peg$currPos);
    if (peg$r0.test(s2)) {
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e5);
      }
    }
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = input.charAt(peg$currPos);
        if (peg$r0.test(s2)) {
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e5);
          }
        }
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      s0 = input.substring(s0, peg$currPos);
    } else {
      s0 = s1;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e4);
      }
    }
    return s0;
  }
  function peg$parsetagValue() {
    var s0, s1, s2;
    peg$silentFails++;
    s0 = peg$currPos;
    s1 = [];
    s2 = input.charAt(peg$currPos);
    if (peg$r1.test(s2)) {
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e7);
      }
    }
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      s2 = input.charAt(peg$currPos);
      if (peg$r1.test(s2)) {
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e7);
        }
      }
    }
    s0 = input.substring(s0, peg$currPos);
    peg$silentFails--;
    s1 = peg$FAILED;
    if (peg$silentFails === 0) {
      peg$fail(peg$e6);
    }
    return s0;
  }
  function peg$parsemoveTextSection() {
    var s0, s1, s3;
    s0 = peg$currPos;
    s1 = peg$parseline();
    peg$parse_();
    s3 = peg$parsegameTerminationMarker();
    if (s3 === peg$FAILED) {
      s3 = null;
    }
    peg$parse_();
    s0 = peg$f3(s1, s3);
    return s0;
  }
  function peg$parseline() {
    var s0, s1, s2, s3;
    s0 = peg$currPos;
    s1 = peg$parsecomment();
    if (s1 === peg$FAILED) {
      s1 = null;
    }
    s2 = [];
    s3 = peg$parsemove();
    while (s3 !== peg$FAILED) {
      s2.push(s3);
      s3 = peg$parsemove();
    }
    s0 = peg$f4(s1, s2);
    return s0;
  }
  function peg$parsemove() {
    var s0, s4, s5, s6, s7, s8, s9, s10;
    s0 = peg$currPos;
    peg$parse_();
    peg$parsemoveNumber();
    peg$parse_();
    s4 = peg$parsesan();
    if (s4 !== peg$FAILED) {
      s5 = peg$parsesuffixAnnotation();
      if (s5 === peg$FAILED) {
        s5 = null;
      }
      s6 = [];
      s7 = peg$parsenag();
      while (s7 !== peg$FAILED) {
        s6.push(s7);
        s7 = peg$parsenag();
      }
      s7 = peg$parse_();
      s8 = peg$parsecomment();
      if (s8 === peg$FAILED) {
        s8 = null;
      }
      s9 = [];
      s10 = peg$parsevariation();
      while (s10 !== peg$FAILED) {
        s9.push(s10);
        s10 = peg$parsevariation();
      }
      s0 = peg$f5(s4, s5, s6, s8, s9);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parsemoveNumber() {
    var s0, s1, s2, s3, s4, s5;
    peg$silentFails++;
    s0 = peg$currPos;
    s1 = [];
    s2 = input.charAt(peg$currPos);
    if (peg$r2.test(s2)) {
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e9);
      }
    }
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      s2 = input.charAt(peg$currPos);
      if (peg$r2.test(s2)) {
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e9);
        }
      }
    }
    if (input.charCodeAt(peg$currPos) === 46) {
      s2 = peg$c3;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e10);
      }
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$parse_();
      s4 = [];
      s5 = input.charAt(peg$currPos);
      if (peg$r3.test(s5)) {
        peg$currPos++;
      } else {
        s5 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e11);
        }
      }
      while (s5 !== peg$FAILED) {
        s4.push(s5);
        s5 = input.charAt(peg$currPos);
        if (peg$r3.test(s5)) {
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e11);
          }
        }
      }
      s1 = [s1, s2, s3, s4];
      s0 = s1;
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e8);
      }
    }
    return s0;
  }
  function peg$parsesan() {
    var s0, s1, s2, s3, s4, s5;
    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$currPos;
    if (input.substr(peg$currPos, 5) === peg$c4) {
      s2 = peg$c4;
      peg$currPos += 5;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e13);
      }
    }
    if (s2 === peg$FAILED) {
      if (input.substr(peg$currPos, 3) === peg$c5) {
        s2 = peg$c5;
        peg$currPos += 3;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e14);
        }
      }
      if (s2 === peg$FAILED) {
        if (input.substr(peg$currPos, 5) === peg$c6) {
          s2 = peg$c6;
          peg$currPos += 5;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e15);
          }
        }
        if (s2 === peg$FAILED) {
          if (input.substr(peg$currPos, 3) === peg$c7) {
            s2 = peg$c7;
            peg$currPos += 3;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e16);
            }
          }
          if (s2 === peg$FAILED) {
            s2 = peg$currPos;
            s3 = input.charAt(peg$currPos);
            if (peg$r0.test(s3)) {
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e5);
              }
            }
            if (s3 !== peg$FAILED) {
              s4 = [];
              s5 = input.charAt(peg$currPos);
              if (peg$r4.test(s5)) {
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e17);
                }
              }
              if (s5 !== peg$FAILED) {
                while (s5 !== peg$FAILED) {
                  s4.push(s5);
                  s5 = input.charAt(peg$currPos);
                  if (peg$r4.test(s5)) {
                    peg$currPos++;
                  } else {
                    s5 = peg$FAILED;
                    if (peg$silentFails === 0) {
                      peg$fail(peg$e17);
                    }
                  }
                }
              } else {
                s4 = peg$FAILED;
              }
              if (s4 !== peg$FAILED) {
                s3 = [s3, s4];
                s2 = s3;
              } else {
                peg$currPos = s2;
                s2 = peg$FAILED;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
          }
        }
      }
    }
    if (s2 !== peg$FAILED) {
      s3 = input.charAt(peg$currPos);
      if (peg$r5.test(s3)) {
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e18);
        }
      }
      if (s3 === peg$FAILED) {
        s3 = null;
      }
      s2 = [s2, s3];
      s1 = s2;
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      s0 = input.substring(s0, peg$currPos);
    } else {
      s0 = s1;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e12);
      }
    }
    return s0;
  }
  function peg$parsesuffixAnnotation() {
    var s0, s1, s2;
    peg$silentFails++;
    s0 = peg$currPos;
    s1 = [];
    s2 = input.charAt(peg$currPos);
    if (peg$r6.test(s2)) {
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e20);
      }
    }
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      if (s1.length >= 2) {
        s2 = peg$FAILED;
      } else {
        s2 = input.charAt(peg$currPos);
        if (peg$r6.test(s2)) {
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e20);
          }
        }
      }
    }
    if (s1.length < 1) {
      peg$currPos = s0;
      s0 = peg$FAILED;
    } else {
      s0 = s1;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e19);
      }
    }
    return s0;
  }
  function peg$parsenag() {
    var s0, s2, s3, s4, s5;
    peg$silentFails++;
    s0 = peg$currPos;
    peg$parse_();
    if (input.charCodeAt(peg$currPos) === 36) {
      s2 = peg$c8;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e22);
      }
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$currPos;
      s4 = [];
      s5 = input.charAt(peg$currPos);
      if (peg$r2.test(s5)) {
        peg$currPos++;
      } else {
        s5 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e9);
        }
      }
      if (s5 !== peg$FAILED) {
        while (s5 !== peg$FAILED) {
          s4.push(s5);
          s5 = input.charAt(peg$currPos);
          if (peg$r2.test(s5)) {
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e9);
            }
          }
        }
      } else {
        s4 = peg$FAILED;
      }
      if (s4 !== peg$FAILED) {
        s3 = input.substring(s3, peg$currPos);
      } else {
        s3 = s4;
      }
      if (s3 !== peg$FAILED) {
        s0 = peg$f6(s3);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      if (peg$silentFails === 0) {
        peg$fail(peg$e21);
      }
    }
    return s0;
  }
  function peg$parsecomment() {
    var s0;
    s0 = peg$parsebraceComment();
    if (s0 === peg$FAILED) {
      s0 = peg$parserestOfLineComment();
    }
    return s0;
  }
  function peg$parsebraceComment() {
    var s0, s1, s2, s3, s4;
    peg$silentFails++;
    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 123) {
      s1 = peg$c9;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e24);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      s3 = [];
      s4 = input.charAt(peg$currPos);
      if (peg$r7.test(s4)) {
        peg$currPos++;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e25);
        }
      }
      while (s4 !== peg$FAILED) {
        s3.push(s4);
        s4 = input.charAt(peg$currPos);
        if (peg$r7.test(s4)) {
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e25);
          }
        }
      }
      s2 = input.substring(s2, peg$currPos);
      if (input.charCodeAt(peg$currPos) === 125) {
        s3 = peg$c10;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e26);
        }
      }
      if (s3 !== peg$FAILED) {
        s0 = peg$f7(s2);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e23);
      }
    }
    return s0;
  }
  function peg$parserestOfLineComment() {
    var s0, s1, s2, s3, s4;
    peg$silentFails++;
    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 59) {
      s1 = peg$c11;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e28);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      s3 = [];
      s4 = input.charAt(peg$currPos);
      if (peg$r8.test(s4)) {
        peg$currPos++;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e29);
        }
      }
      while (s4 !== peg$FAILED) {
        s3.push(s4);
        s4 = input.charAt(peg$currPos);
        if (peg$r8.test(s4)) {
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e29);
          }
        }
      }
      s2 = input.substring(s2, peg$currPos);
      s0 = peg$f8(s2);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e27);
      }
    }
    return s0;
  }
  function peg$parsevariation() {
    var s0, s2, s3, s5;
    peg$silentFails++;
    s0 = peg$currPos;
    peg$parse_();
    if (input.charCodeAt(peg$currPos) === 40) {
      s2 = peg$c12;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e31);
      }
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$parseline();
      if (s3 !== peg$FAILED) {
        peg$parse_();
        if (input.charCodeAt(peg$currPos) === 41) {
          s5 = peg$c13;
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e32);
          }
        }
        if (s5 !== peg$FAILED) {
          s0 = peg$f9(s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      if (peg$silentFails === 0) {
        peg$fail(peg$e30);
      }
    }
    return s0;
  }
  function peg$parsegameTerminationMarker() {
    var s0, s1, s3;
    peg$silentFails++;
    s0 = peg$currPos;
    if (input.substr(peg$currPos, 3) === peg$c14) {
      s1 = peg$c14;
      peg$currPos += 3;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e34);
      }
    }
    if (s1 === peg$FAILED) {
      if (input.substr(peg$currPos, 3) === peg$c15) {
        s1 = peg$c15;
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e35);
        }
      }
      if (s1 === peg$FAILED) {
        if (input.substr(peg$currPos, 7) === peg$c16) {
          s1 = peg$c16;
          peg$currPos += 7;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e36);
          }
        }
        if (s1 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 42) {
            s1 = peg$c17;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e37);
            }
          }
        }
      }
    }
    if (s1 !== peg$FAILED) {
      peg$parse_();
      s3 = peg$parsecomment();
      if (s3 === peg$FAILED) {
        s3 = null;
      }
      s0 = peg$f10(s1, s3);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e33);
      }
    }
    return s0;
  }
  function peg$parse_() {
    var s0, s1;
    peg$silentFails++;
    s0 = [];
    s1 = input.charAt(peg$currPos);
    if (peg$r9.test(s1)) {
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e39);
      }
    }
    while (s1 !== peg$FAILED) {
      s0.push(s1);
      s1 = input.charAt(peg$currPos);
      if (peg$r9.test(s1)) {
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e39);
        }
      }
    }
    peg$silentFails--;
    s1 = peg$FAILED;
    if (peg$silentFails === 0) {
      peg$fail(peg$e38);
    }
    return s0;
  }
  peg$result = peg$startRuleFunction();
  if (options.peg$library) {
    return (
      /** @type {any} */
      {
        peg$result,
        peg$currPos,
        peg$FAILED,
        peg$maxFailExpected,
        peg$maxFailPos
      }
    );
  }
  if (peg$result !== peg$FAILED && peg$currPos === input.length) {
    return peg$result;
  } else {
    if (peg$result !== peg$FAILED && peg$currPos < input.length) {
      peg$fail(peg$endExpectation());
    }
    throw peg$buildStructuredError(
      peg$maxFailExpected,
      peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
      peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
    );
  }
}
var MASK64 = 0xffffffffffffffffn;
function rotl(x, k) {
  return (x << k | x >> 64n - k) & 0xffffffffffffffffn;
}
function wrappingMul(x, y) {
  return x * y & MASK64;
}
function xoroshiro128(state) {
  return function() {
    let s0 = BigInt(state & MASK64);
    let s1 = BigInt(state >> 64n & MASK64);
    const result = wrappingMul(rotl(wrappingMul(s0, 5n), 7n), 9n);
    s1 ^= s0;
    s0 = (rotl(s0, 24n) ^ s1 ^ s1 << 16n) & MASK64;
    s1 = rotl(s1, 37n);
    state = s1 << 64n | s0;
    return result;
  };
}
var rand = xoroshiro128(0xa187eb39cdcaed8f31c4b365b102e01en);
var PIECE_KEYS = Array.from({ length: 2 }, () => Array.from({ length: 6 }, () => Array.from({ length: 128 }, () => rand())));
var EP_KEYS = Array.from({ length: 8 }, () => rand());
var CASTLING_KEYS = Array.from({ length: 16 }, () => rand());
var SIDE_KEY = rand();
var WHITE = "w";
var BLACK = "b";
var PAWN = "p";
var KNIGHT = "n";
var BISHOP = "b";
var ROOK = "r";
var QUEEN = "q";
var KING = "k";
var DEFAULT_POSITION = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
var Move = class {
  color;
  from;
  to;
  piece;
  captured;
  promotion;
  /**
   * @deprecated This field is deprecated and will be removed in version 2.0.0.
   * Please use move descriptor functions instead: `isCapture`, `isPromotion`,
   * `isEnPassant`, `isKingsideCastle`, `isQueensideCastle`, `isCastle`, and
   * `isBigPawn`
   */
  flags;
  san;
  lan;
  before;
  after;
  constructor(chess, internal) {
    const { color, piece, from, to, flags, captured, promotion } = internal;
    const fromAlgebraic = algebraic(from);
    const toAlgebraic = algebraic(to);
    this.color = color;
    this.piece = piece;
    this.from = fromAlgebraic;
    this.to = toAlgebraic;
    this.san = chess["_moveToSan"](internal, chess["_moves"]({ legal: true }));
    this.lan = fromAlgebraic + toAlgebraic;
    this.before = chess.fen();
    chess["_makeMove"](internal);
    this.after = chess.fen();
    chess["_undoMove"]();
    this.flags = "";
    for (const flag in BITS) {
      if (BITS[flag] & flags) {
        this.flags += FLAGS[flag];
      }
    }
    if (captured) {
      this.captured = captured;
    }
    if (promotion) {
      this.promotion = promotion;
      this.lan += promotion;
    }
  }
  isCapture() {
    return this.flags.indexOf(FLAGS["CAPTURE"]) > -1;
  }
  isPromotion() {
    return this.flags.indexOf(FLAGS["PROMOTION"]) > -1;
  }
  isEnPassant() {
    return this.flags.indexOf(FLAGS["EP_CAPTURE"]) > -1;
  }
  isKingsideCastle() {
    return this.flags.indexOf(FLAGS["KSIDE_CASTLE"]) > -1;
  }
  isQueensideCastle() {
    return this.flags.indexOf(FLAGS["QSIDE_CASTLE"]) > -1;
  }
  isBigPawn() {
    return this.flags.indexOf(FLAGS["BIG_PAWN"]) > -1;
  }
};
var EMPTY = -1;
var FLAGS = {
  NORMAL: "n",
  CAPTURE: "c",
  BIG_PAWN: "b",
  EP_CAPTURE: "e",
  PROMOTION: "p",
  KSIDE_CASTLE: "k",
  QSIDE_CASTLE: "q",
  NULL_MOVE: "-"
};
var BITS = {
  NORMAL: 1,
  CAPTURE: 2,
  BIG_PAWN: 4,
  EP_CAPTURE: 8,
  PROMOTION: 16,
  KSIDE_CASTLE: 32,
  QSIDE_CASTLE: 64,
  NULL_MOVE: 128
};
var SEVEN_TAG_ROSTER = {
  Event: "?",
  Site: "?",
  Date: "????.??.??",
  Round: "?",
  White: "?",
  Black: "?",
  Result: "*"
};
var SUPLEMENTAL_TAGS = {
  WhiteTitle: null,
  BlackTitle: null,
  WhiteElo: null,
  BlackElo: null,
  WhiteUSCF: null,
  BlackUSCF: null,
  WhiteNA: null,
  BlackNA: null,
  WhiteType: null,
  BlackType: null,
  EventDate: null,
  EventSponsor: null,
  Section: null,
  Stage: null,
  Board: null,
  Opening: null,
  Variation: null,
  SubVariation: null,
  ECO: null,
  NIC: null,
  Time: null,
  UTCTime: null,
  UTCDate: null,
  TimeControl: null,
  SetUp: null,
  FEN: null,
  Termination: null,
  Annotator: null,
  Mode: null,
  PlyCount: null
};
var HEADER_TEMPLATE = {
  ...SEVEN_TAG_ROSTER,
  ...SUPLEMENTAL_TAGS
};
var Ox88 = {
  a8: 0,
  b8: 1,
  c8: 2,
  d8: 3,
  e8: 4,
  f8: 5,
  g8: 6,
  h8: 7,
  a7: 16,
  b7: 17,
  c7: 18,
  d7: 19,
  e7: 20,
  f7: 21,
  g7: 22,
  h7: 23,
  a6: 32,
  b6: 33,
  c6: 34,
  d6: 35,
  e6: 36,
  f6: 37,
  g6: 38,
  h6: 39,
  a5: 48,
  b5: 49,
  c5: 50,
  d5: 51,
  e5: 52,
  f5: 53,
  g5: 54,
  h5: 55,
  a4: 64,
  b4: 65,
  c4: 66,
  d4: 67,
  e4: 68,
  f4: 69,
  g4: 70,
  h4: 71,
  a3: 80,
  b3: 81,
  c3: 82,
  d3: 83,
  e3: 84,
  f3: 85,
  g3: 86,
  h3: 87,
  a2: 96,
  b2: 97,
  c2: 98,
  d2: 99,
  e2: 100,
  f2: 101,
  g2: 102,
  h2: 103,
  a1: 112,
  b1: 113,
  c1: 114,
  d1: 115,
  e1: 116,
  f1: 117,
  g1: 118,
  h1: 119
};
var PAWN_OFFSETS = {
  b: [16, 32, 17, 15],
  w: [-16, -32, -17, -15]
};
var PIECE_OFFSETS = {
  n: [-18, -33, -31, -14, 18, 33, 31, 14],
  b: [-17, -15, 17, 15],
  r: [-16, 1, 16, -1],
  q: [-17, -16, -15, 1, 17, 16, 15, -1],
  k: [-17, -16, -15, 1, 17, 16, 15, -1]
};
var ATTACKS = [
  20,
  0,
  0,
  0,
  0,
  0,
  0,
  24,
  0,
  0,
  0,
  0,
  0,
  0,
  20,
  0,
  0,
  20,
  0,
  0,
  0,
  0,
  0,
  24,
  0,
  0,
  0,
  0,
  0,
  20,
  0,
  0,
  0,
  0,
  20,
  0,
  0,
  0,
  0,
  24,
  0,
  0,
  0,
  0,
  20,
  0,
  0,
  0,
  0,
  0,
  0,
  20,
  0,
  0,
  0,
  24,
  0,
  0,
  0,
  20,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  20,
  0,
  0,
  24,
  0,
  0,
  20,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  20,
  2,
  24,
  2,
  20,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  2,
  53,
  56,
  53,
  2,
  0,
  0,
  0,
  0,
  0,
  0,
  24,
  24,
  24,
  24,
  24,
  24,
  56,
  0,
  56,
  24,
  24,
  24,
  24,
  24,
  24,
  0,
  0,
  0,
  0,
  0,
  0,
  2,
  53,
  56,
  53,
  2,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  20,
  2,
  24,
  2,
  20,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  20,
  0,
  0,
  24,
  0,
  0,
  20,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  20,
  0,
  0,
  0,
  24,
  0,
  0,
  0,
  20,
  0,
  0,
  0,
  0,
  0,
  0,
  20,
  0,
  0,
  0,
  0,
  24,
  0,
  0,
  0,
  0,
  20,
  0,
  0,
  0,
  0,
  20,
  0,
  0,
  0,
  0,
  0,
  24,
  0,
  0,
  0,
  0,
  0,
  20,
  0,
  0,
  20,
  0,
  0,
  0,
  0,
  0,
  0,
  24,
  0,
  0,
  0,
  0,
  0,
  0,
  20
];
var RAYS = [
  17,
  0,
  0,
  0,
  0,
  0,
  0,
  16,
  0,
  0,
  0,
  0,
  0,
  0,
  15,
  0,
  0,
  17,
  0,
  0,
  0,
  0,
  0,
  16,
  0,
  0,
  0,
  0,
  0,
  15,
  0,
  0,
  0,
  0,
  17,
  0,
  0,
  0,
  0,
  16,
  0,
  0,
  0,
  0,
  15,
  0,
  0,
  0,
  0,
  0,
  0,
  17,
  0,
  0,
  0,
  16,
  0,
  0,
  0,
  15,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  17,
  0,
  0,
  16,
  0,
  0,
  15,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  17,
  0,
  16,
  0,
  15,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  17,
  16,
  15,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  0,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  -15,
  -16,
  -17,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  -15,
  0,
  -16,
  0,
  -17,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  -15,
  0,
  0,
  -16,
  0,
  0,
  -17,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  -15,
  0,
  0,
  0,
  -16,
  0,
  0,
  0,
  -17,
  0,
  0,
  0,
  0,
  0,
  0,
  -15,
  0,
  0,
  0,
  0,
  -16,
  0,
  0,
  0,
  0,
  -17,
  0,
  0,
  0,
  0,
  -15,
  0,
  0,
  0,
  0,
  0,
  -16,
  0,
  0,
  0,
  0,
  0,
  -17,
  0,
  0,
  -15,
  0,
  0,
  0,
  0,
  0,
  0,
  -16,
  0,
  0,
  0,
  0,
  0,
  0,
  -17
];
var PIECE_MASKS = { p: 1, n: 2, b: 4, r: 8, q: 16, k: 32 };
var SYMBOLS = "pnbrqkPNBRQK";
var PROMOTIONS = [KNIGHT, BISHOP, ROOK, QUEEN];
var RANK_1 = 7;
var RANK_2 = 6;
var RANK_7 = 1;
var RANK_8 = 0;
var SIDES = {
  [KING]: BITS.KSIDE_CASTLE,
  [QUEEN]: BITS.QSIDE_CASTLE
};
var ROOKS = {
  w: [
    { square: Ox88.a1, flag: BITS.QSIDE_CASTLE },
    { square: Ox88.h1, flag: BITS.KSIDE_CASTLE }
  ],
  b: [
    { square: Ox88.a8, flag: BITS.QSIDE_CASTLE },
    { square: Ox88.h8, flag: BITS.KSIDE_CASTLE }
  ]
};
var SECOND_RANK = { b: RANK_7, w: RANK_2 };
var SAN_NULLMOVE = "--";
function rank(square) {
  return square >> 4;
}
function file(square) {
  return square & 15;
}
function isDigit(c) {
  return "0123456789".indexOf(c) !== -1;
}
function algebraic(square) {
  const f = file(square);
  const r = rank(square);
  return "abcdefgh".substring(f, f + 1) + "87654321".substring(r, r + 1);
}
function swapColor(color) {
  return color === WHITE ? BLACK : WHITE;
}
function validateFen(fen) {
  const tokens = fen.split(/\s+/);
  if (tokens.length !== 6) {
    return {
      ok: false,
      error: "Invalid FEN: must contain six space-delimited fields"
    };
  }
  const moveNumber = parseInt(tokens[5], 10);
  if (isNaN(moveNumber) || moveNumber <= 0) {
    return {
      ok: false,
      error: "Invalid FEN: move number must be a positive integer"
    };
  }
  const halfMoves = parseInt(tokens[4], 10);
  if (isNaN(halfMoves) || halfMoves < 0) {
    return {
      ok: false,
      error: "Invalid FEN: half move counter number must be a non-negative integer"
    };
  }
  if (!/^(-|[abcdefgh][36])$/.test(tokens[3])) {
    return { ok: false, error: "Invalid FEN: en-passant square is invalid" };
  }
  if (/[^kKqQ-]/.test(tokens[2])) {
    return { ok: false, error: "Invalid FEN: castling availability is invalid" };
  }
  if (!/^(w|b)$/.test(tokens[1])) {
    return { ok: false, error: "Invalid FEN: side-to-move is invalid" };
  }
  const rows = tokens[0].split("/");
  if (rows.length !== 8) {
    return {
      ok: false,
      error: "Invalid FEN: piece data does not contain 8 '/'-delimited rows"
    };
  }
  for (let i = 0; i < rows.length; i++) {
    let sumFields = 0;
    let previousWasNumber = false;
    for (let k = 0; k < rows[i].length; k++) {
      if (isDigit(rows[i][k])) {
        if (previousWasNumber) {
          return {
            ok: false,
            error: "Invalid FEN: piece data is invalid (consecutive number)"
          };
        }
        sumFields += parseInt(rows[i][k], 10);
        previousWasNumber = true;
      } else {
        if (!/^[prnbqkPRNBQK]$/.test(rows[i][k])) {
          return {
            ok: false,
            error: "Invalid FEN: piece data is invalid (invalid piece)"
          };
        }
        sumFields += 1;
        previousWasNumber = false;
      }
    }
    if (sumFields !== 8) {
      return {
        ok: false,
        error: "Invalid FEN: piece data is invalid (too many squares in rank)"
      };
    }
  }
  if (tokens[3][1] == "3" && tokens[1] == "w" || tokens[3][1] == "6" && tokens[1] == "b") {
    return { ok: false, error: "Invalid FEN: illegal en-passant square" };
  }
  const kings = [
    { color: "white", regex: /K/g },
    { color: "black", regex: /k/g }
  ];
  for (const { color, regex } of kings) {
    if (!regex.test(tokens[0])) {
      return { ok: false, error: `Invalid FEN: missing ${color} king` };
    }
    if ((tokens[0].match(regex) || []).length > 1) {
      return { ok: false, error: `Invalid FEN: too many ${color} kings` };
    }
  }
  if (Array.from(rows[0] + rows[7]).some((char) => char.toUpperCase() === "P")) {
    return {
      ok: false,
      error: "Invalid FEN: some pawns are on the edge rows"
    };
  }
  return { ok: true };
}
function getDisambiguator(move, moves) {
  const from = move.from;
  const to = move.to;
  const piece = move.piece;
  let ambiguities = 0;
  let sameRank = 0;
  let sameFile = 0;
  for (let i = 0, len = moves.length; i < len; i++) {
    const ambigFrom = moves[i].from;
    const ambigTo = moves[i].to;
    const ambigPiece = moves[i].piece;
    if (piece === ambigPiece && from !== ambigFrom && to === ambigTo) {
      ambiguities++;
      if (rank(from) === rank(ambigFrom)) {
        sameRank++;
      }
      if (file(from) === file(ambigFrom)) {
        sameFile++;
      }
    }
  }
  if (ambiguities > 0) {
    if (sameRank > 0 && sameFile > 0) {
      return algebraic(from);
    } else if (sameFile > 0) {
      return algebraic(from).charAt(1);
    } else {
      return algebraic(from).charAt(0);
    }
  }
  return "";
}
function addMove(moves, color, from, to, piece, captured = void 0, flags = BITS.NORMAL) {
  const r = rank(to);
  if (piece === PAWN && (r === RANK_1 || r === RANK_8)) {
    for (let i = 0; i < PROMOTIONS.length; i++) {
      const promotion = PROMOTIONS[i];
      moves.push({
        color,
        from,
        to,
        piece,
        captured,
        promotion,
        flags: flags | BITS.PROMOTION
      });
    }
  } else {
    moves.push({
      color,
      from,
      to,
      piece,
      captured,
      flags
    });
  }
}
function inferPieceType(san) {
  let pieceType = san.charAt(0);
  if (pieceType >= "a" && pieceType <= "h") {
    const matches = san.match(/[a-h]\d.*[a-h]\d/);
    if (matches) {
      return void 0;
    }
    return PAWN;
  }
  pieceType = pieceType.toLowerCase();
  if (pieceType === "o") {
    return KING;
  }
  return pieceType;
}
function strippedSan(move) {
  return move.replace(/=/, "").replace(/[+#]?[?!]*$/, "");
}
var Chess = class {
  _board = new Array(128);
  _turn = WHITE;
  _header = {};
  _kings = { w: EMPTY, b: EMPTY };
  _epSquare = -1;
  _halfMoves = 0;
  _moveNumber = 0;
  _history = [];
  _comments = {};
  _castling = { w: 0, b: 0 };
  _hash = 0n;
  // tracks number of times a position has been seen for repetition checking
  _positionCount = /* @__PURE__ */ new Map();
  constructor(fen = DEFAULT_POSITION, { skipValidation = false } = {}) {
    this.load(fen, { skipValidation });
  }
  clear({ preserveHeaders = false } = {}) {
    this._board = new Array(128);
    this._kings = { w: EMPTY, b: EMPTY };
    this._turn = WHITE;
    this._castling = { w: 0, b: 0 };
    this._epSquare = EMPTY;
    this._halfMoves = 0;
    this._moveNumber = 1;
    this._history = [];
    this._comments = {};
    this._header = preserveHeaders ? this._header : { ...HEADER_TEMPLATE };
    this._hash = this._computeHash();
    this._positionCount = /* @__PURE__ */ new Map();
    this._header["SetUp"] = null;
    this._header["FEN"] = null;
  }
  load(fen, { skipValidation = false, preserveHeaders = false } = {}) {
    let tokens = fen.split(/\s+/);
    if (tokens.length >= 2 && tokens.length < 6) {
      const adjustments = ["-", "-", "0", "1"];
      fen = tokens.concat(adjustments.slice(-(6 - tokens.length))).join(" ");
    }
    tokens = fen.split(/\s+/);
    if (!skipValidation) {
      const { ok, error } = validateFen(fen);
      if (!ok) {
        throw new Error(error);
      }
    }
    const position = tokens[0];
    let square = 0;
    this.clear({ preserveHeaders });
    for (let i = 0; i < position.length; i++) {
      const piece = position.charAt(i);
      if (piece === "/") {
        square += 8;
      } else if (isDigit(piece)) {
        square += parseInt(piece, 10);
      } else {
        const color = piece < "a" ? WHITE : BLACK;
        this._put({ type: piece.toLowerCase(), color }, algebraic(square));
        square++;
      }
    }
    this._turn = tokens[1];
    if (tokens[2].indexOf("K") > -1) {
      this._castling.w |= BITS.KSIDE_CASTLE;
    }
    if (tokens[2].indexOf("Q") > -1) {
      this._castling.w |= BITS.QSIDE_CASTLE;
    }
    if (tokens[2].indexOf("k") > -1) {
      this._castling.b |= BITS.KSIDE_CASTLE;
    }
    if (tokens[2].indexOf("q") > -1) {
      this._castling.b |= BITS.QSIDE_CASTLE;
    }
    this._epSquare = tokens[3] === "-" ? EMPTY : Ox88[tokens[3]];
    this._halfMoves = parseInt(tokens[4], 10);
    this._moveNumber = parseInt(tokens[5], 10);
    this._hash = this._computeHash();
    this._updateSetup(fen);
    this._incPositionCount();
  }
  fen({ forceEnpassantSquare = false } = {}) {
    let empty = 0;
    let fen = "";
    for (let i = Ox88.a8; i <= Ox88.h1; i++) {
      if (this._board[i]) {
        if (empty > 0) {
          fen += empty;
          empty = 0;
        }
        const { color, type: piece } = this._board[i];
        fen += color === WHITE ? piece.toUpperCase() : piece.toLowerCase();
      } else {
        empty++;
      }
      if (i + 1 & 136) {
        if (empty > 0) {
          fen += empty;
        }
        if (i !== Ox88.h1) {
          fen += "/";
        }
        empty = 0;
        i += 8;
      }
    }
    let castling = "";
    if (this._castling[WHITE] & BITS.KSIDE_CASTLE) {
      castling += "K";
    }
    if (this._castling[WHITE] & BITS.QSIDE_CASTLE) {
      castling += "Q";
    }
    if (this._castling[BLACK] & BITS.KSIDE_CASTLE) {
      castling += "k";
    }
    if (this._castling[BLACK] & BITS.QSIDE_CASTLE) {
      castling += "q";
    }
    castling = castling || "-";
    let epSquare = "-";
    if (this._epSquare !== EMPTY) {
      if (forceEnpassantSquare) {
        epSquare = algebraic(this._epSquare);
      } else {
        const bigPawnSquare = this._epSquare + (this._turn === WHITE ? 16 : -16);
        const squares = [bigPawnSquare + 1, bigPawnSquare - 1];
        for (const square of squares) {
          if (square & 136) {
            continue;
          }
          const color = this._turn;
          if (this._board[square]?.color === color && this._board[square]?.type === PAWN) {
            this._makeMove({
              color,
              from: square,
              to: this._epSquare,
              piece: PAWN,
              captured: PAWN,
              flags: BITS.EP_CAPTURE
            });
            const isLegal = !this._isKingAttacked(color);
            this._undoMove();
            if (isLegal) {
              epSquare = algebraic(this._epSquare);
              break;
            }
          }
        }
      }
    }
    return [
      fen,
      this._turn,
      castling,
      epSquare,
      this._halfMoves,
      this._moveNumber
    ].join(" ");
  }
  _pieceKey(i) {
    if (!this._board[i]) {
      return 0n;
    }
    const { color, type } = this._board[i];
    const colorIndex = {
      w: 0,
      b: 1
    }[color];
    const typeIndex = {
      p: 0,
      n: 1,
      b: 2,
      r: 3,
      q: 4,
      k: 5
    }[type];
    return PIECE_KEYS[colorIndex][typeIndex][i];
  }
  _epKey() {
    return this._epSquare === EMPTY ? 0n : EP_KEYS[this._epSquare & 7];
  }
  _castlingKey() {
    const index = this._castling.w >> 5 | this._castling.b >> 3;
    return CASTLING_KEYS[index];
  }
  _computeHash() {
    let hash = 0n;
    for (let i = Ox88.a8; i <= Ox88.h1; i++) {
      if (i & 136) {
        i += 7;
        continue;
      }
      if (this._board[i]) {
        hash ^= this._pieceKey(i);
      }
    }
    hash ^= this._epKey();
    hash ^= this._castlingKey();
    if (this._turn === "b") {
      hash ^= SIDE_KEY;
    }
    return hash;
  }
  /*
   * Called when the initial board setup is changed with put() or remove().
   * modifies the SetUp and FEN properties of the header object. If the FEN
   * is equal to the default position, the SetUp and FEN are deleted the setup
   * is only updated if history.length is zero, ie moves haven't been made.
   */
  _updateSetup(fen) {
    if (this._history.length > 0)
      return;
    if (fen !== DEFAULT_POSITION) {
      this._header["SetUp"] = "1";
      this._header["FEN"] = fen;
    } else {
      this._header["SetUp"] = null;
      this._header["FEN"] = null;
    }
  }
  reset() {
    this.load(DEFAULT_POSITION);
  }
  get(square) {
    return this._board[Ox88[square]];
  }
  findPiece(piece) {
    const squares = [];
    for (let i = Ox88.a8; i <= Ox88.h1; i++) {
      if (i & 136) {
        i += 7;
        continue;
      }
      if (!this._board[i] || this._board[i]?.color !== piece.color) {
        continue;
      }
      if (this._board[i].color === piece.color && this._board[i].type === piece.type) {
        squares.push(algebraic(i));
      }
    }
    return squares;
  }
  put({ type, color }, square) {
    if (this._put({ type, color }, square)) {
      this._updateCastlingRights();
      this._updateEnPassantSquare();
      this._updateSetup(this.fen());
      return true;
    }
    return false;
  }
  _set(sq, piece) {
    this._hash ^= this._pieceKey(sq);
    this._board[sq] = piece;
    this._hash ^= this._pieceKey(sq);
  }
  _put({ type, color }, square) {
    if (SYMBOLS.indexOf(type.toLowerCase()) === -1) {
      return false;
    }
    if (!(square in Ox88)) {
      return false;
    }
    const sq = Ox88[square];
    if (type == KING && !(this._kings[color] == EMPTY || this._kings[color] == sq)) {
      return false;
    }
    const currentPieceOnSquare = this._board[sq];
    if (currentPieceOnSquare && currentPieceOnSquare.type === KING) {
      this._kings[currentPieceOnSquare.color] = EMPTY;
    }
    this._set(sq, { type, color });
    if (type === KING) {
      this._kings[color] = sq;
    }
    return true;
  }
  _clear(sq) {
    this._hash ^= this._pieceKey(sq);
    delete this._board[sq];
  }
  remove(square) {
    const piece = this.get(square);
    this._clear(Ox88[square]);
    if (piece && piece.type === KING) {
      this._kings[piece.color] = EMPTY;
    }
    this._updateCastlingRights();
    this._updateEnPassantSquare();
    this._updateSetup(this.fen());
    return piece;
  }
  _updateCastlingRights() {
    this._hash ^= this._castlingKey();
    const whiteKingInPlace = this._board[Ox88.e1]?.type === KING && this._board[Ox88.e1]?.color === WHITE;
    const blackKingInPlace = this._board[Ox88.e8]?.type === KING && this._board[Ox88.e8]?.color === BLACK;
    if (!whiteKingInPlace || this._board[Ox88.a1]?.type !== ROOK || this._board[Ox88.a1]?.color !== WHITE) {
      this._castling.w &= -65;
    }
    if (!whiteKingInPlace || this._board[Ox88.h1]?.type !== ROOK || this._board[Ox88.h1]?.color !== WHITE) {
      this._castling.w &= -33;
    }
    if (!blackKingInPlace || this._board[Ox88.a8]?.type !== ROOK || this._board[Ox88.a8]?.color !== BLACK) {
      this._castling.b &= -65;
    }
    if (!blackKingInPlace || this._board[Ox88.h8]?.type !== ROOK || this._board[Ox88.h8]?.color !== BLACK) {
      this._castling.b &= -33;
    }
    this._hash ^= this._castlingKey();
  }
  _updateEnPassantSquare() {
    if (this._epSquare === EMPTY) {
      return;
    }
    const startSquare = this._epSquare + (this._turn === WHITE ? -16 : 16);
    const currentSquare = this._epSquare + (this._turn === WHITE ? 16 : -16);
    const attackers = [currentSquare + 1, currentSquare - 1];
    if (this._board[startSquare] !== null || this._board[this._epSquare] !== null || this._board[currentSquare]?.color !== swapColor(this._turn) || this._board[currentSquare]?.type !== PAWN) {
      this._hash ^= this._epKey();
      this._epSquare = EMPTY;
      return;
    }
    const canCapture = (square) => !(square & 136) && this._board[square]?.color === this._turn && this._board[square]?.type === PAWN;
    if (!attackers.some(canCapture)) {
      this._hash ^= this._epKey();
      this._epSquare = EMPTY;
    }
  }
  _attacked(color, square, verbose) {
    const attackers = [];
    for (let i = Ox88.a8; i <= Ox88.h1; i++) {
      if (i & 136) {
        i += 7;
        continue;
      }
      if (this._board[i] === void 0 || this._board[i].color !== color) {
        continue;
      }
      const piece = this._board[i];
      const difference = i - square;
      if (difference === 0) {
        continue;
      }
      const index = difference + 119;
      if (ATTACKS[index] & PIECE_MASKS[piece.type]) {
        if (piece.type === PAWN) {
          if (difference > 0 && piece.color === WHITE || difference <= 0 && piece.color === BLACK) {
            if (!verbose) {
              return true;
            } else {
              attackers.push(algebraic(i));
            }
          }
          continue;
        }
        if (piece.type === "n" || piece.type === "k") {
          if (!verbose) {
            return true;
          } else {
            attackers.push(algebraic(i));
            continue;
          }
        }
        const offset = RAYS[index];
        let j = i + offset;
        let blocked = false;
        while (j !== square) {
          if (this._board[j] != null) {
            blocked = true;
            break;
          }
          j += offset;
        }
        if (!blocked) {
          if (!verbose) {
            return true;
          } else {
            attackers.push(algebraic(i));
            continue;
          }
        }
      }
    }
    if (verbose) {
      return attackers;
    } else {
      return false;
    }
  }
  attackers(square, attackedBy) {
    if (!attackedBy) {
      return this._attacked(this._turn, Ox88[square], true);
    } else {
      return this._attacked(attackedBy, Ox88[square], true);
    }
  }
  _isKingAttacked(color) {
    const square = this._kings[color];
    return square === -1 ? false : this._attacked(swapColor(color), square);
  }
  hash() {
    return this._hash.toString(16);
  }
  isAttacked(square, attackedBy) {
    return this._attacked(attackedBy, Ox88[square]);
  }
  isCheck() {
    return this._isKingAttacked(this._turn);
  }
  inCheck() {
    return this.isCheck();
  }
  isCheckmate() {
    return this.isCheck() && this._moves().length === 0;
  }
  isStalemate() {
    return !this.isCheck() && this._moves().length === 0;
  }
  isInsufficientMaterial() {
    const pieces = {
      b: 0,
      n: 0,
      r: 0,
      q: 0,
      k: 0,
      p: 0
    };
    const bishops = [];
    let numPieces = 0;
    let squareColor = 0;
    for (let i = Ox88.a8; i <= Ox88.h1; i++) {
      squareColor = (squareColor + 1) % 2;
      if (i & 136) {
        i += 7;
        continue;
      }
      const piece = this._board[i];
      if (piece) {
        pieces[piece.type] = piece.type in pieces ? pieces[piece.type] + 1 : 1;
        if (piece.type === BISHOP) {
          bishops.push(squareColor);
        }
        numPieces++;
      }
    }
    if (numPieces === 2) {
      return true;
    } else if (
      // k vs. kn .... or .... k vs. kb
      numPieces === 3 && (pieces[BISHOP] === 1 || pieces[KNIGHT] === 1)
    ) {
      return true;
    } else if (numPieces === pieces[BISHOP] + 2) {
      let sum = 0;
      const len = bishops.length;
      for (let i = 0; i < len; i++) {
        sum += bishops[i];
      }
      if (sum === 0 || sum === len) {
        return true;
      }
    }
    return false;
  }
  isThreefoldRepetition() {
    return this._getPositionCount(this._hash) >= 3;
  }
  isDrawByFiftyMoves() {
    return this._halfMoves >= 100;
  }
  isDraw() {
    return this.isDrawByFiftyMoves() || this.isStalemate() || this.isInsufficientMaterial() || this.isThreefoldRepetition();
  }
  isGameOver() {
    return this.isCheckmate() || this.isDraw();
  }
  moves({ verbose = false, square = void 0, piece = void 0 } = {}) {
    const moves = this._moves({ square, piece });
    if (verbose) {
      return moves.map((move) => new Move(this, move));
    } else {
      return moves.map((move) => this._moveToSan(move, moves));
    }
  }
  _moves({ legal = true, piece = void 0, square = void 0 } = {}) {
    const forSquare = square ? square.toLowerCase() : void 0;
    const forPiece = piece?.toLowerCase();
    const moves = [];
    const us = this._turn;
    const them = swapColor(us);
    let firstSquare = Ox88.a8;
    let lastSquare = Ox88.h1;
    let singleSquare = false;
    if (forSquare) {
      if (!(forSquare in Ox88)) {
        return [];
      } else {
        firstSquare = lastSquare = Ox88[forSquare];
        singleSquare = true;
      }
    }
    for (let from = firstSquare; from <= lastSquare; from++) {
      if (from & 136) {
        from += 7;
        continue;
      }
      if (!this._board[from] || this._board[from].color === them) {
        continue;
      }
      const { type } = this._board[from];
      let to;
      if (type === PAWN) {
        if (forPiece && forPiece !== type)
          continue;
        to = from + PAWN_OFFSETS[us][0];
        if (!this._board[to]) {
          addMove(moves, us, from, to, PAWN);
          to = from + PAWN_OFFSETS[us][1];
          if (SECOND_RANK[us] === rank(from) && !this._board[to]) {
            addMove(moves, us, from, to, PAWN, void 0, BITS.BIG_PAWN);
          }
        }
        for (let j = 2; j < 4; j++) {
          to = from + PAWN_OFFSETS[us][j];
          if (to & 136)
            continue;
          if (this._board[to]?.color === them) {
            addMove(moves, us, from, to, PAWN, this._board[to].type, BITS.CAPTURE);
          } else if (to === this._epSquare) {
            addMove(moves, us, from, to, PAWN, PAWN, BITS.EP_CAPTURE);
          }
        }
      } else {
        if (forPiece && forPiece !== type)
          continue;
        for (let j = 0, len = PIECE_OFFSETS[type].length; j < len; j++) {
          const offset = PIECE_OFFSETS[type][j];
          to = from;
          while (true) {
            to += offset;
            if (to & 136)
              break;
            if (!this._board[to]) {
              addMove(moves, us, from, to, type);
            } else {
              if (this._board[to].color === us)
                break;
              addMove(moves, us, from, to, type, this._board[to].type, BITS.CAPTURE);
              break;
            }
            if (type === KNIGHT || type === KING)
              break;
          }
        }
      }
    }
    if (forPiece === void 0 || forPiece === KING) {
      if (!singleSquare || lastSquare === this._kings[us]) {
        if (this._castling[us] & BITS.KSIDE_CASTLE) {
          const castlingFrom = this._kings[us];
          const castlingTo = castlingFrom + 2;
          if (!this._board[castlingFrom + 1] && !this._board[castlingTo] && !this._attacked(them, this._kings[us]) && !this._attacked(them, castlingFrom + 1) && !this._attacked(them, castlingTo)) {
            addMove(moves, us, this._kings[us], castlingTo, KING, void 0, BITS.KSIDE_CASTLE);
          }
        }
        if (this._castling[us] & BITS.QSIDE_CASTLE) {
          const castlingFrom = this._kings[us];
          const castlingTo = castlingFrom - 2;
          if (!this._board[castlingFrom - 1] && !this._board[castlingFrom - 2] && !this._board[castlingFrom - 3] && !this._attacked(them, this._kings[us]) && !this._attacked(them, castlingFrom - 1) && !this._attacked(them, castlingTo)) {
            addMove(moves, us, this._kings[us], castlingTo, KING, void 0, BITS.QSIDE_CASTLE);
          }
        }
      }
    }
    if (!legal || this._kings[us] === -1) {
      return moves;
    }
    const legalMoves = [];
    for (let i = 0, len = moves.length; i < len; i++) {
      this._makeMove(moves[i]);
      if (!this._isKingAttacked(us)) {
        legalMoves.push(moves[i]);
      }
      this._undoMove();
    }
    return legalMoves;
  }
  move(move, { strict = false } = {}) {
    let moveObj = null;
    if (typeof move === "string") {
      moveObj = this._moveFromSan(move, strict);
    } else if (move === null) {
      moveObj = this._moveFromSan(SAN_NULLMOVE, strict);
    } else if (typeof move === "object") {
      const moves = this._moves();
      for (let i = 0, len = moves.length; i < len; i++) {
        if (move.from === algebraic(moves[i].from) && move.to === algebraic(moves[i].to) && (!("promotion" in moves[i]) || move.promotion === moves[i].promotion)) {
          moveObj = moves[i];
          break;
        }
      }
    }
    if (!moveObj) {
      if (typeof move === "string") {
        throw new Error(`Invalid move: ${move}`);
      } else {
        throw new Error(`Invalid move: ${JSON.stringify(move)}`);
      }
    }
    if (this.isCheck() && moveObj.flags & BITS.NULL_MOVE) {
      throw new Error("Null move not allowed when in check");
    }
    const prettyMove = new Move(this, moveObj);
    this._makeMove(moveObj);
    this._incPositionCount();
    return prettyMove;
  }
  _push(move) {
    this._history.push({
      move,
      kings: { b: this._kings.b, w: this._kings.w },
      turn: this._turn,
      castling: { b: this._castling.b, w: this._castling.w },
      epSquare: this._epSquare,
      halfMoves: this._halfMoves,
      moveNumber: this._moveNumber
    });
  }
  _movePiece(from, to) {
    this._hash ^= this._pieceKey(from);
    this._board[to] = this._board[from];
    delete this._board[from];
    this._hash ^= this._pieceKey(to);
  }
  _makeMove(move) {
    const us = this._turn;
    const them = swapColor(us);
    this._push(move);
    if (move.flags & BITS.NULL_MOVE) {
      if (us === BLACK) {
        this._moveNumber++;
      }
      this._halfMoves++;
      this._turn = them;
      this._epSquare = EMPTY;
      return;
    }
    this._hash ^= this._epKey();
    this._hash ^= this._castlingKey();
    if (move.captured) {
      this._hash ^= this._pieceKey(move.to);
    }
    this._movePiece(move.from, move.to);
    if (move.flags & BITS.EP_CAPTURE) {
      if (this._turn === BLACK) {
        this._clear(move.to - 16);
      } else {
        this._clear(move.to + 16);
      }
    }
    if (move.promotion) {
      this._clear(move.to);
      this._set(move.to, { type: move.promotion, color: us });
    }
    if (this._board[move.to].type === KING) {
      this._kings[us] = move.to;
      if (move.flags & BITS.KSIDE_CASTLE) {
        const castlingTo = move.to - 1;
        const castlingFrom = move.to + 1;
        this._movePiece(castlingFrom, castlingTo);
      } else if (move.flags & BITS.QSIDE_CASTLE) {
        const castlingTo = move.to + 1;
        const castlingFrom = move.to - 2;
        this._movePiece(castlingFrom, castlingTo);
      }
      this._castling[us] = 0;
    }
    if (this._castling[us]) {
      for (let i = 0, len = ROOKS[us].length; i < len; i++) {
        if (move.from === ROOKS[us][i].square && this._castling[us] & ROOKS[us][i].flag) {
          this._castling[us] ^= ROOKS[us][i].flag;
          break;
        }
      }
    }
    if (this._castling[them]) {
      for (let i = 0, len = ROOKS[them].length; i < len; i++) {
        if (move.to === ROOKS[them][i].square && this._castling[them] & ROOKS[them][i].flag) {
          this._castling[them] ^= ROOKS[them][i].flag;
          break;
        }
      }
    }
    this._hash ^= this._castlingKey();
    if (move.flags & BITS.BIG_PAWN) {
      let epSquare;
      if (us === BLACK) {
        epSquare = move.to - 16;
      } else {
        epSquare = move.to + 16;
      }
      if (!(move.to - 1 & 136) && this._board[move.to - 1]?.type === PAWN && this._board[move.to - 1]?.color === them || !(move.to + 1 & 136) && this._board[move.to + 1]?.type === PAWN && this._board[move.to + 1]?.color === them) {
        this._epSquare = epSquare;
        this._hash ^= this._epKey();
      } else {
        this._epSquare = EMPTY;
      }
    } else {
      this._epSquare = EMPTY;
    }
    if (move.piece === PAWN) {
      this._halfMoves = 0;
    } else if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
      this._halfMoves = 0;
    } else {
      this._halfMoves++;
    }
    if (us === BLACK) {
      this._moveNumber++;
    }
    this._turn = them;
    this._hash ^= SIDE_KEY;
  }
  undo() {
    const hash = this._hash;
    const move = this._undoMove();
    if (move) {
      const prettyMove = new Move(this, move);
      this._decPositionCount(hash);
      return prettyMove;
    }
    return null;
  }
  _undoMove() {
    const old = this._history.pop();
    if (old === void 0) {
      return null;
    }
    this._hash ^= this._epKey();
    this._hash ^= this._castlingKey();
    const move = old.move;
    this._kings = old.kings;
    this._turn = old.turn;
    this._castling = old.castling;
    this._epSquare = old.epSquare;
    this._halfMoves = old.halfMoves;
    this._moveNumber = old.moveNumber;
    this._hash ^= this._epKey();
    this._hash ^= this._castlingKey();
    this._hash ^= SIDE_KEY;
    const us = this._turn;
    const them = swapColor(us);
    if (move.flags & BITS.NULL_MOVE) {
      return move;
    }
    this._movePiece(move.to, move.from);
    if (move.piece) {
      this._clear(move.from);
      this._set(move.from, { type: move.piece, color: us });
    }
    if (move.captured) {
      if (move.flags & BITS.EP_CAPTURE) {
        let index;
        if (us === BLACK) {
          index = move.to - 16;
        } else {
          index = move.to + 16;
        }
        this._set(index, { type: PAWN, color: them });
      } else {
        this._set(move.to, { type: move.captured, color: them });
      }
    }
    if (move.flags & (BITS.KSIDE_CASTLE | BITS.QSIDE_CASTLE)) {
      let castlingTo, castlingFrom;
      if (move.flags & BITS.KSIDE_CASTLE) {
        castlingTo = move.to + 1;
        castlingFrom = move.to - 1;
      } else {
        castlingTo = move.to - 2;
        castlingFrom = move.to + 1;
      }
      this._movePiece(castlingFrom, castlingTo);
    }
    return move;
  }
  pgn({ newline = "\n", maxWidth = 0 } = {}) {
    const result = [];
    let headerExists = false;
    for (const i in this._header) {
      const headerTag = this._header[i];
      if (headerTag)
        result.push(`[${i} "${this._header[i]}"]` + newline);
      headerExists = true;
    }
    if (headerExists && this._history.length) {
      result.push(newline);
    }
    const appendComment = (moveString2) => {
      const comment = this._comments[this.fen()];
      if (typeof comment !== "undefined") {
        const delimiter = moveString2.length > 0 ? " " : "";
        moveString2 = `${moveString2}${delimiter}{${comment}}`;
      }
      return moveString2;
    };
    const reversedHistory = [];
    while (this._history.length > 0) {
      reversedHistory.push(this._undoMove());
    }
    const moves = [];
    let moveString = "";
    if (reversedHistory.length === 0) {
      moves.push(appendComment(""));
    }
    while (reversedHistory.length > 0) {
      moveString = appendComment(moveString);
      const move = reversedHistory.pop();
      if (!move) {
        break;
      }
      if (!this._history.length && move.color === "b") {
        const prefix = `${this._moveNumber}. ...`;
        moveString = moveString ? `${moveString} ${prefix}` : prefix;
      } else if (move.color === "w") {
        if (moveString.length) {
          moves.push(moveString);
        }
        moveString = this._moveNumber + ".";
      }
      moveString = moveString + " " + this._moveToSan(move, this._moves({ legal: true }));
      this._makeMove(move);
    }
    if (moveString.length) {
      moves.push(appendComment(moveString));
    }
    moves.push(this._header.Result || "*");
    if (maxWidth === 0) {
      return result.join("") + moves.join(" ");
    }
    const strip = function() {
      if (result.length > 0 && result[result.length - 1] === " ") {
        result.pop();
        return true;
      }
      return false;
    };
    const wrapComment = function(width, move) {
      for (const token of move.split(" ")) {
        if (!token) {
          continue;
        }
        if (width + token.length > maxWidth) {
          while (strip()) {
            width--;
          }
          result.push(newline);
          width = 0;
        }
        result.push(token);
        width += token.length;
        result.push(" ");
        width++;
      }
      if (strip()) {
        width--;
      }
      return width;
    };
    let currentWidth = 0;
    for (let i = 0; i < moves.length; i++) {
      if (currentWidth + moves[i].length > maxWidth) {
        if (moves[i].includes("{")) {
          currentWidth = wrapComment(currentWidth, moves[i]);
          continue;
        }
      }
      if (currentWidth + moves[i].length > maxWidth && i !== 0) {
        if (result[result.length - 1] === " ") {
          result.pop();
        }
        result.push(newline);
        currentWidth = 0;
      } else if (i !== 0) {
        result.push(" ");
        currentWidth++;
      }
      result.push(moves[i]);
      currentWidth += moves[i].length;
    }
    return result.join("");
  }
  /**
   * @deprecated Use `setHeader` and `getHeaders` instead. This method will return null header tags (which is not what you want)
   */
  header(...args) {
    for (let i = 0; i < args.length; i += 2) {
      if (typeof args[i] === "string" && typeof args[i + 1] === "string") {
        this._header[args[i]] = args[i + 1];
      }
    }
    return this._header;
  }
  // TODO: value validation per spec
  setHeader(key, value) {
    this._header[key] = value ?? SEVEN_TAG_ROSTER[key] ?? null;
    return this.getHeaders();
  }
  removeHeader(key) {
    if (key in this._header) {
      this._header[key] = SEVEN_TAG_ROSTER[key] || null;
      return true;
    }
    return false;
  }
  // return only non-null headers (omit placemarker nulls)
  getHeaders() {
    const nonNullHeaders = {};
    for (const [key, value] of Object.entries(this._header)) {
      if (value !== null) {
        nonNullHeaders[key] = value;
      }
    }
    return nonNullHeaders;
  }
  loadPgn(pgn2, { strict = false, newlineChar = "\r?\n" } = {}) {
    if (newlineChar !== "\r?\n") {
      pgn2 = pgn2.replace(new RegExp(newlineChar, "g"), "\n");
    }
    const parsedPgn = peg$parse(pgn2);
    this.reset();
    const headers = parsedPgn.headers;
    let fen = "";
    for (const key in headers) {
      if (key.toLowerCase() === "fen") {
        fen = headers[key];
      }
      this.header(key, headers[key]);
    }
    if (!strict) {
      if (fen) {
        this.load(fen, { preserveHeaders: true });
      }
    } else {
      if (headers["SetUp"] === "1") {
        if (!("FEN" in headers)) {
          throw new Error("Invalid PGN: FEN tag must be supplied with SetUp tag");
        }
        this.load(headers["FEN"], { preserveHeaders: true });
      }
    }
    let node2 = parsedPgn.root;
    while (node2) {
      if (node2.move) {
        const move = this._moveFromSan(node2.move, strict);
        if (move == null) {
          throw new Error(`Invalid move in PGN: ${node2.move}`);
        } else {
          this._makeMove(move);
          this._incPositionCount();
        }
      }
      if (node2.comment !== void 0) {
        this._comments[this.fen()] = node2.comment;
      }
      node2 = node2.variations[0];
    }
    const result = parsedPgn.result;
    if (result && Object.keys(this._header).length && this._header["Result"] !== result) {
      this.setHeader("Result", result);
    }
  }
  /*
   * Convert a move from 0x88 coordinates to Standard Algebraic Notation
   * (SAN)
   *
   * @param {boolean} strict Use the strict SAN parser. It will throw errors
   * on overly disambiguated moves (see below):
   *
   * r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4
   * 4. ... Nge7 is overly disambiguated because the knight on c6 is pinned
   * 4. ... Ne7 is technically the valid SAN
   */
  _moveToSan(move, moves) {
    let output = "";
    if (move.flags & BITS.KSIDE_CASTLE) {
      output = "O-O";
    } else if (move.flags & BITS.QSIDE_CASTLE) {
      output = "O-O-O";
    } else if (move.flags & BITS.NULL_MOVE) {
      return SAN_NULLMOVE;
    } else {
      if (move.piece !== PAWN) {
        const disambiguator = getDisambiguator(move, moves);
        output += move.piece.toUpperCase() + disambiguator;
      }
      if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
        if (move.piece === PAWN) {
          output += algebraic(move.from)[0];
        }
        output += "x";
      }
      output += algebraic(move.to);
      if (move.promotion) {
        output += "=" + move.promotion.toUpperCase();
      }
    }
    this._makeMove(move);
    if (this.isCheck()) {
      if (this.isCheckmate()) {
        output += "#";
      } else {
        output += "+";
      }
    }
    this._undoMove();
    return output;
  }
  // convert a move from Standard Algebraic Notation (SAN) to 0x88 coordinates
  _moveFromSan(move, strict = false) {
    let cleanMove = strippedSan(move);
    if (!strict) {
      if (cleanMove === "0-0") {
        cleanMove = "O-O";
      } else if (cleanMove === "0-0-0") {
        cleanMove = "O-O-O";
      }
    }
    if (cleanMove == SAN_NULLMOVE) {
      const res = {
        color: this._turn,
        from: 0,
        to: 0,
        piece: "k",
        flags: BITS.NULL_MOVE
      };
      return res;
    }
    let pieceType = inferPieceType(cleanMove);
    let moves = this._moves({ legal: true, piece: pieceType });
    for (let i = 0, len = moves.length; i < len; i++) {
      if (cleanMove === strippedSan(this._moveToSan(moves[i], moves))) {
        return moves[i];
      }
    }
    if (strict) {
      return null;
    }
    let piece = void 0;
    let matches = void 0;
    let from = void 0;
    let to = void 0;
    let promotion = void 0;
    let overlyDisambiguated = false;
    matches = cleanMove.match(/([pnbrqkPNBRQK])?([a-h][1-8])x?-?([a-h][1-8])([qrbnQRBN])?/);
    if (matches) {
      piece = matches[1];
      from = matches[2];
      to = matches[3];
      promotion = matches[4];
      if (from.length == 1) {
        overlyDisambiguated = true;
      }
    } else {
      matches = cleanMove.match(/([pnbrqkPNBRQK])?([a-h]?[1-8]?)x?-?([a-h][1-8])([qrbnQRBN])?/);
      if (matches) {
        piece = matches[1];
        from = matches[2];
        to = matches[3];
        promotion = matches[4];
        if (from.length == 1) {
          overlyDisambiguated = true;
        }
      }
    }
    pieceType = inferPieceType(cleanMove);
    moves = this._moves({
      legal: true,
      piece: piece ? piece : pieceType
    });
    if (!to) {
      return null;
    }
    for (let i = 0, len = moves.length; i < len; i++) {
      if (!from) {
        if (cleanMove === strippedSan(this._moveToSan(moves[i], moves)).replace("x", "")) {
          return moves[i];
        }
      } else if ((!piece || piece.toLowerCase() == moves[i].piece) && Ox88[from] == moves[i].from && Ox88[to] == moves[i].to && (!promotion || promotion.toLowerCase() == moves[i].promotion)) {
        return moves[i];
      } else if (overlyDisambiguated) {
        const square = algebraic(moves[i].from);
        if ((!piece || piece.toLowerCase() == moves[i].piece) && Ox88[to] == moves[i].to && (from == square[0] || from == square[1]) && (!promotion || promotion.toLowerCase() == moves[i].promotion)) {
          return moves[i];
        }
      }
    }
    return null;
  }
  ascii() {
    let s = "   +------------------------+\n";
    for (let i = Ox88.a8; i <= Ox88.h1; i++) {
      if (file(i) === 0) {
        s += " " + "87654321"[rank(i)] + " |";
      }
      if (this._board[i]) {
        const piece = this._board[i].type;
        const color = this._board[i].color;
        const symbol = color === WHITE ? piece.toUpperCase() : piece.toLowerCase();
        s += " " + symbol + " ";
      } else {
        s += " . ";
      }
      if (i + 1 & 136) {
        s += "|\n";
        i += 8;
      }
    }
    s += "   +------------------------+\n";
    s += "     a  b  c  d  e  f  g  h";
    return s;
  }
  perft(depth) {
    const moves = this._moves({ legal: false });
    let nodes = 0;
    const color = this._turn;
    for (let i = 0, len = moves.length; i < len; i++) {
      this._makeMove(moves[i]);
      if (!this._isKingAttacked(color)) {
        if (depth - 1 > 0) {
          nodes += this.perft(depth - 1);
        } else {
          nodes++;
        }
      }
      this._undoMove();
    }
    return nodes;
  }
  setTurn(color) {
    if (this._turn == color) {
      return false;
    }
    this.move("--");
    return true;
  }
  turn() {
    return this._turn;
  }
  board() {
    const output = [];
    let row = [];
    for (let i = Ox88.a8; i <= Ox88.h1; i++) {
      if (this._board[i] == null) {
        row.push(null);
      } else {
        row.push({
          square: algebraic(i),
          type: this._board[i].type,
          color: this._board[i].color
        });
      }
      if (i + 1 & 136) {
        output.push(row);
        row = [];
        i += 8;
      }
    }
    return output;
  }
  squareColor(square) {
    if (square in Ox88) {
      const sq = Ox88[square];
      return (rank(sq) + file(sq)) % 2 === 0 ? "light" : "dark";
    }
    return null;
  }
  history({ verbose = false } = {}) {
    const reversedHistory = [];
    const moveHistory = [];
    while (this._history.length > 0) {
      reversedHistory.push(this._undoMove());
    }
    while (true) {
      const move = reversedHistory.pop();
      if (!move) {
        break;
      }
      if (verbose) {
        moveHistory.push(new Move(this, move));
      } else {
        moveHistory.push(this._moveToSan(move, this._moves()));
      }
      this._makeMove(move);
    }
    return moveHistory;
  }
  /*
   * Keeps track of position occurrence counts for the purpose of repetition
   * checking. Old positions are removed from the map if their counts are reduced to 0.
   */
  _getPositionCount(hash) {
    return this._positionCount.get(hash) ?? 0;
  }
  _incPositionCount() {
    this._positionCount.set(this._hash, (this._positionCount.get(this._hash) ?? 0) + 1);
  }
  _decPositionCount(hash) {
    const currentCount = this._positionCount.get(hash) ?? 0;
    if (currentCount === 1) {
      this._positionCount.delete(hash);
    } else {
      this._positionCount.set(hash, currentCount - 1);
    }
  }
  _pruneComments() {
    const reversedHistory = [];
    const currentComments = {};
    const copyComment = (fen) => {
      if (fen in this._comments) {
        currentComments[fen] = this._comments[fen];
      }
    };
    while (this._history.length > 0) {
      reversedHistory.push(this._undoMove());
    }
    copyComment(this.fen());
    while (true) {
      const move = reversedHistory.pop();
      if (!move) {
        break;
      }
      this._makeMove(move);
      copyComment(this.fen());
    }
    this._comments = currentComments;
  }
  getComment() {
    return this._comments[this.fen()];
  }
  setComment(comment) {
    this._comments[this.fen()] = comment.replace("{", "[").replace("}", "]");
  }
  /**
   * @deprecated Renamed to `removeComment` for consistency
   */
  deleteComment() {
    return this.removeComment();
  }
  removeComment() {
    const comment = this._comments[this.fen()];
    delete this._comments[this.fen()];
    return comment;
  }
  getComments() {
    this._pruneComments();
    return Object.keys(this._comments).map((fen) => {
      return { fen, comment: this._comments[fen] };
    });
  }
  /**
   * @deprecated Renamed to `removeComments` for consistency
   */
  deleteComments() {
    return this.removeComments();
  }
  removeComments() {
    this._pruneComments();
    return Object.keys(this._comments).map((fen) => {
      const comment = this._comments[fen];
      delete this._comments[fen];
      return { fen, comment };
    });
  }
  setCastlingRights(color, rights) {
    for (const side of [KING, QUEEN]) {
      if (rights[side] !== void 0) {
        if (rights[side]) {
          this._castling[color] |= SIDES[side];
        } else {
          this._castling[color] &= ~SIDES[side];
        }
      }
    }
    this._updateCastlingRights();
    const result = this.getCastlingRights(color);
    return (rights[KING] === void 0 || rights[KING] === result[KING]) && (rights[QUEEN] === void 0 || rights[QUEEN] === result[QUEEN]);
  }
  getCastlingRights(color) {
    return {
      [KING]: (this._castling[color] & SIDES[KING]) !== 0,
      [QUEEN]: (this._castling[color] & SIDES[QUEEN]) !== 0
    };
  }
  moveNumber() {
    return this._moveNumber;
  }
};

// lib/client/chessutil.js
var START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
var FILES = "abcdefgh";
function piecesFromFen(fen) {
  const out = [];
  for (const row of String(fen || START_FEN).split(" ")[0].split("/")) {
    for (const ch of row) {
      if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) out.push(null);
      else out.push((ch === ch.toUpperCase() ? "w" : "b") + ch.toUpperCase());
    }
  }
  while (out.length < 64) out.push(null);
  return out.slice(0, 64);
}
var sideToMove = (fen) => String(fen || START_FEN).split(" ")[1] === "b" ? "black" : "white";
var squareAt = (index) => FILES[index % 8] + (8 - Math.floor(index / 8));
function uciSquares(uci) {
  return uci && uci.length >= 4 ? { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] } : null;
}
function load(fen) {
  try {
    return new Chess(fen);
  } catch {
    return null;
  }
}
function legalTargets(fen, square) {
  const g = load(fen);
  if (!g) return [];
  try {
    return g.moves({ square, verbose: true }).map((m) => m.to);
  } catch {
    return [];
  }
}
function ownPiece(fen, square) {
  const g = load(fen);
  const p = g && g.get(square);
  return !!p && p.color === "w" === (sideToMove(fen) === "white");
}
function tryMove(fen, from, to, promotion = "q") {
  const g = load(fen);
  if (!g) return null;
  try {
    const m = g.move({ from, to, promotion });
    return { san: m.san, uci: m.from + m.to + (m.promotion || ""), fen: g.fen() };
  } catch {
    return null;
  }
}
function playSan(fen, san) {
  const g = load(fen);
  if (!g) return null;
  try {
    const m = g.move(san);
    return { san: m.san, uci: m.from + m.to + (m.promotion || ""), fen: g.fen(), from: m.from, to: m.to };
  } catch {
    return null;
  }
}
function playLine(fen, sans) {
  const out = { sans: [], fens: [fen], moves: [] };
  let cur = fen;
  for (const s of sans || []) {
    const m = playSan(cur, s);
    if (!m) break;
    out.sans.push(m.san);
    out.fens.push(m.fen);
    out.moves.push({ from: m.from, to: m.to });
    cur = m.fen;
  }
  return out;
}
var clampCp = (cp) => Math.max(-2e3, Math.min(2e3, cp));
function winPct(ev) {
  if (!ev) return 50;
  if (ev.mate != null) return ev.mate > 0 ? 100 : ev.mate < 0 ? 0 : 50;
  const cp = clampCp(ev.cp || 0);
  return 50 + 50 * (2 / (1 + Math.exp(-368208e-8 * cp)) - 1);
}
function formatEval(ev, minus = "\u2212") {
  if (!ev) return "";
  if (ev.mate != null) return (ev.mate < 0 ? minus : "") + "M" + Math.abs(ev.mate);
  const v = (ev.cp || 0) / 100;
  if (Math.abs(v) < 0.05) return "0.0";
  return (v > 0 ? "+" : minus) + Math.abs(v).toFixed(1);
}
var whiteLeads = (ev) => ev ? ev.mate != null ? ev.mate > 0 : (ev.cp || 0) >= 0 : true;

// assets/pieces/wK.svg
var wK_default = '<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme:light only" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linejoin="miter" d="M22.5 11.63V6M20 8h5"/><path fill="#fff" stroke-linecap="butt" stroke-linejoin="miter" d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/><path fill="#fff" d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10z"/><path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/></g></svg>';

// assets/pieces/wQ.svg
var wQ_default = '<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme:light only" width="45" height="45" viewBox="0 0 45 45"><g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0m16.5-4.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0M41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0M16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0M33 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0"/><path stroke-linecap="butt" d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L7 14z"/><path stroke-linecap="butt" d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><path fill="none" d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0"/></g></svg>';

// assets/pieces/wR.svg
var wR_default = '<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme:light only" width="45" height="45" viewBox="0 0 45 45"><g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linecap="butt" d="M9 39h27v-3H9zm3-3v-4h21v4zm-1-22V9h4v2h5V9h5v2h5V9h4v5"/><path d="m34 14-3 3H14l-3-3"/><path stroke-linecap="butt" stroke-linejoin="miter" d="M31 17v12.5H14V17"/><path d="m31 29.5 1.5 2.5h-20l1.5-2.5"/><path fill="none" stroke-linejoin="miter" d="M11 14h23"/></g></svg>';

// assets/pieces/wB.svg
var wB_default = '<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme:light only" width="45" height="45" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><g fill="#fff" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path stroke-linejoin="miter" d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5"/></g></svg>';

// assets/pieces/wN.svg
var wN_default = '<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme:light only" width="45" height="45" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path fill="#fff" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/><path fill="#fff" d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"/><path fill="#000" d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0m5.433-9.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5"/></g></svg>';

// assets/pieces/wP.svg
var wP_default = '<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme:light only" width="45" height="45" viewBox="0 0 45 45"><path fill="#fff" stroke="#000" stroke-linecap="round" stroke-width="1.5" d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"/></svg>';

// assets/pieces/bK.svg
var bK_default = '<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme:light only" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linejoin="miter" d="M22.5 11.6V6"/><path fill="#000" stroke-linecap="butt" stroke-linejoin="miter" d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/><path fill="#000" d="M11.5 37a22.3 22.3 0 0 0 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10z"/><path stroke-linejoin="miter" d="M20 8h5"/><path stroke="#ececec" d="M32 29.5s8.5-4 6-9.7C34.1 14 25 18 22.5 24.6v2.1-2.1C20 18 9.9 14 7 19.9c-2.5 5.6 4.8 9 4.8 9"/><path stroke="#ececec" d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/></g></svg>';

// assets/pieces/bQ.svg
var bQ_default = '<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme:light only" width="45" height="45" viewBox="0 0 45 45"><g fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><g stroke="none"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/></g><path stroke-linecap="butt" d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5z"/><path stroke-linecap="butt" d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><path fill="none" stroke-linecap="butt" d="M11 38.5a35 35 1 0 0 23 0"/><path fill="none" stroke="#ececec" d="M11 29a35 35 1 0 1 23 0m-21.5 2.5h20m-21 3a35 35 1 0 0 22 0m-23 3a35 35 1 0 0 24 0"/></g></svg>';

// assets/pieces/bR.svg
var bR_default = '<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme:light only" width="45" height="45" viewBox="0 0 45 45"><g fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linecap="butt" d="M9 39h27v-3H9zm3.5-7 1.5-2.5h17l1.5 2.5zm-.5 4v-4h21v4z"/><path stroke-linecap="butt" stroke-linejoin="miter" d="M14 29.5v-13h17v13z"/><path stroke-linecap="butt" d="M14 16.5 11 14h23l-3 2.5zM11 14V9h4v2h5V9h5v2h5V9h4v5z"/><path fill="none" stroke="#ececec" stroke-linejoin="miter" stroke-width="1" d="M12 35.5h21m-20-4h19m-18-2h17m-17-13h17M11 14h23"/></g></svg>';

// assets/pieces/bB.svg
var bB_default = '<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme:light only" width="45" height="45" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><g fill="#000" stroke-linecap="butt"><path d="M9 36c3.4-1 10.1.4 13.5-2 3.4 2.4 10.1 1 13.5 2 0 0 1.6.5 3 2-.7 1-1.6 1-3 .5-3.4-1-10.1.5-13.5-1-3.4 1.5-10.1 0-13.5 1-1.4.5-2.3.5-3-.5 1.4-2 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path stroke="#ececec" stroke-linejoin="miter" d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5"/></g></svg>';

// assets/pieces/bN.svg
var bN_default = '<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme:light only" width="45" height="45" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path fill="#000" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/><path fill="#000" d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.04-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-1-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-2 2.5-3c1 0 1 3 1 3"/><path fill="#ececec" stroke="#ececec" d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0m5.43-9.75a.5 1.5 30 1 1-.86-.5.5 1.5 30 1 1 .86.5"/><path fill="#ececec" stroke="none" d="m24.55 10.4-.45 1.45.5.15c3.15 1 5.65 2.49 7.9 6.75S35.75 29.06 35.25 39l-.05.5h2.25l.05-.5c.5-10.06-.88-16.85-3.25-21.34s-5.79-6.64-9.19-7.16z"/></g></svg>';

// assets/pieces/bP.svg
var bP_default = '<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme:light only" width="45" height="45" viewBox="0 0 45 45"><path stroke="#000" stroke-linecap="round" stroke-width="1.5" d="M22.5 9a4 4 0 0 0-3.22 6.38 6.48 6.48 0 0 0-.87 10.65c-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47a6.46 6.46 0 0 0-.87-10.65A4.01 4.01 0 0 0 22.5 9z"/></svg>';

// lib/client/board.js
var RAW = { wK: wK_default, wQ: wQ_default, wR: wR_default, wB: wB_default, wN: wN_default, wP: wP_default, bK: bK_default, bQ: bQ_default, bR: bR_default, bB: bB_default, bN: bN_default, bP: bP_default };
var PIECE_SVG = Object.fromEntries(Object.entries(RAW).map(([k, svg]) => [k, (/<svg[^>]*>([\s\S]*)<\/svg>/.exec(svg) || [])[1] || ""]));
var C = 100;
var center = (sq, flipped) => {
  const f = FILES.indexOf(sq[0]);
  const r = Number(sq[1]) - 1;
  const col = flipped ? 7 - f : f;
  const row = flipped ? r : 7 - r;
  return { x: col * C + C / 2, y: row * C + C / 2, col, row };
};
function Arrow({ from, to, flipped }) {
  const a = center(from, flipped), b = center(to, flipped);
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len, head = 34, w = 15;
  const sx = a.x + ux * 18, sy = a.y + uy * 18;
  const ex = b.x - ux * head * 0.55, ey = b.y - uy * head * 0.55;
  const bx = b.x - ux * head, by = b.y - uy * head;
  return h(
    "g",
    { "aria-hidden": true, opacity: 0.85, pointerEvents: "none" },
    h("line", { x1: sx, y1: sy, x2: bx + ux * 4, y2: by + uy * 4, stroke: "#81b64c", strokeWidth: w, strokeLinecap: "round" }),
    h("polygon", { points: `${b.x - ux * 6},${b.y - uy * 6} ${bx - uy * 24},${by + ux * 24} ${bx + uy * 24},${by - ux * 24}`, fill: "#81b64c" }),
    ex === sx ? null : null
  );
}
function Board({ fen, flipped = false, lastMove, arrow, badge, selected, targets = [], onSquare, interactive = false, dim = false, label }) {
  const pieces = piecesFromFen(fen);
  const cells = [];
  const overlays = [];
  const imgs = [];
  for (let i = 0; i < 64; i++) {
    const sq = squareAt(i);
    const { col, row } = center(sq, flipped);
    const lightSq = (FILES.indexOf(sq[0]) + Number(sq[1])) % 2 === 1;
    const x = col * C, y = row * C;
    cells.push(h("rect", { key: sq, x, y, width: C, height: C, fill: lightSq ? BOARD.light : BOARD.dark, onClick: onSquare ? () => onSquare(sq) : void 0, style: interactive ? { cursor: "pointer" } : void 0, "data-square": sq }));
    if (lastMove && (sq === lastMove.from || sq === lastMove.to)) overlays.push(h("rect", { key: `l${sq}`, x, y, width: C, height: C, fill: BOARD.last, pointerEvents: "none" }));
    if (selected === sq) overlays.push(h("rect", { key: `s${sq}`, x, y, width: C, height: C, fill: "rgba(20,85,30,0.5)", pointerEvents: "none" }));
    if (col === 0) overlays.push(h("text", { key: `r${sq}`, x: x + 5, y: y + 22, fontSize: 21, fontWeight: 700, fill: lightSq ? BOARD.dark : BOARD.light, pointerEvents: "none", fontFamily: "Arial, sans-serif" }, sq[1]));
    if (row === 7) overlays.push(h("text", { key: `f${sq}`, x: x + C - 6, y: y + C - 7, fontSize: 21, fontWeight: 700, textAnchor: "end", fill: lightSq ? BOARD.dark : BOARD.light, pointerEvents: "none", fontFamily: "Arial, sans-serif" }, sq[0]));
    const p = pieces[i];
    if (p) {
      const mv = lastMove && lastMove.to === sq && lastMove.from ? center(lastMove.from, flipped) : null;
      const slide = mv ? { className: "cc-piece-move", style: { "--dx": `${mv.x - (x + C / 2)}px`, "--dy": `${mv.y - (y + C / 2)}px` } } : {};
      imgs.push(h(
        "g",
        { key: `p${sq}-${mv ? lastMove.from + lastMove.to : ""}`, transform: `translate(${x} ${y})`, pointerEvents: "none", "data-piece": p },
        h(
          "g",
          { ...slide },
          h("g", { transform: `scale(${C / 45})`, dangerouslySetInnerHTML: { __html: PIECE_SVG[p] } })
        )
      ));
    }
    if (targets.includes(sq)) {
      overlays.push(p ? h("circle", { key: `t${sq}`, cx: x + C / 2, cy: y + C / 2, r: 46, fill: "none", stroke: "rgba(20,85,30,0.5)", strokeWidth: 9, pointerEvents: "none" }) : h("circle", { key: `t${sq}`, cx: x + C / 2, cy: y + C / 2, r: 15, fill: "rgba(20,85,30,0.5)", pointerEvents: "none" }));
    }
  }
  let badgeEl = null;
  if (badge && TOKENS[badge.cls]) {
    const { col, row } = center(badge.square, flipped);
    const tok = TOKENS[badge.cls];
    badgeEl = h(
      "svg",
      { x: col * C + C - 44, y: row * C - 4, width: 48, height: 48, viewBox: "0 0 24 24", pointerEvents: "none", "data-badge": badge.cls, className: "cc-badge" },
      h("circle", { cx: 12, cy: 12, r: 11, fill: tok.color, stroke: "rgba(0,0,0,0.35)", strokeWidth: 0.8 }),
      h(Glyph, { g: tok.glyph, ink: inkFor(tok.color) })
    );
  }
  return h("svg", {
    viewBox: "0 0 800 800",
    role: "img",
    "aria-label": label || t("board.label"),
    style: { display: "block", width: "100%", height: "auto", aspectRatio: "1 / 1", borderRadius: 12, opacity: dim ? 0.92 : 1, userSelect: "none" }
  }, cells, overlays, imgs, arrow ? h(Arrow, { from: arrow.from, to: arrow.to, flipped }) : null, badgeEl);
}
function EvalBar({ ev, height, flipped = false, dim = false }) {
  const pct = winPct(ev);
  const wl = whiteLeads(ev);
  const text = formatEval(ev);
  const whiteAtBottom = !flipped;
  const labelAtBottom = wl === whiteAtBottom;
  return h(
    "div",
    {
      role: "img",
      "aria-label": t("board.evalBar", { value: text || "0.0" }),
      style: { position: "relative", width: 26, height, flex: "none", background: "#403d39", borderRadius: 8, overflow: "hidden", opacity: dim ? 0.55 : 1 }
    },
    h("div", { className: "cc-evalbar-fill", style: { position: "absolute", left: 0, right: 0, [whiteAtBottom ? "bottom" : "top"]: 0, height: `${pct}%`, background: "#ffffff" } }),
    h("div", { style: { position: "absolute", left: 0, right: 0, [labelAtBottom ? "bottom" : "top"]: 3, textAlign: "center", fontSize: 10, fontWeight: 800, color: wl ? "#262421" : "#f2f0ec", letterSpacing: -0.3 } }, text)
  );
}
function PlayerCard({ name, rating, color, active, extra }) {
  return h(
    "div",
    { style: { display: "flex", alignItems: "center", gap: 8, padding: "4px 2px", minHeight: 36 } },
    h("span", { "aria-hidden": true, style: { width: 14, height: 14, borderRadius: 3, flex: "none", background: color === "white" ? "#fff" : "#262421", border: "1px solid var(--cc-muted)" } }),
    h("strong", { style: { fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, name || "?"),
    rating != null ? h("span", { style: { color: "var(--cc-muted)", fontSize: 13 } }, `(${rating})`) : null,
    h("span", { style: { color: "var(--cc-muted)", fontSize: 12, marginLeft: "auto" } }, t(color === "white" ? "common.white" : "common.black")),
    extra || null
  );
}

// lib/client/charts.js
import React4 from "react";
function evalSeries(initial, moves) {
  const pts = [winPct(initial)];
  let last = pts[0];
  for (const m of moves) {
    if (m.evalAfter && !m.failed) last = winPct(m.evalAfter);
    pts.push(last);
  }
  return pts;
}
function useBoxWidth(ref, fallback = 400) {
  const [w, setW] = React4.useState(fallback);
  React4.useEffect(() => {
    const el = ref.current;
    if (!el) return void 0;
    const read = () => setW(Math.max(200, Math.round(el.getBoundingClientRect().width || fallback)));
    read();
    if (typeof ResizeObserver === "undefined") return void 0;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, fallback]);
  return w;
}
function smoothPath(xs, ys, top, bottom) {
  if (xs.length === 0) return "";
  if (xs.length === 1) return `M${xs[0]},${ys[0]}`;
  const clamp = (v) => Math.max(top, Math.min(bottom, v));
  let d = `M${xs[0].toFixed(1)},${ys[0].toFixed(1)}`;
  for (let i = 0; i < xs.length - 1; i += 1) {
    const x0 = xs[Math.max(0, i - 1)], y0 = ys[Math.max(0, i - 1)];
    const x1 = xs[i], y1 = ys[i], x2 = xs[i + 1], y2 = ys[i + 1];
    const x3 = xs[Math.min(xs.length - 1, i + 2)], y3 = ys[Math.min(xs.length - 1, i + 2)];
    const c1x = x1 + (x2 - x0) / 6, c1y = clamp(y1 + (y2 - y0) / 6);
    const c2x = x2 - (x3 - x1) / 6, c2y = clamp(y2 - (y3 - y1) / 6);
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
  }
  return d;
}
function EvalGraph({ initial, moves, ply, onSelect, height = 150 }) {
  const box = React4.useRef(null);
  const W = useBoxWidth(box);
  const [hover, setHover] = React4.useState(null);
  const H = height, padX = 8, padY = 8;
  const pts = evalSeries(initial, moves);
  const n = pts.length - 1;
  const X = (i) => n === 0 ? padX : padX + i / n * (W - 2 * padX);
  const Y = (p) => padY + (1 - p / 100) * (H - 2 * padY);
  const xs = pts.map((_, i) => X(i));
  const ys = pts.map((p) => Y(p));
  const line = smoothPath(xs, ys, padY, H - padY);
  const area = `${line} L${X(n).toFixed(1)},${H} L${X(0).toFixed(1)},${H} Z`;
  const plyAt = (e) => {
    const r = box.current.getBoundingClientRect();
    const frac = r.width ? (e.clientX - r.left - padX) / (r.width - 2 * padX) : 0;
    return Math.max(0, Math.min(n, Math.round(frac * n)));
  };
  const markers = moves.filter((m) => ERRORS.has(m.classification) && m.classification !== "inaccuracy");
  const hp = hover != null ? hover : null;
  const hm = hp != null && hp > 0 ? moves[hp - 1] : null;
  const tip = hp != null ? `${hp === 0 ? t("review.startPosition") : `${Math.ceil(hp / 2)}${hp % 2 ? "." : "..."} ${hm ? hm.san : ""}`}  ${hm && hm.evalAfter ? formatEval(hm.evalAfter) : hp === 0 && initial ? formatEval(initial) : ""}` : "";
  const tipW = Math.min(W - 4, 11 + tip.length * 6.6);
  const tipX = hp == null ? 0 : Math.max(2, Math.min(W - tipW - 2, X(hp) - tipW / 2));
  return h(
    "div",
    { ref: box, style: { width: "100%" } },
    h(
      "svg",
      {
        viewBox: `0 0 ${W} ${H}`,
        width: W,
        height: H,
        role: "img",
        "aria-label": t("review.graphLabel"),
        onClick: (e) => {
          if (onSelect && n > 0) onSelect(plyAt(e));
        },
        onMouseMove: (e) => {
          if (n > 0) setHover(plyAt(e));
        },
        onMouseLeave: () => setHover(null),
        style: { display: "block", width: "100%", height: H, cursor: "pointer", borderRadius: 14, background: "var(--cc-graph-bg)" }
      },
      h(
        "defs",
        null,
        h(
          "linearGradient",
          { id: "ccEvalFill", x1: 0, x2: 0, y1: 0, y2: 1 },
          h("stop", { offset: "0%", stopColor: "var(--cc-graph-fill)", stopOpacity: 0.95 }),
          h("stop", { offset: "100%", stopColor: "var(--cc-graph-fill)", stopOpacity: 0.55 })
        )
      ),
      [25, 75].map((p) => h("line", { key: p, x1: padX, x2: W - padX, y1: Y(p), y2: Y(p), stroke: "var(--cc-graph-fill)", strokeWidth: 1, opacity: 0.12 })),
      h("path", { d: area, fill: "url(#ccEvalFill)" }),
      h("line", { x1: padX, x2: W - padX, y1: Y(50), y2: Y(50), stroke: "var(--cc-accent)", strokeWidth: 1, strokeDasharray: "4 4", opacity: 0.8 }),
      h("path", { d: line, fill: "none", stroke: "var(--cc-accent)", strokeWidth: 2.2, strokeLinejoin: "round", strokeLinecap: "round" }),
      n <= 200 ? pts.map((p, i) => h("circle", { key: `d${i}`, cx: xs[i], cy: ys[i], r: n > 120 ? 1.6 : 2.4, fill: "var(--cc-accent)", opacity: i === ply ? 0 : 0.85, pointerEvents: "none" })) : null,
      markers.map((m) => h("circle", { key: m.ply, cx: xs[m.ply], cy: ys[m.ply], r: 5.5, fill: TOKENS[m.classification].color, stroke: "#1b1a18", strokeWidth: 1, "data-marker": m.classification, pointerEvents: "none" })),
      n > 0 ? h(
        "g",
        { pointerEvents: "none" },
        h("line", { x1: xs[ply], x2: xs[ply], y1: 0, y2: H, stroke: "#f7c631", strokeWidth: 1.5 }),
        h("circle", { cx: xs[ply], cy: ys[ply] ?? Y(50), r: 5.5, fill: "#f7c631", stroke: "#1b1a18", strokeWidth: 1 })
      ) : null,
      hp != null ? h(
        "g",
        { pointerEvents: "none", "data-tip": true },
        h("line", { x1: xs[hp], x2: xs[hp], y1: 0, y2: H, stroke: "var(--cc-text)", strokeWidth: 1, opacity: 0.45 }),
        h("rect", { x: tipX, y: 4, width: tipW, height: 20, rx: 10, fill: "rgba(0,0,0,0.78)" }),
        h("text", { x: tipX + tipW / 2, y: 18, textAnchor: "middle", fontSize: 12, fontWeight: 600, fill: "#fff" }, tip)
      ) : null
    )
  );
}

// lib/client/keys.js
function reduceNav(state, key) {
  const { ply, max } = state;
  const go = (p) => ({ ...state, ply: Math.max(0, Math.min(max, p)) });
  switch (key) {
    case "ArrowLeft":
      return { ...go(ply - 1), playing: false };
    case "ArrowRight":
      return go(ply + 1);
    case "Home":
      return { ...go(0), playing: false };
    case "End":
      return { ...go(max), playing: false };
    case "f":
    case "F":
      return { ...state, flipped: !state.flipped };
    case " ":
    case "Spacebar":
      return { ...state, playing: ply >= max ? false : !state.playing };
    default:
      return null;
  }
}
function isTypingTarget(el) {
  if (!el || !el.tagName) return false;
  const tag = String(el.tagName).toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable === true;
}

// lib/client/coach.js
import React6 from "react";

// lib/client/md.js
import React5 from "react";
var h2 = React5.createElement;
var SAN = /\b(?:O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)(?![\w-])/g;
function withFlags(text, flagged, label, keyBase) {
  if (!flagged || flagged.size === 0) return [text];
  const out = [];
  let last = 0;
  let m;
  SAN.lastIndex = 0;
  while (m = SAN.exec(text)) {
    const bare = m[0].replace(/[+#]$/, "");
    if (!flagged.has(m[0]) && !flagged.has(bare)) continue;
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(h2("mark", {
      key: `${keyBase}-${m.index}`,
      title: label,
      "data-unverified": "true",
      style: { background: "rgba(247,198,49,0.28)", color: "inherit", borderBottom: "2px solid #f7c631", borderRadius: 3, padding: "0 2px" }
    }, m[0]));
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
function inline(text, flagged, label, key) {
  const parts = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g;
  let last = 0;
  let m;
  let i = 0;
  while (m = re.exec(text)) {
    if (m.index > last) parts.push(...withFlags(text.slice(last, m.index), flagged, label, `${key}t${i}`));
    const tok = m[0];
    if (tok.startsWith("**")) parts.push(h2("strong", { key: `${key}b${i}` }, ...withFlags(tok.slice(2, -2), flagged, label, `${key}b${i}`)));
    else if (tok.startsWith("`")) parts.push(h2("code", { key: `${key}c${i}`, style: { fontFamily: "ui-monospace, monospace", fontSize: "0.92em" } }, ...withFlags(tok.slice(1, -1), flagged, label, `${key}c${i}`)));
    else parts.push(h2("em", { key: `${key}e${i}` }, ...withFlags(tok.slice(1, -1), flagged, label, `${key}e${i}`)));
    last = m.index + tok.length;
    i += 1;
  }
  if (last < text.length) parts.push(...withFlags(text.slice(last), flagged, label, `${key}z`));
  return parts.map((p, j) => typeof p === "string" ? h2(React5.Fragment, { key: `${key}s${j}` }, p) : p);
}
function renderMarkdown(markdown, flaggedList = [], unverifiedLabel = "Unverified move") {
  const flagged = new Set(flaggedList || []);
  const lines = String(markdown || "").replace(/\r/g, "").split("\n");
  const out = [];
  let list = null;
  let para = [];
  const flushPara = () => {
    if (para.length) out.push(h2("p", { key: `p${out.length}`, style: { margin: "0 0 10px", lineHeight: 1.55 } }, ...inline(para.join(" "), flagged, unverifiedLabel, `p${out.length}`)));
    para = [];
  };
  const flushList = () => {
    if (list) {
      out.push(h2(
        list.ordered ? "ol" : "ul",
        { key: `l${out.length}`, style: { margin: "0 0 10px", paddingLeft: 22, lineHeight: 1.55 } },
        list.items.map((it, i) => h2("li", { key: i }, ...inline(it, flagged, unverifiedLabel, `l${out.length}i${i}`)))
      ));
      list = null;
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const hm = /^(#{1,4})\s+(.*)$/.exec(line);
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (hm) {
      flushPara();
      flushList();
      const size = [20, 17, 15, 14][hm[1].length - 1];
      out.push(h2("div", { key: `h${out.length}`, role: "heading", "aria-level": hm[1].length + 1, style: { fontWeight: 700, fontSize: size, margin: "14px 0 6px" } }, ...inline(hm[2], flagged, unverifiedLabel, `h${out.length}`)));
    } else if (ul || ol) {
      flushPara();
      const ordered = !!ol;
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((ul || ol)[1]);
    } else if (line.trim() === "") {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();
  return out;
}

// lib/client/coach.js
var { useState: useState2, useEffect: useEffect2, useCallback, useRef } = React6;
var WAITING = /* @__PURE__ */ new Set(["queued", "sent"]);
function Answer({ text, flagged }) {
  return h("div", { style: { fontSize: 14 } }, renderMarkdown(text, flagged, t("coach.unverified")));
}
function CoachPanel({ gameId, analysisReady, onGoAnalyse }) {
  const { api, live, openCoach } = useApp();
  const [report, setReport] = useState2(null);
  const [error, setError] = useState2(null);
  const [busy, setBusy] = useState2(false);
  const [tick, setTick] = useState2(0);
  const [question, setQuestion] = useState2("");
  const [thread, setThread] = useState2([]);
  const asks = useRef(/* @__PURE__ */ new Map());
  const coachTick = live.coachTick;
  useEffect2(() => {
    let alive = true;
    setReport(null);
    setError(null);
    api.get(`coach/report/${gameId}`).then((r) => {
      if (alive) setReport(r);
    }, (e) => {
      if (alive) setError(e);
    });
    return () => {
      alive = false;
    };
  }, [api, gameId, tick, coachTick]);
  const waiting = report && WAITING.has(report.state);
  useEffect2(() => {
    if (!waiting) return void 0;
    const id = setInterval(() => setTick((n) => n + 1), 3e3);
    return () => clearInterval(id);
  }, [waiting]);
  const generate = async (force) => {
    setBusy(true);
    setError(null);
    try {
      await api.post("coach/report", { gameId, force: !!force });
      setTick((n) => n + 1);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  const pending = thread.some((m) => m.state === "pending");
  useEffect2(() => {
    if (!pending) return void 0;
    const id = setInterval(async () => {
      const open = thread.filter((m) => m.state === "pending" && m.requestId);
      for (const m of open) {
        try {
          const r = await api.get(`coach/ask/${m.requestId}`);
          if (r.state !== "pending") setThread((cur) => cur.map((x) => x.requestId === m.requestId ? { ...x, state: r.state, answer: r.answer, flagged: r.flagged, message: r.message } : x));
        } catch (e) {
          setThread((cur) => cur.map((x) => x.requestId === m.requestId ? { ...x, state: "error", message: errorText(t, e) } : x));
        }
      }
    }, 2e3);
    return () => clearInterval(id);
  }, [pending, thread, api]);
  const ask = async (e) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    const local = { id: Date.now(), question: q, state: "sending" };
    setThread((cur) => [...cur, local]);
    setQuestion("");
    try {
      const r = await api.post("coach/ask", { gameId, question: q });
      setThread((cur) => cur.map((x) => x.id === local.id ? { ...x, requestId: r.requestId, state: "pending" } : x));
    } catch (err) {
      setThread((cur) => cur.map((x) => x.id === local.id ? { ...x, state: "error", message: errorText(t, err) } : x));
    } finally {
      setBusy(false);
    }
  };
  if (!analysisReady) return h(Empty, { title: t("coach.needAnalysisTitle"), action: onGoAnalyse ? h(Btn, { primary: true, onClick: onGoAnalyse }, t("games.analyse")) : null }, t("coach.needAnalysis"));
  if (error && !report) return h(ErrorBox, { error, text: errorText(t, error), onRetry: () => setTick((n) => n + 1) });
  if (!report) return h(Loading);
  let body;
  if (report.state === "ready") {
    body = h(
      "div",
      null,
      h(Answer, { text: report.markdown, flagged: report.flagged }),
      report.flagged && report.flagged.length ? h(Notice, { kind: "warn", title: t("coach.flaggedTitle") }, t("coach.flagged", { moves: report.flagged.join(", ") })) : null,
      h(
        "div",
        { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" } },
        h("span", { style: { fontSize: 12, color: "var(--cc-muted)" } }, report.createdAt ? t("coach.generatedAt", { date: fmtDateTime(report.createdAt) }) : ""),
        h(Btn, { small: true, disabled: busy, onClick: () => generate(true) }, t("coach.regenerate"))
      )
    );
  } else if (WAITING.has(report.state)) {
    body = h(Notice, { kind: "info", title: t("coach.waitingTitle") }, t("coach.waiting"));
  } else if (report.state === "timeout" || report.state === "error") {
    body = h(Notice, { kind: "error", title: t(report.state === "timeout" ? "coach.timeoutTitle" : "coach.errorTitle"), action: h(Btn, { small: true, disabled: busy, onClick: () => generate(true) }, t("common.retry")) }, report.error || t(report.state === "timeout" ? "coach.timeout" : "errors.generic"));
  } else {
    body = h(Empty, { title: t("coach.noneTitle"), action: h(Btn, { primary: true, disabled: busy, onClick: () => generate(false) }, t("coach.generate")) }, t("coach.none"));
  }
  return h(
    "div",
    { style: { display: "grid", gap: 14 } },
    error ? h(ErrorBox, { error, text: errorText(t, error) }) : null,
    body,
    h(
      "div",
      { style: { borderTop: "1px solid var(--cc-border)", paddingTop: 12, display: "grid", gap: 8 } },
      h("strong", { style: { fontSize: 14 } }, t("coach.askTitle")),
      thread.map((m) => h(
        "div",
        { key: m.id, style: { display: "grid", gap: 6 } },
        h("div", { style: { background: "var(--cc-sel)", borderRadius: 8, padding: "6px 10px", fontSize: 13.5, justifySelf: "end", maxWidth: "90%" } }, m.question),
        m.state === "done" ? h("div", { style: { background: "var(--cc-panel2)", borderRadius: 8, padding: "8px 12px" } }, h(Answer, { text: m.answer, flagged: m.flagged })) : m.state === "error" || m.state === "timeout" ? h(Notice, { kind: "error" }, m.message || t(m.state === "timeout" ? "coach.timeout" : "errors.generic")) : h("div", { className: "cc-spin", style: { ...S.muted, fontSize: 13 } }, t("coach.thinking"))
      )),
      h(
        "form",
        { onSubmit: ask, style: { display: "flex", gap: 8 } },
        h("input", { type: "text", value: question, maxLength: 2e3, onChange: (e) => setQuestion(e.target.value), placeholder: t("coach.askPlaceholder"), "aria-label": t("coach.askTitle"), style: { ...S.input, flex: 1 } }),
        h(Btn, { primary: true, type: "submit", disabled: busy || !question.trim() }, t("coach.send"))
      )
    ),
    h(
      "div",
      { style: { fontSize: 11.5, color: "var(--cc-muted)", lineHeight: 1.45 } },
      t("coach.disclaimer"),
      " ",
      h("button", { type: "button", onClick: openCoach, style: { background: "none", border: "none", color: "var(--cc-accent-text)", cursor: "pointer", padding: 0, textDecoration: "underline", fontSize: "inherit" } }, t("coach.openChat"))
    )
  );
}

// lib/client/review.js
var { useState: useState3, useEffect: useEffect3, useRef: useRef2, useCallback: useCallback2, useMemo } = React7;
function useWidth(ref, fallback = 1200) {
  const [w, setW] = useState3(fallback);
  const roRef = useRef2({ el: null, ro: null });
  useEffect3(() => {
    const el = ref.current;
    const cur = roRef.current;
    if (el === cur.el) return;
    if (cur.ro) cur.ro.disconnect();
    cur.el = el;
    cur.ro = null;
    if (!el) return;
    const read = () => setW(el.getBoundingClientRect().width || fallback);
    read();
    if (typeof ResizeObserver !== "undefined") {
      cur.ro = new ResizeObserver(read);
      cur.ro.observe(el);
    }
  });
  useEffect3(() => () => {
    if (roRef.current.ro) roRef.current.ro.disconnect();
  }, []);
  return w;
}
function useViewportHeight(fallback = 900) {
  const [v, setV] = useState3(typeof window === "undefined" ? fallback : window.innerHeight || fallback);
  useEffect3(() => {
    const f = () => setV(window.innerHeight || fallback);
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, [fallback]);
  return v;
}
var resultKey = (r) => r === "win" || r === "loss" || r === "draw" ? r : "draw";
var resultColor = (r) => r === "win" ? "var(--cc-win)" : r === "loss" ? "var(--cc-loss)" : "var(--cc-draw)";
function lineLabel(fen, sans) {
  const parts = String(fen || START_FEN).split(" ");
  let n = Number(parts[5]) || 1;
  let white = parts[1] !== "b";
  return sans.map((s, i) => {
    const label = white ? `${n}.${s}` : i === 0 ? `${n}\u2026${s}` : s;
    if (!white) n += 1;
    white = !white;
    return label;
  });
}
function OpeningsCard({ detail, onSelect }) {
  const o = detail.openings || {};
  const rows = [["white", o.white], ["black", o.black]];
  if (!o.white && !o.black) return null;
  const moveNo = (e) => `${Math.ceil(e.ply / 2)}${e.ply % 2 ? "." : "..."} ${e.san}`;
  return h(
    Card,
    { title: t("review.openings"), style: { padding: 14 } },
    h(
      "div",
      { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } },
      rows.map(([c, e]) => h(
        "button",
        {
          key: c,
          type: "button",
          className: "cc-hover",
          disabled: !e,
          onClick: e ? () => onSelect(e.ply) : void 0,
          "data-opening": c,
          style: { display: "flex", alignItems: "center", gap: 12, textAlign: "left", width: "100%", padding: "8px 10px", borderRadius: 14, border: "1px solid var(--cc-border)", background: "var(--cc-panel2)", cursor: e ? "pointer" : "default", minWidth: 0 }
        },
        h("span", { "aria-hidden": true, style: { width: 18, height: 18, borderRadius: 999, flex: "none", background: c === "white" ? "#fff" : "#1d1d1f", border: "1.5px solid var(--cc-muted)" } }),
        h(
          "span",
          { style: { display: "grid", gap: 2, minWidth: 0 } },
          h("span", { style: { fontSize: 12, color: "var(--cc-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" } }, `${t(c === "white" ? "common.white" : "common.black")}${detail[c] && detail[c].name ? " \xB7 " + detail[c].name : ""}`),
          h("span", { style: { fontSize: 15, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" } }, e ? e.name : t("review.noOpening")),
          e ? h("span", { style: { fontSize: 12.5, color: "var(--cc-muted)" } }, `${e.eco} \xB7 ${moveNo(e)}`) : null
        )
      ))
    )
  );
}
function ReviewHeader({ detail, analysis }) {
  const acc = analysis && analysis.accuracy;
  const elo = analysis && analysis.elo || {};
  const term = detail.termination ? t(`term.${detail.termination}`) : "";
  const termText = term && !term.startsWith("term.") ? term : detail.termination || "";
  const meta = [detail.timeClass ? t(`tc.${detail.timeClass}`) : null, fmtDate(detail.endTime), detail.rated ? t("games.rated") : null].filter(Boolean).join(" \xB7 ");
  const rk = resultKey(detail.result);
  const meColor = detail.color === "black" ? "black" : "white";
  const oppColor = meColor === "white" ? "black" : "white";
  const winnerColor = rk === "win" ? meColor : rk === "loss" ? oppColor : null;
  const winnerName = winnerColor && detail[winnerColor] && detail[winnerColor].name;
  const score = winnerColor === "white" ? "1 \u2013 0" : winnerColor === "black" ? "0 \u2013 1" : "\xBD \u2013 \xBD";
  const banner = h(
    "div",
    { "data-result-banner": rk, role: "status", style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", padding: "10px 14px", borderRadius: 14, border: `1.5px solid ${resultColor(detail.result)}`, background: "var(--cc-panel2)" } },
    h(
      "span",
      { style: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 } },
      h("span", { "aria-hidden": true, style: { fontSize: 22 } }, rk === "draw" ? "\u{1F91D}" : "\u{1F3C6}"),
      h(
        "span",
        { style: { display: "grid", minWidth: 0 } },
        h("span", { style: { fontSize: 18, fontWeight: 800, color: resultColor(detail.result), lineHeight: 1.15 } }, t(`result.${rk}`)),
        h(
          "span",
          { style: { fontSize: 13, color: "var(--cc-muted)", overflow: "hidden", textOverflow: "ellipsis" } },
          [winnerName ? t("review.winner", { name: winnerName }) : t("review.drawText"), termText].filter(Boolean).join(" \xB7 ")
        )
      )
    ),
    h("span", { style: { fontSize: 20, fontWeight: 800, fontVariantNumeric: "tabular-nums" } }, score)
  );
  return h(
    "div",
    { style: { display: "grid", gap: 8 } },
    h("strong", { style: { fontSize: 15 } }, t("review.title")),
    banner,
    h(
      "div",
      { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } },
      [["white", detail.white, acc && acc.white], ["black", detail.black, acc && acc.black]].map(([c, p, a]) => h(
        "div",
        { key: c, style: { display: "flex", alignItems: "center", gap: 10, minWidth: 0, padding: "6px 8px", borderRadius: 14, background: "var(--cc-panel2)", border: winnerColor === c ? "1.5px solid var(--cc-win)" : "1.5px solid transparent" } },
        h(Ring, { value: a == null ? null : a, size: 54, label: t("accuracy.label") + " \u2013 " + (p && p.name) }),
        h(
          "div",
          { style: { display: "grid", minWidth: 0 } },
          h("span", { style: { fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, p && p.name || t(`common.${c}`)),
          h("span", { title: t("review.eloNote"), "data-elo": c, style: { fontSize: 12.5, color: "var(--cc-muted)", fontVariantNumeric: "tabular-nums" } }, elo[c] != null ? t("review.eloEstimate", { value: elo[c] }) : t("review.eloNone"))
        )
      ))
    ),
    h("div", { title: t("accuracy.note"), style: { fontSize: 12, color: "var(--cc-muted)" } }, meta)
  );
}
function ClassTable({ analysis }) {
  const counts = analysis.counts || { white: {}, black: {} };
  return h(
    "table",
    { "aria-label": t("review.classTable"), style: { fontSize: 13 } },
    h("thead", null, h("tr", null, h("th", null, t("review.classification")), h("th", { style: { textAlign: "right" } }, t("common.white")), h("th", { style: { textAlign: "right" } }, t("common.black")))),
    h("tbody", null, ORDER.map((c) => h(
      "tr",
      { key: c, className: "cc-row", "data-class": c },
      h("td", { style: { padding: "4px 10px" } }, h("span", { style: { display: "inline-flex", alignItems: "center", gap: 8 } }, h(ClassBadge, { cls: c, size: 16 }), t(`class.${c}`))),
      h("td", { style: { textAlign: "right", padding: "4px 10px", fontVariantNumeric: "tabular-nums", color: counts.white[c] || 0 ? void 0 : "var(--cc-muted)" } }, counts.white[c] || 0),
      h("td", { style: { textAlign: "right", padding: "4px 10px", fontVariantNumeric: "tabular-nums", color: counts.black[c] || 0 ? void 0 : "var(--cc-muted)" } }, counts.black[c] || 0)
    )))
  );
}
var FIG = { K: 1, Q: 1, R: 1, B: 1, N: 1 };
function Figurine({ san, color, size = 17 }) {
  const letter = san && FIG[san[0]] ? san[0] : null;
  const key = letter ? (color === "black" ? "b" : "w") + letter : null;
  if (!key || !PIECE_SVG[key]) return h("span", null, san);
  return h(
    "span",
    { style: { display: "inline-flex", alignItems: "center", gap: 1 } },
    h("svg", { viewBox: "0 0 45 45", width: size + 3, height: size + 3, "aria-hidden": true, style: { flex: "none" } }, h("g", { dangerouslySetInnerHTML: { __html: PIECE_SVG[key] } })),
    h("span", null, san.slice(1))
  );
}
function FullMoves({ moves, ply, onSelect }) {
  const box = useRef2(null);
  const curRef = useRef2(null);
  useEffect3(() => {
    const b = box.current, c = curRef.current;
    if (!b || !c) return;
    const top = c.offsetTop - b.offsetTop;
    if (top < b.scrollTop) b.scrollTop = Math.max(0, top - 4);
    else if (top + c.offsetHeight > b.scrollTop + b.clientHeight) b.scrollTop = top + c.offsetHeight - b.clientHeight + 4;
  }, [ply]);
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) rows.push([moves[i], moves[i + 1]]);
  const cell = (m) => {
    if (!m) return h("div");
    const on = m.ply === ply;
    return h(
      "button",
      {
        type: "button",
        ref: on ? curRef : void 0,
        "data-ply": m.ply,
        "aria-current": on ? "step" : void 0,
        className: "cc-hover",
        onClick: () => onSelect(m.ply),
        style: { display: "flex", alignItems: "center", gap: 6, border: "none", cursor: "pointer", textAlign: "left", padding: "7px 10px", borderRadius: 10, fontSize: 15.5, fontWeight: 700, minWidth: 0, background: on ? "var(--cc-sel)" : "transparent", outline: on ? "1.5px solid var(--cc-accent)" : "none", color: "inherit" }
      },
      h(Figurine, { san: m.san, color: m.color }),
      m.classification && ERRORS.has(m.classification) ? h(ClassBadge, { cls: m.classification, size: 14 }) : null
    );
  };
  return h(
    "div",
    { ref: box, role: "group", "aria-label": t("review.moveList"), style: { height: "100%", minHeight: 0, overflowY: "auto", display: "grid", gridTemplateColumns: "44px 1fr 1fr", gap: "2px 4px", alignContent: "start" } },
    rows.map(([w, b], i) => h(
      React7.Fragment,
      { key: i },
      h("div", { style: { color: "var(--cc-muted)", padding: "7px 6px 7px 0", textAlign: "right", fontWeight: 700, fontSize: 14.5, fontVariantNumeric: "tabular-nums" } }, i + 1 + "."),
      cell(w),
      cell(b)
    ))
  );
}
function Fold({ title, open, onToggle, children, style }) {
  return h(
    "section",
    { style: { ...S.card, padding: 0, overflow: "hidden", minWidth: 0, ...style } },
    h(
      "button",
      { type: "button", "aria-expanded": open, onClick: onToggle, className: "cc-hover", style: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "12px 16px", border: "none", background: "transparent", cursor: "pointer", color: "inherit", fontSize: 15, fontWeight: 700, textAlign: "left" } },
      h("span", null, title),
      h("span", { "aria-hidden": true, style: { display: "inline-block", transition: "transform .2s", transform: open ? "rotate(180deg)" : "none", color: "var(--cc-muted)" } }, "\u25BE")
    ),
    open ? h("div", { style: { padding: "0 6px 12px" } }, children) : null
  );
}
function LineRow({ line, fen, onPlay, index }) {
  const labels = lineLabel(fen, line.san || []);
  return h(
    "div",
    { style: { display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderTop: index ? "1px solid var(--cc-border)" : "none" } },
    h("span", { style: { minWidth: 46, textAlign: "center", fontWeight: 800, fontSize: 12.5, padding: "3px 6px", borderRadius: 4, background: line.eval && (line.eval.mate != null ? line.eval.mate > 0 : (line.eval.cp || 0) >= 0) ? "#ffffff" : "#403d39", color: line.eval && (line.eval.mate != null ? line.eval.mate > 0 : (line.eval.cp || 0) >= 0) ? "#262421" : "#f2f0ec", border: "1px solid var(--cc-border)" } }, formatEval(line.eval)),
    h("div", { style: { display: "flex", flexWrap: "wrap", gap: 2 } }, labels.map((lab, i) => h("button", {
      key: i,
      type: "button",
      onClick: () => onPlay(i),
      className: "cc-hover",
      "data-san": line.san[i],
      title: t("review.tryHint"),
      style: { border: "none", background: "transparent", cursor: "pointer", padding: "2px 5px", borderRadius: 4, fontSize: 13.5, fontWeight: 600 }
    }, lab)))
  );
}
function AnalysisTab({ analysis, move, ply, fen, fenBefore, onTry, partialMove }) {
  if (!analysis) return h(Empty, { title: t("review.noAnalysisTitle") }, t("review.noAnalysisTab"));
  const lines = ply === 0 ? analysis.initial && analysis.initial.lines || [] : move && move.topLines ? move.topLines : [];
  return h(
    "div",
    { style: { display: "grid", gap: 10 } },
    move ? h(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
      h(ClassBadge, { cls: move.classification, size: 22 }),
      h("strong", null, `${move.san}`),
      h("span", { style: S.muted }, t(`class.${move.classification}`)),
      move.loss != null && move.loss > 5e-3 ? h("span", { style: S.muted }, t("review.loss", { value: fmtNum(move.loss * 100, 1) })) : null
    ) : h("div", { style: S.muted }, t("review.startPosition")),
    move && move.bestSan && move.bestUci !== move.uci ? h(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 13.5 } },
      h("span", { style: S.muted }, t("review.bestWas")),
      h("button", { type: "button", className: "cc-hover", "data-san": move.bestSan, onClick: () => onTry(fenBefore, move.line && move.line.length ? move.line : [move.bestSan], 0), style: { border: "1px solid var(--cc-border)", background: "var(--cc-panel2)", cursor: "pointer", borderRadius: 4, padding: "2px 8px", fontWeight: 700 } }, move.bestSan)
    ) : null,
    partialMove ? h(Notice, { kind: "warn" }, t("review.moveFailed")) : null,
    h(
      "div",
      null,
      h("div", { style: { fontSize: 12, color: "var(--cc-muted)", marginBottom: 2 } }, t("review.engineLines")),
      lines.length ? lines.slice(0, 2).map((ln, i) => h(LineRow, { key: i, index: i, line: ln, fen, onPlay: (k) => onTry(fen, ln.san, k) })) : h("div", { style: { ...S.muted, fontSize: 13 } }, t("review.noLines"))
    )
  );
}
function ReviewScreen({ gameId, initialPly, initialTab, onBack, goTo }) {
  const app = useApp();
  const { api, status, live, settings, setSetting } = app;
  const [detail, setDetail] = useState3(null);
  const [analysis, setAnalysis] = useState3(null);
  const [error, setError] = useState3(null);
  const [aError, setAError] = useState3(null);
  const [ply, setPly] = useState3(initialPly || 0);
  const [flipped, setFlipped] = useState3(false);
  const [playing, setPlaying] = useState3(false);
  const [tab, setTab] = useState3(initialTab || "analysis");
  const [classOpen, setClassOpen] = useState3(false);
  const [tryS, setTryS] = useState3(null);
  const [sel, setSel] = useState3(null);
  const [poll, setPoll] = useState3(0);
  const [busy, setBusy] = useState3(false);
  const wrap = useRef2(null);
  const W = useWidth(wrap);
  const stageRef = useRef2(null);
  const [stageTop, setStageTop] = useState3(150);
  useEffect3(() => {
    const el = stageRef.current;
    if (!el) return;
    const top2 = Math.round(el.getBoundingClientRect().top);
    if (Math.abs(top2 - stageTop) > 2) setStageTop(top2);
  });
  const vh = useViewportHeight();
  const loadDetail = useCallback2(async () => {
    setError(null);
    try {
      const d = await api.get(`games/${gameId}`);
      setDetail(d);
      setFlipped(d.color === "black");
    } catch (e) {
      setError(e);
    }
  }, [api, gameId]);
  useEffect3(() => {
    setDetail(null);
    setAnalysis(null);
    setPly(initialPly || 0);
    setTryS(null);
    setSel(null);
    setPlaying(false);
    loadDetail();
  }, [gameId]);
  const gameTick = (live.analysisTick[gameId] || 0) + live.analysisAny;
  useEffect3(() => {
    let alive = true;
    api.get(`analysis/${gameId}`).then((a) => {
      if (alive) {
        setAnalysis(a);
        setAError(null);
      }
    }, (e) => {
      if (alive) setAError(e);
    });
    return () => {
      alive = false;
    };
  }, [api, gameId, gameTick, poll]);
  const running = analysis && (analysis.state === "pending" || analysis.state === "running");
  useEffect3(() => {
    if (!running) return void 0;
    const id = setInterval(() => setPoll((n) => n + 1), 3e3);
    return () => clearInterval(id);
  }, [running]);
  const ready = analysis && (analysis.state === "ready" || analysis.state === "partial");
  const moves = useMemo(() => ready ? analysis.moves : detail && detail.moves || [], [ready, analysis, detail]);
  const max = moves.length;
  const move = ply > 0 ? moves[ply - 1] : null;
  const baseFen = ply === 0 ? detail && detail.initialFen || START_FEN : move && move.fenAfter;
  const fenBefore = ply === 0 ? null : ply === 1 ? detail && detail.initialFen || START_FEN : moves[ply - 2].fenAfter;
  const startTry = useCallback2((fen0, sans, upto) => {
    const pl = playLine(fen0, sans.slice(0, upto + 1));
    if (!pl.sans.length) return;
    setPlaying(false);
    setSel(null);
    setTryS({ fen0, sans: pl.sans, fens: pl.fens, moves: pl.moves, idx: pl.sans.length });
  }, []);
  const exitTry = useCallback2(() => {
    setTryS(null);
    setSel(null);
  }, []);
  const fen = tryS ? tryS.fens[tryS.idx] : baseFen;
  useEffect3(() => {
    setSel(null);
  }, [fen]);
  const onSquare = (sq) => {
    if (!fen) return;
    if (sel && sel !== sq) {
      const m = tryMove(fen, sel, sq);
      if (m) {
        setPlaying(false);
        setTryS((cur) => {
          const base = cur || { fen0: baseFen, sans: [], fens: [baseFen], moves: [], idx: 0 };
          const sans = base.sans.slice(0, base.idx).concat(m.san);
          const fens = base.fens.slice(0, base.idx + 1).concat(m.fen);
          const mv = base.moves.slice(0, base.idx).concat({ from: sel, to: sq });
          return { ...base, sans, fens, moves: mv, idx: sans.length };
        });
        setSel(null);
        return;
      }
    }
    if (ownPiece(fen, sq)) setSel(sel === sq ? null : sq);
    else setSel(null);
  };
  const nav = useRef2();
  nav.current = { ply, max, flipped, playing, tryS };
  useEffect3(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      const s = nav.current;
      if (e.key === "Escape") {
        if (s.tryS) {
          exitTry();
          e.preventDefault();
        }
        return;
      }
      if (s.tryS && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End")) {
        const last = s.tryS.sans.length;
        const idx = e.key === "ArrowLeft" ? s.tryS.idx - 1 : e.key === "ArrowRight" ? s.tryS.idx + 1 : e.key === "Home" ? 0 : last;
        setTryS({ ...s.tryS, idx: Math.max(0, Math.min(last, idx)) });
        e.preventDefault();
        return;
      }
      if (e.key === " " && e.target && e.target.tagName === "BUTTON") return;
      const next = reduceNav(s, e.key);
      if (!next) return;
      e.preventDefault();
      setPly(next.ply);
      setFlipped(next.flipped);
      setPlaying(next.playing);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exitTry]);
  useEffect3(() => {
    if (!playing || tryS) return void 0;
    const id = setInterval(() => setPly((p) => {
      if (p >= max) {
        setPlaying(false);
        return p;
      }
      return p + 1;
    }), 1e3);
    return () => clearInterval(id);
  }, [playing, tryS, max]);
  const enqueue = async () => {
    setBusy(true);
    try {
      await api.post("analysis/enqueue", { gameIds: [gameId], priority: 1 });
      setPoll((n) => n + 1);
    } catch (e) {
      setAError(e);
    } finally {
      setBusy(false);
    }
  };
  const cancel = async () => {
    setBusy(true);
    try {
      await api.post("analysis/cancel", { gameId });
      setPoll((n) => n + 1);
    } catch (e) {
      setAError(e);
    } finally {
      setBusy(false);
    }
  };
  if (error) return h("div", { style: { display: "grid", gap: 12 } }, h(ErrorBox, { error, text: errorText(t, error), onRetry: loadDetail }), onBack ? h("div", null, h(Btn, { onClick: onBack }, t("review.back"))) : null);
  if (!detail) return h(Loading, { label: t("review.loading") });
  const wide = W >= 1100;
  const stageH = wide ? Math.max(480, vh - stageTop - 58) : 0;
  const boardSize = Math.round(Math.max(260, Math.min(wide ? Math.min(stageH - 165, W - 420 - 28 - 40) : W - 40, 1100)));
  const colW = boardSize + 32;
  const panelW = wide ? Math.max(420, W - colW - 28) : 0;
  const dual = wide && panelW >= 860;
  const showEval = ready && !tryS;
  const curEval = ply === 0 ? analysis && analysis.initial && analysis.initial.eval : move && move.evalAfter;
  const lastM = tryS ? tryS.moves[tryS.idx - 1] : move ? uciSquares(move.uci) : null;
  const arrow = !tryS && ready && settings.showBestArrow && move && move.bestUci && move.bestUci !== move.uci ? uciSquares(move.bestUci) : null;
  const badge = !tryS && ready && move && move.classification && lastM ? { square: lastM.to, cls: move.classification } : null;
  const targets = sel && fen ? legalTargets(fen, sel) : [];
  const top = flipped ? detail.white : detail.black;
  const bottom = flipped ? detail.black : detail.white;
  const topColor = flipped ? "white" : "black";
  const bottomColor = flipped ? "black" : "white";
  const tryAt = tryS ? tryS.idx : 0;
  const stepBtn = (label, icon, onClick, disabled, key) => h("button", { key, type: "button", "aria-label": label, title: label, onClick, disabled, className: "cc-hover cc-icon", style: { border: "1px solid var(--cc-border)", background: "var(--cc-panel2)", borderRadius: 16, width: 62, height: 54, display: "grid", placeItems: "center", cursor: "pointer" } }, icon);
  const prog = live.progress[gameId] || analysis && analysis.progress || null;
  const engineBad = status && status.engine && (status.engine.state === "error" || status.engine.state === "missing");
  const controls = h(
    "div",
    { role: "toolbar", "aria-label": t("review.controls"), style: { display: "flex", gap: 10, justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginTop: 10 } },
    stepBtn(t("review.first"), Icon.first(28), () => tryS ? setTryS({ ...tryS, idx: 0 }) : (setPly(0), setPlaying(false)), tryS ? tryAt === 0 : ply === 0, "first"),
    stepBtn(t("review.prev"), Icon.prev(28), () => tryS ? setTryS({ ...tryS, idx: Math.max(0, tryAt - 1) }) : (setPly(Math.max(0, ply - 1)), setPlaying(false)), tryS ? tryAt === 0 : ply === 0, "prev"),
    stepBtn(playing ? t("review.pause") : t("review.play"), playing ? Icon.pause(28) : Icon.play(28), () => setPlaying((p) => ply >= max ? false : !p), !!tryS || max === 0, "play"),
    stepBtn(t("review.next"), Icon.next(28), () => tryS ? setTryS({ ...tryS, idx: Math.min(tryS.sans.length, tryAt + 1) }) : setPly(Math.min(max, ply + 1)), tryS ? tryAt >= tryS.sans.length : ply >= max, "next"),
    stepBtn(t("review.last"), Icon.last(28), () => tryS ? setTryS({ ...tryS, idx: tryS.sans.length }) : (setPly(max), setPlaying(false)), tryS ? tryAt >= tryS.sans.length : ply >= max, "last"),
    h("span", { style: { width: 8 } }),
    stepBtn(t("review.flip"), Icon.flip(28), () => setFlipped((f) => !f), false, "flip"),
    ready ? h("button", { key: "arrow", type: "button", "aria-pressed": !!settings.showBestArrow, title: t("review.arrowToggle"), onClick: () => setSetting("showBestArrow", !settings.showBestArrow), className: "cc-hover", style: { border: "1px solid var(--cc-border)", background: settings.showBestArrow ? "var(--cc-sel)" : "var(--cc-panel2)", borderRadius: 16, height: 54, padding: "0 16px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 15 } }, Icon.arrow(20), t("review.arrow")) : null
  );
  const banners = h(
    "div",
    { style: { display: "grid", gap: 10 } },
    running ? h(
      Notice,
      { kind: "info", title: t("review.analysing"), action: h(Btn, { small: true, disabled: busy, onClick: cancel }, t("common.cancel")) },
      h(
        "div",
        { style: { display: "grid", gap: 6 } },
        h("div", null, prog && prog.total ? t("review.progress", { done: prog.done, total: prog.total, phase: prog.phase || "A" }) : t("review.queued")),
        h(ProgressBar, { done: prog ? prog.done : 0, total: prog ? prog.total : 0, label: t("review.analysing") })
      )
    ) : null,
    analysis && analysis.state === "none" ? h(Notice, { kind: "info", title: t("review.noAnalysisTitle"), action: h(Btn, { primary: true, disabled: busy || engineBad, onClick: enqueue }, t("games.analyse")) }, engineBad ? t("review.engineBlocked") : t("review.noAnalysis")) : null,
    analysis && (analysis.state === "invalid" || analysis.state === "failed") ? h(Notice, { kind: "error", title: t(`review.state.${analysis.state}`), action: h(Btn, { small: true, disabled: busy, onClick: enqueue }, t("review.retryAnalysis")) }, analysis.error || t("errors.generic")) : null,
    analysis && analysis.state === "partial" ? h(Notice, { kind: "warn", title: t("review.partialTitle") }, t("review.partial")) : null,
    engineBad && !(analysis && analysis.state === "none") ? h(Notice, { kind: "error", title: t("review.engineError") }, status.engine && status.engine.error || t("review.engineBlocked")) : null,
    aError ? h(ErrorBox, { error: aError, text: errorText(t, aError), onRetry: () => setPoll((n) => n + 1) }) : null,
    tryS ? h(Notice, { kind: "warn", action: h(Btn, { small: true, onClick: exitTry }, t("review.exitTry")) }, t("review.tryBanner")) : null
  );
  const left = h(
    "div",
    { style: { width: wide ? colW : "100%", flex: "none", minWidth: 0, display: "grid", gap: 8, alignContent: "start" } },
    h("div", { style: { paddingLeft: 32 } }, h(PlayerCard, { name: top && top.name, rating: top && top.rating, color: topColor })),
    h(
      "div",
      { style: { display: "flex", gap: 8, alignItems: "flex-start" }, id: "cc-board-row" },
      h(EvalBar, { ev: curEval, height: boardSize, flipped, dim: !!tryS || !ready }),
      h(
        "div",
        { style: { width: boardSize, flex: "none" } },
        h(Board, { fen: fen || START_FEN, flipped, lastMove: lastM, arrow, badge, selected: sel, targets, onSquare, interactive: true })
      )
    ),
    h("div", { style: { paddingLeft: 32 } }, h(PlayerCard, { name: bottom && bottom.name, rating: bottom && bottom.rating, color: bottomColor })),
    h("div", { style: { paddingLeft: 32 } }, controls),
    h("div", { style: { fontSize: 11.5, color: "var(--cc-muted)", textAlign: "center" } }, t("review.keys"))
  );
  const noMoves = max === 0;
  const tabs = [["analysis", t("review.tabAnalysis")], ["coach", t("review.tabCoach")]];
  const pick = (p) => {
    exitTry();
    setPly(p);
    setPlaying(false);
  };
  const colA = [
    h(Card, { key: "hd", style: { padding: 14, flex: "none" } }, h(ReviewHeader, { detail, analysis: ready ? analysis : null })),
    h("div", { key: "op", style: { flex: "none" } }, h(OpeningsCard, { detail, onSelect: pick })),
    ready ? h(Card, { key: "gr", title: t("review.graph"), style: { padding: "10px 14px", flex: "none" } }, h(EvalGraph, { height: 150, initial: analysis.initial && analysis.initial.eval, moves: analysis.moves, ply, onSelect: pick })) : null
  ];
  const tabPanel = h(
    "section",
    { key: "tabs", style: { ...S.card, padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", flex: dual ? "1 1 0" : "none", minHeight: dual ? 0 : void 0 } },
    h(Tabs, { options: tabs, value: tab, onChange: setTab, label: t("review.tabs") }),
    h(
      "div",
      { role: "tabpanel", "aria-labelledby": `cc-tab-${tab}`, style: { padding: 14, flex: 1, minHeight: 0, overflowY: dual ? "auto" : "visible" } },
      tab === "analysis" ? h(AnalysisTab, { analysis: ready ? analysis : null, move: ready ? move : null, ply, fen: baseFen, fenBefore, onTry: startTry, partialMove: ready && move && move.failed }) : h(CoachPanel, { gameId, analysisReady: !!ready, onGoAnalyse: enqueue })
    )
  );
  const movesBlock = h(
    Card,
    { key: "ml", title: t("review.moveList"), style: { display: "flex", flexDirection: "column", flex: dual ? "1 1 0" : "none", minHeight: dual ? 120 : void 0, overflow: "hidden", padding: "12px 10px 10px" } },
    noMoves ? h("div", { style: S.muted }, t("review.noMoves")) : h("div", { style: { flex: 1, minHeight: 0, height: dual ? void 0 : 300 } }, h(FullMoves, { moves, ply, onSelect: pick }))
  );
  const colB = [
    ready ? h(Fold, { key: "cl", title: t("review.classification"), open: classOpen, onToggle: () => setClassOpen((o) => !o), style: { flex: "none" } }, h(ClassTable, { analysis })) : null,
    movesBlock,
    tabPanel
  ];
  const col = (kids, extra) => h("div", { style: { display: "flex", flexDirection: "column", gap: 10, minWidth: 0, minHeight: 0, ...extra } }, kids);
  const right = !wide ? col([...colA, ...colB], { width: "100%" }) : dual ? h("div", { style: { width: panelW, flex: "none", display: "flex", gap: 12, height: stageH, minHeight: 0 } }, col(colA, { flex: "1 1 0", height: "100%" }), col(colB, { flex: "1 1 0", height: "100%" })) : col([...colA, ...colB], { width: panelW, flex: "none", height: stageH, overflowY: "auto", paddingRight: 4 });
  return h(
    "div",
    { ref: wrap, style: { display: "grid", gap: 12 } },
    h(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } },
      onBack ? h(Btn, { small: true, onClick: onBack }, "\u2190 " + t("review.back")) : null,
      h("span", { style: { color: "var(--cc-muted)", fontSize: 13 } }, `${detail.white && detail.white.name} \u2013 ${detail.black && detail.black.name}`)
    ),
    banners,
    noMoves && !running ? h(Empty, { title: t("review.noMovesTitle"), action: onBack ? h(Btn, { onClick: onBack }, t("review.back")) : null }, t("review.noMoves")) : null,
    h("div", { ref: stageRef, style: { display: "flex", gap: 24, flexWrap: wide ? "nowrap" : "wrap", alignItems: "flex-start", justifyContent: wide ? "flex-start" : "center", ...wide ? { height: stageH, overflow: "hidden" } : {} } }, left, right)
  );
}

// lib/client/syncpicker.js
import React8 from "react";
var { useState: useState4 } = React8;
var iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function SyncPicker({ onRun, busy, running, label, disabled }) {
  const today = iso(/* @__PURE__ */ new Date());
  const [mode, setMode] = useState4("ten");
  const [day, setDay] = useState4(today);
  const bad = mode === "date" && !day;
  const run = () => onRun(mode === "last" ? { scope: "recent", count: 1 } : mode === "ten" ? { scope: "recent", count: 10 } : { scope: "range", from: day, to: day });
  return h(
    "div",
    { style: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }, "data-sync-picker": true },
    h(Seg, { label: t("sync.mode"), value: mode, onChange: setMode, options: [["last", t("sync.optLast")], ["ten", t("sync.optTen")], ["date", t("sync.optDate")]] }),
    mode === "date" ? h(Field, { label: t("sync.day") }, h("input", { type: "date", value: day, max: today, onChange: (e) => setDay(e.target.value), style: { ...S.input } })) : null,
    h(Btn, { primary: true, disabled: busy || running || disabled || bad, onClick: run }, label)
  );
}

// lib/client/games.js
var { useState: useState5, useEffect: useEffect4, useCallback: useCallback3, useMemo: useMemo2 } = React9;
var DAY = 86400;
var PERIODS = { all: null, "7": 7, "30": 30, "90": 90, "365": 365 };
function SyncControl({ compact }) {
  const { api, status, reloadStatus } = useApp();
  const sync = status && status.sync || { state: "idle" };
  const [busy, setBusy] = useState5(false);
  const [err, setErr] = useState5(null);
  const run = async (params) => {
    setBusy(true);
    setErr(null);
    try {
      await api.post("sync/start", typeof params === "string" ? { scope: params } : params);
      reloadStatus();
    } catch (e) {
      setErr(e);
    } finally {
      setBusy(false);
    }
  };
  const running = sync.state === "running";
  const label = running ? t("sync.running") : sync.state === "rate_limited" ? t("sync.rateLimited") : sync.state === "not_found" ? t("sync.notFound") : sync.state === "error" ? t("sync.error") : sync.last ? t("sync.last", { when: fmtAgo(sync.last) || fmtDate(Date.parse(sync.last) / 1e3) }) : t("sync.never");
  const bad = sync.state === "rate_limited" || sync.state === "not_found" || sync.state === "error";
  const status1 = h("span", { style: { fontSize: 12.5, color: bad ? "var(--cc-loss)" : "var(--cc-muted)" }, role: "status" }, label, running && sync.games != null ? ` \xB7 ${t("sync.games", { count: sync.games })}` : "");
  const errs = [
    err ? h("span", { key: "e", role: "alert", style: { fontSize: 12.5, color: "var(--cc-loss)" } }, errorText(t, err)) : null,
    sync.error && bad ? h("span", { key: "se", style: { fontSize: 12.5, color: "var(--cc-muted)" } }, sync.error) : null
  ];
  if (!compact) {
    return h(
      "div",
      { style: { display: "grid", gap: 8 } },
      h(SyncPicker, { onRun: run, busy, running, disabled: !status || !status.configured, label: running ? t("sync.running") : t("sync.start") }),
      h("div", { style: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" } }, status1, errs)
    );
  }
  return h(
    "div",
    { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } },
    h(Btn, { small: true, disabled: busy || running || !status || !status.configured, onClick: () => run({ scope: "recent", count: 10 }), title: t("sync.hint") }, h("span", { style: { display: "inline-flex", alignItems: "center", gap: 6 } }, Icon.sync ? Icon.sync() : null, running ? t("sync.running") : t("sync.start"))),
    status1,
    errs
  );
}
function ImportPgn({ goTo }) {
  const { api, reloadStatus } = useApp();
  const [open, setOpen] = useState5(false);
  const [text, setText] = useState5("");
  const [busy, setBusy] = useState5(false);
  const [err, setErr] = useState5(null);
  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await api.post("games/import", { pgn: text });
      setText("");
      setOpen(false);
      reloadStatus();
      goTo("review", { gameId: r.id });
    } catch (e) {
      setErr(e);
    } finally {
      setBusy(false);
    }
  };
  if (!open) return h(Btn, { small: true, onClick: () => setOpen(true), "data-import": true }, t("import.open"));
  return h(
    Card,
    { title: t("import.title"), style: { flexBasis: "100%" } },
    h(
      "div",
      { style: { display: "grid", gap: 10 } },
      h("textarea", { value: text, onChange: (e) => setText(e.target.value), rows: 6, spellCheck: false, "aria-label": t("import.title"), placeholder: t("import.placeholder"), style: { ...S.input, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: 12.5, resize: "vertical", width: "100%" } }),
      err ? h(ErrorBox, { error: err, text: errorText(t, err) }) : null,
      h(
        "div",
        { style: { display: "flex", gap: 8 } },
        h(Btn, { primary: true, disabled: busy || !text.trim(), onClick: submit }, t("import.submit")),
        h(Btn, { disabled: busy, onClick: () => {
          setOpen(false);
          setErr(null);
        } }, t("common.cancel"))
      )
    )
  );
}
function GamesScreen({ goTo }) {
  const { api, status, live } = useApp();
  const [f, setF] = useState5({ timeClass: "", color: "", result: "", opening: "", period: "all", analyzed: false, search: "" });
  const [q, setQ] = useState5("");
  const [sort, setSort] = useState5("date_desc");
  const [page, setPage] = useState5(1);
  const [pageSize, setPageSize] = useState5(25);
  const [data, setData] = useState5(null);
  const [error, setError] = useState5(null);
  const [loading, setLoading] = useState5(true);
  const [sel, setSel] = useState5(() => /* @__PURE__ */ new Set());
  const [note, setNote] = useState5(null);
  const [busy, setBusy] = useState5(false);
  useEffect4(() => {
    const id = setTimeout(() => {
      setF((x) => x.search === q ? x : { ...x, search: q });
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [q]);
  const body = useMemo2(() => {
    const b = { sort, page, pageSize };
    if (f.timeClass) b.timeClass = f.timeClass;
    if (f.color) b.color = f.color;
    if (f.result) b.result = f.result;
    if (f.opening) b.opening = f.opening;
    if (f.analyzed) b.analyzed = true;
    if (f.search) b.search = f.search;
    if (PERIODS[f.period]) b.from = Math.floor(Date.now() / 1e3) - PERIODS[f.period] * DAY;
    return b;
  }, [f, sort, page, pageSize]);
  const syncTick = live.syncTick, anyTick = live.analysisAny, doneTick = live.analysisDone;
  const load2 = useCallback3(() => {
    let alive = true;
    setLoading(true);
    api.post("games/list", body).then((r) => {
      if (alive) {
        setData(r);
        setError(null);
        setLoading(false);
      }
    }, (e) => {
      if (alive) {
        setError(e);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [api, body]);
  useEffect4(() => load2(), [load2, syncTick, doneTick]);
  const filtered = !!(f.timeClass || f.color || f.result || f.opening || f.analyzed || f.search || f.period !== "all");
  const set = (k) => (v) => {
    setF((x) => ({ ...x, [k]: v }));
    setPage(1);
  };
  const items = data && data.items || [];
  const total = data && data.total || 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const toggle = (id) => setSel((cur) => {
    const n = new Set(cur);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const allOnPage = items.length > 0 && items.every((g) => sel.has(g.id));
  const togglePage = () => setSel((cur) => {
    const n = new Set(cur);
    if (allOnPage) items.forEach((g) => n.delete(g.id));
    else items.forEach((g) => n.add(g.id));
    return n;
  });
  const analyse = async (ids) => {
    setBusy(true);
    setNote(null);
    try {
      const one = ids.length === 1;
      const r = await api.post("analysis/enqueue", { gameIds: ids.slice(0, 200), priority: one ? 1 : 0 });
      if (one) {
        goTo("review", { gameId: ids[0] });
        return;
      }
      setNote({ kind: "info", text: t("games.queued", { count: r.queued != null ? r.queued : ids.length }) });
      setSel(/* @__PURE__ */ new Set());
      load2();
    } catch (e) {
      setNote({ kind: "error", text: errorText(t, e) });
    } finally {
      setBusy(false);
    }
  };
  const trend = async () => {
    setBusy(true);
    setNote(null);
    try {
      await api.post("coach/trend", { gameIds: [...sel] });
      setNote({ kind: "info", text: t("games.trendQueued") });
    } catch (e) {
      setNote({ kind: "error", text: errorText(t, e) });
    } finally {
      setBusy(false);
    }
  };
  const head = h(
    "div",
    { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" } },
    h("h1", { style: { margin: 0, fontSize: 20 } }, t("games.title")),
    h("div", { style: { display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" } }, h(SyncControl), h(ImportPgn, { goTo }))
  );
  const filters = h(
    "div",
    { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }, role: "search", "aria-label": t("games.filters") },
    h(Select, { value: f.timeClass, onChange: set("timeClass"), label: t("games.timeClass"), options: [["", t("games.allTimeClasses")], ["bullet", t("tc.bullet")], ["blitz", t("tc.blitz")], ["rapid", t("tc.rapid")], ["daily", t("tc.daily")]] }),
    h(Select, { value: f.color, onChange: set("color"), label: t("games.color"), options: [["", t("games.allColors")], ["white", t("common.white")], ["black", t("common.black")]] }),
    h(Select, { value: f.result, onChange: set("result"), label: t("games.result"), options: [["", t("games.allResults")], ["win", t("result.win")], ["loss", t("result.loss")], ["draw", t("result.draw")]] }),
    h(Select, { value: f.opening, onChange: set("opening"), label: t("games.opening"), style: { maxWidth: 200 }, options: [["", t("games.allOpenings")], ...(data && data.openings || []).map((o) => [o.opening, `${o.opening} (${o.count})`])] }),
    h(Select, { value: f.period, onChange: set("period"), label: t("games.period"), options: [["all", t("games.anyTime")], ["7", t("games.last7")], ["30", t("games.last30")], ["90", t("games.last90")], ["365", t("games.last365")]] }),
    h("label", { style: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 } }, h("input", { type: "checkbox", checked: f.analyzed, onChange: (e) => set("analyzed")(e.target.checked) }), t("games.analysedOnly")),
    h("input", { type: "search", value: q, onChange: (e) => setQ(e.target.value), placeholder: t("games.search"), "aria-label": t("games.search"), style: { ...S.input, width: 170 } }),
    h(Select, { value: sort, onChange: (v) => {
      setSort(v);
      setPage(1);
    }, label: t("games.sort"), options: [["date_desc", t("games.sortNewest")], ["date_asc", t("games.sortOldest")], ["accuracy_desc", t("games.sortAccDesc")], ["accuracy_asc", t("games.sortAccAsc")], ["rating_desc", t("games.sortRating")]] }),
    filtered ? h(Btn, { small: true, onClick: () => {
      setF({ timeClass: "", color: "", result: "", opening: "", period: "all", analyzed: false, search: "" });
      setQ("");
      setPage(1);
    } }, t("games.clear")) : null
  );
  const batch = sel.size ? h(
    "div",
    { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" } },
    h("span", { style: { fontSize: 13, ...S.muted } }, t("games.selected", { count: sel.size })),
    h(Btn, { small: true, primary: true, disabled: busy, onClick: () => analyse([...sel]) }, t("games.analyseSelection")),
    h(Btn, { small: true, disabled: busy, onClick: trend }, t("games.trendReport")),
    h(Btn, { small: true, onClick: () => setSel(/* @__PURE__ */ new Set()) }, t("games.deselect"))
  ) : null;
  let main;
  if (error && !data) main = h(ErrorBox, { error, text: errorText(t, error), onRetry: load2 });
  else if (!data) main = h(Loading);
  else if (items.length === 0) {
    main = filtered ? h(Empty, { title: t("games.noMatchTitle"), action: h(Btn, { onClick: () => {
      setF({ timeClass: "", color: "", result: "", opening: "", period: "all", analyzed: false, search: "" });
      setQ("");
    } }, t("games.clear")) }, t("games.noMatch")) : status && !status.configured ? h(Empty, { title: t("games.emptyTitle"), action: h(Btn, { primary: true, onClick: () => goTo("setup") }, t("nav.setup")) }, t("games.emptyNotConfigured")) : h(Empty, { title: t("games.emptyTitle") }, h("div", { style: { display: "grid", gap: 10, justifyItems: "center" } }, t("games.empty"), h(SyncControl)));
  } else {
    main = h(
      "div",
      { style: { ...S.card, padding: 0, overflowX: "auto", opacity: loading ? 0.7 : 1 } },
      h(
        "table",
        { "aria-label": t("games.title") },
        h("thead", null, h(
          "tr",
          null,
          h("th", { style: { width: 34 } }, h("input", { type: "checkbox", checked: allOnPage, onChange: togglePage, "aria-label": t("games.selectPage") })),
          ["date", "timeClass", "color", "opponent", "result", "opening", "accuracy", "actions"].map((k) => h("th", { key: k, style: k === "actions" ? { textAlign: "right" } : void 0 }, t(`games.col.${k}`)))
        )),
        h("tbody", null, items.map((g) => {
          const state = g.analysisState || (g.analyzed ? "ready" : "none");
          const hasReview = g.analyzed || state === "ready" || state === "partial";
          const running = state === "queued" || state === "running";
          return h(
            "tr",
            { key: g.id, className: "cc-row", "data-game": g.id },
            h("td", null, h("input", { type: "checkbox", checked: sel.has(g.id), onChange: () => toggle(g.id), "aria-label": t("games.selectOne", { name: g.opponent && g.opponent.name }) })),
            h("td", { style: { whiteSpace: "nowrap" } }, fmtDate(g.endTime)),
            h("td", { style: { whiteSpace: "nowrap" }, title: g.timeControl }, h("span", { style: { display: "inline-flex", alignItems: "center", gap: 6 } }, timeClassIcon(g.timeClass, 15), g.timeClass ? t(`tc.${g.timeClass}`) : "", h("span", { style: { color: "var(--cc-muted)", fontSize: 12 } }, g.timeControl || ""))),
            h("td", null, h("span", { "aria-label": t(g.color === "white" ? "common.white" : "common.black"), title: t(g.color === "white" ? "common.white" : "common.black"), style: { display: "inline-block", width: 14, height: 14, borderRadius: 3, background: g.color === "white" ? "#fff" : "#262421", border: "1px solid var(--cc-muted)" } })),
            h("td", null, h("strong", null, g.opponent && g.opponent.name), h("span", { style: { color: "var(--cc-muted)" } }, ` (${g.opponent && g.opponent.rating != null ? g.opponent.rating : "?"})`)),
            h("td", { style: { whiteSpace: "nowrap", color: resultColor(g.result), fontWeight: 700 } }, t(`result.${g.result === "win" || g.result === "loss" ? g.result : "draw"}`), g.termination ? h("span", { style: { color: "var(--cc-muted)", fontWeight: 400, fontSize: 12 } }, " \xB7 " + (t(`term.${g.termination}`).startsWith("term.") ? g.termination : t(`term.${g.termination}`))) : null),
            h("td", { style: { maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, title: g.opening }, g.opening || "\u2014"),
            h("td", { style: { whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" } }, g.accuracy ? fmtNum(g.accuracy.mine, 1) : h("span", { style: S.muted }, "\u2014"), g.chesscomAccuracy ? h("span", { style: { color: "var(--cc-muted)", fontSize: 11.5 }, title: t("accuracy.chesscom", { value: fmtNum(g.chesscomAccuracy.mine, 1) }) }, ` \xB7 cc ${fmtNum(g.chesscomAccuracy.mine, 1)}`) : null),
            h(
              "td",
              { style: { textAlign: "right", whiteSpace: "nowrap" } },
              hasReview ? h(Btn, { small: true, primary: true, onClick: () => goTo("review", { gameId: g.id }) }, t("games.review")) : running ? h("span", { className: "cc-spin", style: { fontSize: 12.5, color: "var(--cc-muted)", marginRight: 8 } }, t(state === "queued" ? "games.stateQueued" : "games.stateRunning")) : h(Btn, { primary: true, disabled: busy, "data-analyse": g.id, style: { padding: "8px 22px", fontSize: 14.5, boxShadow: "0 4px 14px color-mix(in srgb, var(--cc-accent) 35%, transparent)" }, onClick: () => analyse([g.id]) }, state === "failed" || state === "invalid" ? t("common.retry") : `\u25B6  ${t("games.analyse")}`),
              running ? h(Btn, { small: true, onClick: () => goTo("review", { gameId: g.id }) }, t("games.open")) : null
            )
          );
        }))
      )
    );
  }
  const pager = data && items.length ? h(
    "div",
    { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" } },
    h("span", { style: { fontSize: 13, ...S.muted } }, t("games.range", { from: (page - 1) * pageSize + 1, to: Math.min(total, page * pageSize), total })),
    h(
      "div",
      { style: { display: "flex", gap: 8, alignItems: "center" } },
      h(Select, { value: String(pageSize), onChange: (v) => {
        setPageSize(Number(v));
        setPage(1);
      }, label: t("games.pageSize"), options: [["25", "25"], ["50", "50"], ["100", "100"]] }),
      h(Btn, { small: true, disabled: page <= 1, onClick: () => setPage(page - 1) }, t("games.prev")),
      h("span", { style: { fontSize: 13 } }, t("games.page", { page, pages })),
      h(Btn, { small: true, disabled: page >= pages, onClick: () => setPage(page + 1) }, t("games.next"))
    )
  ) : null;
  return h(
    "div",
    { style: { display: "grid", gap: 12 } },
    head,
    filters,
    batch,
    note ? h(Notice, { kind: note.kind === "error" ? "error" : "info", action: h(Btn, { small: true, onClick: () => setNote(null) }, t("common.dismiss")) }, note.text) : null,
    error && data ? h(ErrorBox, { error, text: errorText(t, error), onRetry: load2 }) : null,
    main,
    pager
  );
}

// lib/client/setup.js
import React10 from "react";
var { useState: useState6, useEffect: useEffect5 } = React10;
var NAME = /^[A-Za-z0-9_-]{3,25}$/;
var POLICY_SNIPPET = '{\n  "pluginPolicy": {\n    "http": { "byPlugin": { "chess-coach": ["api.chess.com"] } }\n  }\n}';
var PRESETS = [["fast", 10, 16], ["balanced", 14, 20], ["precise", 16, 24]];
function Toggle({ checked, onChange, label, hint }) {
  return h(
    "label",
    { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, cursor: "pointer" } },
    h("span", { style: { display: "grid", gap: 2 } }, h("span", { style: { fontSize: 14.5, fontWeight: 600 } }, label), hint ? h("span", { style: { fontSize: 12.5, color: "var(--cc-muted)" } }, hint) : null),
    h(
      "span",
      {
        role: "switch",
        "aria-checked": !!checked,
        tabIndex: 0,
        onClick: (e) => {
          e.preventDefault();
          onChange(!checked);
        },
        onKeyDown: (e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            onChange(!checked);
          }
        },
        style: { width: 46, height: 28, borderRadius: 999, flex: "none", position: "relative", background: checked ? "var(--cc-accent)" : "var(--cc-panel2)", border: "1px solid var(--cc-border)", transition: "background-color .2s ease" }
      },
      h("span", { style: { position: "absolute", top: 2, left: checked ? 20 : 2, width: 22, height: 22, borderRadius: 999, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.35)", transition: "left .2s cubic-bezier(.2,.8,.3,1)" } })
    )
  );
}
var Section = ({ title, hint, children }) => h(
  Card,
  { style: { display: "grid", gap: 14 } },
  h("div", null, h("h2", { style: { margin: 0, fontSize: 17 } }, title), hint ? h("p", { style: { margin: "4px 0 0", color: "var(--cc-muted)", fontSize: 13.5, lineHeight: 1.5 } }, hint) : null),
  children
);
function NumberPref({ label, value, onSave, hint }) {
  const [v, setV] = useState6(String(value));
  useEffect5(() => {
    setV(String(value));
  }, [value]);
  return h(
    Field,
    { label, hint },
    h("input", { type: "number", value: v, onChange: (e) => setV(e.target.value), onBlur: () => {
      const n = Number(v);
      if (Number.isInteger(n) && n !== value) onSave(n);
      else setV(String(value));
    }, style: { ...S.input, width: 140 } })
  );
}
function SetupScreen({ goTo }) {
  const { api, status, settings, savePrefs, setSetting, live, reloadStatus, openCoach, markOnboarding } = useApp();
  const [name, setName] = useState6(status && status.username || "");
  const [editing, setEditing] = useState6(false);
  const [check, setCheck] = useState6(null);
  const [engine, setEngine] = useState6(null);
  const [busy, setBusy] = useState6(false);
  const [err, setErr] = useState6(null);
  const [noGames, setNoGames] = useState6(false);
  const [cleaned, setCleaned] = useState6(null);
  const configured = !!(status && status.configured);
  const sync = status && status.sync || {};
  const syncing = sync.state === "running";
  const games = sync.games || 0;
  const validFormat = NAME.test(name.trim());
  const s = settings || {};
  const wrap = (fn) => async () => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e);
    } finally {
      setBusy(false);
    }
  };
  useEffect5(() => {
    reloadStatus();
  }, [live.syncTick]);
  useEffect5(() => {
    let live1 = true;
    api.post("engine/check", {}).then((r) => {
      if (live1) {
        setEngine(r);
        if (r && r.ok) markOnboarding("engine", true);
      }
    }, () => {
      if (live1) setEngine({ ok: false });
    });
    return () => {
      live1 = false;
    };
  }, []);
  const verify = wrap(async () => {
    const r = await api.post("sync/check", { username: name.trim() });
    setCheck(r);
    if (r.ok) {
      await savePrefs({ username: name.trim() });
      await markOnboarding("username", true);
      setEditing(false);
      await reloadStatus();
    }
  });
  const finish = async (leave) => {
    await markOnboarding("sync", true);
    await markOnboarding("complete", true);
    if (!(status && status.onboarding && status.onboarding.chatOpened)) await openCoach({ remember: true });
    await reloadStatus();
    if (leave) goTo("games");
  };
  const analyseLatest = wrap(async () => {
    setNoGames(false);
    await api.post("sync/start", { scope: "recent", count: 1 });
    let st = null;
    for (let i = 0; i < 120; i += 1) {
      await new Promise((r) => setTimeout(r, 750));
      st = await api.get("status");
      if (!st.sync || st.sync.state !== "running") break;
    }
    await reloadStatus();
    if (st && st.sync && st.sync.state !== "running" && st.sync.state !== "idle") return;
    const list = await api.post("games/list", { sort: "date_desc", page: 1, pageSize: 1 });
    const g = list.items && list.items[0];
    if (!g) {
      setNoGames(true);
      return;
    }
    await api.post("analysis/enqueue", { gameIds: [g.id], priority: 1 });
    await finish(true);
  });
  const clearGames = wrap(async () => {
    if (typeof window !== "undefined" && !window.confirm(t("setup.clearGamesConfirm"))) return;
    const r = await api.post("games/clear", {});
    setCleaned(r.deleted);
    await reloadStatus();
  });
  const resetAll = wrap(async () => {
    if (typeof window !== "undefined" && !window.confirm(t("profile.resetConfirm"))) return;
    await api.post("reset", {});
    await reloadStatus();
    goTo("setup");
  });
  const cleanUnanalysed = wrap(async () => {
    if (typeof window !== "undefined" && !window.confirm(t("profile.cleanConfirmUnanalysed"))) return;
    const r = await api.post("games/clear", { only: "unanalysed" });
    setCleaned(r.deleted);
    await reloadStatus();
  });
  const presetKey = (PRESETS.find(([, f, d]) => s.depthFast === f && s.depthDeep === d) || ["custom"])[0];
  const setPreset = (k) => {
    const p = PRESETS.find(([key]) => key === k);
    if (p) savePrefs({ depthFast: p[1], depthDeep: p[2] }).catch(setErr);
  };
  const presetText = { fast: t("profile.presetFastText"), balanced: t("profile.presetBalancedText"), precise: t("profile.presetPreciseText"), custom: "" }[presetKey];
  const initial = (status && status.username || name || "?")[0].toUpperCase();
  const accountBody = configured && !editing ? h(
    "div",
    { style: { display: "grid", gap: 12 } },
    h(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" } },
      h("span", { "data-linked": true, style: { fontSize: 15, fontWeight: 600, color: "var(--cc-win)" } }, `\u2713 ${t("profile.linked")}`),
      h(Btn, { small: true, onClick: () => {
        setEditing(true);
        setCheck(null);
      } }, t("profile.change"))
    ),
    syncing ? h(
      "div",
      { style: { display: "grid", gap: 6 } },
      h(ProgressBar, { done: live.syncProgress.archivesDone || 0, total: live.syncProgress.archivesTotal || 0, label: t("sync.running") }),
      h("div", { style: { fontSize: 13, color: "var(--cc-muted)" }, role: "status" }, t("sync.running"))
    ) : null,
    sync.state === "rate_limited" || sync.state === "error" || sync.state === "not_found" ? h(Notice, { kind: "error", title: t(sync.state === "rate_limited" ? "sync.rateLimited" : sync.state === "not_found" ? "sync.notFound" : "sync.error") }, sync.error || "") : null,
    h(
      "div",
      { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
      h(Btn, { primary: true, disabled: busy || syncing, "data-analyse-latest": true, style: { padding: "11px 24px", fontSize: 15 }, onClick: analyseLatest }, busy || syncing ? t("profile.downloading") : `\u25B6  ${t("profile.analyseLatest")}`),
      games && !syncing ? h(Btn, { disabled: busy, onClick: () => finish(true) }, t("profile.goHome")) : null
    ),
    noGames ? h(Notice, { kind: "warn" }, t("setup.noGames")) : null
  ) : h(
    "div",
    { style: { display: "grid", gap: 10 } },
    h(
      "form",
      { onSubmit: (e) => {
        e.preventDefault();
        if (validFormat && !busy) verify();
      }, style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" } },
      h(
        Field,
        { label: t("profile.usernameLabel"), hint: name && !validFormat ? t("setup.usernameFormat") : null },
        h("input", { type: "text", value: name, onChange: (e) => {
          setName(e.target.value);
          setCheck(null);
        }, autoComplete: "off", spellCheck: false, "aria-invalid": !!name && !validFormat, style: { ...S.input, width: 260 }, placeholder: t("setup.usernamePlaceholder") })
      ),
      h(Btn, { primary: true, type: "submit", disabled: busy || !validFormat }, busy ? t("profile.verifying") : t("profile.verify")),
      configured ? h(Btn, { onClick: () => {
        setEditing(false);
        setName(status && status.username || "");
        setCheck(null);
      } }, t("common.cancel")) : null
    ),
    check && check.ok ? h(Notice, { kind: "info", title: t("setup.accountOk") }, t("setup.accountOkText", { count: check.archives })) : null,
    check && !check.ok ? h(
      Notice,
      { kind: "error", title: t("setup.accountFail") },
      h(
        "div",
        null,
        t(`errors.${check.code}`) !== `errors.${check.code}` ? t(`errors.${check.code}`) : check.error,
        check.code === "network" ? h("div", { style: { marginTop: 8 } }, t("setup.operatorHttp"), h("pre", { style: { background: "var(--cc-panel2)", border: "1px solid var(--cc-border)", borderRadius: 10, padding: 10, overflow: "auto", fontSize: 12 } }, POLICY_SNIPPET)) : null
      )
    ) : null
  );
  const engineLine = !engine ? t("profile.engineChecking") : engine.ok ? t("profile.engineReady", { name: engine.name || "Stockfish", version: engine.version || "", cores: engine.cores || "?" }) : `${t("profile.engineFail")}${engine.error ? ` \u2014 ${engine.error}` : ""}`;
  return h(
    "div",
    { style: { display: "grid", gap: 16, maxWidth: 820, margin: "0 auto", width: "100%" } },
    h(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 16 } },
      h("span", { "aria-hidden": true, style: { width: 64, height: 64, borderRadius: 999, flex: "none", display: "grid", placeItems: "center", fontSize: 28, fontWeight: 700, color: "var(--cc-accent-ink)", background: "linear-gradient(135deg, var(--cc-accent), color-mix(in srgb, var(--cc-accent) 55%, #7d5cff))" } }, initial),
      h(
        "div",
        { style: { minWidth: 0 } },
        h("h1", { style: { margin: 0, fontSize: 26, letterSpacing: "-0.02em" } }, configured ? status.username : t("profile.noName")),
        h(
          "p",
          { style: { margin: "2px 0 0", color: "var(--cc-muted)", fontSize: 14 } },
          configured ? [t("profile.gamesCount", { count: games }), `(${t("profile.gamesMax")})`, sync.last ? t("profile.lastSync", { when: fmtAgo(sync.last) || sync.last }) : t("profile.neverSynced")].join(" \xB7 ") : t("profile.welcome")
        )
      )
    ),
    err ? h(Notice, { kind: "error" }, errorText(t, err)) : null,
    h(Section, { title: t("profile.account"), hint: t("profile.accountHint") }, accountBody),
    h(
      Section,
      { title: t("profile.analysis") },
      h(
        "div",
        { style: { display: "grid", gap: 8 } },
        h("div", { style: { fontSize: 13.5, fontWeight: 600 } }, t("profile.speed")),
        h(Seg, { label: t("profile.speed"), value: presetKey, onChange: setPreset, options: [["fast", t("profile.presetFast")], ["balanced", t("profile.presetBalanced")], ["precise", t("profile.presetPrecise")], ...presetKey === "custom" ? [["custom", t("profile.presetCustom")]] : []] }),
        presetText ? h("div", { style: { fontSize: 12.5, color: "var(--cc-muted)" } }, presetText) : null
      ),
      h(Toggle, { checked: s.autoAnalyse !== false, onChange: (v) => setSetting("autoAnalyse", v), label: t("profile.autoAnalyse"), hint: t("profile.autoAnalyseHint") }),
      h("div", { "data-engine": true, style: { fontSize: 13, color: engine && !engine.ok ? "var(--cc-loss)" : "var(--cc-muted)" }, role: "status" }, `${t("profile.engine")} : ${engineLine}`)
    ),
    h(
      Section,
      { title: t("profile.cleanTitle"), hint: t("profile.cleanHint") },
      h(
        "div",
        { style: { display: "flex", gap: 10, flexWrap: "wrap" } },
        h(Btn, { primary: true, disabled: busy || games === 0, "data-clean": "unanalysed", onClick: cleanUnanalysed, style: { background: "var(--cc-loss)", color: "#fff", padding: "12px 22px", fontSize: 15 } }, t("profile.cleanUnanalysed")),
        h(Btn, { disabled: busy || games === 0, "data-clean": "all", onClick: clearGames, style: { padding: "12px 22px", fontSize: 15, color: "var(--cc-loss)" } }, t("profile.cleanAll"))
      ),
      cleaned !== null ? h("div", { role: "status", style: { fontSize: 13.5, color: "var(--cc-win)" } }, t("profile.cleanDone", { count: cleaned })) : null
    ),
    h(
      Section,
      { title: t("profile.magnus"), hint: t("profile.magnusHint") },
      h("div", null, h(Seg, { label: t("profile.magnus"), value: s.language || "auto", onChange: (v) => setSetting("language", v), options: [["auto", t("profile.lang_auto")], ["fr", t("profile.lang_fr")], ["en", t("profile.lang_en")]] }))
    ),
    h(
      "details",
      { style: { borderRadius: 18, border: "1px solid var(--cc-border)", background: "var(--cc-panel)", padding: "12px 18px" } },
      h("summary", { style: { cursor: "pointer", fontWeight: 600, fontSize: 14.5 } }, t("profile.advanced")),
      h(
        "div",
        { style: { display: "flex", gap: 16, flexWrap: "wrap", marginTop: 14, alignItems: "end" } },
        h(NumberPref, { label: t("profile.threads"), value: s.threads ?? 0, onSave: (n) => savePrefs({ threads: n }).catch(setErr) }),
        h(NumberPref, { label: t("profile.hash"), value: s.hashMb ?? 64, onSave: (n) => savePrefs({ hashMb: n }).catch(setErr) }),
        h(
          Field,
          { label: t("profile.contact") },
          h("input", { type: "text", defaultValue: s.contact || "", onBlur: (e) => {
            if (e.target.value !== (s.contact || "")) savePrefs({ contact: e.target.value }).catch(setErr);
          }, style: { ...S.input, width: 280 } })
        )
      )
    ),
    h(
      Section,
      { title: t("profile.resetTitle"), hint: t("profile.resetHint") },
      h(Btn, { disabled: busy, "data-reset": true, onClick: resetAll, style: { padding: "10px 18px", color: "var(--cc-loss)" } }, t("profile.resetBtn"))
    ),
    h("div", { style: { fontSize: 12, color: "var(--cc-muted)", lineHeight: 1.5 } }, t("setup.privacy"))
  );
}

// lib/client/app.js
var { useState: useState7, useEffect: useEffect6, useRef: useRef3, useCallback: useCallback4, useMemo: useMemo3 } = React11;
var TOPICS = ["sync.progress", "sync.done", "analysis.progress", "analysis.done", "coach.updated"];
var COACH_AGENT = "chess-plugin.coach";
var INITIAL_LIVE = { syncTick: 0, analysisAny: 0, analysisDone: 0, analysisTick: {}, coachTick: 0, progress: {}, syncProgress: {} };
function reduceLive(live, topic, payload = {}) {
  switch (topic) {
    case "sync.progress":
      return { ...live, syncProgress: payload };
    case "sync.done":
      return { ...live, syncTick: live.syncTick + 1, syncProgress: {} };
    case "analysis.progress":
      return payload.gameId ? { ...live, progress: { ...live.progress, [payload.gameId]: payload } } : live;
    case "analysis.done": {
      const progress = { ...live.progress };
      if (payload.gameId) delete progress[payload.gameId];
      return { ...live, progress, analysisAny: live.analysisAny + 1, analysisDone: live.analysisDone + 1, analysisTick: { ...live.analysisTick, [payload.gameId]: (live.analysisTick[payload.gameId] || 0) + 1 } };
    }
    case "coach.updated":
      return { ...live, coachTick: live.coachTick + 1 };
    default:
      return live;
  }
}
function needsSetup(status) {
  if (!status) return false;
  const ob = status.onboarding || {};
  if (ob.completed) return false;
  return !(status.configured && status.sync && status.sync.games > 0);
}
var STORE = "chess-coach.view";
var readView = (initial) => {
  if (initial) return initial;
  try {
    const v = JSON.parse(window.sessionStorage.getItem(STORE) || "null");
    if (v && v.name) return v;
  } catch {
  }
  return null;
};
function EngineChip({ status }) {
  const e = status && status.engine || {};
  const bad = e.state === "error" || e.state === "missing";
  const color = bad ? "var(--cc-loss)" : e.state === "busy" ? "var(--cc-warn)" : "var(--cc-win)";
  return h(
    "span",
    { title: e.error || "", style: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--cc-muted)" } },
    h("span", { "aria-hidden": true, style: { width: 8, height: 8, borderRadius: 4, background: color } }),
    t(`engine.${e.state || "idle"}`),
    e.version ? ` \xB7 ${e.version}` : ""
  );
}
function createPage(ctx) {
  const api = createApi(ctx);
  return function ChessPage() {
    const dark = useDark();
    const [status, setStatus] = useState7(null);
    const [statusErr, setStatusErr] = useState7(null);
    const [settings, setSettings] = useState7({ showBestArrow: true });
    const [live, setLive] = useState7(INITIAL_LIVE);
    const [view, setView] = useState7(() => readView(ctx.__initialView));
    const [coachHelp, setCoachHelp] = useState7(false);
    const chatTried = useRef3(false);
    const lastStatus = useRef3(0);
    const reloadStatus = useCallback4(async () => {
      lastStatus.current = Date.now();
      try {
        setStatus(await api.get("status"));
        setStatusErr(null);
      } catch (e) {
        setStatusErr(e);
      }
    }, []);
    useEffect6(() => {
      reloadStatus();
      api.get("prefs").then((r) => r && r.settings && setSettings(r.settings), () => {
      });
    }, [reloadStatus]);
    useEffect6(() => {
      let timer;
      let pending = [];
      const flush = () => {
        const batch = pending;
        pending = [];
        setLive((cur) => batch.reduce((acc, [topic, payload]) => reduceLive(acc, topic, payload), cur));
        if (batch.some(([topic]) => topic !== "analysis.progress" && topic !== "sync.progress") || Date.now() - lastStatus.current > 1500) reloadStatus();
      };
      const subs = TOPICS.map((topic) => ctx.realtime.subscribe(topic, (payload) => {
        pending.push([topic, payload]);
        clearTimeout(timer);
        timer = setTimeout(flush, 120);
      }));
      return () => {
        clearTimeout(timer);
        subs.forEach((off) => {
          try {
            off();
          } catch {
          }
        });
      };
    }, [reloadStatus]);
    const goTo = useCallback4((name2, params = {}) => {
      const v = { name: name2, ...params };
      setView(v);
      try {
        window.sessionStorage.setItem(STORE, JSON.stringify(v));
      } catch {
      }
    }, []);
    const savePrefs = useCallback4(async (patch) => {
      let before;
      setSettings((cur) => {
        before = cur;
        return { ...cur, ...patch };
      });
      try {
        const r = await api.put("prefs", patch);
        if (r && r.settings) setSettings(r.settings);
        return r;
      } catch (e) {
        setSettings(before || {});
        throw e;
      }
    }, []);
    const setSetting = useCallback4((key, value) => savePrefs({ [key]: value }).catch(() => null), [savePrefs]);
    const markOnboarding = useCallback4((step, done) => api.put("onboarding", { step, done }).catch(() => null), []);
    const openCoach = useCallback4(async (opts = {}) => {
      if (opts.remember && chatTried.current) return true;
      if (opts.remember) chatTried.current = true;
      let ok = false;
      try {
        ok = !!openInIsland({ type: "@timon/missions:chat", params: { agent: COACH_AGENT, missionId: null, fresh: true } }, { edge: "right" });
      } catch {
        ok = false;
      }
      setCoachHelp(!ok);
      if (ok && opts.remember) await markOnboarding("chatOpened", true);
      return ok;
    }, [markOnboarding]);
    useEffect6(() => {
      if (status && status.onboarding && status.onboarding.completed && !status.onboarding.chatOpened && !chatTried.current) openCoach({ remember: true });
    }, [status]);
    const app = useMemo3(() => ({ api, status, settings, setSetting, savePrefs, live, goTo, reloadStatus, openCoach, markOnboarding, dark }), [status, settings, live, goTo, reloadStatus, openCoach, markOnboarding, dark, setSetting, savePrefs]);
    const style = { ...dark ? PALETTES.dark : PALETTES.light, height: "100%", maxHeight: "100dvh", overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" };
    const shell = (kids) => h("div", { className: "cc", style }, h("style", null, CSS), kids);
    if (statusErr && !status) {
      return shell(h("main", { style: { padding: 24, display: "grid", gap: 12, maxWidth: 720, margin: "0 auto" } }, h("h1", { style: { margin: 0 } }, t("nav.title")), h(ErrorBox, { error: statusErr, text: errorText(t, statusErr), onRetry: reloadStatus })));
    }
    if (!status) return shell(h("main", { style: { padding: 24 } }, h(Loading, { label: t("common.loading") })));
    const wizard = needsSetup(status);
    const name = view && view.name ? view.name : wizard ? "setup" : "games";
    const current = wizard && name !== "setup" && !(view && view.name) ? "setup" : name;
    const hasGames = !!(status.sync && status.sync.games > 0);
    const goAnalyse = async () => {
      if (view && view.gameId) {
        goTo("review", { gameId: view.gameId });
        return;
      }
      try {
        const l = await api.post("games/list", { sort: "date_desc", page: 1, pageSize: 1 });
        const g = l && l.items && l.items[0];
        goTo(g ? "review" : "games", g ? { gameId: g.id } : {});
      } catch {
        goTo("games");
      }
    };
    const nav = [["setup", t("nav.profile"), () => goTo("setup")], ["games", t("nav.home"), () => goTo("games")]];
    let screen;
    if (current === "setup") screen = h(SetupScreen, { goTo });
    else if (current === "review" && view && view.gameId) screen = h(ReviewScreen, { key: view.gameId, gameId: view.gameId, initialPly: view.ply, initialTab: view.tab, onBack: () => goTo("games"), goTo });
    else screen = h(GamesScreen, { goTo });
    const a = status.analysis || {};
    return shell(h(
      AppCtx.Provider,
      { value: app },
      h(
        "main",
        { style: { padding: "14px clamp(12px, 2.5vw, 28px) 48px", maxWidth: 2200, margin: "0 auto", display: "grid", gap: 14 } },
        h(
          "header",
          { style: { display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", paddingBottom: 6 } },
          h("strong", { "data-brand": true, style: { fontSize: 17, letterSpacing: "-0.02em", paddingRight: 6 } }, t("nav.title")),
          h(
            "nav",
            { "aria-label": t("nav.title"), style: { display: "flex", gap: 6, flexWrap: "wrap" } },
            nav.map(([k, label, fn, off]) => h("button", {
              key: k,
              type: "button",
              "data-nav": k,
              "aria-current": current === k ? "page" : void 0,
              disabled: !!off,
              onClick: fn,
              className: "cc-btn cc-hover",
              style: { border: "none", background: current === k ? "var(--cc-sel)" : "transparent", cursor: "pointer", padding: "8px 18px", borderRadius: 999, fontSize: 14.5, fontWeight: current === k ? 700 : 500, color: current === k ? "var(--cc-accent-text)" : "var(--cc-muted)" }
            }, label))
          ),
          h(
            "span",
            { style: { marginLeft: "auto", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" } },
            a.running || a.queued ? h("span", { role: "status", className: "cc-spin", style: { fontSize: 12.5, color: "var(--cc-muted)" } }, t("app.analysing", { running: a.running || 0, queued: a.queued || 0 })) : null,
            h(EngineChip, { status }),
            null
          )
        ),
        coachHelp ? h(Notice, { kind: "warn", title: t("app.coachHelpTitle"), action: h(Btn, { small: true, onClick: () => setCoachHelp(false) }, t("common.dismiss")) }, t("app.coachHelp", { agent: COACH_AGENT })) : null,
        h("div", { key: `${current}:${view && view.gameId || ""}`, className: "cc-screen" }, screen)
      )
    ));
  };
}

// lib/client/index.js
var h3 = React12.createElement;
var PICTO = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='6.5' r='3.2'/%3E%3Cpath d='M9 11.5h6M10 11.5c0 3-2.2 4-2.2 7.5h8.4c0-3.5-2.2-4.5-2.2-7.5M6.5 21h11'/%3E%3C/svg%3E")`;
function NavIcon({ className }) {
  return h3("span", {
    className,
    "aria-hidden": true,
    style: { display: "inline-block", width: 16, height: 16, flex: "none", backgroundColor: "currentColor", WebkitMaskImage: PICTO, maskImage: PICTO, WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center", WebkitMaskSize: "contain", maskSize: "contain" }
  });
}
function apply(ctx) {
  const disposePage = ctx.slots.register({ slot: "page", key: "/chess" }, createPage(ctx));
  const disposeNav = ctx.slots.register({ slot: "nav.item", key: "/chess" }, () => h3(NavLink, { href: "/chess", label: t("nav.title"), icon: NavIcon }));
  return () => {
    disposeNav();
    disposePage();
  };
}
export {
  NavIcon,
  apply
};
