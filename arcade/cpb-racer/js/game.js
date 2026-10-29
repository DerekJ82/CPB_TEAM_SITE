// ================================================================
// GM CONNECTIONS RALLY — Game loop, player logic, HUD, init
// ================================================================

// ── Player state ──────────────────────────────────────────────
let playerX   = 0;     // -1..1 road position (0 = centre)
let playerZ   = 0;     // distance travelled (world units)
let speed     = 0;

// ── Game state ────────────────────────────────────────────────
let engineRunning       = false;
let driveSequenceActive = false;
let raceTime            = 0;
let nextMilestone       = 0;
let penalties           = 0;
let currentVals = { gm: 0, kddi: 0, total: 0 };
let penaltyFlashTimer = 0;
let paused = false;
let victoryBraking = false;
function togglePause() {
  if (!driveSequenceActive && !paused) return; // can't pause when not driving
  paused = !paused;
  const overlay = document.getElementById('pause-overlay');
  if (overlay) overlay.classList.toggle('hidden', !paused);
}

// ── Update ────────────────────────────────────────────────────
function update(dt) {
  if (!engineRunning || !driveSequenceActive) return;

  raceTime += dt;
  if (penaltyFlashTimer > 0) penaltyFlashTimer = Math.max(0, penaltyFlashTimer - dt);

  // Speed physics
  if (keys.up)        speed = Math.min(speed + ACCEL * dt,          MAX_SPEED);
  else if (keys.down) speed = Math.max(speed + BRAKING * dt,        0);
  else                speed = Math.max(speed + DECEL * dt,           0);

  // Off-road penalty
  if (Math.abs(playerX) > 1) {
    if (speed > OFF_ROAD_LIMIT) speed = Math.max(speed + OFF_ROAD_DECEL * dt, OFF_ROAD_LIMIT);
  }

  // Smooth steering
  const steerSpeed = 1.5;
  if (keys.left)  playerX -= dt * steerSpeed * (speed / MAX_SPEED + 0.1);
  if (keys.right) playerX += dt * steerSpeed * (speed / MAX_SPEED + 0.1);

  // Road curve pushes the car
  const seg = getSegmentAt(playerZ);
  playerX -= (seg.curve * 0.003) * (speed / MAX_SPEED);
  playerX = Math.max(-1.5, Math.min(1.5, playerX));

  // Move forward
  playerZ += speed * dt;
  if (playerZ >= trackLength) playerZ -= trackLength;

  // ── Milestone triggers ─────────────────────────────────────
  const progress = playerZ / trackLength;
  while (nextMilestone < rallyMilestones.length && progress >= rallyMilestones[nextMilestone].pct) {
    const m = rallyMilestones[nextMilestone];
    updateScores(m.gm, m.kddi);
    nextMilestone++;
  }

  // ── Collision ─────────────────────────────────────────────
  if (seg.obstacle && !seg.obstacle.hit) {
    const obs = seg.obstacle;
    if (Math.abs(playerX - obs.x) < 0.45) {
      obs.hit  = true;
      speed    = Math.max(speed * 0.25, 0);
      penalties++;
      penaltyFlashTimer = 1.5;
      currentVals.total = Math.max(0, currentVals.total - 15000);
      document.getElementById('val-total').innerHTML = currentVals.total.toLocaleString();
      honkHorn();
      playSpray();
      const cv = document.getElementById('gameCanvas');
      cv.classList.remove('shake');
      void cv.offsetWidth; // force reflow to restart animation
      cv.classList.add('shake');
      setTimeout(() => cv.classList.remove('shake'), 450);
      const pf = document.getElementById('penalty-flash');
      pf.style.opacity = '1';
      setTimeout(() => { pf.style.opacity = '0'; }, 800);
    }
  }

  // ── Win condition ─────────────────────────────────────────
  if (nextMilestone >= rallyMilestones.length && progress > 0.95 && !victoryBraking) {
    victoryBraking = true;
    document.getElementById('hud-target').innerHTML = 'FINISH LINE!';
  }

  // Victory auto-brake
  if (victoryBraking) {
    speed = Math.max(speed + BRAKING * 2 * dt, 0);
    if (speed <= 0) {
      driveSequenceActive = false;
      victoryBraking = false;
      showVictoryModal();
    }
  }

  // ── HUD updates ───────────────────────────────────────────
  const displaySpeed = Math.round((speed / MAX_SPEED) * 240);
  document.getElementById('lcd-speed').textContent = displaySpeed;

  const gear = speed < 1 ? 'N'
    : displaySpeed < 40  ? '1'
    : displaySpeed < 80  ? '2'
    : displaySpeed < 130 ? '3'
    : displaySpeed < 180 ? '4' : '5';
  document.getElementById('lcd-gear').textContent = gear;

  const mins = Math.floor(raceTime / 60);
  const secs = (raceTime % 60).toFixed(1).padStart(4, '0');
  document.getElementById('lcd-timer').textContent =
    `${String(mins).padStart(2, '0')}:${secs}`;

  const needleAngle = -90 + (speed / MAX_SPEED) * 180;
  document.getElementById('speedo-needle').style.transform = `rotate(${needleAngle}deg)`;
  const arcLen = 204;
  document.getElementById('speedo-arc').style.strokeDashoffset =
    arcLen - (speed / MAX_SPEED) * arcLen;
}

function updateScores(gm, kddi) {
  const penaltyDeduction = penalties * 15000;
  currentVals.gm    = gm;
  currentVals.kddi  = kddi;
  currentVals.total = Math.max(0, gm + kddi - penaltyDeduction);
  document.getElementById('val-gm').innerHTML    = gm.toLocaleString();
  document.getElementById('val-kddi').innerHTML  = kddi.toLocaleString();
  document.getElementById('val-total').innerHTML = currentVals.total.toLocaleString();
}

// ── Game loop ─────────────────────────────────────────────────
let lastTime = null;
function showVictoryModal() {
  fireConfetti();
  setTimeout(fireConfetti, 500);
  setTimeout(fireConfetti, 1100);
  const modal = document.getElementById('victory-modal');
  if (!modal) return;
  document.getElementById('vm-time').textContent = document.getElementById('lcd-timer').textContent;
  document.getElementById('vm-penalties').textContent = penalties;
  document.getElementById('vm-total').textContent = currentVals.total.toLocaleString();
  modal.classList.remove('hidden');
  document.getElementById('retro-ignition').style.display = 'none';
  const muteBtn = document.getElementById('muteBtn');
  if (muteBtn) muteBtn.style.display = 'none';
}

function victoryPlayAgain() {
  document.getElementById('victory-modal').classList.add('hidden');
  document.getElementById('retro-ignition').style.display = '';
  const muteBtn = document.getElementById('muteBtn');
  if (muteBtn) muteBtn.style.display = '';
  toggleIgnition(); // stop
  setTimeout(() => toggleIgnition(), 200); // restart
}

function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);
  if (!lastTime) { lastTime = timestamp; return; }
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime  = timestamp;
  if (!paused) update(dt);
  render();
}

// ── Ignition / sequence control ───────────────────────────────
function startDriveSequence() {
  setTimeout(() => {
    driveSequenceActive = true;
    playerZ      = 0;
    playerX      = 0;
    speed        = 0;
    raceTime     = 0;
    nextMilestone = 0;
    penalties    = 0;
    penaltyFlashTimer = 0;
    victoryBraking = false;
    currentVals  = { gm: 0, kddi: 0, total: 0 };
    segments.forEach(seg => { if (seg.obstacle) seg.obstacle.hit = false; });
    document.getElementById('val-gm').innerHTML    = '0';
    document.getElementById('val-kddi').innerHTML  = '0';
    document.getElementById('val-total').innerHTML = '0';
    document.getElementById('lcd-speed').textContent = '0';
    document.getElementById('lcd-gear').textContent  = 'N';
    document.getElementById('lcd-timer').textContent = '00:00.0';
    document.getElementById('hud-target').innerHTML  = 'DODGE THE ANIMALS!';
    document.getElementById('speedo-needle').style.transform = 'rotate(-90deg)';
    document.getElementById('speedo-arc').style.strokeDashoffset = '204';
  }, 50);
}

function toggleIgnition() {
  const btn = document.getElementById('ignitionBtn');
  if (!engineRunning) {
    engineRunning = true;
    btn.classList.replace('off', 'on');
    btn.textContent = 'STOP';
    playIgnitionStart();
    startDriveSequence();
  } else {
    engineRunning       = false;
    driveSequenceActive = false;
    btn.classList.replace('on', 'off');
    btn.textContent = 'START';
    playIgnitionStop();
    speed  = 0;
    document.getElementById('lcd-speed').textContent = '0';
    document.getElementById('lcd-gear').textContent  = 'N';
    document.getElementById('lcd-timer').textContent = '00:00.0';
    document.getElementById('hud-target').innerHTML  = 'TARGET: 500,000';
    document.getElementById('speedo-needle').style.transform = 'rotate(-90deg)';
    document.getElementById('speedo-arc').style.strokeDashoffset = '204';
  }
}

// ── Init ──────────────────────────────────────────────────────
resetRoad();
requestAnimationFrame(gameLoop);

window.onload = () => {};
