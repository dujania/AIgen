export const COLS = 21;
export const ROWS = 21;

export interface Vec {
  x: number;
  y: number;
}

export type Phase = "menu" | "countdown" | "playing" | "paused" | "dying" | "over";

export type DifficultyId = "garden" | "classic" | "frenzy";

export interface DifficultyDef {
  id: DifficultyId;
  name: string;
  tag: string;
  /** ms per tick at start */
  base: number;
  /** fastest tick allowed */
  min: number;
  /** ms shaved off per apple */
  accel: number;
  foodValue: number;
  bonusValue: number;
  pips: number; // 1..3 speed indicator
}

export const DIFFICULTIES: DifficultyDef[] = [
  {
    id: "garden",
    name: "GARDEN",
    tag: "a gentle stroll",
    base: 168,
    min: 96,
    accel: 1.6,
    foodValue: 10,
    bonusValue: 50,
    pips: 1,
  },
  {
    id: "classic",
    name: "CLASSIC",
    tag: "the 1976 cut",
    base: 122,
    min: 66,
    accel: 1.9,
    foodValue: 15,
    bonusValue: 75,
    pips: 2,
  },
  {
    id: "frenzy",
    name: "FRENZY",
    tag: "hold my tail",
    base: 86,
    min: 46,
    accel: 2.2,
    foodValue: 25,
    bonusValue: 125,
    pips: 3,
  },
];

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  size: number;
  color: string;
  grav: number;
}

export interface Floater {
  x: number;
  y: number;
  text: string;
  life: number;
  ttl: number;
  color: string;
}

export interface BonusStar {
  pos: Vec;
  until: number;
  total: number;
}

export interface World {
  snake: Vec[];
  prev: Vec[];
  dir: Vec;
  queue: Vec[];
  food: Vec;
  foodSeed: number;
  bonus: BonusStar | null;
  bonusCounter: number;
  score: number;
  eaten: number;
  grow: number;
  speed: number;
  acc: number;
  ticks: number;
  particles: Particle[];
  floaters: Floater[];
  shake: number;
  flash: number;
  flashColor: string;
  deathCause: "wall" | "self" | "win" | null;
  demo: boolean;
  startTime: number;
  pausedAt: number;
  pausedTotal: number;
}

const rnd = (n: number) => Math.floor(Math.random() * n);

function freeCell(w: Pick<World, "snake" | "food" | "bonus">): Vec | null {
  const taken = new Set<number>();
  for (const s of w.snake) taken.add(s.y * COLS + s.x);
  taken.add(w.food.y * COLS + w.food.x);
  if (w.bonus) taken.add(w.bonus.pos.y * COLS + w.bonus.pos.x);
  const open: number[] = [];
  for (let i = 0; i < COLS * ROWS; i++) if (!taken.has(i)) open.push(i);
  if (open.length === 0) return null;
  const pick = open[rnd(open.length)];
  return { x: pick % COLS, y: Math.floor(pick / COLS) };
}

export function createWorld(demo: boolean, baseSpeed = 122, now = 0): World {
  const cx = Math.floor(COLS / 2);
  const cy = Math.floor(ROWS / 2);
  const snake: Vec[] = [
    { x: cx + 1, y: cy },
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ];
  const w: World = {
    snake,
    prev: snake.map((s) => ({ ...s })),
    dir: { x: 1, y: 0 },
    queue: [],
    food: { x: cx + 6, y: cy },
    foodSeed: Math.random() * Math.PI * 2,
    bonus: null,
    bonusCounter: 0,
    score: 0,
    eaten: 0,
    grow: 0,
    speed: baseSpeed,
    acc: 0,
    ticks: 0,
    particles: [],
    floaters: [],
    shake: 0,
    flash: 0,
    flashColor: "255,77,109",
    deathCause: null,
    demo,
    startTime: now,
    pausedAt: 0,
    pausedTotal: 0,
  };
  const f = freeCell(w);
  if (f) w.food = f;
  return w;
}

export function queueDirection(w: World, d: Vec) {
  const last = w.queue.length > 0 ? w.queue[w.queue.length - 1] : w.dir;
  if (d.x === -last.x && d.y === -last.y) return; // no 180° reversal
  if (d.x === last.x && d.y === last.y) return;
  if (w.queue.length < 3) w.queue.push(d);
}

function burst(w: World, at: Vec, color: string, count: number, power: number) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = (0.4 + Math.random() * 0.9) * power;
    w.particles.push({
      x: at.x,
      y: at.y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - power * 0.25,
      life: 0,
      ttl: 420 + Math.random() * 420,
      size: 1.6 + Math.random() * 2.6,
      color,
      grav: power * 0.9,
    });
  }
  if (w.particles.length > 220) w.particles.splice(0, w.particles.length - 220);
}

function float(w: World, at: Vec, text: string, color: string) {
  w.floaters.push({ x: at.x, y: at.y, text, life: 0, ttl: 900, color });
  if (w.floaters.length > 12) w.floaters.shift();
}

export type StepEvent = "eat" | "bonus" | "die" | "win" | null;

/** Advance one tick. Mutates world; returns what happened (for sound/HUD). */
export function step(w: World, diff: DifficultyDef, now: number): StepEvent {
  if (w.deathCause) return null;

  w.prev = w.snake.map((s) => ({ ...s }));

  const next = w.queue.shift();
  if (next && !(next.x === -w.dir.x && next.y === -w.dir.y)) w.dir = next;

  const head = w.snake[0];
  const nh = { x: head.x + w.dir.x, y: head.y + w.dir.y };

  // wall
  if (nh.x < 0 || nh.x >= COLS || nh.y < 0 || nh.y >= ROWS) {
    return kill(w, "wall");
  }
  // self (tail cell vacates unless growing)
  const willGrow = w.grow > 0 || (nh.x === w.food.x && nh.y === w.food.y);
  const limit = willGrow ? w.snake.length : w.snake.length - 1;
  for (let i = 0; i < limit; i++) {
    if (w.snake[i].x === nh.x && w.snake[i].y === nh.y) return kill(w, "self");
  }

  w.snake.unshift(nh);
  w.ticks++;

  // eat food
  if (nh.x === w.food.x && nh.y === w.food.y) {
    w.score += diff.foodValue;
    w.eaten++;
    w.grow += 1;
    w.speed = Math.max(diff.min, diff.base - w.eaten * diff.accel);
    burst(w, nh, "255,77,109", 12, 2.2);
    burst(w, nh, "255,138,92", 6, 1.4);
    float(w, nh, `+${diff.foodValue}`, "#ff8a9d");
    const f = freeCell(w);
    if (!f) {
      w.deathCause = "win";
      return "win";
    }
    w.food = f;
    w.foodSeed = Math.random() * Math.PI * 2;
    w.bonusCounter++;
    if (w.bonusCounter % 5 === 0 && !w.bonus) {
      const b = freeCell(w);
      if (b) w.bonus = { pos: b, until: now + 6500, total: 6500 };
    }
    return "eat";
  }

  // grab bonus star
  if (w.bonus && nh.x === w.bonus.pos.x && nh.y === w.bonus.pos.y) {
    w.score += diff.bonusValue;
    w.grow += 2;
    burst(w, nh, "255,215,94", 22, 2.8);
    float(w, nh, `+${diff.bonusValue}`, "#ffd75e");
    w.bonus = null;
    w.flash = Math.max(w.flash, 0.16);
    w.flashColor = "255,215,94";
    return "bonus";
  }

  if (w.grow > 0) w.grow--;
  else w.snake.pop();

  return null;
}

function kill(w: World, cause: "wall" | "self"): StepEvent {
  w.deathCause = cause;
  w.shake = 1;
  w.flash = 0.42;
  w.flashColor = "255,77,109";
  const head = w.snake[0];
  burst(w, head, "168,240,62", 26, 3.1);
  burst(w, head, "255,77,109", 14, 2.2);
  return "die";
}

/** Frame-rate independent cosmetic update (particles, shake, flash, bonus expiry). */
export function updateFx(w: World, dt: number, now: number, running = true) {
  w.shake = Math.max(0, w.shake - dt * 0.0028);
  w.flash = Math.max(0, w.flash - dt * 0.0016);
  for (let i = w.particles.length - 1; i >= 0; i--) {
    const p = w.particles[i];
    p.life += dt;
    if (p.life >= p.ttl) {
      w.particles.splice(i, 1);
      continue;
    }
    p.vy += (p.grav * dt) / 1000;
    p.x += (p.vx * dt) / 1000;
    p.y += (p.vy * dt) / 1000;
  }
  for (let i = w.floaters.length - 1; i >= 0; i--) {
    const f = w.floaters[i];
    f.life += dt;
    if (f.life >= f.ttl) w.floaters.splice(i, 1);
  }
  if (running && w.bonus && now > w.bonus.until) {
    burst(w, w.bonus.pos, "255,215,94", 8, 1.2);
    w.bonus = null;
  }
}

/* ---------------- attract-mode AI ---------------- */

function floodCount(start: Vec, blocked: Set<number>): number {
  if (start.x < 0 || start.x >= COLS || start.y < 0 || start.y >= ROWS) return 0;
  const key = start.y * COLS + start.x;
  if (blocked.has(key)) return 0;
  const seen = new Set<number>([key]);
  const stack = [start];
  let count = 0;
  while (stack.length && count < 70) {
    const c = stack.pop()!;
    count++;
    const neigh = [
      { x: c.x + 1, y: c.y },
      { x: c.x - 1, y: c.y },
      { x: c.x, y: c.y + 1 },
      { x: c.x, y: c.y - 1 },
    ];
    for (const n of neigh) {
      if (n.x < 0 || n.x >= COLS || n.y < 0 || n.y >= ROWS) continue;
      const k = n.y * COLS + n.x;
      if (!blocked.has(k) && !seen.has(k)) {
        seen.add(k);
        stack.push(n);
      }
    }
  }
  return count;
}

/** Pick the safest direction that trends toward the food. */
export function aiChooseDir(w: World): Vec {
  const options: Vec[] = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ].filter((d) => !(d.x === -w.dir.x && d.y === -w.dir.y));

  const blocked = new Set<number>();
  for (let i = 0; i < w.snake.length - 1; i++) {
    blocked.add(w.snake[i].y * COLS + w.snake[i].x);
  }

  let best: Vec = w.dir;
  let bestScore = -Infinity;
  for (const d of options) {
    const nh = { x: w.snake[0].x + d.x, y: w.snake[0].y + d.y };
    if (nh.x < 0 || nh.x >= COLS || nh.y < 0 || nh.y >= ROWS) continue;
    if (blocked.has(nh.y * COLS + nh.x)) continue;
    const dist = Math.abs(nh.x - w.food.x) + Math.abs(nh.y - w.food.y);
    const space = floodCount(nh, blocked);
    const score = -dist * 2.1 + space * 0.65 + Math.random() * 0.6;
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}
