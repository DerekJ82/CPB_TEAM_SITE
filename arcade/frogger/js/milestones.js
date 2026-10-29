/* ─── Milestone Data & Popup ────────────────────────────────────────────────── */

const MILESTONE_DATA = [
  { level: 1, period: '2024',     batch: 'GM Launch Batch', payload: 25_000,  cumulative: 25_000,  tagline: 'FIRST CONNECTIONS ESTABLISHED', accent: '#00e5ff' },
  { level: 2, period: '2025',     batch: 'KDDI Expansion',  payload: 185_000, cumulative: 210_000, tagline: 'NETWORK GROWS ACROSS REGIONS',  accent: '#00ff88' },
  { level: 3, period: 'JUL 2026', batch: 'Scale-Up Push',   payload: 354_000, cumulative: 564_000, tagline: 'MASSIVE DEPLOYMENT UNDERWAY',   accent: '#ffe600' },
  { level: 4, period: 'AUG 2026', batch: 'Surge Sprint',    payload: 51_000,  cumulative: 615_000, tagline: 'SURGING PAST 600K',             accent: '#ff9900' },
  { level: 5, period: 'SEP 2026', batch: 'Final Mile',      payload: 31_000,  cumulative: 646_000, tagline: 'FULL DEPLOYMENT ACHIEVED',      accent: '#ff44aa' },
];

const GRAND_TARGET    = 646_000;
const PENALTY_PER_HIT = 15_000;

function formatNum(n) {
  return Math.max(0, Math.floor(n)).toLocaleString('en-US');
}

/* ─── Milestone Popup ─────────────────────────────────────────────────────── */
const MilestoneOverlay = (() => {
  let _timer = null;

  function _el(id)         { return document.getElementById(id); }
  function _set(id, v, c, s) {
    const el = _el(id);
    el.textContent = v;
    if (c) el.style.color      = c;
    if (s) el.style.textShadow = s;
    else   el.style.textShadow = '';
  }

  function show(levelIdx, delivered, grandTotal, callback) {
    const ms     = MILESTONE_DATA[levelIdx];
    const pct    = Math.min(100, Math.round((grandTotal / GRAND_TARGET) * 100));
    const lost   = ms.payload - delivered;
    const isLast = levelIdx === MILESTONE_DATA.length - 1;
    const card   = _el('milestone-card');

    card.style.borderColor = ms.accent;
    card.style.boxShadow =
      `0 0 50px ${ms.accent}44, 0 0 100px ${ms.accent}18, inset 0 0 30px rgba(0,0,0,0.6)`;

    _set('ms-header',
      isLast ? '[ MISSION ACCOMPLISHED ]' : '[ CONNECTION SECURED ]',
      ms.accent);
    _set('ms-period', ms.period, ms.accent,
      `0 0 28px ${ms.accent}, 0 0 56px ${ms.accent}88`);
    _set('ms-batch', ms.batch.toUpperCase(), 'rgba(255,255,255,0.45)');

    _set('ms-delivered-val', formatNum(delivered), ms.accent);
    _set('ms-penalty',
      lost > 0 ? `▼ ${formatNum(lost)} LOST IN TRAFFIC` : '★ PERFECT RUN — NO INCIDENTS',
      lost > 0 ? '#ff4466' : ms.accent);

    _set('ms-total-val', formatNum(grandTotal), ms.accent);

    const fill = _el('ms-bar-fill');
    fill.style.width      = pct + '%';
    fill.style.background = `linear-gradient(90deg, ${ms.accent}55, ${ms.accent})`;
    fill.style.boxShadow  = `0 0 8px ${ms.accent}88`;

    _set('ms-pct', `${pct}%  OF  ${formatNum(GRAND_TARGET)}  TARGET`, 'rgba(255,255,255,0.4)');

    if (isLast) {
      _set('ms-next', '◆  ALL CONNECTIONS SECURED  ◆', ms.accent);
    } else {
      const next = MILESTONE_DATA[levelIdx + 1];
      _set('ms-next',
        `NEXT  ▶  ${next.period}  —  ${formatNum(next.payload)} CONNECTIONS`,
        'rgba(255,255,255,0.4)');
    }

    _el('milestone-overlay').classList.remove('hidden');

    clearTimeout(_timer);
    _timer = setTimeout(() => {
      _el('milestone-overlay').classList.add('hidden');
      setTimeout(callback, 300);
    }, 4000);
  }

  return { show };
})();
