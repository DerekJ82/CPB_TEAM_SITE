const Audio = (() => {
  let ctx = null;
  let masterGain = null;
  let muted = false;
  let tickOsc = null;
  let tickGain = null;

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.4;
    masterGain.connect(ctx.destination);
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function tone(freq, type, duration, volume, startDelay = 0) {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    env.gain.setValueAtTime(volume, ctx.currentTime + startDelay);
    env.gain.linearRampToValueAtTime(0, ctx.currentTime + startDelay + duration);
    osc.connect(env);
    env.connect(masterGain);
    osc.start(ctx.currentTime + startDelay);
    osc.stop(ctx.currentTime + startDelay + duration);
  }

  function playTick() {
    tone(880, 'square', 0.04, 0.15);
  }

  function playCrisisAlert() {
    // Three descending alarm bleeps
    tone(1200, 'square', 0.12, 0.3, 0.0);
    tone(1000, 'square', 0.12, 0.3, 0.14);
    tone(800,  'square', 0.18, 0.3, 0.28);
  }

  function playChoiceGood() {
    tone(523, 'square', 0.1, 0.25, 0.0);
    tone(659, 'square', 0.1, 0.25, 0.1);
    tone(784, 'square', 0.2, 0.25, 0.2);
  }

  function playChoiceBad() {
    tone(300, 'sawtooth', 0.15, 0.3, 0.0);
    tone(220, 'sawtooth', 0.25, 0.3, 0.15);
  }

  function playReboot() {
    // Descending whine
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 2.5);
    env.gain.setValueAtTime(0.3, ctx.currentTime);
    env.gain.linearRampToValueAtTime(0, ctx.currentTime + 3);
    osc.connect(env);
    env.connect(masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 3);
  }

  function playRebootComplete() {
    tone(440, 'square', 0.08, 0.2, 0.0);
    tone(880, 'square', 0.12, 0.2, 0.1);
  }

  function playHuntingStart() {
    tone(523, 'square', 0.08, 0.3, 0.00);
    tone(784, 'square', 0.08, 0.3, 0.09);
    tone(1047,'square', 0.12, 0.3, 0.18);
  }

  function playSignalCollect() {
    if (!ctx || muted) return;
    const f = 400 + Math.random() * 400;
    tone(f,   'square', 0.06, 0.3, 0.0);
    tone(f*2, 'square', 0.08, 0.2, 0.06);
  }

  function playPacingUp() {
    tone(600, 'square', 0.07, 0.2);
    tone(800, 'square', 0.07, 0.2, 0.08);
  }

  function playPacingDown() {
    tone(600, 'square', 0.07, 0.2);
    tone(400, 'square', 0.07, 0.2, 0.08);
  }

  function playVictory() {
    const melody = [523,659,784,1047,784,659,523];
    melody.forEach((f, i) => tone(f, 'square', 0.12, 0.3, i * 0.13));
  }

  function playTombstone() {
    tone(220, 'sawtooth', 0.3, 0.3, 0.0);
    tone(185, 'sawtooth', 0.3, 0.3, 0.3);
    tone(147, 'sawtooth', 0.5, 0.3, 0.6);
  }

  function startEngineLoop() {
    if (!ctx || muted) return;
    stopEngineLoop();
    tickOsc  = ctx.createOscillator();
    tickGain = ctx.createGain();
    tickOsc.type = 'sawtooth';
    tickOsc.frequency.value = 55;
    tickGain.gain.value = 0.06;
    tickOsc.connect(tickGain);
    tickGain.connect(masterGain);
    tickOsc.start();
  }

  function stopEngineLoop() {
    if (tickOsc) { try { tickOsc.stop(); } catch(e) {} tickOsc = null; }
    tickGain = null;
  }

  function setEngineFreq(freq) {
    if (tickOsc) tickOsc.frequency.value = freq;
  }

  function toggleMute() {
    if (!ctx) return;
    muted = !muted;
    masterGain.gain.value = muted ? 0 : 0.4;
    document.getElementById('mute-btn').textContent = muted ? '🔇' : '🔊';
  }

  return {
    init, resume, toggleMute,
    playTick, playCrisisAlert, playChoiceGood, playChoiceBad,
    playReboot, playRebootComplete,
    playHuntingStart, playSignalCollect,
    playPacingUp, playPacingDown,
    playVictory, playTombstone,
    startEngineLoop, stopEngineLoop, setEngineFreq
  };
})();
