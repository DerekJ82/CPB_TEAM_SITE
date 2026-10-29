const world = (() => {
  let nodes      = [];
  let obstacles  = [];
  let gates      = [];
  let nextObstX  = 0;

  // ── Init ──────────────────────────────────────────────────────
  function reset(canvasWidth) {
    nodes     = [];
    obstacles = [];
    nextObstX = canvasWidth + 1000;

    gates = CONFIG.GATE_MILESTONES.map((g, i) => ({
      worldX:      g.pct * CONFIG.TRACK_LENGTH,
      label:       g.label,
      sub:         g.sub,
      detail:      g.detail,
      actualGm:    g.actualGm,
      actualKddi:  g.actualKddi,
      actualTotal: g.actualTotal,
      passed:      false,
      isLast:      i === CONFIG.GATE_MILESTONES.length - 1,
    }));

    nodes = CONFIG.NODES.map((n, i) => ({
      worldX:    n.worldX,
      yRatio:    0.79 + (i % 7) * 0.02,   // deterministic vertical spread
      r:         15,
      type:      n.type,
      color:     n.type === 'kddi' ? '#39FF14' : '#00AAFF',
      glow:      n.type === 'kddi' ? '#39FF14' : '#00AAFF',
      value:     n.value,
      collected: false,
    }));
  }

  // ── Helpers ───────────────────────────────────────────────────
  function isNearGate(wx, buffer) {
    return gates.some(g => Math.abs(wx - g.worldX) < buffer);
  }

  // ── Spawning ──────────────────────────────────────────────────
  function spawnObstacle(worldX) {
    // Hard cap: clear final approach to finish line
    if (worldX >= CONFIG.TRACK_LENGTH * 0.90) { nextObstX = CONFIG.TRACK_LENGTH + 1000; return; }

    // Skip if within 800 units of any gate
    if (isNearGate(worldX, 800)) {
      const nearGate = gates.find(g => g.worldX >= worldX - 800 && g.worldX <= worldX + 800);
      nextObstX = (nearGate ? nearGate.worldX : worldX) + 820
                 + Math.random() * 200;
      return;
    }

    const h = 48 + Math.floor(Math.random() * 22);
    obstacles.push({
      worldX,
      w: 34,
      h,
      destroyed: false,
    });
    nextObstX = worldX + CONFIG.OBSTACLE_INTERVAL_MIN
                       + Math.random() * (CONFIG.OBSTACLE_INTERVAL_MAX - CONFIG.OBSTACLE_INTERVAL_MIN);
  }

  // ── Update ────────────────────────────────────────────────────
  function update(cameraX, canvasWidth) {
    const ahead = cameraX + canvasWidth + 500;

    while (nextObstX < ahead) spawnObstacle(nextObstX);

    const cull = cameraX - 300;
    nodes     = nodes.filter(n => n.worldX > cull && !n.collected);
    obstacles = obstacles.filter(o => o.worldX > cull && !o.destroyed);
  }

  // ── Draw ──────────────────────────────────────────────────────
  function draw(ctx, cameraX, canvasWidth, canvasHeight) {
    const floorY = canvasHeight * CONFIG.FLOOR_Y_RATIO;
    const t = performance.now() * 0.001;

    for (const gate of gates) {
      const sx = gate.worldX - cameraX;
      if (sx < -90 || sx > canvasWidth + 90) continue;
      drawGate(ctx, gate, sx, floorY, t);
    }

    for (const obs of obstacles) {
      const sx = obs.worldX - cameraX;
      if (sx < -50 || sx > canvasWidth + 50) continue;
      drawObstacle(ctx, obs, sx, floorY);
    }

    for (const node of nodes) {
      const sx = node.worldX - cameraX;
      if (sx < -30 || sx > canvasWidth + 30) continue;
      const bob = Math.sin(t * 2.2 + node.worldX * 0.013) * 7;
      drawNode(ctx, node, sx, node.yRatio * floorY + bob);
    }
  }

  function drawNode(ctx, node, sx, sy) {
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = node.glow;
    ctx.fillStyle = node.color;
    ctx.beginPath();
    ctx.arc(sx, sy, node.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.beginPath();
    ctx.arc(sx - 4, sy - 4, node.r * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawObstacle(ctx, obs, sx, floorY) {
    const oy = floorY - obs.h;
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#FF2222';
    ctx.fillStyle = '#7a0000';
    ctx.fillRect(sx, oy, obs.w, obs.h);
    ctx.fillStyle = '#FF3333';
    ctx.fillRect(sx, oy, obs.w, 5);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#FF4444';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx + 7,           oy + 10);
    ctx.lineTo(sx + obs.w - 7,   oy + obs.h - 10);
    ctx.moveTo(sx + obs.w - 7,   oy + 10);
    ctx.lineTo(sx + 7,           oy + obs.h - 10);
    ctx.stroke();
    ctx.restore();
  }

  function drawGate(ctx, gate, sx, floorY, t) {
    const postW  = 12;
    const halfW  = 58;
    const gateH  = floorY * 0.62;
    const gateTop = floorY - gateH;
    const pulse  = 0.78 + 0.22 * Math.sin(t * 2.8);

    ctx.save();

    // Energy field between posts
    const field = ctx.createLinearGradient(sx - halfW, 0, sx + halfW, 0);
    field.addColorStop(0,   'rgba(255,215,0,0)');
    field.addColorStop(0.25, `rgba(255,215,0,${0.10 * pulse})`);
    field.addColorStop(0.5,  `rgba(255,215,0,${0.20 * pulse})`);
    field.addColorStop(0.75, `rgba(255,215,0,${0.10 * pulse})`);
    field.addColorStop(1,   'rgba(255,215,0,0)');
    ctx.fillStyle = field;
    ctx.fillRect(sx - halfW, gateTop, halfW * 2, gateH);

    // Glowing posts + crossbar
    ctx.shadowBlur  = Math.round(22 * pulse);
    ctx.shadowColor = '#FFD700';
    ctx.fillStyle   = `rgba(255,200,0,${0.82 + 0.18 * pulse})`;
    ctx.fillRect(sx - halfW,          gateTop, postW, gateH);   // left post
    ctx.fillRect(sx + halfW - postW,  gateTop, postW, gateH);   // right post
    ctx.fillRect(sx - halfW,          gateTop, halfW * 2, postW); // crossbar

    ctx.restore();

    // Labels above crossbar
    ctx.save();
    ctx.shadowBlur  = 10;
    ctx.shadowColor = '#FFD700';
    ctx.textAlign   = 'center';

    if (gate.sub) {
      ctx.fillStyle    = 'rgba(255,215,0,0.65)';
      ctx.font         = `10px 'Courier New', monospace`;
      ctx.textBaseline = 'bottom';
      ctx.fillText(gate.sub, sx, gateTop - 22);
    }

    ctx.fillStyle    = '#FFD700';
    ctx.font         = `bold 15px 'Courier New', monospace`;
    ctx.textBaseline = 'bottom';
    ctx.fillText(gate.label, sx, gateTop - 5);

    ctx.restore();
  }

  // ── Accessors ─────────────────────────────────────────────────
  function getNodes()     { return nodes; }
  function getObstacles() { return obstacles; }
  function getGates()     { return gates; }

  return { reset, update, draw, getNodes, getObstacles, getGates };
})();
