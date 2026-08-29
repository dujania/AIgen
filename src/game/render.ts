import { COLS, ROWS } from "./engine";
import type { Phase, Vec, World } from "./engine";

export interface View {
  size: number;
  cell: number;
  dpr: number;
  board: HTMLCanvasElement | null;
}

export function initView(canvas: HTMLCanvasElement, size: number): View {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const cell = size / COLS;
  return { size, cell, dpr, board: buildBoard(size, dpr, cell) };
}

function buildBoard(size: number, dpr: number, cell: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.round(size * dpr);
  c.height = Math.round(size * dpr);
  const g = c.getContext("2d");
  if (!g) return c;
  g.scale(dpr, dpr);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      g.fillStyle = (x + y) % 2 === 0 ? "#0f2918" : "#0d2415";
      g.fillRect(x * cell, y * cell, cell + 0.5, cell + 0.5);
    }
  }
  // faint center dots for texture
  g.fillStyle = "rgba(211,255,94,0.045)";
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      g.beginPath();
      g.arc(x * cell + cell / 2, y * cell + cell / 2, Math.max(1, cell * 0.045), 0, Math.PI * 2);
      g.fill();
    }
  }
  // vignette
  const v = g.createRadialGradient(
    size / 2, size / 2, size * 0.28,
    size / 2, size / 2, size * 0.74
  );
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(2,10,6,0.5)");
  g.fillStyle = v;
  g.fillRect(0, 0, size, size);

  // inner rim light
  g.strokeStyle = "rgba(168,240,62,0.14)";
  g.lineWidth = 1.5;
  g.strokeRect(1, 1, size - 2, size - 2);
  return c;
}

/* ---------- helpers ---------- */

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function mix(c1: number[], c2: number[], t: number): string {
  const r = Math.round(lerp(c1[0], c2[0], t));
  const g = Math.round(lerp(c1[1], c2[1], t));
  const b = Math.round(lerp(c1[2], c2[2], t));
  return `rgb(${r},${g},${b})`;
}

const HEAD_C = [211, 255, 94];
const MID_C = [148, 224, 47];
const TAIL_C = [52, 128, 40];

function bodyColor(t: number): string {
  return t < 0.5 ? mix(HEAD_C, MID_C, t * 2) : mix(MID_C, TAIL_C, (t - 0.5) * 2);
}

interface Pt {
  x: number;
  y: number;
}

function interpolated(w: World, t: number, cell: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < w.snake.length; i++) {
    const cur = w.snake[i];
    const prev = w.prev[i] ?? cur;
    pts.push({
      x: (lerp(prev.x, cur.x, t) + 0.5) * cell,
      y: (lerp(prev.y, cur.y, t) + 0.5) * cell,
    });
  }
  return pts;
}

/* ---------- main render ---------- */

export function render(
  ctx: CanvasRenderingContext2D,
  view: View,
  w: World,
  now: number,
  phase: Phase
) {
  const { size, cell, dpr } = view;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);

  // screen shake
  if (w.shake > 0.001) {
    const m = w.shake * w.shake * 13;
    ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
  }

  if (view.board) ctx.drawImage(view.board, 0, 0, size, size);

  drawFood(ctx, w, now, cell);
  if (w.bonus) drawBonus(ctx, w, now, cell);

  const blinkOut = phase === "dying" && Math.floor(now / 85) % 2 === 0;
  if (!blinkOut) drawSnake(ctx, w, now, cell, phase);

  drawParticles(ctx, w, cell);
  drawFloaters(ctx, w, cell);

  if (w.flash > 0.003) {
    ctx.fillStyle = `rgba(${w.flashColor},${(w.flash * 0.55).toFixed(3)})`;
    ctx.fillRect(-8, -8, size + 16, size + 16);
  }
}

function drawSnake(
  ctx: CanvasRenderingContext2D,
  w: World,
  now: number,
  cell: number,
  phase: Phase
) {
  const t = phase === "dying" || phase === "over" ? 1 : Math.min(1, w.acc / w.speed);
  const pts = interpolated(w, t, cell);
  if (pts.length < 2) return;

  const path = new Path2D();
  path.moveTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  for (let i = pts.length - 2; i >= 0; i--) path.lineTo(pts[i].x, pts[i].y);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // soft drop shadow
  ctx.save();
  ctx.translate(0, cell * 0.09);
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineWidth = cell * 0.66;
  ctx.stroke(path);
  ctx.restore();

  // dark outline
  ctx.strokeStyle = "#0f3a17";
  ctx.lineWidth = cell * 0.74;
  ctx.stroke(path);

  // glow pass (single draw call)
  ctx.save();
  ctx.shadowColor = "rgba(168,240,62,0.55)";
  ctx.shadowBlur = cell * 0.55;
  ctx.strokeStyle = "rgba(126,208,47,0.9)";
  ctx.lineWidth = cell * 0.58;
  ctx.stroke(path);
  ctx.restore();

  // per-segment gradient body, tapered toward tail
  const n = pts.length;
  for (let i = n - 1; i >= 1; i--) {
    const f = i / (n - 1);
    ctx.strokeStyle = bodyColor(f);
    ctx.lineWidth = cell * (0.58 - 0.2 * f);
    ctx.beginPath();
    ctx.moveTo(pts[i].x, pts[i].y);
    ctx.lineTo(pts[i - 1].x, pts[i - 1].y);
    ctx.stroke();
  }

  // belly highlight
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = cell * 0.14;
  ctx.stroke(path);

  // head
  const head = pts[0];
  const neck = pts[1];
  const dx = head.x - neck.x;
  const dy = head.y - neck.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;

  ctx.save();
  ctx.shadowColor = "rgba(211,255,94,0.8)";
  ctx.shadowBlur = cell * 0.5;
  ctx.fillStyle = "#d3ff5e";
  ctx.beginPath();
  ctx.arc(head.x, head.y, cell * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // tongue flick while hunting
  if ((phase === "playing" || phase === "menu") && Math.sin(now / 170) > 0.82) {
    const tx = head.x + ux * cell * 0.42;
    const ty = head.y + uy * cell * 0.42;
    const ex = head.x + ux * cell * 0.85;
    const ey = head.y + uy * cell * 0.85;
    ctx.strokeStyle = "#ff4d6d";
    ctx.lineWidth = Math.max(1.4, cell * 0.07);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(ex, ey);
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - uy * cell * 0.12 + ux * cell * 0.12, ey + ux * cell * 0.12 + uy * cell * 0.12);
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + uy * cell * 0.12 + ux * cell * 0.12, ey - ux * cell * 0.12 + uy * cell * 0.12);
    ctx.stroke();
  }

  // eyes track direction of travel
  const px = -uy;
  const py = ux;
  for (const s of [1, -1]) {
    const ex = head.x + ux * cell * 0.1 + px * s * cell * 0.19;
    const ey = head.y + uy * cell * 0.1 + py * s * cell * 0.19;
    ctx.fillStyle = "#f4ffe0";
    ctx.beginPath();
    ctx.arc(ex, ey, cell * 0.135, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0d240f";
    ctx.beginPath();
    ctx.arc(ex + ux * cell * 0.055, ey + uy * cell * 0.055, cell * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFood(ctx: CanvasRenderingContext2D, w: World, now: number, cell: number) {
  const x = (w.food.x + 0.5) * cell;
  const y = (w.food.y + 0.5) * cell;
  const pulse = 1 + 0.09 * Math.sin(now / 240 + w.foodSeed);
  const r = cell * 0.34 * pulse;

  ctx.save();
  ctx.shadowColor = "rgba(255,77,109,0.8)";
  ctx.shadowBlur = cell * 0.5;

  // stem + leaf
  ctx.strokeStyle = "#8a5a33";
  ctx.lineWidth = Math.max(1.5, cell * 0.07);
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.9);
  ctx.quadraticCurveTo(x + r * 0.15, y - r * 1.35, x + r * 0.3, y - r * 1.45);
  ctx.stroke();
  ctx.fillStyle = "#7ee081";
  ctx.beginPath();
  ctx.ellipse(x + r * 0.62, y - r * 1.18, r * 0.42, r * 0.2, -0.5, 0, Math.PI * 2);
  ctx.fill();

  const grad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.15, x, y, r * 1.05);
  grad.addColorStop(0, "#ff9d7a");
  grad.addColorStop(0.45, "#ff4d6d");
  grad.addColorStop(1, "#b31f3e");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.38, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
}

function drawBonus(ctx: CanvasRenderingContext2D, w: World, now: number, cell: number) {
  const b = w.bonus!;
  const x = (b.pos.x + 0.5) * cell;
  const y = (b.pos.y + 0.5) * cell;
  const remain = Math.max(0, (b.until - now) / b.total);
  const urgent = remain < 0.32;
  const pulse = 1 + (urgent ? 0.18 : 0.1) * Math.sin(now / (urgent ? 90 : 170));
  const r = cell * 0.38 * pulse;
  const spin = now / 640;

  // timer ring
  ctx.strokeStyle = urgent
    ? `rgba(255,215,94,${0.45 + 0.5 * Math.abs(Math.sin(now / 110))})`
    : "rgba(255,215,94,0.85)";
  ctx.lineWidth = Math.max(1.6, cell * 0.08);
  ctx.beginPath();
  ctx.arc(x, y, cell * 0.56, -Math.PI / 2, -Math.PI / 2 + remain * Math.PI * 2);
  ctx.stroke();

  // 4-point sparkle star
  ctx.save();
  ctx.shadowColor = "rgba(255,215,94,0.9)";
  ctx.shadowBlur = cell * 0.6;
  ctx.fillStyle = "#ffd75e";
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const ang = spin + (i * Math.PI) / 4;
    const rad = i % 2 === 0 ? r : r * 0.4;
    const sx = x + Math.cos(ang) * rad;
    const sy = y + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
}

function drawParticles(ctx: CanvasRenderingContext2D, w: World, cell: number) {
  if (w.particles.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const p of w.particles) {
    const a = 1 - p.life / p.ttl;
    ctx.fillStyle = `rgba(${p.color},${(a * 0.9).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(
      (p.x + 0.5) * cell,
      (p.y + 0.5) * cell,
      p.size * (cell / 24) * (0.5 + a * 0.7),
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  ctx.restore();
}

function drawFloaters(ctx: CanvasRenderingContext2D, w: World, cell: number) {
  if (w.floaters.length === 0) return;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(cell * 0.46)}px "Chakra Petch", sans-serif`;
  for (const f of w.floaters) {
    const t = f.life / f.ttl;
    const a = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
    const x = (f.x + 0.5) * cell;
    const y = (f.y + 0.5 - t * 1.3) * cell;
    ctx.lineWidth = 4;
    ctx.strokeStyle = `rgba(4,16,10,${(a * 0.85).toFixed(3)})`;
    ctx.strokeText(f.text, x, y);
    ctx.fillStyle = f.color;
    ctx.globalAlpha = a;
    ctx.fillText(f.text, x, y);
    ctx.globalAlpha = 1;
  }
}

export type { Vec };
