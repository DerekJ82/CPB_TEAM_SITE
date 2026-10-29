// ================================================================
// GM CONNECTIONS RALLY — Input (keyboard state)
// ================================================================

// ── Input state ───────────────────────────────────────────────
const keys = { up: false, down: false, left: false, right: false };

window.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft'  || e.key === 'a') { keys.left  = true; e.preventDefault(); }
  if (e.key === 'ArrowRight' || e.key === 'd') { keys.right = true; e.preventDefault(); }
  if (e.key === 'ArrowUp'    || e.key === 'w') { keys.up    = true; e.preventDefault(); }
  if (e.key === 'ArrowDown'  || e.key === 's') { keys.down  = true; e.preventDefault(); }
  if (e.key === 'Escape') { if (typeof togglePause === 'function') togglePause(); }
});

window.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft'  || e.key === 'a') keys.left  = false;
  if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
  if (e.key === 'ArrowUp'    || e.key === 'w') keys.up    = false;
  if (e.key === 'ArrowDown'  || e.key === 's') keys.down  = false;
});

// ── Touch button → keys mapping ───────────────────────────────
// Wires the #touch-controls buttons to the same keys{} state as
// keyboard input.  Uses DOMContentLoaded so elements are present.
document.addEventListener('DOMContentLoaded', function () {
  function bindTouchBtn(id, key) {
    var btn = document.getElementById(id);
    if (!btn) return;

    function press(e) {
      e.preventDefault();
      keys[key] = true;
      btn.classList.add('tc-pressed');
    }
    function release(e) {
      e.preventDefault();
      keys[key] = false;
      btn.classList.remove('tc-pressed');
    }

    btn.addEventListener('touchstart',  press,   { passive: false });
    btn.addEventListener('touchend',    release, { passive: false });
    btn.addEventListener('touchcancel', release, { passive: false });
  }

  bindTouchBtn('btn-left',  'left');
  bindTouchBtn('btn-right', 'right');
  bindTouchBtn('btn-accel', 'up');
  bindTouchBtn('btn-brake', 'down');
});
