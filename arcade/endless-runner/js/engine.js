const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

// HUD elements
const elGM    = document.getElementById('scoreGM');
const elKDDI  = document.getElementById('scoreKDDI');
const elTotal = document.getElementById('scoreTotal');
const muteBtn = document.getElementById('muteBtn');

// ── Game state ────────────────────────────────────────────────
// 'start' | 'playing' | 'paused' | 'milestone' | 'victory'
let gameState  = 'start';
let cameraX    = 0;
let lastTime   = null;
let scores     = { gm: 0, kddi: 0, penalties: 0 };
let screenFlash = 0;
let pauseTimer  = 0;
let activePopup    = null;   // milestone popup data
let victoryData    = null;   // victory screen data
let pendingVictory = false;  // true when last gate popup is showing

const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

// ── Canvas ────────────────────────────────────────────────────
function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  player.init(canvas.height);
}

// ── Background ────────────────────────────────────────────────
function drawBackground() {
  const floorY = canvas.height * CONFIG.FLOOR_Y_RATIO;

  const sky = ctx.createLinearGradient(0, 0, 0, floorY);
  sky.addColorStop(0,    '#05001a');
  sky.addColorStop(0.55, '#0a0535');
  sky.addColorStop(1,    '#14082a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, floorY);

  ctx.fillStyle = '#091a14';
  ctx.fillRect(0, floorY, canvas.width, canvas.height - floorY);

  ctx.save();
  ctx.strokeStyle = '#00FFCC';
  ctx.lineWidth   = 2;
  ctx.shadowBlur  = 12;
  ctx.shadowColor = '#00FFCC';
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(canvas.width, floorY);
  ctx.stroke();
  ctx.restore();
}

// ── Helpers ───────────────────────────────────────────────────
function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function grandTotal() {
  return Math.max(0, scores.gm + scores.kddi - scores.penalties);
}

function drawStatRow(label, value, color, leftX, rightX, y) {
  ctx.save();
  ctx.textBaseline = 'top';
  ctx.font      = `700 10px 'Courier New', monospace`;
  ctx.fillStyle = '#445';
  ctx.textAlign = 'left';
  ctx.fillText(label, leftX, y);
  ctx.font        = `700 21px 'Courier New', monospace`;
  ctx.fillStyle   = color;
  ctx.shadowBlur  = 10;
  ctx.shadowColor = color;
  ctx.textAlign   = 'right';
  ctx.fillText(value.toLocaleString(), rightX, y - 2);
  ctx.restore();
}

// ── Collision detection ───────────────────────────────────────
function checkCollisions() {
  const pr     = player.getRect();
  const floorY = canvas.height * CONFIG.FLOOR_Y_RATIO;
  const pcx    = pr.x + pr.w / 2;
  const pcy    = pr.y + pr.h / 2;

  for (const node of world.getNodes()) {
    const sx = node.worldX - cameraX;
    const ny = node.yRatio * floorY;
    const dx = pcx - sx, dy = pcy - ny;
    if (dx * dx + dy * dy < (node.r + pr.w * 0.40) ** 2) {
      node.collected = true;
      const headroom = Math.max(0, CONFIG.TARGET_TOTAL - scores.gm - scores.kddi);
      const addValue = Math.min(node.value, headroom);
      if (node.type === 'gm') scores.gm   += addValue;
      else                    scores.kddi += addValue;
      audio.playCollect();
    }
  }

  if (!player.isInvincible()) {
    for (const obs of world.getObstacles()) {
      const sx = obs.worldX - cameraX;
      const oy = floorY - obs.h;
      const m  = 6;
      if (pr.x + m < sx + obs.w && pr.x + pr.w - m > sx &&
          pr.y + m < oy + obs.h && pr.y + pr.h - m > oy) {
        obs.destroyed = true;
        scores.penalties += CONFIG.OBSTACLE_PENALTY;
        screenFlash = 0.45;
        player.setInvincible(CONFIG.INVINCIBILITY_SECS);
        audio.playBugHit();
      }
    }
  }
}

// ── Gate crossing ─────────────────────────────────────────────
function checkGates() {
  const playerWorldX = cameraX + CONFIG.PLAYER_SCREEN_X;
  for (const gate of world.getGates()) {
    if (gate.passed || playerWorldX < gate.worldX) continue;
    gate.passed = true;
    audio.playGatePass();

    if (gate.isLast) {
      cameraX        = gate.worldX - CONFIG.PLAYER_SCREEN_X;  // park car exactly at gate
      gameState      = 'milestone';
      pauseTimer     = CONFIG.MILESTONE_PAUSE_SECS;
      pendingVictory = true;
      activePopup    = {
        label:       gate.label,
        sub:         gate.sub,
        detail:      gate.detail,
        actualGm:    gate.actualGm,
        actualKddi:  gate.actualKddi,
        actualTotal: gate.actualTotal,
        playerTotal: grandTotal(),
        isFinal:     true,
      };
    } else {
      gameState   = 'milestone';
      pauseTimer  = CONFIG.MILESTONE_PAUSE_SECS;
      activePopup = {
        label:       gate.label,
        sub:         gate.sub,
        detail:      gate.detail,
        actualGm:    gate.actualGm,
        actualKddi:  gate.actualKddi,
        actualTotal: gate.actualTotal,
        playerTotal: grandTotal(),
      };
    }
  }
}

// ── Game management ───────────────────────────────────────────
function startGame() {
  cameraX        = 0;
  lastTime       = null;
  scores         = { gm: 0, kddi: 0, penalties: 0 };
  screenFlash    = 0;
  activePopup    = null;
  victoryData    = null;
  pauseTimer     = 0;
  pendingVictory = false;
  world.reset(canvas.width);
  player.init(canvas.height);
  gameState   = 'playing';
  updateHUD();
}

function handleAction() {
  try { audio.ensureCtx(); } catch (_) {}
  switch (gameState) {
    case 'start':   startGame(); break;
    case 'playing': if (player.jump()) audio.playJump(); break;
    case 'victory': startGame(); break;
  }
}

// ── Screens (canvas-drawn) ────────────────────────────────────
function drawStartScreen() {
  drawBackground();
  ctx.fillStyle = 'rgba(0,2,14,0.55)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cw = canvas.width, ch = canvas.height;
  const cx = cw / 2;
  const t  = performance.now() * 0.001;
  const top = ch < 500 ? 30 : 55;

  // Title
  const tsz = Math.max(20, Math.min(36, cw / 22));
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.font         = `700 ${tsz}px 'Courier New', monospace`;
  ctx.fillStyle    = '#00FFCC';
  ctx.shadowBlur   = 22;
  ctx.shadowColor  = '#00FFCC';
  ctx.fillText('CPB ENDLESS RUNNER', cx, top);
  ctx.restore();

  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.font         = `10px 'Courier New', monospace`;
  ctx.fillStyle    = 'rgba(0,255,204,0.40)';
  ctx.fillText('A TELUS CPB PRODUCTION  ·  OCTOBER 2026', cx, top + tsz + 8);
  ctx.restore();

  // Story blurb
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.font         = `11px 'Courier New', monospace`;
  ctx.fillStyle    = 'rgba(180,220,255,0.72)';
  ctx.fillText('The CPB racer is hauling GM & KDDI connection loads', cx, top + tsz + 30);
  ctx.fillText('across 2024 – 2026. Collect every load to hit the target!', cx, top + tsz + 48);
  ctx.restore();

  // Instruction rows
  const rows = [
    { sym: '●', col: '#00AAFF', txt: 'Collect Blue nodes — GM connections'    },
    { sym: '●', col: '#39FF14', txt: 'Collect Green nodes — KDDI connections' },
    { sym: '✕', col: '#FF3333', txt: 'Jump over Red Bugs  — avoid -15,000'    },
    { sym: '◼', col: '#FFD700', txt: 'Pass 4 Milestone Gates to win!'         },
  ];
  const lh     = ch < 500 ? 26 : 32;
  const bTop   = ch / 2 - (rows.length * lh) / 2;
  const lLeft  = cx - Math.min(210, cw * 0.36);

  rows.forEach((r, i) => {
    const ly = bTop + i * lh;
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.textAlign    = 'left';
    ctx.font         = `700 12px 'Courier New', monospace`;
    ctx.fillStyle    = r.col;
    ctx.shadowBlur   = 6;
    ctx.shadowColor  = r.col;
    ctx.fillText(r.sym, lLeft, ly);
    ctx.shadowBlur   = 0;
    ctx.fillStyle    = '#8899bb';
    ctx.font         = `12px 'Courier New', monospace`;
    ctx.fillText(r.txt, lLeft + 22, ly);
    ctx.restore();
  });

  // Target
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.font         = `700 13px 'Courier New', monospace`;
  ctx.fillStyle    = '#FFD700';
  ctx.shadowBlur   = 10;
  ctx.shadowColor  = '#FFD700';
  ctx.fillText('TARGET: 646,349 TOTAL CONNECTIONS', cx, bTop + rows.length * lh + 20);
  ctx.restore();

  // Blink prompt
  if (Math.sin(t * 3) > 0) {
    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.font         = `700 14px 'Courier New', monospace`;
    ctx.fillStyle    = '#ffffff';
    ctx.shadowBlur   = 14;
    ctx.shadowColor  = '#ffffff';
    ctx.fillText(
      isTouch ? 'TAP TO BEGIN' : 'PRESS  SPACE  TO  BEGIN',
      cx, bTop + rows.length * lh + 56
    );
    ctx.restore();
  }

  // Controls reminder (keyboard)
  if (!isTouch) {
    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.font         = `10px 'Courier New', monospace`;
    ctx.fillStyle    = '#334';
    ctx.fillText('SPACE / UP / W  to jump     ESC to pause', cx, bTop + rows.length * lh + 80);
    ctx.restore();
  }
}

function drawPauseScreen() {
  ctx.fillStyle = 'rgba(0,2,14,0.62)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2, cy = canvas.height / 2;
  const pw = 300, ph = 108;
  const px = cx - pw / 2, py = cy - ph / 2;

  ctx.fillStyle = '#00060f';
  ctx.fillRect(px, py, pw, ph);

  ctx.save();
  ctx.strokeStyle = '#00FFCC';
  ctx.lineWidth   = 2;
  ctx.shadowBlur  = 18;
  ctx.shadowColor = '#00FFCC';
  ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.save();
  ctx.font         = `700 30px 'Courier New', monospace`;
  ctx.fillStyle    = '#00FFCC';
  ctx.shadowBlur   = 16;
  ctx.shadowColor  = '#00FFCC';
  ctx.textBaseline = 'middle';
  ctx.fillText('PAUSED', cx, cy - 14);
  ctx.restore();

  ctx.save();
  ctx.font         = `10px 'Courier New', monospace`;
  ctx.fillStyle    = '#445566';
  ctx.textBaseline = 'middle';
  ctx.fillText('PRESS  ESC  TO  RESUME', cx, cy + 26);
  ctx.restore();
}

function drawMilestonePopup(popup) {
  const cw = canvas.width, ch = canvas.height;
  const cx = cw / 2;

  ctx.fillStyle = 'rgba(0,4,12,0.72)';
  ctx.fillRect(0, 0, cw, ch);

  const pw = Math.min(600, cw - 60);
  const ph = popup.isFinal ? 410 : 370;
  const px = (cw - pw) / 2, py = (ch - ph) / 2;

  ctx.fillStyle = '#00060f';
  ctx.fillRect(px, py, pw, ph);

  ctx.save();
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth   = 3;
  ctx.shadowBlur  = 24;
  ctx.shadowColor = '#FFD700';
  ctx.strokeRect(px + 1.5, py + 1.5, pw - 3, ph - 3);
  ctx.restore();

  // Header label
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.font         = `700 11px 'Courier New', monospace`;
  ctx.fillStyle    = 'rgba(255,215,0,0.50)';
  ctx.fillText('MILESTONE REACHED', cx, py + 18);
  ctx.restore();

  // Date label
  const dateFontSize = Math.max(30, Math.min(54, pw / 9));
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.font         = `700 ${dateFontSize}px 'Courier New', monospace`;
  ctx.fillStyle    = '#FFD700';
  ctx.shadowBlur   = 18;
  ctx.shadowColor  = '#FFD700';
  ctx.fillText(popup.label, cx, py + 44);
  ctx.restore();

  // Sub label
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.font         = `13px 'Courier New', monospace`;
  ctx.fillStyle    = 'rgba(255,215,0,0.60)';
  ctx.fillText(popup.sub, cx, py + 44 + dateFontSize + 8);
  ctx.restore();

  // Actual data rows
  const rowTop = py + 178, rowGap = 38;
  const leftX  = px + 32,  rightX = px + pw - 32;

  ctx.save();
  ctx.strokeStyle = 'rgba(255,215,0,0.20)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(px + 24, rowTop - 10);
  ctx.lineTo(px + pw - 24, rowTop - 10);
  ctx.stroke();
  ctx.restore();

  drawStatRow('GM CONNECTIONS',   popup.actualGm,    '#00AAFF', leftX, rightX, rowTop);
  drawStatRow('KDDI CONNECTIONS', popup.actualKddi,  '#39FF14', leftX, rightX, rowTop + rowGap);

  ctx.save();
  ctx.strokeStyle = 'rgba(255,215,0,0.32)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(px + 24, rowTop + rowGap * 2 - 4);
  ctx.lineTo(px + pw - 24, rowTop + rowGap * 2 - 4);
  ctx.stroke();
  ctx.restore();

  drawStatRow('ACTUAL TOTAL', popup.actualTotal, '#FFD700', leftX, rightX, rowTop + rowGap * 2);

  // Detail context
  if (popup.detail) {
    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.font         = `italic 10px 'Courier New', monospace`;
    ctx.fillStyle    = 'rgba(255,215,0,0.42)';
    ctx.fillText(popup.detail, cx, rowTop + rowGap * 3 + 6);
    ctx.restore();
  }

  // Player score (secondary)
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.font         = `700 11px 'Courier New', monospace`;
  ctx.fillStyle    = 'rgba(180,220,255,0.55)';
  ctx.fillText(`YOUR SCORE SO FAR:  ${popup.playerTotal.toLocaleString()}`, cx, rowTop + rowGap * 3 + 26);
  ctx.restore();

  // Pass / fail indicator (final gate only)
  if (popup.isFinal) {
    const passed = popup.playerTotal >= CONFIG.TARGET_TOTAL;
    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.font         = `700 14px 'Courier New', monospace`;
    ctx.fillStyle    = passed ? '#39FF14' : '#FF7744';
    ctx.shadowBlur   = passed ? 14 : 0;
    ctx.shadowColor  = '#39FF14';
    ctx.fillText(
      passed ? '★  TARGET REACHED!  ★' : '✕  Target not reached this run',
      cx, rowTop + rowGap * 3 + 48
    );
    ctx.restore();
  }

  // Countdown bar
  const barW = (pw - 60) * Math.max(0, pauseTimer / CONFIG.MILESTONE_PAUSE_SECS);
  ctx.fillStyle = 'rgba(255,215,0,0.14)';
  ctx.fillRect(px + 30, py + ph - 16, pw - 60, 4);
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(px + 30, py + ph - 16, barW, 4);
}

function drawVictoryScreen() {
  const cw = canvas.width, ch = canvas.height, cx = cw / 2;
  const t  = performance.now() * 0.001;

  ctx.fillStyle = 'rgba(0,4,14,0.80)';
  ctx.fillRect(0, 0, cw, ch);

  const pw = Math.min(580, cw - 60);
  const ph = 308;
  const px = cx - pw / 2, py = ch / 2 - ph / 2;

  ctx.fillStyle = '#00060f';
  ctx.fillRect(px, py, pw, ph);

  ctx.save();
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth   = 3;
  ctx.shadowBlur  = 28;
  ctx.shadowColor = '#FFD700';
  ctx.strokeRect(px + 1.5, py + 1.5, pw - 3, ph - 3);
  ctx.restore();

  const hfsz = Math.max(20, Math.min(28, pw / 16));
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.font         = `700 ${hfsz}px 'Courier New', monospace`;
  ctx.fillStyle    = '#FFD700';
  ctx.shadowBlur   = 22;
  ctx.shadowColor  = '#FFD700';
  ctx.fillText('CONNECTIONS SECURED!', cx, py + 18);
  ctx.restore();

  const rowTop = py + 80, rowGap = 42;
  const leftX  = px + 32, rightX = px + pw - 32;

  ctx.save();
  ctx.strokeStyle = 'rgba(255,215,0,0.18)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(px + 24, rowTop - 8);
  ctx.lineTo(px + pw - 24, rowTop - 8);
  ctx.stroke();
  ctx.restore();

  drawStatRow('GM CONNECTIONS',   victoryData.gm,   '#00AAFF', leftX, rightX, rowTop);
  drawStatRow('KDDI CONNECTIONS', victoryData.kddi, '#39FF14', leftX, rightX, rowTop + rowGap);

  ctx.save();
  ctx.strokeStyle = 'rgba(255,215,0,0.35)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(px + 24, rowTop + rowGap * 2 - 5);
  ctx.lineTo(px + pw - 24, rowTop + rowGap * 2 - 5);
  ctx.stroke();
  ctx.restore();

  drawStatRow('GRAND TOTAL', victoryData.total, '#FFD700', leftX, rightX, rowTop + rowGap * 2);

  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.font         = `700 13px 'Courier New', monospace`;
  const hit = victoryData.hit;
  ctx.fillStyle  = hit ? '#39FF14' : '#FF7744';
  ctx.shadowBlur = hit ? 12 : 0;
  ctx.shadowColor = '#39FF14';
  ctx.fillText(
    hit ? '★  TARGET REACHED!  ★' : 'Keep pushing — target not reached!',
    cx, rowTop + rowGap * 3 + 10
  );
  ctx.restore();

  if (Math.sin(t * 2.5) > 0) {
    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.font         = `10px 'Courier New', monospace`;
    ctx.fillStyle    = '#445566';
    ctx.fillText(
      isTouch ? 'TAP TO PLAY AGAIN' : 'PRESS  SPACE  TO  PLAY  AGAIN',
      cx, py + ph - 26
    );
    ctx.restore();
  }
}

// ── HUD update ────────────────────────────────────────────────
function updateHUD() {
  const total = grandTotal();
  elGM.textContent    = scores.gm.toLocaleString();
  elKDDI.textContent  = scores.kddi.toLocaleString();
  elTotal.textContent = total.toLocaleString();
  elTotal.className   = 'hud-val ' + (total >= CONFIG.TARGET_TOTAL ? 'gold target-hit' : 'gold');
}

// ── Game loop ─────────────────────────────────────────────────
function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  // Update
  if (gameState === 'playing') {
    cameraX += CONFIG.SCROLL_SPEED * dt;
    player.update(dt, canvas.height);
    world.update(cameraX, canvas.width);
    checkCollisions();
    checkGates();
    if (screenFlash > 0) screenFlash -= dt;
  } else if (gameState === 'milestone') {
    pauseTimer -= dt;
    if (pauseTimer <= 0) {
      activePopup = null;
      if (pendingVictory) {
        pendingVictory = false;
        const total = grandTotal();
        gameState   = 'victory';
        victoryData = { gm: scores.gm, kddi: scores.kddi, total, hit: total >= CONFIG.TARGET_TOTAL };
        if (typeof confetti === 'function') {
          confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
          setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 } }), 600);
        }
      } else {
        gameState = 'playing';
      }
    }
  }

  // Render
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameState === 'start') {
    drawStartScreen();
  } else {
    drawBackground();
    world.draw(ctx, cameraX, canvas.width, canvas.height);
    player.draw(ctx);

    if (screenFlash > 0) {
      ctx.fillStyle = `rgba(255,0,0,${screenFlash * 0.60})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (gameState === 'paused')    drawPauseScreen();
    if (gameState === 'milestone' && activePopup) drawMilestonePopup(activePopup);
    if (gameState === 'victory')   drawVictoryScreen();

    updateHUD();
  }
}

// ── Input ─────────────────────────────────────────────────────
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' || e.key === 'Escape') {
    if (gameState === 'playing') { gameState = 'paused';  return; }
    if (gameState === 'paused')  { gameState = 'playing'; return; }
    return;
  }
  const isJump = e.code === 'Space'    || e.code === 'ArrowUp' || e.code === 'KeyW'
              || e.key  === ' '        || e.key  === 'ArrowUp'
              || e.key  === 'w'        || e.key  === 'W';
  if (isJump) {
    e.preventDefault();
    handleAction();
  }
});

window.addEventListener('touchstart', (e) => {
  if (e.touches.length !== 1) return;
  e.preventDefault();
  handleAction();
}, { passive: false });

// ── Mute button ───────────────────────────────────────────────
muteBtn.addEventListener('click', () => {
  const m = audio.toggleMute();
  muteBtn.textContent = m ? '🔇' : '🔊';
  muteBtn.blur();
});

// ── Boot ──────────────────────────────────────────────────────
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
requestAnimationFrame(gameLoop);
