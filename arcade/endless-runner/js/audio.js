const audio = (() => {
  let actx   = null;
  let master = null;
  let muted  = false;

  function ensure() {
    if (!actx) {
      actx   = new (window.AudioContext || window.webkitAudioContext)();
      master = actx.createGain();
      master.connect(actx.destination);
      master.gain.value = muted ? 0 : 1;
    }
    if (actx.state === 'suspended') actx.resume();
  }

  function tone(freq, type, t0, dur, vol, freqEnd) {
    const osc = actx.createOscillator();
    const g   = actx.createGain();
    osc.connect(g);
    g.connect(master);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.start(t0);
    osc.stop(t0 + dur + 0.01);
  }

  // ── Quick ascending sweep ─────────────────────────────────────
  function playJump() {
    ensure(); if (muted) return;
    tone(200, 'sine', actx.currentTime, 0.18, 0.28, 680);
  }

  // ── Pleasant 8-bit two-note chime ─────────────────────────────
  function playCollect() {
    ensure(); if (muted) return;
    const now = actx.currentTime;
    tone(523, 'square', now,        0.10, 0.18);  // C5
    tone(784, 'square', now + 0.07, 0.10, 0.18);  // G5
  }

  // ── Discordant crash + noise ───────────────────────────────────
  function playBugHit() {
    ensure(); if (muted) return;
    const now = actx.currentTime;
    // Noise burst
    const len  = Math.round(actx.sampleRate * 0.35);
    const buf  = actx.createBuffer(1, len, actx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = actx.createBufferSource();
    src.buffer = buf;
    const ng = actx.createGain();
    src.connect(ng); ng.connect(master);
    ng.gain.setValueAtTime(0.38, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    src.start(now);
    // Low descending sawtooth
    tone(110, 'sawtooth', now, 0.35, 0.28, 38);
  }

  // ── Triumphant C-major arpeggio ───────────────────────────────
  function playGatePass() {
    ensure(); if (muted) return;
    const now = actx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) =>
      tone(f, 'triangle', now + i * 0.07, 0.55, 0.18)
    );
  }

  // ── Mute control ──────────────────────────────────────────────
  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 1;
    return muted;
  }

  function ensureCtx() { ensure(); }
  function isMuted()   { return muted; }

  return { ensureCtx, playJump, playCollect, playBugHit, playGatePass, toggleMute, isMuted };
})();
