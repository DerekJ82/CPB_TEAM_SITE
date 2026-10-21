// ================================================================
// GM CONNECTIONS RALLY — OutRun Engine (road, projection, drawing)
// ================================================================

// Canvas setup — depends on WIDTH/HEIGHT from config.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width  = WIDTH;
canvas.height = HEIGHT;

// Scale canvas to fill viewport
function resizeCanvas() {
  canvas.style.width  = window.innerWidth  + 'px';
  canvas.style.height = window.innerHeight + 'px';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ── Track state ───────────────────────────────────────────────
let segments    = [];
let trackLength = 0;

// ── Projection ────────────────────────────────────────────────
function project(p, camX, camY, camZ) {
  p.camera.x = (p.world.x || 0) - camX;
  p.camera.y = (p.world.y || 0) - camY;
  p.camera.z = (p.world.z || 0) - camZ;
  p.screen.scale = CAMERA_DEPTH / Math.max(p.camera.z, 1);
  p.screen.x = Math.round((WIDTH  / 2) + (p.screen.scale * p.camera.x * WIDTH  / 2));
  p.screen.y = Math.round((HEIGHT / 2) - (p.screen.scale * p.camera.y * HEIGHT / 2));
  p.screen.w = Math.round( p.screen.scale * ROAD_WIDTH * WIDTH / 2);
}

function makePoint(worldZ) {
  return { world: { x: 0, y: 0, z: worldZ }, camera: {}, screen: { x: 0, y: 0, w: 0, scale: 0 } };
}

// ── Track generation ──────────────────────────────────────────
function addSegments(count, curve, hill) {
  for (let i = 0; i < count; i++) {
    const n = segments.length;
    segments.push({
      index:    n,
      p1:       makePoint(n * SEGMENT_LENGTH),
      p2:       makePoint((n + 1) * SEGMENT_LENGTH),
      curve:    curve  || 0,
      hill:     hill   || 0,
      color:    (Math.floor(n / RUMBLE_LENGTH) % 2) ? DARK : LIGHT,
      obstacle: null,
      sign:     null,
    });
  }
}

function resetRoad() {
  segments = [];

  // Straight start
  addSegments(40,   0,     0);
  // Curve right + hill up
  addSegments(55,   3,     3);
  // Straight hilltop
  addSegments(30,   0,     0);
  // Curve left + hill down
  addSegments(55,  -3,    -3);
  // Long straight
  addSegments(70,   0,     0);
  // S-curve
  addSegments(35,   4,     2);
  addSegments(35,  -4,    -2);
  // Straight
  addSegments(35,   0,     0);
  // Big curve right
  addSegments(70,   5,     4);
  // Straight descent
  addSegments(35,   0,    -4);
  // Final curves
  addSegments(55,  -3,     0);
  addSegments(35,   2,     1);
  addSegments(55,   0,    -1);
  // Straight run-in
  addSegments(45,   0,     0);

  // ── Propagate Y heights ───────────────────────────────────────
  let y = 0;
  segments.forEach(seg => {
    seg.p1.world.y = y;
    y += seg.hill;
    seg.p2.world.y = y;
  });

  trackLength = segments.length * SEGMENT_LENGTH;

  // ── Place animals ─────────────────────────────────────────────
  ANIMAL_DEFS.forEach(a => {
    if (a.seg < segments.length)
      segments[a.seg].obstacle = { x: a.x, type: a.type, hit: false };
  });

  // ── Place milestone signs ─────────────────────────────────────
  const totalSegs = segments.length;
  SIGN_DEFS.forEach(({ pct, label }) => {
    const idx = Math.floor(pct * totalSegs);
    if (idx < segments.length) segments[idx].sign = label;
  });
}

function getSegmentAt(z) {
  const idx = Math.floor(((z % trackLength) + trackLength) % trackLength / SEGMENT_LENGTH) % segments.length;
  return segments[idx];
}

// ── Drawing helpers ───────────────────────────────────────────
function drawPoly(x1, y1, x2, y2, x3, y3, x4, y4, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3); ctx.lineTo(x4, y4);
  ctx.closePath();
  ctx.fill();
}

function drawSegmentStrip(seg, x1, w1, y1, x2, w2, y2) {
  const c  = seg.color;
  const r1 = Math.round(w1 / 5);
  const r2 = Math.round(w2 / 5);

  drawPoly(x1-w1-r1,y1, x2-w2-r2,y2, x2-w2,y2, x1-w1,y1, c.rumble);
  drawPoly(x1+w1,y1,    x2+w2,y2,    x2+w2+r2,y2, x1+w1+r1,y1, c.rumble);
  drawPoly(x1-w1,y1,    x2-w2,y2,    x2+w2,y2,    x1+w1,y1,    c.road);

  // Guitar Hero: always-on neon lane lines, every segment
  const lw1   = Math.max(1, Math.round(w1 * 0.022));
  const lw2   = Math.max(1, Math.round(w2 * 0.022));
  const step1 = (w1 * 2) / LANES;
  const step2 = (w2 * 2) / LANES;
  for (let ln = 1; ln < LANES; ln++) {
    const lx1 = Math.round(x1 - w1 + step1 * ln);
    const lx2 = Math.round(x2 - w2 + step2 * ln);
    // Soft glow halo (wider, translucent)
    drawPoly(lx1-lw1*3,y1, lx2-lw2*3,y2, lx2+lw2*3,y2, lx1+lw1*3,y1, 'rgba(0,200,255,0.18)');
    // Bright core line
    drawPoly(lx1-lw1,y1,   lx2-lw2,y2,   lx2+lw2,y2,   lx1+lw1,y1,   c.lane);
  }
}

// ── Render ────────────────────────────────────────────────────
function render() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // ── Sky / sunset gradient ──────────────────────────────────
  const halfH = Math.floor(HEIGHT / 2);
  // ── Dark space sky ────────────────────────────────────────
  const sky = ctx.createLinearGradient(0, 0, 0, halfH);
  sky.addColorStop(0,   '#000000');
  sky.addColorStop(0.5, '#06001c');
  sky.addColorStop(1,   '#0c0038');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, halfH);

  // ── Starfield (deterministic, subtly twinkles) ─────────────
  ctx.fillStyle = '#ffffff';
  const tStar = performance.now() * 0.001;
  for (let i = 0; i < 110; i++) {
    if (Math.sin(i * 2.31 + tStar) > -0.25) {
      ctx.fillRect(Math.floor((i * 137.508) % WIDTH), Math.floor((i * 89.443) % halfH), 1, 1);
    }
  }

  // ── Distant neon horizon glow ─────────────────────────────
  const horizonGlow = ctx.createLinearGradient(0, halfH - 30, 0, halfH);
  horizonGlow.addColorStop(0, 'transparent');
  horizonGlow.addColorStop(1, 'rgba(80, 0, 180, 0.55)');
  ctx.fillStyle = horizonGlow;
  ctx.fillRect(0, halfH - 30, WIDTH, 30);

  // ── Purple mountain silhouettes ───────────────────────────
  ctx.fillStyle = 'rgba(28, 8, 65, 0.8)';
  ctx.beginPath();
  ctx.moveTo(0, halfH);
  [[0,0.74],[110,0.51],[210,0.67],[330,0.43],[450,0.60],[560,0.39],[670,0.55],[790,0.44],[910,0.59],[1024,0.66]]
    .forEach(([x, f]) => ctx.lineTo(x, halfH * f));
  ctx.lineTo(1024, halfH);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(14, 4, 45, 0.94)';
  ctx.beginPath();
  ctx.moveTo(0, halfH);
  [[0,0.87],[90,0.77],[180,0.84],[270,0.73],[380,0.81],[480,0.71],[590,0.79],[700,0.74],[820,0.82],[940,0.76],[1024,0.83]]
    .forEach(([x, f]) => ctx.lineTo(x, halfH * f));
  ctx.lineTo(1024, halfH);
  ctx.closePath();
  ctx.fill();

  // ── Ground below horizon ────────────────────────────────────
  ctx.fillStyle = '#08001a';
  ctx.fillRect(0, halfH, WIDTH, HEIGHT - halfH);

  // Clip all road/sprite rendering to below the horizon line
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, halfH, WIDTH, HEIGHT - halfH);
  ctx.clip();

  // ── Road rendering ───────────────────────────────────────────
  const baseSegment = getSegmentAt(playerZ);
  const basePercent = (playerZ % SEGMENT_LENGTH) / SEGMENT_LENGTH;
  const camY = Math.round(CAMERA_HEIGHT + baseSegment.p1.world.y + (baseSegment.p2.world.y - baseSegment.p1.world.y) * basePercent);
  const camX = playerX * ROAD_WIDTH;
  const camZ = playerZ - (CAMERA_HEIGHT * 0.5);

  let maxY = HEIGHT;
  let x  = 0;
  let dx = -(baseSegment.curve * basePercent * 0.05);

  // Pass 1: Front-to-Back Road Rendering
  for (let n = 0; n < DRAW_DISTANCE; n++) {
    const seg = segments[(baseSegment.index + n) % segments.length];
    seg.looped = seg.index < baseSegment.index;
    const zOffset = seg.looped ? trackLength : 0;

    project(seg.p1, (camX - x), camY, camZ - zOffset);
    x  += dx;
    dx += seg.curve * 0.05;
    project(seg.p2, (camX - x), camY, camZ - zOffset);

    seg.clip = maxY;
    seg.drawn = false;

    // Cull segments behind camera, or fully clipped by hills
    if (seg.p1.camera.z <= CAMERA_DEPTH || seg.p2.screen.y >= maxY || seg.p2.screen.y >= seg.p1.screen.y) {
      continue;
    }

    // Draw Grass Band
    ctx.fillStyle = seg.color.grass;
    ctx.fillRect(0, seg.p2.screen.y, WIDTH, (seg.p1.screen.y - seg.p2.screen.y) + 1);

    // Draw Road Strip
    drawSegmentStrip(seg,
      seg.p1.screen.x, seg.p1.screen.w, seg.p1.screen.y,
      seg.p2.screen.x, seg.p2.screen.w, seg.p2.screen.y
    );

    seg.drawn = true;
    maxY = seg.p2.screen.y;
  }

  // Pass 2: Back-to-Front Sprite Rendering (Painter's Algorithm)
  // Signs are deferred — their boards rise above the horizon clip line
  const deferredSigns = [];

  for (let n = DRAW_DISTANCE - 1; n > 0; n--) {
    const seg = segments[(baseSegment.index + n) % segments.length];
    const sc = seg.p1.screen.scale;
    const sx = seg.p1.screen.x;
    const sy = seg.p1.screen.y;

    if (!seg.drawn) continue;

    if (seg.obstacle && !seg.obstacle.hit) {
      const obs   = seg.obstacle;
      const sprX  = Math.round(sx + (sc * obs.x * ROAD_WIDTH * WIDTH / 2));
      const baseSize = Math.max(12, sc * 80000);
      // Bounce: faster + bigger as player approaches (sc grows as distance shrinks)
      const proximity = Math.min(sc * 8, 1); // 0 far, 1 close
      const bounce = 1 + Math.sin(performance.now() * 0.006 + seg.index * 1.7) * 0.13 * proximity;
      const sprSz = baseSize * bounce;
      // Vertical bob offset (small up/down motion)
      const bob = Math.sin(performance.now() * 0.006 + seg.index * 1.7) * baseSize * 0.08 * proximity;
      ctx.font         = `${sprSz}px serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(obs.type, sprX, sy + bob);
    }

    if (seg.sign) {
      deferredSigns.push({ seg, sc, sx, sy });
    }
  }

  ctx.restore(); // release horizon clip — signs draw next, unrestricted

  // ── Signs: post-clip so boards can rise above the horizon ────
  for (const s of deferredSigns) {
    drawSign(s.seg, s.sc, s.sx, s.sy);
  }

  // ── Player car ────────────────────────────────────────────────
  drawPlayerCar();
}

function drawPlayerCar() {
  const cw = 220, ch = 80;
  const cx = WIDTH / 2;
  const cy = HEIGHT - 90;
  const steerAngle = (keys.left ? -1 : keys.right ? 1 : 0) * 0.09 * Math.min(speed / MAX_SPEED * 5, 1);

  ctx.save();
  // Penalty flash: alternate opacity at ~8 Hz for 1.5s
  if (typeof penaltyFlashTimer !== 'undefined' && penaltyFlashTimer > 0) {
    const flashOn = Math.floor(penaltyFlashTimer * 8) % 2 === 0;
    ctx.globalAlpha = flashOn ? 0.25 : 1.0;
  }
  ctx.translate(cx, cy);
  ctx.rotate(steerAngle);
  ctx.translate(-cx, -cy);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 8, cw / 2, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = '#cc1111';
  ctx.beginPath();
  ctx.roundRect(cx - cw / 2, cy - ch, cw, ch, 10);
  ctx.fill();

  // Cabin taper
  ctx.fillStyle = '#aa0000';
  ctx.beginPath();
  ctx.moveTo(cx - cw * 0.3, cy - ch);
  ctx.lineTo(cx + cw * 0.3, cy - ch);
  ctx.lineTo(cx + cw * 0.2, cy - ch * 1.6);
  ctx.lineTo(cx - cw * 0.2, cy - ch * 1.6);
  ctx.closePath();
  ctx.fill();

  // Windshield
  ctx.fillStyle = 'rgba(60,120,220,0.6)';
  ctx.beginPath();
  ctx.moveTo(cx - cw * 0.18, cy - ch);
  ctx.lineTo(cx + cw * 0.18, cy - ch);
  ctx.lineTo(cx + cw * 0.14, cy - ch * 1.55);
  ctx.lineTo(cx - cw * 0.14, cy - ch * 1.55);
  ctx.closePath();
  ctx.fill();

  // Headlights
  ctx.fillStyle = '#ffffaa';
  ctx.fillRect(cx - cw / 2 + 8, cy - 28, 32, 14);
  ctx.fillRect(cx + cw / 2 - 40, cy - 28, 32, 14);

  // Tyres
  ctx.fillStyle = '#111';
  [cx - cw * 0.42, cx + cw * 0.42 - 24].forEach(tx => {
    ctx.fillRect(tx, cy - 24, 24, 36);
  });
  // Rim shine
  ctx.fillStyle = '#555';
  [cx - cw * 0.42 + 6, cx + cw * 0.42 - 18].forEach(tx => {
    ctx.fillRect(tx, cy - 18, 12, 24);
  });

  ctx.restore();
}

// ── Sign rendering (outside clip so board rises above horizon) ──
function drawSign(seg, sc, sx, sy) {
  const roadW  = seg.p1.screen.w;
  const fh     = Math.max(10, Math.min(sc * 200000, 68));
  const bw     = fh * 6.5;
  const bh     = fh * 3.4;
  const postH  = Math.max(6, bh * 0.75);
  const poleW  = Math.max(2, roadW * 0.06);
  const border = Math.max(1.5, roadW * 0.022);

  let sprX = sx + roadW * 1.45;
  sprX = Math.min(sprX, WIDTH - bw / 2 - 8);

  const signBot = sy - postH;
  const signTop = signBot - bh;

  // Skip if entirely off-screen vertically or horizontally
  if (signTop >= HEIGHT || signBot < -bh || sprX + bw / 2 < 0) return;

  // Pole
  ctx.fillStyle = '#bbbbbb';
  ctx.fillRect(sprX - poleW / 2, Math.min(signBot, HEIGHT), poleW, Math.max(0, postH - Math.max(0, signBot - HEIGHT)));

  // Board shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(sprX - bw / 2 + 4, signTop + 4, bw, bh);

  // Board face
  ctx.fillStyle = '#001a44';
  ctx.fillRect(sprX - bw / 2, signTop, bw, bh);

  // Top accent stripe (neon blue band)
  ctx.fillStyle = '#0044aa';
  ctx.fillRect(sprX - bw / 2, signTop, bw, bh * 0.2);

  // Border
  ctx.strokeStyle = '#00ccff';
  ctx.lineWidth   = border;
  ctx.strokeRect(sprX - bw / 2, signTop, bw, bh);

  // ── Text
  const dash  = seg.sign.indexOf(' — ');
  const line1 = dash >= 0 ? seg.sign.slice(0, dash)  : seg.sign;
  const line2 = dash >= 0 ? seg.sign.slice(dash + 3) : '';

  ctx.textAlign = 'center';

  if (line2) {
    ctx.fillStyle    = '#99ddff';
    ctx.font         = `600 ${Math.round(fh * 0.52)}px Arial, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(line1, sprX, signTop + bh * 0.24);

    ctx.fillStyle    = '#fbcc04';
    ctx.font         = `900 ${Math.round(fh)}px Arial, sans-serif`;
    ctx.textBaseline = 'bottom';
    ctx.fillText(line2, sprX, signBot - bh * 0.06);
  } else {
    ctx.fillStyle    = '#fbcc04';
    ctx.font         = `900 ${Math.round(fh)}px Arial, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(seg.sign, sprX, signTop + bh / 2);
  }
}
