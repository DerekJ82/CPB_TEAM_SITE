/* ─── UI Layer — overlays, D-pad, mute ─────────────────────────────────────── */
const UI = (() => {
  function _el(id)   { return document.getElementById(id); }
  function _show(id) { _el(id).classList.remove('hidden'); }
  function _hide(id) { _el(id).classList.add('hidden'); }

  /* ── Start Screen ──────────────────────────────────────────────────────────── */
  function showStart() { _show('start-overlay'); }

  function hideStart() {
    const el = _el('start-overlay');
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    setTimeout(() => el.classList.add('hidden'), 460);
  }

  /* ── Pause ─────────────────────────────────────────────────────────────────── */
  function showPause() { _show('pause-overlay'); }
  function hidePause() { _hide('pause-overlay'); }

  /* ── Victory ───────────────────────────────────────────────────────────────── */
  function showVictory(grandTotal, onPlayAgain) {
    const pct = Math.min(100, Math.round((grandTotal / GRAND_TARGET) * 100));
    _el('victory-total').textContent = formatNum(grandTotal);
    _el('victory-max').textContent   = `of ${formatNum(GRAND_TARGET)} possible`;
    _el('v-bar-fill').style.width       = pct + '%';
    _el('v-bar-fill').style.background  = 'linear-gradient(90deg, #ff44aa55, #ff44aa)';
    _el('v-bar-fill').style.boxShadow   = '0 0 10px #ff44aa88';
    _el('victory-pct').textContent   = `${pct}%  DELIVERY RATE`;
    _el('play-again-btn').onclick    = onPlayAgain;
    _show('victory-overlay');
  }
  function hideVictory() { _hide('victory-overlay'); }

  /* ── D-Pad (touch controls) ────────────────────────────────────────────────── */
  function initDPad(onMove) {
    const map = {
      'dpad-up':    [ 0, -1],
      'dpad-down':  [ 0,  1],
      'dpad-left':  [-1,  0],
      'dpad-right': [ 1,  0],
    };
    Object.entries(map).forEach(([id, [dx, dy]]) => {
      const btn = _el(id);
      if (!btn) return;
      btn.addEventListener('touchstart', e => { e.preventDefault(); onMove(dx, dy); }, { passive: false });
      // Mouse fallback so it works on desktop too
      btn.addEventListener('mousedown', () => onMove(dx, dy));
    });
  }

  /* ── Mute Button ───────────────────────────────────────────────────────────── */
  function initMute() {
    const btn = _el('mute-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const muted = GameAudio.toggleMute();
      btn.textContent = muted ? '×♪' : '♪';
      btn.classList.toggle('muted', muted);
    });
  }

  /* ── Start Button ──────────────────────────────────────────────────────────── */
  function initStartBtn(cb) {
    const btn = _el('start-btn');
    if (btn) btn.addEventListener('click', cb);
  }

  return {
    showStart, hideStart,
    showPause, hidePause,
    showVictory, hideVictory,
    initDPad, initMute, initStartBtn,
  };
})();
