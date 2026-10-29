/* ─── Traffic / Car System ──────────────────────────────────────────────────── */

// GM = steel blue (80 %), KDDI = forest green (20 %)
const CAR_COLORS = {
  gm:   { body: '#1a3f7a', roof: '#2255aa', glow: '#4488ee', hl: '#ffff99', tl: '#cc2200' },
  kddi: { body: '#1a5224', roof: '#267030', glow: '#44cc55', hl: '#ffff99', tl: '#cc2200' },
};

// Lane definitions — all car traffic, no type distinction
const HAZARD_LANE_DEFS = [
  { row: 5,  dir:  1, speed: 70,  count: 2 },
  { row: 6,  dir: -1, speed: 115, count: 3 },
  { row: 7,  dir:  1, speed: 55,  count: 2 },
  { row: 8,  dir: -1, speed: 138, count: 3 },
  { row: 9,  dir:  1, speed: 92,  count: 2 },
  { row: 11, dir: -1, speed: 150, count: 3 },
  { row: 12, dir:  1, speed: 74,  count: 2 },
  { row: 13, dir: -1, speed: 118, count: 3 },
];

// Per-level difficulty scaling
const LEVEL_CFG = [
  { speedMult: 1.00, extraCount: 0 },  // level 1
  { speedMult: 1.28, extraCount: 0 },  // level 2
  { speedMult: 1.58, extraCount: 1 },  // level 3
  { speedMult: 1.92, extraCount: 1 },  // level 4
  { speedMult: 2.30, extraCount: 2 },  // level 5
];

/* ════════════════════════════════════════════════════════════════════════════
   Car — a single traffic vehicle
   ════════════════════════════════════════════════════════════════════════════ */
class Hazard {
  constructor(def, startX) {
    this.row   = def.row;
    this.dir   = def.dir;
    this.speed = def.speed;   // px/s
    // 80 % GM (blue), 20 % KDDI (green)
    this.brand = Math.random() < 0.8 ? 'gm' : 'kddi';
    this.w     = GRID.TILE;   // all cars are 1 tile wide
    this.x     = startX;
    this.c     = CAR_COLORS[this.brand];
  }

  update(dt) {
    this.x += this.dir * this.speed * (dt / 1000);
    const buf = this.w + 8;
    if (this.dir === 1  && this.x > GRID.WIDTH + buf) this.x = -buf;
    if (this.dir === -1 && this.x + this.w < -buf)    this.x = GRID.WIDTH + buf;
  }

  // Hitbox matches car body dimensions (3 px inset X, 10 px inset Y)
  get rect() {
    return {
      x: this.x + 3,
      y: this.row * GRID.TILE + 10,
      w: this.w - 6,
      h: GRID.TILE - 20,
    };
  }

  render(ctx) {
    const x = Math.round(this.x);
    const y = this.row * GRID.TILE;
    const W = this.w;
    const H = GRID.TILE;
    const c = this.c;

    ctx.save();

    /* ── Tires (4 corners, behind body) ───────────────────────────────────── */
    ctx.fillStyle = '#111111';
    const tw = 7, th = 11, tvp = 5;
    ctx.fillRect(x + 4,          y + tvp,          th, tw);  // top-left
    ctx.fillRect(x + W - 4 - th, y + tvp,          th, tw);  // top-right
    ctx.fillRect(x + 4,          y + H - tvp - tw, th, tw);  // bottom-left
    ctx.fillRect(x + W - 4 - th, y + H - tvp - tw, th, tw);  // bottom-right

    /* ── Car body ─────────────────────────────────────────────────────────── */
    ctx.shadowColor = c.glow;
    ctx.shadowBlur  = 7;
    ctx.fillStyle   = c.body;
    ctx.fillRect(x + 3, y + 10, W - 6, H - 20);

    ctx.shadowBlur = 0;

    /* ── Roof / window strip ──────────────────────────────────────────────── */
    ctx.fillStyle = c.roof;
    const wp = 8;
    ctx.fillRect(x + 3 + wp, y + 14, W - 6 - wp * 2, (H - 20) * 0.44);

    /* ── Headlights (front) & taillights (rear) ───────────────────────────── */
    const lw = 4, lh = 5;
    if (this.dir === 1) {
      // Moving right — front = right edge
      ctx.fillStyle = c.hl;
      ctx.fillRect(x + W - 4, y + 13,          lw, lh);
      ctx.fillRect(x + W - 4, y + H - 13 - lh, lw, lh);
      ctx.fillStyle = c.tl;
      ctx.fillRect(x,          y + 13,          lw, lh);
      ctx.fillRect(x,          y + H - 13 - lh, lw, lh);
    } else {
      // Moving left — front = left edge
      ctx.fillStyle = c.hl;
      ctx.fillRect(x,          y + 13,          lw, lh);
      ctx.fillRect(x,          y + H - 13 - lh, lw, lh);
      ctx.fillStyle = c.tl;
      ctx.fillRect(x + W - 4, y + 13,          lw, lh);
      ctx.fillRect(x + W - 4, y + H - 13 - lh, lw, lh);
    }

    ctx.restore();
  }
}

/* ════════════════════════════════════════════════════════════════════════════
   Particle — single debris fragment from a crash explosion
   ════════════════════════════════════════════════════════════════════════════ */
class Particle {
  constructor(x, y) {
    const angle  = Math.random() * Math.PI * 2;
    const speed  = 60 + Math.random() * 180;
    this.x       = x;
    this.y       = y;
    this.vx      = Math.cos(angle) * speed;
    this.vy      = Math.sin(angle) * speed;
    this.life    = 1.0;
    this.decay   = 0.85 + Math.random() * 0.8;
    this.size    = 2 + Math.random() * 4.5;
    const pal    = ['#ff2244', '#ff6600', '#ffcc00', '#aaaaaa', '#ffffff'];
    this.color   = pal[Math.floor(Math.random() * pal.length)];
  }

  update(dt) {
    const s  = dt / 1000;
    this.x  += this.vx * s;
    this.y  += this.vy * s;
    this.vy += 280 * s;
    this.vx *= 0.97;
    this.life -= this.decay * s;
  }

  get alive() { return this.life > 0; }

  render(ctx) {
    ctx.save();
    ctx.globalAlpha  = Math.max(0, this.life);
    ctx.shadowColor  = this.color;
    ctx.shadowBlur   = 8;
    ctx.fillStyle    = this.color;
    const s = this.size * this.life;
    ctx.fillRect(this.x - s / 2, this.y - s / 2, s, s);
    ctx.restore();
  }
}

/* ════════════════════════════════════════════════════════════════════════════
   HazardManager — owns all cars and particles
   ════════════════════════════════════════════════════════════════════════════ */
class HazardManager {
  constructor(level = 1) {
    this.hazards   = [];
    this.particles = [];
    this._spawnAll(level);
  }

  _spawnAll(level) {
    const cfg = LEVEL_CFG[Math.min(level, LEVEL_CFG.length) - 1];

    HAZARD_LANE_DEFS.forEach(def => {
      const count = Math.min(5, def.count + cfg.extraCount);
      const speed = def.speed * cfg.speedMult;
      const slotW = GRID.WIDTH / count;

      for (let i = 0; i < count; i++) {
        const jitter = (Math.random() - 0.5) * slotW * 0.4;
        const startX = def.dir === 1
          ? i * slotW + jitter
          : GRID.WIDTH - i * slotW - GRID.TILE + jitter;
        this.hazards.push(new Hazard({ ...def, speed }, startX));
      }
    });
  }

  spawnExplosion(cx, cy, count = 20) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(cx, cy));
    }
  }

  static _overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }

  checkCollision(playerRect) {
    for (const h of this.hazards) {
      if (HazardManager._overlaps(playerRect, h.rect)) return true;
    }
    return false;
  }

  update(dt) {
    for (const h of this.hazards) h.update(dt);
    this.particles = this.particles.filter(p => { p.update(dt); return p.alive; });
  }

  render(ctx) {
    for (const h of this.hazards) h.render(ctx);
    for (const p of this.particles) p.render(ctx);
  }
}
