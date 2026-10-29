/* ─── Player (Data Courier) ────────────────────────────────────────────────── */
class Player {
  constructor(gridX, gridY) {
    this.gridX        = gridX;
    this.gridY        = gridY;
    this._locked      = false;
    this._dead        = false;
    this._lastHitTime = 0;   // timestamp of last hit (for payload-tag flash)

    this._bindInput();
  }

  /* ── Public Getters (read by engine) ─────────────────────────────────────── */
  get dead()   { return this._dead; }
  get locked() { return this._locked; }

  // Pixel-space hitbox — slightly smaller than the visual square for fairness
  get rect() {
    const i = 9;
    return {
      x: this.gridX * GRID.TILE + i,
      y: this.gridY * GRID.TILE + i,
      w: GRID.TILE - i * 2,
      h: GRID.TILE - i * 2,
    };
  }

  /* ── Input ────────────────────────────────────────────────────────────────── */
  _bindInput() {
    window.addEventListener('keydown', (e) => {
      if (this._locked || typeof _gameState !== 'undefined' && _gameState !== 'playing') return;

      switch (e.key) {
        case 'ArrowUp':    case 'w': case 'W': this._move( 0, -1); e.preventDefault(); break;
        case 'ArrowDown':  case 's': case 'S': this._move( 0,  1); e.preventDefault(); break;
        case 'ArrowLeft':  case 'a': case 'A': this._move(-1,  0); e.preventDefault(); break;
        case 'ArrowRight': case 'd': case 'D': this._move( 1,  0); e.preventDefault(); break;
      }
    });
  }

  /* ── Public move — called by D-pad and engine ────────────────────────────── */
  move(dx, dy) {
    if (!this._locked && !this._dead) this._move(dx, dy);
  }

  /* ── Internal movement ────────────────────────────────────────────────────── */
  _move(dx, dy) {
    const nx = this.gridX + dx;
    const ny = this.gridY + dy;

    if (nx < 0 || nx >= GRID.COLS) return;
    if (ny < 0 || ny >= GRID.ROWS) return;

    GameAudio.playHop();
    this.gridX = nx;
    this.gridY = ny;

    if (this.gridY === 0) this._onGoal();
  }

  /* ── Goal Handler ─────────────────────────────────────────────────────────── */
  _onGoal() {
    this._locked = true;
    onGoalReached(this);  // delegate to engine; engine unlocks & repositions
  }

  /* ── Death Handler ────────────────────────────────────────────────────────── */
  die(hazardManager) {
    if (this._dead) return;
    this._dead        = true;
    this._locked      = true;
    this._lastHitTime = Date.now();

    GameAudio.playHit();

    const cx = this.gridX * GRID.TILE + GRID.TILE / 2;
    const cy = this.gridY * GRID.TILE + GRID.TILE / 2;
    hazardManager.spawnExplosion(cx, cy, 22);

    const penalty     = Math.min(state.payload, PENALTY_PER_HIT);
    state.payload     = Math.max(0, state.payload - PENALTY_PER_HIT);
    state.lives       = Math.max(0, state.lives - 1);
    updateHUD();
    setStatus(
      penalty > 0
        ? `✗  CAR CRASH — ${formatNum(penalty)} CONNECTIONS LOST`
        : '✗  CAR CRASH',
      false, true
    );

    setTimeout(() => {
      this.gridX   = Math.floor(GRID.COLS / 2);
      this.gridY   = GRID.ROWS - 1;
      this._dead   = false;
      this._locked = false;

      if (state.lives === 0) {
        resetGame();
        setStatus('GAME OVER — REINITIALIZING…', false);
        setTimeout(() => setStatus('AWAITING TRANSMISSION…', false), 2200);
      } else {
        setStatus('AWAITING TRANSMISSION…', false);
      }
    }, 1600);
  }

  /* ── Render ───────────────────────────────────────────────────────────────── */
  render(ctx) {
    const px  = this.gridX * GRID.TILE;
    const py  = this.gridY * GRID.TILE;
    const pad = 7;
    const s   = GRID.TILE - pad * 2;   // body size
    const cx  = px + GRID.TILE / 2;
    const cy  = py + GRID.TILE / 2;

    ctx.save();

    /* Outer glow */
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur  = 22;

    /* Body */
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(px + pad, py + pad, s, s);

    /* Inner highlight */
    ctx.shadowBlur  = 0;
    ctx.fillStyle   = 'rgba(255,255,255,0.28)';
    ctx.fillRect(px + pad + 3, py + pad + 3, s * 0.36, s * 0.36);

    /* Direction arrow (pointing up — "forward") */
    ctx.fillStyle = '#001a0a';
    ctx.beginPath();
    ctx.moveTo(cx,           cy - s * 0.28);
    ctx.lineTo(cx - s * 0.16, cy + s * 0.14);
    ctx.lineTo(cx + s * 0.16, cy + s * 0.14);
    ctx.closePath();
    ctx.fill();

    /* Corner notches (retro detail) */
    ctx.fillStyle = '#001a0a';
    const notch = 4;
    // TL, TR, BL, BR
    [[px + pad, py + pad], [px + pad + s - notch, py + pad],
     [px + pad, py + pad + s - notch], [px + pad + s - notch, py + pad + s - notch]]
      .forEach(([x, y]) => ctx.fillRect(x, y, notch, notch));

    ctx.restore();

    this._renderPayloadTag(ctx);
  }

  /* ── Floating payload label above sprite ──────────────────────────────────── */
  _renderPayloadTag(ctx) {
    const px = this.gridX * GRID.TILE;
    const py = this.gridY * GRID.TILE;
    const cx = px + GRID.TILE / 2;

    const flashing = (Date.now() - this._lastHitTime) < 750;
    const color    = flashing ? '#ff6600' : '#00ff88';
    const txt      = formatNum(state.payload);

    ctx.save();
    ctx.font         = 'bold 9px "Courier New", monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';

    const tw   = ctx.measureText(txt).width + 8;
    const tagY = py - 2;

    // Dark pill
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(cx - tw / 2, tagY - 13, tw, 12);

    // Payload text
    ctx.fillStyle   = color;
    ctx.shadowColor = color;
    ctx.shadowBlur  = flashing ? 14 : 5;
    ctx.fillText(txt, cx, tagY - 3);

    ctx.restore();
  }
}
