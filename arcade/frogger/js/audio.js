/* ─── 8-bit Web Audio Sound Engine ─────────────────────────────────────────── */
const GameAudio = (() => {
  let _actx  = null;
  let _muted = false;

  function _ctx() {
    if (!_actx) _actx = new (window.AudioContext || window.webkitAudioContext)();
    if (_actx.state === 'suspended') _actx.resume();
    return _actx;
  }

  function _tone(freq, dur, type, vol, freqEnd) {
    if (_muted) return;
    try {
      const c = _ctx();
      const o = c.createOscillator();
      const g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = type;
      o.frequency.setValueAtTime(freq, c.currentTime);
      if (freqEnd != null) o.frequency.linearRampToValueAtTime(freqEnd, c.currentTime + dur);
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.start(); o.stop(c.currentTime + dur + 0.01);
    } catch (_) {}
  }

  /* Quick square-wave blip on each hop */
  function playHop() {
    _tone(220, 0.07, 'square', 0.10, 440);
  }

  /* Car honk + thud on collision */
  function playHit() {
    if (_muted) return;
    try {
      const c = _ctx();
      const t = c.currentTime;

      // Honk: two-tone square waves (440Hz + 370Hz) for ~140ms
      [440, 370].forEach(freq => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.connect(g); g.connect(c.destination);
        o.type = 'square';
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.18, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
        o.start(t); o.stop(t + 0.15);
      });

      // Thud: low sine drop (65Hz→30Hz) triggered 100ms after honk
      const o2 = c.createOscillator();
      const g2 = c.createGain();
      o2.connect(g2); g2.connect(c.destination);
      o2.type = 'sine';
      o2.frequency.setValueAtTime(65, t + 0.10);
      o2.frequency.linearRampToValueAtTime(30, t + 0.10 + 0.22);
      g2.gain.setValueAtTime(0.55, t + 0.10);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.10 + 0.22);
      o2.start(t + 0.10); o2.stop(t + 0.35);
    } catch (_) {}
  }

  /* High-pitched ascending success chime */
  function playSuccess() {
    [[261.63, 0], [329.63, 100], [392.00, 200], [523.25, 300], [659.25, 400]]
      .forEach(([f, ms]) => setTimeout(() => _tone(f, 0.3, 'sine', 0.16), ms));
  }

  function toggleMute() { _muted = !_muted; return _muted; }
  function isMuted()    { return _muted; }

  return { playHop, playHit, playSuccess, toggleMute, isMuted };
})();
