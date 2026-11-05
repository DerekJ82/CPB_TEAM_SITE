/* ----------------------------------------------------------------
   The Connection Trail — main engine
   States: boot | start | playing | crisis | hunting | reboot | end
---------------------------------------------------------------- */

const E = (() => {

  // ── DOM refs ──────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const canvas  = $('game-canvas');
  const ctx     = canvas.getContext('2d');

  // ── State ─────────────────────────────────────────────────────
  const state = {
    phase: 'boot',
    elapsed: 0,          // seconds of game time elapsed
    health: 100,         // %
    gmConnections:   0,
    kddiConnections: 0,
    pacingIndex: 0,      // 0=STEADY, 1=AGGRESSIVE, 2=OVERDRIVE

    // crisis
    crisisEvent: null,
    crisisTimeLeft: 0,
    crisisResult: null,
    crisisResultTimer: 0,

    // hunting
    huntingTimeLeft: 0,
    huntingSignals: [],
    huntingBonus: 0,
    huntingTriggered: false,

    // reboot
    rebootTimeLeft: 0,
    rebootCount: 0,

    // scheduled events
    scheduledEvents: [],
    triggeredEvents: new Set(),

    // boost/debuff
    shieldActive: false, shieldTimer: 0,
    kddiBoost: 1.0, kddiBoostTimer: 0,
    kddiPaused: false, kddiPausedTimer: 0,

    // visual
    scrollOffset: 0,
    carBob: 0,
    carBobDir: 1,
    exhaustParticles: [],
    starField: [],

    // tick
    lastTickSecond: -1,
    bootLine: 0,
  };

  // ── Terrain layer data ────────────────────────────────────────
  const LAYERS = [
    { peaks: [], color: '#003300', speed: 0.15, hBase: 0.55, hVar: 0.20 },
    { peaks: [], color: '#005500', speed: 0.30, hBase: 0.68, hVar: 0.15 },
    { peaks: [], color: '#007700', speed: 0.55, hBase: 0.75, hVar: 0.10 },
  ];
  const ROAD_MARKINGS = []; // x positions of road dashes (replenished)

  // ── Boot sequence lines ───────────────────────────────────────
  const BOOT_LINES = [
    'APPLE II FLEET OS v3.14',
    'COPYRIGHT 1977-2026 EPB SIGNAL CORPS',
    '',
    'RAM OK     65536 BYTES FREE',
    'DISK ][ INTERFACE DETECTED',
    '> LOADING CONNECTION TRAIL v1.0 ...',
    '',
    '> FLEET REGISTRY INITIALIZED',
    '> GM MODULE .............. OK',
    '> KDDI MODULE ............ OK',
    '> SIGNAL HEALTH MONITOR .. OK',
    '> CRISIS RESPONSE UNIT ... OK',
    '',
    '> PRESS ANY KEY TO BEGIN',
  ];

  // ── Init ──────────────────────────────────────────────────────
  function init() {
    resize();
    window.addEventListener('resize', resize);
    buildStarField();
    buildTerrain();
    buildRoadMarkings();

    document.addEventListener('keydown', onKey);
    canvas.addEventListener('click', onCanvasClick);

    scheduleEvents();
    requestAnimationFrame(loop);
  }

  function resize() {
    // Use actual rendered dimensions so road/car aren't clipped by HUD
    canvas.width  = canvas.offsetWidth  || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;
    if (canvas.width === 0) canvas.width = window.innerWidth;
    if (canvas.height === 0) canvas.height = window.innerHeight;
    buildTerrain();
    buildStarField();
  }

  function buildStarField() {
    state.starField = [];
    for (let i = 0; i < 80; i++) {
      state.starField.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.5,
        r: Math.random() < 0.2 ? 1.5 : 1,
        blink: Math.random()
      });
    }
  }

  function buildTerrain() {
    const W = canvas.width;
    LAYERS.forEach(layer => {
      layer.peaks = [];
      // 80 peaks — enough for a seamless tile at all speeds
      const count = 80;
      let y = canvas.height * layer.hBase;
      for (let i = 0; i < count; i++) {
        y += (Math.random() - 0.5) * canvas.height * layer.hVar * 0.5;
        const minY = canvas.height * (layer.hBase - layer.hVar);
        const maxY = canvas.height * (layer.hBase + layer.hVar * 0.3);
        y = Math.max(minY, Math.min(maxY, y));
        layer.peaks.push(y);  // just the y value; x is computed from index
      }
    });
  }

  function buildRoadMarkings() {
    ROAD_MARKINGS.length = 0;
    for (let x = 0; x < canvas.width * 2; x += 100) {
      ROAD_MARKINGS.push(x);
    }
  }

  // ── Event scheduling ──────────────────────────────────────────
  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function scheduleEvents() {
    const count = 3 + Math.floor(Math.random() * 2); // 3 or 4
    const indices = shuffleArray([0, 1, 2, 3]).slice(0, count);
    const times   = [];

    // Place events, avoiding 26-33 second window (Signal Hunting zone)
    // and first/last 4 seconds
    const tryPlace = (lo, hi) => {
      let attempts = 0, t;
      do {
        t = lo + Math.random() * (hi - lo);
        attempts++;
      } while (attempts < 50 && times.some(e => Math.abs(e - t) < 7));
      return t;
    };

    const half = Math.ceil(count / 2);
    for (let i = 0; i < half; i++)        times.push(tryPlace(5, 25));
    for (let i = half; i < count; i++)    times.push(tryPlace(34, 54));

    state.scheduledEvents = indices.map((eventIdx, i) => ({
      uid:        `ev_${i}`,
      gameTime:   times[i],
      eventIndex: eventIdx
    }));
  }

  // ── Main loop ─────────────────────────────────────────────────
  let lastTime = null;

  function loop(ts) {
    if (!lastTime) lastTime = ts;
    const dt = Math.min((ts - lastTime) / 1000, 0.1); // cap at 100 ms
    lastTime = ts;

    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  // ── Update ────────────────────────────────────────────────────
  function update(dt) {
    switch (state.phase) {
      case 'boot':    updateBoot(dt);    break;
      case 'playing': updatePlaying(dt); break;
      case 'crisis':  updateCrisis(dt);  break;
      case 'hunting': updateHunting(dt); break;
      case 'reboot':  updateReboot(dt);  break;
    }
  }

  function updateBoot(dt) {
    bootTimer += dt;
  }

  function updatePlaying(dt) {
    state.elapsed += dt;

    if (state.elapsed >= CONFIG.GAME_DURATION) {
      state.elapsed = CONFIG.GAME_DURATION;
      endGame();
      return;
    }

    // Signal Hunting trigger at 30s
    if (!state.huntingTriggered && state.elapsed >= CONFIG.HUNTING_TRIGGER) {
      state.huntingTriggered = true;
      startHunting();
      return;
    }

    // Crisis event check
    for (const ev of state.scheduledEvents) {
      if (!state.triggeredEvents.has(ev.uid) && state.elapsed >= ev.gameTime) {
        state.triggeredEvents.add(ev.uid);
        startCrisis(ev.eventIndex);
        return;
      }
    }

    const pacing = CONFIG.PACING[CONFIG.PACING_LEVELS[state.pacingIndex]];

    // Health drain
    state.health -= pacing.healthDrain * dt;
    if (state.health <= 0) {
      state.health = 0;
      startReboot();
      return;
    }

    // Connections growth
    state.gmConnections   += pacing.gmRate * dt;
    const kddiMult = state.kddiPaused ? 0 : (state.kddiBoost * dt);
    state.kddiConnections += pacing.kddiRate * kddiMult;

    // Boost/debuff timers
    if (state.shieldTimer > 0) {
      state.shieldTimer -= dt;
      if (state.shieldTimer <= 0) state.shieldActive = false;
    }
    if (state.kddiBoostTimer > 0) {
      state.kddiBoostTimer -= dt;
      if (state.kddiBoostTimer <= 0) state.kddiBoost = 1.0;
    }
    if (state.kddiPausedTimer > 0) {
      state.kddiPausedTimer -= dt;
      if (state.kddiPausedTimer <= 0) state.kddiPaused = false;
    }

    // Terrain scroll — no wrap, tiling handled per-layer in render
    state.scrollOffset += pacing.scrollSpeed * dt;

    // Car bob
    state.carBob += dt * 4 * state.carBobDir;
    if (Math.abs(state.carBob) > 2) state.carBobDir *= -1;

    // Exhaust particles (more for overdrive)
    if (Math.random() < (state.pacingIndex + 1) * 0.3) {
      const carX  = getCarX();
      const roadY = getRoadY();
      state.exhaustParticles.push({
        x: carX - 10,
        y: roadY - 18,
        vx: -(15 + Math.random() * 20),
        vy: (Math.random() - 0.5) * 8,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.5 + Math.random() * 0.3,
        color: state.pacingIndex === 2 ? '#ff4444' : '#009900'
      });
    }
    state.exhaustParticles = state.exhaustParticles.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      return p.life > 0;
    });

    // Tick sound
    const sec = Math.floor(state.elapsed);
    if (sec !== state.lastTickSecond) {
      state.lastTickSecond = sec;
      Audio.playTick();
      const remaining = CONFIG.GAME_DURATION - state.elapsed;
      const freq = 55 + (state.pacingIndex * 30) + (state.elapsed / CONFIG.GAME_DURATION) * 20;
      Audio.setEngineFreq(freq);
    }

    updateHUD();
  }

  function updateCrisis(dt) {
    if (state.crisisResult) {
      // Show result briefly then resume
      state.crisisResultTimer -= dt;
      if (state.crisisResultTimer <= 0) {
        hideCrisisModal();
        state.phase = 'playing';
      }
      return;
    }

    state.crisisTimeLeft -= dt;
    const fill = $('crisis-timer-fill');
    if (fill) fill.style.width = Math.max(0, (state.crisisTimeLeft / 5) * 100) + '%';

    if (state.crisisTimeLeft <= 0) {
      resolveCrisis(null); // auto-worst-case
    }
  }

  function updateHunting(dt) {
    state.huntingTimeLeft -= dt;
    const el = $('hunting-timer');
    if (el) el.textContent = Math.max(0, Math.ceil(state.huntingTimeLeft));
    if (state.huntingTimeLeft <= 0) endHunting();
  }

  function updateReboot(dt) {
    state.rebootTimeLeft -= dt;
    const cd = $('reboot-countdown');
    if (cd) cd.textContent = Math.max(0, Math.ceil(state.rebootTimeLeft));
    if (state.rebootTimeLeft <= 0) {
      $('reboot-overlay').classList.add('hidden');
      state.health = 30; // partial restore after reboot
      Audio.playRebootComplete();
      state.phase = 'playing';
    }
  }

  // ── Pacing control ────────────────────────────────────────────
  function changePacing(dir) {
    const next = Math.max(0, Math.min(2, state.pacingIndex + dir));
    if (next === state.pacingIndex) return;
    state.pacingIndex = next;
    if (dir > 0) Audio.playPacingUp(); else Audio.playPacingDown();
    updateHUD();
  }

  // ── Crisis ────────────────────────────────────────────────────
  function startCrisis(eventIndex) {
    state.crisisEvent = CONFIG.EVENTS[eventIndex];
    state.crisisTimeLeft  = 5;
    state.crisisResult    = null;
    state.crisisResultTimer = 0;
    state.phase = 'crisis';
    Audio.playCrisisAlert();
    showCrisisModal();
  }

  function showCrisisModal() {
    const ev = state.crisisEvent;
    $('crisis-title').textContent = ev.title;
    $('crisis-desc').textContent  = ev.desc;

    const opts = $('crisis-options');
    opts.innerHTML = '';
    ev.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className  = 'crisis-btn';
      btn.innerHTML  = `<span class="opt-label">${opt.label}</span><span class="opt-desc">${opt.desc}</span>`;
      btn.onclick    = () => resolveCrisis(opt);
      opts.appendChild(btn);
    });

    $('crisis-result').classList.add('hidden');
    $('crisis-timer-fill').style.width = '100%';
    $('crisis-modal').classList.remove('hidden');
  }

  function resolveCrisis(option) {
    const ev = state.crisisEvent;
    const result = option ? option.resolve(state) : ev.worstCase(state);
    state.crisisResult = result;
    state.crisisResultTimer = 1.8;

    const resEl = $('crisis-result');
    resEl.textContent  = result.msg;
    resEl.className    = 'crisis-result ' + (result.good ? 'result-good' : 'result-bad');
    resEl.classList.remove('hidden');

    if (result.good) Audio.playChoiceGood(); else Audio.playChoiceBad();

    // Disable buttons
    document.querySelectorAll('.crisis-btn').forEach(b => b.disabled = true);
  }

  function hideCrisisModal() {
    $('crisis-modal').classList.add('hidden');
    state.crisisEvent = null;
  }

  // ── Signal Hunting ────────────────────────────────────────────
  function startHunting() {
    state.phase = 'hunting';
    state.huntingTimeLeft = CONFIG.HUNTING_DURATION;
    state.huntingBonus    = 0;

    // Spawn signal dots in the arena
    const arena = $('hunting-arena');
    arena.innerHTML = '';
    state.huntingSignals = [];

    for (let i = 0; i < CONFIG.HUNTING_SIGNAL_COUNT; i++) {
      const dot = document.createElement('div');
      dot.className = 'signal-dot';
      const x = 5 + Math.random() * 85; // %
      const y = 5 + Math.random() * 80; // %
      dot.style.left = x + '%';
      dot.style.top  = y + '%';
      dot.dataset.idx = i;
      dot.onclick = () => collectSignal(i, dot);
      arena.appendChild(dot);
      state.huntingSignals.push({ collected: false });
    }

    $('hunting-score').textContent = 'SIGNALS: 0 / +0 GM';
    $('hunting-modal').classList.remove('hidden');
    Audio.playHuntingStart();
  }

  function collectSignal(idx, el) {
    if (state.huntingSignals[idx].collected) return;
    state.huntingSignals[idx].collected = true;
    state.huntingBonus += CONFIG.HUNTING_BONUS;
    state.gmConnections += CONFIG.HUNTING_BONUS;
    el.classList.add('collected');
    Audio.playSignalCollect();
    const count = state.huntingSignals.filter(s => s.collected).length;
    $('hunting-score').textContent =
      `SIGNALS: ${count} / +${(state.huntingBonus).toLocaleString()} GM`;
  }

  function endHunting() {
    $('hunting-modal').classList.add('hidden');
    state.phase = 'playing';
  }

  // ── Reboot ────────────────────────────────────────────────────
  function startReboot() {
    state.rebootCount++;
    state.rebootTimeLeft = CONFIG.REBOOT_DURATION;
    state.phase = 'reboot';
    Audio.playReboot();

    const overlay = $('reboot-overlay');
    overlay.classList.remove('hidden');
    $('reboot-countdown').textContent = CONFIG.REBOOT_DURATION;
  }

  // ── End game ─────────────────────────────────────────────────
  function endGame() {
    Audio.stopEngineLoop();
    state.phase = 'end';

    const gm   = Math.round(state.gmConnections);
    const kddi = Math.round(state.kddiConnections);
    const isTombstone = state.rebootCount >= CONFIG.MAX_REBOOTS ||
                        (gm + kddi < 50000);

    if (isTombstone) {
      Audio.playTombstone();
      showEndScreen(gm, kddi, true);
    } else {
      Audio.playVictory();
      showEndScreen(gm, kddi, false);
    }
  }

  function showEndScreen(gm, kddi, tombstone) {
    const ranking  = CONFIG.RANKINGS.find(r => r.condition(gm, kddi)) || CONFIG.RANKINGS[CONFIG.RANKINGS.length - 1];
    const gmPct    = Math.min(100, (gm / CONFIG.GM_TARGET * 100)).toFixed(1);
    const kddiPct  = Math.min(100, (kddi / CONFIG.KDDI_TARGET * 100)).toFixed(1);

    const rankEl = $('end-rank');
    if (tombstone) {
      rankEl.style.color = '#ff2244';
      rankEl.innerHTML   = '💀 R.I.P. 💀<br>THE CONNECTION<br>WAS LOST';
    } else {
      rankEl.style.color = ranking.color;
      rankEl.innerHTML   = ranking.label;
    }

    $('end-stats').innerHTML =
      `GM CONNECTIONS  : ${gm.toLocaleString()} / ${CONFIG.GM_TARGET.toLocaleString()} (${gmPct}%)<br>` +
      `KDDI CONNECTIONS: ${kddi.toLocaleString()} / ${CONFIG.KDDI_TARGET.toLocaleString()} (${kddiPct}%)<br>` +
      `TOTAL           : ${(gm + kddi).toLocaleString()} / ${CONFIG.TOTAL_TARGET.toLocaleString()}<br>` +
      `REBOOTS         : ${state.rebootCount}`;

    const messages = {
      'ELITE PIONEER':  'BOTH GM & KDDI TARGETS MET. FULL DEPLOYMENT ACHIEVED.',
      'TRAIL BLAZER':   'STRONG PROGRESS. WITHIN STRIKING DISTANCE.',
      'SIGNAL SEEKER':  'GM CONNECTIONS SOLID. KDDI NEEDS MORE COVERAGE.',
      'DESERT WALKER':  'ROUGH TRAIL. MORE AGGRESSIVE PACING NEEDED.',
      'LOST IN STATIC': 'THE SIGNAL WAS TOO WEAK. TRY AGAIN, PIONEER.'
    };
    $('end-message').textContent = tombstone
      ? 'SYSTEM REBOOTED TOO MANY TIMES. MISSION COMPROMISED.'
      : (messages[ranking.label] || '');

    $('game-screen').classList.add('hidden');
    $('end-screen').classList.remove('hidden');
    $('end-screen').style.display = 'flex';
  }

  // ── HUD update ────────────────────────────────────────────────
  function updateHUD() {
    const remaining = Math.max(0, CONFIG.GAME_DURATION - state.elapsed);
    const mins = Math.floor(remaining / 60);
    const secs = Math.floor(remaining % 60);
    $('hud-timer').textContent = `TIME: ${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;

    const months = Math.floor((state.elapsed / CONFIG.GAME_DURATION) * CONFIG.TIMELINE_MONTHS);
    const baseMonth = 0; // Jan = 0
    const baseYear  = 2024;
    const totalMonth = baseMonth + months;
    const year  = baseYear + Math.floor(totalMonth / 12);
    const month = totalMonth % 12;
    $('hud-date').textContent = `DATE: ${CONFIG.MONTH_NAMES[month]} ${year}`;

    const pacing = CONFIG.PACING[CONFIG.PACING_LEVELS[state.pacingIndex]];
    const pName  = $('pacing-name');
    pName.textContent = pacing.name;
    pName.style.color = pacing.color;

    // Health bar
    const h = Math.max(0, state.health);
    $('health-fill').style.width = h + '%';
    $('health-fill').style.background =
      h > 50 ? '#00ff41' : h > 25 ? '#ffe600' : '#ff2244';
    $('health-pct').textContent  = Math.round(h) + '%';

    // Connection bars
    const gmPct   = Math.min(100, state.gmConnections   / CONFIG.GM_TARGET   * 100);
    const kddiPct = Math.min(100, state.kddiConnections / CONFIG.KDDI_TARGET * 100);
    $('gm-fill').style.width    = gmPct   + '%';
    $('kddi-fill').style.width  = kddiPct + '%';
    $('gm-current').textContent   = Math.round(state.gmConnections).toLocaleString();
    $('kddi-current').textContent = Math.round(state.kddiConnections).toLocaleString();

    // Timeline progress bar
    const pct = (state.elapsed / CONFIG.GAME_DURATION) * 100;
    $('timeline-fill').style.width  = pct + '%';
    $('timeline-marker').style.left = pct + '%';
  }

  // ── Helpers for car/road ─────────────────────────────────────
  function getRoadY() {
    return canvas.height * 0.78;
  }

  function getCarX() {
    const margin = 100;
    return margin + (state.elapsed / CONFIG.GAME_DURATION) * (canvas.width - margin * 2);
  }

  // ── Render ────────────────────────────────────────────────────
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    switch (state.phase) {
      case 'boot':
        renderBoot();
        break;
      case 'start':
        // start screen is HTML
        break;
      default:
        renderGameWorld();
        break;
    }
  }

  // Boot screen ─────────────────────────────────────────────────
  let bootTimer = 0;
  let bootLineTimer = 0;

  function renderBoot() {
    const el = $('boot-text');
    const linesShown = Math.min(BOOT_LINES.length, Math.floor(bootTimer * 4));
    el.innerHTML = BOOT_LINES.slice(0, linesShown).map(l =>
      l === '' ? '<br>' : `<div>${l}</div>`
    ).join('');

    // Add blinking cursor to last line
    if (linesShown > 0 && linesShown <= BOOT_LINES.length) {
      const cursor = Math.floor(Date.now() / 500) % 2 === 0 ? '█' : ' ';
      const divs = el.querySelectorAll('div');
      if (divs.length) divs[divs.length - 1].textContent += cursor;
    }

    if (linesShown >= BOOT_LINES.length) {
      // Last line is "PRESS ANY KEY" — wait for keypress handled in onKey
    }
  }

  // Game world ──────────────────────────────────────────────────
  function renderGameWorld() {
    const W = canvas.width, H = canvas.height;
    const roadY = getRoadY();

    // Sky
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, roadY);

    // Stars
    const now = Date.now() / 1000;
    state.starField.forEach(s => {
      const alpha = 0.4 + 0.6 * Math.abs(Math.sin(now * 1.5 + s.blink * 10));
      ctx.fillStyle = `rgba(0,255,65,${alpha})`;
      ctx.fillRect(s.x, s.y, s.r, s.r);
    });

    // Layered mountains — seamless tiling via index modulo
    LAYERS.forEach(layer => {
      const peaks = layer.peaks;
      const count = peaks.length;
      const STEP = 24;
      const totalW = count * STEP;
      // Per-layer scroll offset, properly wrapped for tiling
      const off = (state.scrollOffset * layer.speed) % totalW;

      ctx.beginPath();
      ctx.moveTo(-10, roadY);

      for (let screenX = -STEP; screenX <= W + STEP; screenX += STEP) {
        const globalX = screenX + off;
        const idxA = Math.floor(globalX / STEP);
        const idxB = idxA + 1;
        const yA = peaks[((idxA % count) + count) % count];
        const yB = peaks[((idxB % count) + count) % count];
        const t  = (globalX - idxA * STEP) / STEP;
        ctx.lineTo(screenX, yA + (yB - yA) * t);
      }

      ctx.lineTo(W + 10, roadY);
      ctx.closePath();
      ctx.fillStyle = layer.color;
      ctx.fill();
    });

    // Road surface
    ctx.fillStyle = '#111';
    ctx.fillRect(0, roadY, W, H - roadY);

    // Road edge lines
    ctx.strokeStyle = '#005500';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, roadY);     ctx.lineTo(W, roadY);     ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, H - 20);    ctx.lineTo(W, H - 20);    ctx.stroke();

    // Road dashes
    const dashOff = (state.scrollOffset * 1.0) % 100;
    ctx.strokeStyle = '#004400';
    ctx.lineWidth = 2;
    ctx.setLineDash([50, 50]);
    ctx.lineDashOffset = -dashOff;
    ctx.beginPath();
    ctx.moveTo(0, roadY + (H - roadY) * 0.5);
    ctx.lineTo(W, roadY + (H - roadY) * 0.5);
    ctx.stroke();
    ctx.setLineDash([]);

    // Exhaust particles
    state.exhaustParticles.forEach(p => {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 4, 4);
    });
    ctx.globalAlpha = 1;

    // Car
    const carX = getCarX();
    const carY = roadY - 10 + state.carBob;
    drawCar(carX, carY);

    // Reboot glitch overlay
    if (state.phase === 'reboot') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, W, H);
      // Scanline glitch effect
      for (let i = 0; i < 20; i++) {
        const gy = Math.random() * H;
        ctx.fillStyle = 'rgba(0,255,65,0.05)';
        ctx.fillRect(0, gy, W, 2);
      }
    }
  }

  function drawCar(cx, cy) {
    const sc = 2;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(cx - 30*sc, cy + 10*sc, 60*sc, 4);

    // Body
    ctx.fillStyle = CONFIG.PACING[CONFIG.PACING_LEVELS[state.pacingIndex]].color;
    ctx.fillRect(cx - 28*sc, cy - 8*sc, 56*sc, 16*sc);

    // Cabin/roof
    ctx.fillStyle = CONFIG.PACING[CONFIG.PACING_LEVELS[state.pacingIndex]].color;
    ctx.fillRect(cx - 14*sc, cy - 18*sc, 28*sc, 10*sc);

    // Windows
    ctx.fillStyle = '#001a00';
    ctx.fillRect(cx - 12*sc, cy - 16*sc, 10*sc, 8*sc);
    ctx.fillRect(cx +  2*sc, cy - 16*sc, 10*sc, 8*sc);

    // Grill/front details
    ctx.fillStyle = '#00aa00';
    ctx.fillRect(cx + 22*sc, cy - 4*sc, 4*sc, 8*sc);

    // Wheels
    ctx.fillStyle = '#222';
    ctx.fillRect(cx - 28*sc, cy + 6*sc, 14*sc, 8*sc);
    ctx.fillRect(cx + 14*sc, cy + 6*sc, 14*sc, 8*sc);

    // Wheel shine
    ctx.fillStyle = '#444';
    ctx.fillRect(cx - 24*sc, cy + 8*sc, 6*sc, 4*sc);
    ctx.fillRect(cx + 18*sc, cy + 8*sc, 6*sc, 4*sc);

    // Headlights (flash in OVERDRIVE)
    if (state.pacingIndex === 2 && Math.floor(Date.now() / 150) % 2 === 0) {
      ctx.fillStyle = '#ffff88';
      ctx.fillRect(cx + 24*sc, cy - 6*sc, 4*sc, 4*sc);
    }
  }

  // ── Input ─────────────────────────────────────────────────────
  function onKey(e) {
    Audio.init();
    Audio.resume();

    if (state.phase === 'boot') {
      // Check if boot text fully shown
      const linesShown = Math.min(BOOT_LINES.length, Math.floor(bootTimer * 4));
      if (linesShown >= BOOT_LINES.length) {
        goToStart();
      }
      return;
    }

    if (state.phase === 'start') {
      startGame();
      return;
    }

    if (state.phase === 'end') {
      restartGame();
      return;
    }

    if (state.phase === 'playing') {
      if (e.key === 'ArrowUp'   || e.key === 'w' || e.key === 'W') {
        e.preventDefault(); changePacing(1);
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault(); changePacing(-1);
      }
    }

    if (state.phase === 'crisis' && !state.crisisResult) {
      const ev = state.crisisEvent;
      if (e.key === 'a' || e.key === 'A') resolveCrisis(ev.options[0]);
      if (e.key === 'b' || e.key === 'B') resolveCrisis(ev.options[1]);
    }
  }

  function onCanvasClick(e) {
    // Crisis modal click handled by HTML buttons
  }

  // ── State transitions ─────────────────────────────────────────
  function goToStart() {
    state.phase = 'start';
    $('boot-screen').classList.remove('active');
    $('start-screen').style.display = 'flex';
  }

  function startGame() {
    $('start-screen').style.display = 'none';
    $('game-screen').classList.remove('hidden');
    // Defer resize until game-screen is in layout flow
    setTimeout(resize, 0);
    state.phase = 'playing';
    Audio.startEngineLoop();
    updateHUD();
  }

  function restartGame() {
    // Reset state
    Object.assign(state, {
      phase: 'playing',
      elapsed: 0,
      health: 100,
      gmConnections: 0,
      kddiConnections: 0,
      pacingIndex: 0,
      crisisEvent: null,
      crisisTimeLeft: 0,
      crisisResult: null,
      crisisResultTimer: 0,
      huntingTimeLeft: 0,
      huntingSignals: [],
      huntingBonus: 0,
      huntingTriggered: false,
      rebootTimeLeft: 0,
      rebootCount: 0,
      triggeredEvents: new Set(),
      shieldActive: false, shieldTimer: 0,
      kddiBoost: 1.0, kddiBoostTimer: 0,
      kddiPaused: false, kddiPausedTimer: 0,
      scrollOffset: 0, carBob: 0, carBobDir: 1,
      exhaustParticles: [],
      lastTickSecond: -1,
    });

    scheduleEvents();
    lastTime = null;

    $('end-screen').classList.add('hidden');
    $('end-screen').style.display = 'none';
    setTimeout(resize, 0);
    $('crisis-modal').classList.add('hidden');
    $('hunting-modal').classList.add('hidden');
    $('reboot-overlay').classList.add('hidden');
    $('game-screen').classList.remove('hidden');

    Audio.startEngineLoop();
    updateHUD();
  }

  return { init };
})();

window.addEventListener('load', () => E.init());
