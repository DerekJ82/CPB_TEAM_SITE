// ================================================================
// GM CONNECTIONS RALLY — Audio Engine (Web Audio API)
// ================================================================

// ── AudioContext ──────────────────────────────────────────────
let _audioCtx = null;
let _masterGain = null;
let _muted = false;
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  if (!_masterGain) {
    _masterGain = _audioCtx.createGain();
    _masterGain.gain.value = 1;
    _masterGain.connect(_audioCtx.destination);
  }
  return _audioCtx;
}

function toggleMute() {
  _muted = !_muted;
  if (_masterGain) _masterGain.gain.value = _muted ? 0 : 1;
  const btn = document.getElementById('muteBtn');
  if (btn) btn.textContent = _muted ? '🔇' : '🔊';
}

function playHorn() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  // Classic dual-tone car horn: ~392 Hz (G4) and ~494 Hz (B4)
  [[392, 0.55], [494, 0.45]].forEach(([freq, gain]) => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(gain, now + 0.02);
    env.gain.setValueAtTime(gain, now + 0.25);
    env.gain.linearRampToValueAtTime(0, now + 0.38);
    osc.connect(env);
    env.connect(_masterGain);
    osc.start(now);
    osc.stop(now + 0.38);
  });
}

function playIgnitionStart() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  // Starter crank: rising noise burst + engine catch
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.8, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / ctx.sampleRate;
    // Crank rumble + ignition catch
    const crank = Math.sin(2 * Math.PI * 28 * t + Math.sin(2 * Math.PI * 14 * t) * 3);
    data[i] = (Math.random() * 0.3 + crank * 0.5) * Math.min(t * 4, 1) * Math.max(1 - (t - 0.5) * 3, 0.1);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.8, now);
  env.gain.linearRampToValueAtTime(0, now + 0.8);
  src.connect(filter);
  filter.connect(env);
  env.connect(_masterGain);
  src.start(now);
  // Engine idle settling in after crank
  const idle = ctx.createOscillator();
  const idleEnv = ctx.createGain();
  idle.type = 'sawtooth';
  idle.frequency.setValueAtTime(35, now + 0.5);
  idle.frequency.linearRampToValueAtTime(22, now + 1.6);
  idleEnv.gain.setValueAtTime(0, now + 0.5);
  idleEnv.gain.linearRampToValueAtTime(0.18, now + 0.7);
  idleEnv.gain.linearRampToValueAtTime(0.08, now + 1.8);
  idleEnv.gain.linearRampToValueAtTime(0, now + 2.2);
  const idleFilter = ctx.createBiquadFilter();
  idleFilter.type = 'lowpass';
  idleFilter.frequency.value = 180;
  idle.connect(idleFilter);
  idleFilter.connect(idleEnv);
  idleEnv.connect(_masterGain);
  idle.start(now + 0.5);
  idle.stop(now + 2.2);
}

function playIgnitionStop() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  // Engine wind-down: falling pitch
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(22, now);
  osc.frequency.linearRampToValueAtTime(6, now + 0.9);
  env.gain.setValueAtTime(0.12, now);
  env.gain.linearRampToValueAtTime(0, now + 0.9);
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 160;
  osc.connect(filt);
  filt.connect(env);
  env.connect(_masterGain);
  osc.start(now);
  osc.stop(now + 0.9);
}

function playSpray() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.9, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / ctx.sampleRate;
    data[i] = (Math.random() * 2 - 1) * Math.min(t * 12, 1) * Math.max(1 - (t - 0.45) * 1.8, 0.08) * 0.45;
  }
  const src = ctx.createBufferSource(); src.buffer = buf;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2800; hp.Q.value = 0.5;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 8000;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.7, now); env.gain.linearRampToValueAtTime(0, now + 0.9);
  src.connect(hp); hp.connect(lp); lp.connect(env); env.connect(_masterGain);
  src.start(now);
}

function honkHorn() {
  const honk = document.getElementById('honkGraphic');
  honk.classList.add('show');
  playHorn();
  setTimeout(() => honk.classList.remove('show'), 350);
}

function fireConfetti() {
  confetti({
    particleCount: 150,
    spread: 100,
    origin: { y: 0.4 },
    colors: ['#4ba3e3', '#00ff66', '#fbcc04', '#cc0000', '#ffffff']
  });
}
