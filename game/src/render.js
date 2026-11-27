// Renderer: every pixel is drawn from code on one canvas — sky, sun, clouds,
// layered ridges, the scrolling valley floor, the runway, the aircraft in
// chase view, the rings and hazards ahead, and the lit HUD instruments.
// The playfield is a fixed 1280x720 logical area scaled to the window.

import { FIELD, FONT, LIVES, PALETTE, PLANE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const TAU = Math.PI * 2;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = 700) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function outlineText(ctx, str, x, y, size, color, align = 'center', weight = 800) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(10, 14, 26, 0.85)';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function compassLabel(deg) {
  const d = ((deg % 360) + 360) % 360;
  if (d < 22.5 || d >= 337.5) return 'N';
  if (d < 67.5) return 'NE';
  if (d < 112.5) return 'E';
  if (d < 157.5) return 'SE';
  if (d < 202.5) return 'S';
  if (d < 247.5) return 'SW';
  if (d < 292.5) return 'W';
  return 'NW';
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let dpr = 1;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
  }
  window.addEventListener('resize', resize);
  resize();

  function project(e) {
    const t = 1 - e.z;
    const ease = t * t * (3 - 2 * t);
    const scale = 0.06 + 0.94 * ease;
    const sx = FIELD.width / 2 + (e.x - FIELD.width / 2) * (0.12 + 0.88 * ease);
    const sy = FIELD.horizonY + (e.y - FIELD.horizonY) * (0.12 + 0.88 * ease);
    return { x: sx, y: sy, s: scale, t };
  }

  function drawSky(state) {
    const sky = PALETTE.skies[(state.level - 1) % PALETTE.skies.length];
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, sky.top);
    g.addColorStop(0.45, sky.mid);
    g.addColorStop(0.62, sky.low);
    g.addColorStop(1, '#2c4a2e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Sun with glow.
    const sunX = 1060;
    const sunY = 92;
    const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 130);
    glow.addColorStop(0, sky.sun);
    glow.addColorStop(0.25, 'rgba(255, 240, 180, 0.55)');
    glow.addColorStop(1, 'rgba(255, 240, 180, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sunX - 140, sunY - 140, 280, 280);
    ctx.fillStyle = '#fff8d0';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 34, 0, TAU);
    ctx.fill();
  }

  function drawClouds(state) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (const c of state.clouds) {
      const s = c.s;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 52 * s, 20 * s, 0, 0, TAU);
      ctx.ellipse(c.x - 34 * s, c.y + 8 * s, 34 * s, 15 * s, 0, 0, TAU);
      ctx.ellipse(c.x + 36 * s, c.y + 9 * s, 36 * s, 16 * s, 0, 0, TAU);
      ctx.fill();
    }
  }

  function drawRidges(state) {
    const d = state.distance;
    // Far ridge (slow parallax), snow-capped.
    ctx.fillStyle = PALETTE.farRidge;
    ctx.beginPath();
    ctx.moveTo(0, FIELD.horizonY + 2);
    const stepFar = 160;
    const offFar = (d * 0.06) % stepFar;
    for (let i = -1; i <= 9; i += 1) {
      const idx = ((Math.floor(d * 0.06 / stepFar) + i) % 96 + 96) % 96;
      const h = state.ridgeFar[idx];
      const x = i * stepFar - offFar;
      ctx.lineTo(x + stepFar / 2, FIELD.horizonY - h * 165);
      ctx.lineTo(x + stepFar, FIELD.horizonY + 2);
    }
    ctx.lineTo(FIELD.width, FIELD.horizonY + 2);
    ctx.closePath();
    ctx.fill();
    // Snow caps on the far ridge.
    ctx.fillStyle = PALETTE.farRidgeSnow;
    for (let i = -1; i <= 9; i += 1) {
      const idx = ((Math.floor(d * 0.06 / stepFar) + i) % 96 + 96) % 96;
      const h = state.ridgeFar[idx];
      if (h < 0.62) continue;
      const x = i * stepFar - offFar + stepFar / 2;
      const y = FIELD.horizonY - h * 165;
      ctx.beginPath();
      ctx.moveTo(x - 26, y + 26);
      ctx.lineTo(x, y - 4);
      ctx.lineTo(x + 26, y + 26);
      ctx.closePath();
      ctx.fill();
    }
    // Near hills (faster parallax).
    ctx.fillStyle = PALETTE.nearHill;
    ctx.beginPath();
    ctx.moveTo(0, 560);
    const stepNear = 220;
    const offNear = (d * 0.22) % stepNear;
    for (let i = -1; i <= 7; i += 1) {
      const idx = ((Math.floor(d * 0.22 / stepNear) + i) % 96 + 96) % 96;
      const h = state.ridgeNear[idx];
      const x = i * stepNear - offNear;
      ctx.quadraticCurveTo(x + stepNear / 2, 470 - h * 110, x + stepNear, 560);
    }
    ctx.lineTo(FIELD.width, 560);
    ctx.closePath();
    ctx.fill();
  }

  function drawGround(state) {
    const d = state.distance;
    const top = 520;
    // Valley floor: scrolling field bands.
    const bandW = 110;
    const off = (d * 0.9) % bandW;
    const colors = [PALETTE.groundA, PALETTE.groundB, PALETTE.fieldC, PALETTE.nearHillDark];
    for (let i = -1; i <= 13; i += 1) {
      const idx = ((Math.floor(d * 0.9 / bandW) + i) % 96 + 96) % 96;
      ctx.fillStyle = colors[state.fieldBand[idx]];
      ctx.fillRect(i * bandW - off, top, bandW, FIELD.height - top);
    }
    // River: a winding blue band.
    ctx.strokeStyle = PALETTE.river;
    ctx.lineWidth = 24;
    ctx.beginPath();
    for (let x = -20; x <= FIELD.width + 20; x += 20) {
      const y = 566 + Math.sin((x + d * 0.7) / 190) * 13;
      if (x === -20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Road with dashes.
    ctx.fillStyle = PALETTE.road;
    ctx.fillRect(0, 648, FIELD.width, 26);
    ctx.fillStyle = '#f5f5f5';
    const dashW = 46;
    const offRoad = (d * 1.4) % (dashW * 2);
    for (let x = -offRoad; x < FIELD.width; x += dashW * 2) {
      ctx.fillRect(x, 659, dashW, 4);
    }
    // Trees: little triangles scrolling with the ground.
    ctx.fillStyle = '#2c5a33';
    for (let i = 0; i < 10; i += 1) {
      const spacing = 190;
      const x = ((i * spacing - d * 1.1) % (spacing * 10) + spacing * 10) % (spacing * 10) - 40;
      const y = 700;
      const s = 12 + ((i * 37) % 10);
      ctx.beginPath();
      ctx.moveTo(x, y - s * 2);
      ctx.lineTo(x - s, y);
      ctx.lineTo(x + s, y);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawRunway(state, screen) {
    const show = screen === SCREEN_TITLE || state.takeoff > 0;
    if (!show) return;
    // The runway the flight starts from: a perspective strip down the middle.
    ctx.fillStyle = PALETTE.runway;
    ctx.beginPath();
    ctx.moveTo(640 - 34, 352);
    ctx.lineTo(640 + 34, 352);
    ctx.lineTo(640 + 190, FIELD.height);
    ctx.lineTo(640 - 190, FIELD.height);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.runwayMark;
    const dashLen = 34;
    const gap = 30;
    const off = (state.distance * 1.6) % (dashLen + gap);
    for (let y = 360 - off; y < FIELD.height; y += dashLen + gap) {
      const t = (y - 350) / (FIELD.height - 350);
      const w = lerp(4, 12, t);
      ctx.fillRect(640 - w / 2, y, w, dashLen * (0.5 + t * 0.5));
    }
    // Threshold bars at the far end.
    ctx.fillRect(640 - 30, 356, 60, 6);
  }

  function drawRing(e, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(0.12);
    ctx.lineWidth = 7 * p.s + 2;
    ctx.strokeStyle = PALETTE.ringGlow;
    ctx.shadowColor = '#ffb700';
    ctx.shadowBlur = 22 * p.s;
    ctx.beginPath();
    ctx.ellipse(0, 0, e.r * p.s, e.r * p.s * 0.92, 0, 0, TAU);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 3 * p.s + 1;
    ctx.strokeStyle = PALETTE.ring;
    ctx.beginPath();
    ctx.ellipse(0, 0, e.r * p.s, e.r * p.s * 0.92, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function drawStar(e, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(stateTime * 0.9);
    ctx.fillStyle = PALETTE.star;
    ctx.shadowColor = '#ffe066';
    ctx.shadowBlur = 16 * p.s;
    const r = e.r * p.s;
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const ang = (i * Math.PI) / 5 - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r * 0.45;
      const x = Math.cos(ang) * rad;
      const y = Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawBalloon(e, p) {
    const r = e.r * p.s;
    const colors = [PALETTE.balloon, PALETTE.balloonAlt];
    const c = colors[Math.floor(e.hue * 2) % 2];
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.4, r * 0.85, r, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.4, r * 0.5, r * 0.9, 0, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = '#5a4632';
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, r * 0.45);
    ctx.lineTo(-r * 0.25, r * 0.95);
    ctx.moveTo(r * 0.4, r * 0.45);
    ctx.lineTo(r * 0.25, r * 0.95);
    ctx.stroke();
    ctx.fillStyle = '#8a6b45';
    ctx.fillRect(-r * 0.28, r * 0.9, r * 0.56, r * 0.4);
    ctx.restore();
  }

  function drawStorm(e, p) {
    const r = e.r * p.s;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = PALETTE.storm;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.15, r * 0.55, 0, 0, TAU);
    ctx.ellipse(-r * 0.6, r * 0.12, r * 0.6, r * 0.4, 0, 0, TAU);
    ctx.ellipse(r * 0.6, r * 0.12, r * 0.6, r * 0.4, 0, 0, TAU);
    ctx.fill();
    // Lightning bolt.
    ctx.strokeStyle = '#ffe95e';
    ctx.lineWidth = 3 * p.s + 1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.15, r * 0.5);
    ctx.lineTo(-r * 0.3, r * 0.95);
    ctx.lineTo(-r * 0.05, r * 0.95);
    ctx.lineTo(-r * 0.2, r * 1.4);
    ctx.stroke();
    ctx.restore();
  }

  function drawPeak(e, p) {
    const r = e.r * p.s;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = PALETTE.peak;
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.lineTo(0, -r * 2.1);
    ctx.lineTo(r, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.peakSnow;
    ctx.beginPath();
    ctx.moveTo(-r * 0.34, -r * 1.42);
    ctx.lineTo(0, -r * 2.1);
    ctx.lineTo(r * 0.34, -r * 1.42);
    ctx.lineTo(r * 0.14, -r * 1.22);
    ctx.lineTo(0, -r * 1.45);
    ctx.lineTo(-r * 0.14, -r * 1.22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawEntities(state) {
    for (const e of state.entities) {
      if (!e.active) continue;
      const p = project(e);
      if (p.s < 0.09) continue;
      if (e.kind === 'ring') drawRing(e, p);
      else if (e.kind === 'star') drawStar(e, p);
      else if (e.kind === 'balloon') drawBalloon(e, p);
      else if (e.kind === 'storm') drawStorm(e, p);
      else if (e.kind === 'peak') drawPeak(e, p);
    }
  }

  function drawPlane(state, screen) {
    const p = state.plane;
    const onGround = screen === SCREEN_TITLE || state.takeoff > 0;
    const blink = p.invuln > 0 && Math.floor(state.time * 12) % 2 === 0;
    ctx.save();
    ctx.translate(p.x, p.y + Math.sin(state.time * 3) * 2);
    ctx.rotate(p.bank);
    if (blink) ctx.globalAlpha = 0.35;
    // Boost speed lines.
    if (state.boost && screen === SCREEN_PLAY) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i += 1) {
        const yy = -40 + i * 22;
        ctx.beginPath();
        ctx.moveTo(-150 - ((i * 53) % 40), yy);
        ctx.lineTo(-105 - ((i * 53) % 40), yy);
        ctx.stroke();
      }
    }
    // Main wings (seen from behind, swept slightly back).
    ctx.fillStyle = PALETTE.planeWing;
    ctx.beginPath();
    ctx.moveTo(-14, -6);
    ctx.lineTo(-148, 26);
    ctx.lineTo(-138, 44);
    ctx.lineTo(-10, 22);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(14, -6);
    ctx.lineTo(148, 26);
    ctx.lineTo(138, 44);
    ctx.lineTo(10, 22);
    ctx.closePath();
    ctx.fill();
    // Wingtip lights: red left, green right — lit.
    ctx.fillStyle = '#ff2d2d';
    ctx.shadowColor = '#ff2d2d';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(-142, 34, 5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2dff5e';
    ctx.shadowColor = '#2dff5e';
    ctx.beginPath();
    ctx.arc(142, 34, 5, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Tailplane.
    ctx.fillStyle = PALETTE.planeWing;
    ctx.beginPath();
    ctx.moveTo(-10, -34);
    ctx.lineTo(-58, -18);
    ctx.lineTo(-52, -6);
    ctx.lineTo(-8, -18);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10, -34);
    ctx.lineTo(58, -18);
    ctx.lineTo(52, -6);
    ctx.lineTo(8, -18);
    ctx.closePath();
    ctx.fill();
    // Fuselage (tail cone toward the viewer).
    const bodyGrad = ctx.createLinearGradient(0, -52, 0, 66);
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(0.6, PALETTE.planeBody);
    bodyGrad.addColorStop(1, '#9fb2c2');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(0, -54);
    ctx.quadraticCurveTo(20, -30, 22, 10);
    ctx.quadraticCurveTo(22, 52, 0, 66);
    ctx.quadraticCurveTo(-22, 52, -22, 10);
    ctx.quadraticCurveTo(-20, -30, 0, -54);
    ctx.fill();
    // Red cheatline down the fuselage.
    ctx.fillStyle = PALETTE.planeAccent;
    ctx.beginPath();
    ctx.moveTo(-7, -40);
    ctx.quadraticCurveTo(9, -10, 9, 34);
    ctx.lineTo(-9, 34);
    ctx.quadraticCurveTo(-9, -10, -7, -40);
    ctx.closePath();
    ctx.fill();
    // Vertical fin.
    ctx.fillStyle = PALETTE.planeAccent;
    ctx.beginPath();
    ctx.moveTo(0, -86);
    ctx.lineTo(14, -46);
    ctx.lineTo(-14, -46);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1', 0, -56);
    // Twin engine exhausts, glowing.
    ctx.fillStyle = '#ffb347';
    ctx.shadowColor = '#ff8c1a';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(-13, 58, 6, 0, TAU);
    ctx.arc(13, 58, 6, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    if (onGround) {
      // Soft shadow on the runway.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(p.x, FIELD.groundY + 26, 90, 10, 0, 0, TAU);
      ctx.fill();
    }
  }

  function drawDial(x, y, r, label, valueText, frac, color) {
    ctx.save();
    ctx.translate(x, y);
    // Lit instrument face.
    ctx.fillStyle = 'rgba(8, 14, 28, 0.85)';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140, 220, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#4fc3f7';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
    for (let i = 0; i <= 10; i += 1) {
      const a = -Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
      const inner = r - (i % 5 === 0 ? 12 : 7);
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = i % 5 === 0 ? 2.5 : 1.2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.lineTo(Math.cos(a) * (r - 3), Math.sin(a) * (r - 3));
      ctx.stroke();
    }
    const na = -Math.PI * 0.75 + clamp(frac, 0, 1) * Math.PI * 1.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(na) * (r - 14), Math.sin(na) * (r - 14));
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(valueText, 0, r * 0.42);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 11px ${FONT}`;
    ctx.fillText(label, 0, -r * 0.45);
    ctx.restore();
  }

  function drawHUD(state, screen) {
    // Top-left: score block.
    panel(ctx, 18, 16, 250, 92);
    text(ctx, 'SCORE', 34, 34, 12, PALETTE.muted);
    text(ctx, String(Math.floor(state.score)), 34, 62, 30, PALETTE.text);
    text(ctx, `RINGS ${state.rings}   STARS ${state.stars}`, 34, 90, 13, PALETTE.good);
    // Top-right: lives + level.
    panel(ctx, FIELD.width - 268, 16, 250, 92);
    text(ctx, 'LIVES', FIELD.width - 252, 34, 12, PALETTE.muted);
    for (let i = 0; i < LIVES; i += 1) {
      const x = FIELD.width - 240 + i * 34;
      const y = 62;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = i < state.lives ? PALETTE.planeAccent : 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(9, 8);
      ctx.lineTo(0, 4);
      ctx.lineTo(-9, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    text(ctx, `LEVEL ${state.level}`, FIELD.width - 252, 90, 13, PALETTE.text);
    // Compass tape, top centre.
    const heading = ((state.heading % 360) + 360) % 360;
    panel(ctx, FIELD.width / 2 - 190, 16, 380, 56);
    ctx.save();
    ctx.beginPath();
    ctx.rect(FIELD.width / 2 - 190, 16, 380, 56);
    ctx.clip();
    for (let d = -60; d <= 60; d += 5) {
      const deg = Math.round(heading + d);
      const x = FIELD.width / 2 + d * 2.6;
      const major = ((deg % 30) + 30) % 30 === 0;
      ctx.strokeStyle = major ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)';
      ctx.lineWidth = major ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, 58);
      ctx.lineTo(x, major ? 40 : 48);
      ctx.stroke();
      if (major) {
        const lab = compassLabel(deg);
        text(ctx, lab === 'N' || lab === 'E' || lab === 'S' || lab === 'W' ? lab : String(((deg % 360) + 360) % 360), x, 30, 11, PALETTE.text);
      }
    }
    ctx.restore();
    ctx.fillStyle = PALETTE.ring;
    ctx.beginPath();
    ctx.moveTo(FIELD.width / 2 - 7, 16);
    ctx.lineTo(FIELD.width / 2 + 7, 16);
    ctx.lineTo(FIELD.width / 2, 28);
    ctx.closePath();
    ctx.fill();
    text(ctx, `${Math.round(heading)}° ${compassLabel(heading)}`, FIELD.width / 2, 64, 12, PALETTE.text, 'center');
    // Instruments, bottom corners (lit dials).
    drawDial(88, 604, 54, 'ALTITUDE', `${state.altitude}`, state.altitude / 6000, '#4fc3f7');
    text(ctx, 'FT', 88, 668, 11, PALETTE.muted, 'center');
    drawDial(FIELD.width - 88, 604, 54, 'AIRSPEED', `${Math.round(state.speed)}`, (state.speed - 80) / 260, '#7dff8a');
    text(ctx, 'KT', FIELD.width - 88, 668, 11, PALETTE.muted, 'center');
    // Throttle bar, bottom centre.
    panel(ctx, FIELD.width / 2 - 110, 668, 220, 34);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    roundRect(ctx, FIELD.width / 2 - 96, 680, 150, 10, 5);
    ctx.fill();
    ctx.fillStyle = state.boost ? PALETTE.ring : '#4fc3f7';
    roundRect(ctx, FIELD.width / 2 - 96, 680, 150 * clamp(state.throttle, 0, 1), 10, 5);
    ctx.fill();
    text(ctx, state.boost ? 'BOOST!' : 'THR', FIELD.width / 2 + 66, 685, 12, PALETTE.text);
    // Centre message.
    if (state.messageTimer > 0 && state.message) {
      const a = clamp(state.messageTimer, 0, 1);
      ctx.globalAlpha = a;
      outlineText(ctx, state.message, FIELD.width / 2, 150, 30, '#ffe066');
      ctx.globalAlpha = 1;
    }
    // Takeoff hint.
    if (state.takeoff > 0 && screen === SCREEN_PLAY) {
      outlineText(ctx, 'TAKEOFF!', FIELD.width / 2, 150, 34, PALETTE.text);
    }
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(8, 14, 30, 0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    outlineText(ctx, 'SKY RINGS', FIELD.width / 2, 128, 84, '#ffffff');
    outlineText(ctx, 'A L P I N E   F L I G H T', FIELD.width / 2, 192, 26, PALETTE.ring);
    panel(ctx, FIELD.width / 2 - 300, 240, 600, 150);
    text(ctx, 'Fly through the golden rings. Dodge balloons,', FIELD.width / 2, 272, 19, PALETTE.text, 'center');
    text(ctx, 'storm clouds and mountain peaks. Grab stars.', FIELD.width / 2, 300, 19, PALETTE.text, 'center');
    text(ctx, 'ARROWS / WASD or MOUSE — steer    SHIFT — boost', FIELD.width / 2, 340, 16, PALETTE.muted, 'center');
    text(ctx, 'P — pause    3 lives    Rings are worth 100', FIELD.width / 2, 368, 16, PALETTE.muted, 'center');
    const pulse = 0.65 + Math.sin(state.time * 4) * 0.35;
    ctx.globalAlpha = pulse;
    outlineText(ctx, 'PRESS SPACE OR CLICK TO FLY', FIELD.width / 2, 452, 28, '#7dff8a');
    ctx.globalAlpha = 1;
    if (best > 0) text(ctx, `BEST SCORE  ${best}`, FIELD.width / 2, 500, 18, PALETTE.text, 'center');
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(8, 14, 30, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(ctx, FIELD.width / 2 - 290, 170, 580, 330);
    outlineText(ctx, 'FLIGHT OVER', FIELD.width / 2, 220, 52, '#ffffff');
    text(ctx, `SCORE   ${Math.floor(state.score)}`, FIELD.width / 2, 292, 26, PALETTE.text, 'center');
    text(ctx, `RINGS ${state.rings}    STARS ${state.stars}    DISTANCE ${Math.floor(state.distance / 100)} km`, FIELD.width / 2, 334, 17, PALETTE.muted, 'center');
    text(ctx, `BEST  ${best}`, FIELD.width / 2, 368, 20, PALETTE.ring, 'center');
    const pulse = 0.65 + Math.sin(state.time * 4) * 0.35;
    ctx.globalAlpha = pulse;
    outlineText(ctx, 'PRESS SPACE TO FLY AGAIN', FIELD.width / 2, 440, 24, '#7dff8a');
    ctx.globalAlpha = 1;
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(8, 14, 30, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    outlineText(ctx, 'PAUSED', FIELD.width / 2, 330, 56, '#ffffff');
    text(ctx, 'Press P or Space to continue', FIELD.width / 2, 396, 18, PALETTE.muted, 'center');
  }

  let stateTime = 0;

  function draw(state, screen, best) {
    stateTime = state.time;
    // Letterbox: fit the 1280x720 field into the canvas.
    const cw = canvas.width / dpr;
    const ch = canvas.height / dpr;
    const fit = Math.min(cw / FIELD.width, ch / FIELD.height);
    const ox = (cw - FIELD.width * fit) / 2;
    const oy = (ch - FIELD.height * fit) / 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, cw, ch);
    ctx.setTransform(dpr * fit, 0, 0, dpr * fit, dpr * ox, dpr * oy);

    ctx.save();
    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake * 14, (Math.random() - 0.5) * state.shake * 14);
    }
    drawSky(state);
    drawClouds(state);
    drawRidges(state);
    drawGround(state);
    drawRunway(state, screen);
    drawEntities(state);
    drawPlane(state, screen);
    drawHUD(state, screen);
    ctx.restore();

    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_OVER) drawOver(state, best);
    else if (screen === SCREEN_PAUSED) drawPaused();

    // Damage flash vignette.
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255, 40, 30, ${state.flash * 0.28})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
  }

  return { draw };
}
