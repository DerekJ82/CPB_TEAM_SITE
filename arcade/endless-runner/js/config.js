const CONFIG = {
  // Physics
  GRAVITY:        1800,
  JUMP_FORCE:      750,
  SCROLL_SPEED:    667,
  FLOOR_Y_RATIO:  0.82,
  PLAYER_SCREEN_X: 180,
  PLAYER_SIZE:      38,

  // World
  TRACK_LENGTH: 30000,

  // Obstacle spawn intervals
  OBSTACLE_INTERVAL_MIN:  2140,
  OBSTACLE_INTERVAL_MAX:  3810,

  // Pre-defined nodes — exact values ensure cumulative totals match real data at each gate.
  // All worldX positions are outside gate exclusion zones (±600 units from each gate).
  NODES: [
    // Segment 0: pre-JAN 2025 — GM only; delta 30,214
    { worldX:  2200, type: 'gm',   value: 10071 },
    { worldX:  2900, type: 'gm',   value: 10071 },
    { worldX:  3500, type: 'gm',   value: 10072 },

    // Segment 1: JAN 2025 → DEC 2025 — GM delta 168,025 / KDDI delta 14,604
    // KDDI node placed after ~worldX 6375 (Jun 2025)
    { worldX:  5300, type: 'gm',   value: 33605 },
    { worldX:  5900, type: 'gm',   value: 33605 },
    { worldX:  6400, type: 'gm',   value: 33605 },
    { worldX:  6900, type: 'gm',   value: 33605 },
    { worldX:  7400, type: 'kddi', value: 14604 },
    { worldX:  7900, type: 'gm',   value: 33605 },

    // Segment 2: DEC 2025 → JUL 2026 — GM delta 324,789 / KDDI delta 26,451
    { worldX:  9950, type: 'gm',   value: 46398 },
    { worldX: 10650, type: 'gm',   value: 46398 },
    { worldX: 11350, type: 'gm',   value: 46398 },
    { worldX: 12050, type: 'kddi', value: 13225 },
    { worldX: 12750, type: 'gm',   value: 46398 },
    { worldX: 13450, type: 'gm',   value: 46398 },
    { worldX: 14150, type: 'kddi', value: 13226 },
    { worldX: 14850, type: 'gm',   value: 46398 },
    { worldX: 15550, type: 'gm',   value: 46401 },

    // Segment 3: JUL 2026 → SEP 2026 — GM delta 76,760 / KDDI delta 5,506
    { worldX: 17535, type: 'gm',   value: 8529 },
    { worldX: 18405, type: 'gm',   value: 8529 },
    { worldX: 19275, type: 'gm',   value: 8529 },
    { worldX: 20145, type: 'gm',   value: 8529 },
    { worldX: 21015, type: 'kddi', value: 5506 },
    { worldX: 21885, type: 'gm',   value: 8529 },
    { worldX: 22755, type: 'gm',   value: 8529 },
    { worldX: 23625, type: 'gm',   value: 8529 },
    { worldX: 24495, type: 'gm',   value: 8529 },
    { worldX: 25365, type: 'gm',   value: 8528 },

    // Segment 4: SEP 2026 → OCT 2026 — GM delta 18,433 / KDDI delta 2,415
    { worldX: 26235, type: 'gm',   value: 9217 },
    { worldX: 27105, type: 'kddi', value: 2415 },
    { worldX: 27975, type: 'gm',   value: 9216 },
  ],
  OBSTACLE_PENALTY:   15000,
  INVINCIBILITY_SECS:   1.5,
  TARGET_TOTAL:      667197,

  // Milestone popup duration (seconds)
  MILESTONE_PAUSE_SECS: 5.0,

  // Milestone gates
  GATE_MILESTONES: [
    { pct: 0.15, label: 'JAN 2025', sub: '30,214 connections',
      actualGm: 30214,  actualKddi:     0, actualTotal:  30214,
      detail: 'GM partnership launches — KDDI connections not yet active' },
    { pct: 0.30, label: 'DEC 2025', sub: '212,843 connections',
      actualGm: 198239, actualKddi: 14604, actualTotal: 212843,
      detail: '8× growth — KDDI activates mid-year and reaches 14.6K' },
    { pct: 0.55, label: 'JUL 2026', sub: '564,083 connections',
      actualGm: 523028, actualKddi: 41055, actualTotal: 564083,
      detail: 'Over half a million connections secured by mid-2026' },
    { pct: 0.88, label: 'OCT 2026', sub: '667,197 connections',
      actualGm: 618221, actualKddi: 48976, actualTotal: 667197,
      detail: 'Rally complete — 667K connections at end of October 2026' },
  ],
};
