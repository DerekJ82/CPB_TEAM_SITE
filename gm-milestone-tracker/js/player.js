const player = (() => {
  const W = CONFIG.PLAYER_SIZE;
  const H = CONFIG.PLAYER_SIZE;

  let x          = CONFIG.PLAYER_SCREEN_X;
  let y          = 0;
  let vy         = 0;
  let isOnGround = true;
  let floorY     = 0;
  let invincible = 0;  // seconds remaining

  function init(canvasHeight) {
    floorY     = canvasHeight * CONFIG.FLOOR_Y_RATIO;
    y          = floorY - H;
    vy         = 0;
    isOnGround = true;
    invincible = 0;
  }

  function jump() {
    if (isOnGround) {
      vy = -CONFIG.JUMP_FORCE;
      isOnGround = false;
      return true;
    }
    return false;
  }

  function setInvincible(secs) {
    invincible = secs;
  }

  function isInvincible() {
    return invincible > 0;
  }

  function update(dt, canvasHeight) {
    floorY = canvasHeight * CONFIG.FLOOR_Y_RATIO;
    if (invincible > 0) invincible -= dt;

    vy += CONFIG.GRAVITY * dt;
    y  += vy * dt;
    if (y >= floorY - H) {
      y          = floorY - H;
      vy         = 0;
      isOnGround = true;
    }
  }

  function draw(ctx) {
    const flashRed  = invincible > 0 && Math.floor(invincible * 8) % 2 === 1;
    const bodyCol   = flashRed ? '#FF3333' : '#00FFCC';
    const glowCol   = flashRed ? '#FF2200' : '#00FFCC';
    const wheelCol  = flashRed ? '#FF3333' : '#00FFCC';

    ctx.save();

    const bh  = Math.round(H * 0.55);
    const by  = y + H - bh;
    const ovr = 4;

    ctx.shadowBlur  = 22;
    ctx.shadowColor = glowCol;
    ctx.fillStyle   = bodyCol;
    ctx.fillRect(x - ovr, by, W + ovr * 2, bh);

    ctx.shadowBlur = 0;

    const ch   = Math.round(H * 0.42);
    const cy2  = y + H - bh - ch + 4;
    const cinL = Math.round(W * 0.18);
    const cinR = Math.round(W * 0.12);
    const cw2  = W - cinL - cinR;

    ctx.fillStyle = bodyCol;
    ctx.beginPath();
    ctx.roundRect(x + cinL, cy2, cw2, ch, 5);
    ctx.fill();

    ctx.fillStyle = 'rgba(0,8,20,0.82)';
    const wi = 4;
    ctx.fillRect(x + cinL + wi, cy2 + wi, cw2 - wi * 2, ch - wi - 2);

    ctx.fillStyle = 'rgba(180,240,255,0.22)';
    ctx.fillRect(x + cinL + wi + 2, cy2 + wi + 2, Math.round((cw2 - wi * 2) * 0.55), Math.round((ch - wi - 2) * 0.5));

    const hlW = 6, hlH = 5;
    ctx.fillStyle = flashRed ? '#FF8888' : '#FFFFFF';
    ctx.shadowBlur  = 8;
    ctx.shadowColor = flashRed ? '#FF3333' : '#CCFFFF';
    ctx.fillRect(x + W - ovr - hlW, by + Math.round(bh * 0.28), hlW, hlH);
    ctx.shadowBlur = 0;

    const wr  = Math.round(W * 0.22);
    const wxL = x + Math.round(W * 0.22);
    const wxR = x + W - Math.round(W * 0.22);
    const wy  = y + H - wr + 2;

    for (const wx of [wxL, wxR]) {
      ctx.fillStyle = '#0a0a14';
      ctx.beginPath();
      ctx.arc(wx, wy, wr, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = wheelCol;
      ctx.lineWidth   = 3;
      ctx.shadowBlur  = 10;
      ctx.shadowColor = glowCol;
      ctx.beginPath();
      ctx.arc(wx, wy, wr - 1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = wheelCol;
      ctx.lineWidth   = 1.5;
      ctx.globalAlpha = 0.55;
      for (let a = 0; a < Math.PI; a += Math.PI / 3) {
        ctx.beginPath();
        ctx.moveTo(wx + Math.cos(a) * (wr - 4), wy + Math.sin(a) * (wr - 4));
        ctx.lineTo(wx - Math.cos(a) * (wr - 4), wy - Math.sin(a) * (wr - 4));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function getRect() {
    return { x, y, w: W, h: H };
  }

  return { init, jump, update, draw, getRect, setInvincible, isInvincible };
})();
