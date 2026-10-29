/* ─── Grid Constants ───────────────────────────────────────────────────────── */
const GRID = Object.freeze({
  COLS: 13,
  ROWS: 15,
  TILE: 48,          // pixels per tile
  WIDTH:  13 * 48,   // 624px
  HEIGHT: 15 * 48,   // 720px
});

/* ─── Coordinate Utilities ─────────────────────────────────────────────────── */

/** Returns the top-left canvas pixel for a grid cell. */
function toPixel(gx, gy) {
  return { x: gx * GRID.TILE, y: gy * GRID.TILE };
}

/** Returns the grid cell containing a canvas pixel (floor). */
function toGrid(px, py) {
  return { gx: Math.floor(px / GRID.TILE), gy: Math.floor(py / GRID.TILE) };
}

/* ─── Road & Grass Theme ────────────────────────────────────────────────────── */
// Row 0 = top (goal), Row 14 = bottom (start).
// Rows 0, 4, 10, 14 are grass safe zones; all others are asphalt.
const GRASS_ROWS = new Set([0, 4, 10, 14]);

/* ─── Canvas Setup ─────────────────────────────────────────────────────────── */
const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');
canvas.width  = GRID.WIDTH;
canvas.height = GRID.HEIGHT;

/* ─── Game State ───────────────────────────────────────────────────────────── */
const state = {
  lives:      3,
  level:      1,
  payload:    0,   // connections being carried this level
  grandTotal: 0,   // cumulative connections delivered
};

/* ─── Game State Machine ───────────────────────────────────────────────────── */
// 'menu' | 'playing' | 'paused' | 'victory'
let _gameState = 'menu';

/* ─── DOM Refs ─────────────────────────────────────────────────────────────── */
const DOM = {
  level:  document.getElementById('level-val'),
  period: document.getElementById('period-val'),
  target: document.getElementById('target-val'),
  total:  document.getElementById('total-val'),
  lives:  document.getElementById('lives-val'),
  status: document.getElementById('status-msg'),
};

function updateHUD() {
  const ms = MILESTONE_DATA[state.level - 1];
  DOM.level.textContent  = state.level;
  DOM.period.textContent = ms ? ms.period : '';
  DOM.target.textContent = ms ? formatNum(ms.payload) : '0';
  DOM.total.textContent  = formatNum(state.grandTotal);
  DOM.lives.textContent  = state.lives > 0 ? '♥ '.repeat(state.lives).trim() : '—';
}

function setStatus(msg, secured = false, error = false) {
  DOM.status.textContent = msg;
  DOM.status.classList.toggle('secured', secured);
  DOM.status.classList.toggle('error',   error);
}

/* ─── Level & Game Management ──────────────────────────────────────────────── */
function startLevel(level) {
  const ms      = MILESTONE_DATA[level - 1];
  state.level   = level;
  state.payload = ms.payload;
  _hazards = new HazardManager(level);
  updateHUD();
  setStatus('AWAITING TRANSMISSION…', false);
}

function resetGame() {
  state.lives      = 3;
  state.grandTotal = 0;
  UI.hideVictory();
  startLevel(1);
}

function onGoalReached(player) {
  const levelIdx = state.level - 1;
  const isLast   = levelIdx === MILESTONE_DATA.length - 1;

  GameAudio.playSuccess();
  state.grandTotal += state.payload;
  updateHUD();

  MilestoneOverlay.show(levelIdx, state.payload, state.grandTotal, () => {
    if (isLast) {
      // Show victory screen after final milestone popup
      UI.showVictory(state.grandTotal, () => {
        _gameState = 'playing';
        resetGame();
        player.gridX   = Math.floor(GRID.COLS / 2);
        player.gridY   = GRID.ROWS - 1;
        player._locked = false;
        setStatus('AWAITING TRANSMISSION…', false);
      });
    } else {
      startLevel(state.level + 1);
      player.gridX   = Math.floor(GRID.COLS / 2);
      player.gridY   = GRID.ROWS - 1;
      player._locked = false;
    }
  });
}

/* ─── Drawing Helpers ──────────────────────────────────────────────────────── */

function drawLaneBackgrounds() {
  for (let row = 0; row < GRID.ROWS; row++) {
    const y = row * GRID.TILE;
    const T = GRID.TILE;

    if (GRASS_ROWS.has(row)) {
      // Grass: solid base with lighter centre mowing stripe
      ctx.fillStyle = '#3d7a3d';
      ctx.fillRect(0, y, GRID.WIDTH, T);
      ctx.fillStyle = '#4a9550';
      ctx.fillRect(0, y + T * 0.28, GRID.WIDTH, T * 0.44);
      // Darker top/bottom edge
      ctx.fillStyle = '#2d5c2d';
      ctx.fillRect(0, y, GRID.WIDTH, 3);
      ctx.fillRect(0, y + T - 3, GRID.WIDTH, 3);
    } else {
      // Asphalt road
      ctx.fillStyle = '#2c2c2c';
      ctx.fillRect(0, y, GRID.WIDTH, T);
      // Very subtle lighter centre band
      ctx.fillStyle = '#363636';
      ctx.fillRect(0, y + T * 0.28, GRID.WIDTH, T * 0.44);
      // Dark kerb edge top/bottom
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, y, GRID.WIDTH, 2);
      ctx.fillRect(0, y + T - 2, GRID.WIDTH, 2);
    }
  }
}

function drawLaneDividers() {
  // White dashed centre-lines between consecutive active car lanes
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  const dashW = 18, gapW = 14;

  [[5, 9], [11, 13]].forEach(([first, last]) => {
    for (let row = first + 1; row <= last; row++) {
      const lineY = row * GRID.TILE - 1;
      let x = gapW / 2;
      while (x < GRID.WIDTH) {
        ctx.fillRect(x, lineY, dashW, 2);
        x += dashW + gapW;
      }
    }
  });

  // Solid yellow edge lines at grass/road transitions
  ctx.fillStyle = '#ffdd00';
  [5, 11].forEach(row => {            // top edge of each road section
    ctx.fillRect(0, row * GRID.TILE, GRID.WIDTH, 2);
  });
  [9, 13].forEach(row => {            // bottom edge of each road section
    ctx.fillRect(0, (row + 1) * GRID.TILE - 2, GRID.WIDTH, 2);
  });
}

function drawGoalZone() {
  // Checkered finish-line stripe at bottom of goal row, then label
  const y  = 0;
  const T  = GRID.TILE;
  const cs = 6;  // checker square size

  for (let x = 0; x < GRID.WIDTH; x += cs) {
    const col = Math.floor(x / cs);
    for (let r = 0; r < 2; r++) {
      ctx.fillStyle = (col + r) % 2 === 0 ? '#ffffff' : '#000000';
      ctx.fillRect(x, y + T - cs * 2 + r * cs, cs, cs);
    }
  }

  // Dark pill behind text
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(GRID.WIDTH * 0.12, y + T * 0.2, GRID.WIDTH * 0.76, T * 0.5);

  ctx.fillStyle    = '#ffffff';
  ctx.font         = 'bold 12px "Courier New", monospace';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('◆  SECURE SERVER  ◆', GRID.WIDTH / 2, y + T * 0.44);
}

function drawStartZone() {
  const y = (GRID.ROWS - 1) * GRID.TILE;
  const T = GRID.TILE;

  ctx.fillStyle    = 'rgba(0,0,0,0.35)';
  ctx.fillRect(GRID.WIDTH * 0.12, y + T * 0.28, GRID.WIDTH * 0.76, T * 0.44);

  ctx.fillStyle    = '#ffffff';
  ctx.font         = 'bold 11px "Courier New", monospace';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('▶  START / SAFE ZONE  ▶', GRID.WIDTH / 2, y + T / 2);
}

function drawSafeMedians() {
  [4, 10].forEach(row => {
    const y = row * GRID.TILE;
    ctx.fillStyle    = 'rgba(0,0,0,0.28)';
    ctx.fillRect(GRID.WIDTH * 0.3, y + GRID.TILE * 0.3, GRID.WIDTH * 0.4, GRID.TILE * 0.4);
    ctx.fillStyle    = 'rgba(255,255,255,0.45)';
    ctx.font         = '9px "Courier New", monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('— SAFE —', GRID.WIDTH / 2, y + GRID.TILE / 2);
  });
}

function drawScene() {
  ctx.clearRect(0, 0, GRID.WIDTH, GRID.HEIGHT);
  drawLaneBackgrounds();
  drawLaneDividers();
  drawSafeMedians();
  drawGoalZone();
  drawStartZone();
}

/* ─── Game Loop ────────────────────────────────────────────────────────────── */
let _player  = null;
let _hazards = null;
let _lastTs  = 0;

function gameLoop(timestamp) {
  const dt = _lastTs === 0 ? 16 : Math.min(timestamp - _lastTs, 50);
  _lastTs = timestamp;

  // Update hazards in menu (animated bg) and during play
  if (_hazards && (_gameState === 'playing' || _gameState === 'menu')) {
    _hazards.update(dt);
  }

  // Collision only during active play
  if (_gameState === 'playing' && _player && _hazards && !_player.dead && !_player.locked) {
    if (_hazards.checkCollision(_player.rect)) {
      _player.die(_hazards);
    }
  }

  drawScene();
  if (_hazards) _hazards.render(ctx);
  if (_player && !_player.dead) _player.render(ctx);

  requestAnimationFrame(gameLoop);
}

/* ─── Boot ─────────────────────────────────────────────────────────────────── */
window.addEventListener('load', () => {
  // Create level-1 hazards for animated menu background
  _hazards = new HazardManager(1);
  _player  = new Player(Math.floor(GRID.COLS / 2), GRID.ROWS - 1);
  state.payload = MILESTONE_DATA[0].payload;
  updateHUD();

  UI.initMute();
  UI.initDPad((dx, dy) => {
    if (_player && _gameState === 'playing') _player.move(dx, dy);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (_gameState === 'playing') {
        _gameState = 'paused';
        UI.showPause();
      } else if (_gameState === 'paused') {
        _gameState = 'playing';
        UI.hidePause();
      }
    }
  });

  UI.initStartBtn(() => {
    UI.hideStart();
    _gameState = 'playing';
    startLevel(1);
  });

  requestAnimationFrame(gameLoop);
  UI.showStart();
});
