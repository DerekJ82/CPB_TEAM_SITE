// ================================================================
// GM CONNECTIONS RALLY — Config: constants & data tables
// ================================================================

// Canvas dimensions
const WIDTH  = 1024;
const HEIGHT = 768;

// ── Engine constants ──────────────────────────────────────────
const SEGMENT_LENGTH  = 200;
const RUMBLE_LENGTH   = 3;
const ROAD_WIDTH      = 900;
const LANES           = 3;
const FOV             = 100;
const CAMERA_HEIGHT   = 700;
const CAMERA_DEPTH    = 1 / Math.tan((FOV / 2) * Math.PI / 180);
const DRAW_DISTANCE   = 150;

// ── Player physics constants ──────────────────────────────────
const MAX_SPEED      =  SEGMENT_LENGTH * 24;
const ACCEL          =  MAX_SPEED / 5;
const BRAKING        = -MAX_SPEED;
const DECEL          = -MAX_SPEED / 5;
const OFF_ROAD_DECEL = -MAX_SPEED / 2;
const OFF_ROAD_LIMIT =  MAX_SPEED / 4;

// ── Milestone data ────────────────────────────────────────────
const rallyMilestones = [
  { pct: 0.15, gm:  25000, kddi:      0 },
  { pct: 0.30, gm: 198000, kddi:  12000 },
  { pct: 0.50, gm: 523028, kddi:  41055 },
  { pct: 0.65, gm: 571810, kddi:  43780 },
  { pct: 0.82, gm: 599788, kddi:  46561 },
];

// ── Colour palettes ───────────────────────────────────────────
const DARK  = { grass: '#08001a', rumble: '#ff22ee', road: '#08081c', lane: '#00ccff' };
const LIGHT = { grass: '#0d0025', rumble: '#ff22ee', road: '#16163c', lane: '#00ccff' };

// ── Animal obstacle definitions ────────────────────────────────
// Redistributed across 650-segment track
// Milestones at: 15%=97, 30%=195, 50%=325, 65%=423, 82%=533
const ANIMAL_DEFS = [
  { seg:  25, x:  0.5, type: '🐄' },
  { seg:  72, x: -0.4, type: '🐑' },
  { seg: 120, x:  0.3, type: '🐦' },
  { seg: 165, x: -0.5, type: '🐄' },
  { seg: 222, x:  0.5, type: '🐑' },
  { seg: 275, x: -0.3, type: '🐦' },
  { seg: 348, x:  0.4, type: '🐄' },
  { seg: 398, x: -0.5, type: '🐑' },
  { seg: 448, x:  0.3, type: '🐦' },
  { seg: 498, x: -0.4, type: '🐄' },
  { seg: 555, x:  0.5, type: '🐑' },
  { seg: 610, x: -0.3, type: '🐦' },
];

// ── Milestone sign definitions ─────────────────────────────────
const SIGN_DEFS = [
  { pct: 0.15, label: '2024 — 25K' },
  { pct: 0.30, label: '2025 — 210K' },
  { pct: 0.50, label: 'JUL 2026 — 564K' },
  { pct: 0.65, label: 'AUG 2026 — 615K' },
  { pct: 0.82, label: 'SEP 2026 — 646K' },
];
