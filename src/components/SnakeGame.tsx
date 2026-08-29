import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  DIFFICULTIES,
  aiChooseDir,
  createWorld,
  queueDirection,
  step,
  updateFx,
} from "../game/engine";
import type { DifficultyId, Phase, Vec, World } from "../game/engine";
import { initView, render } from "../game/render";
import type { View } from "../game/render";
import { setMuted as setAudioMuted, sfx } from "../game/audio";

/* ---------------- persistence ---------------- */

const bestKey = (d: DifficultyId) => `snake.best.${d}`;

function loadBest(d: DifficultyId): number {
  try {
    return Number(localStorage.getItem(bestKey(d))) || 0;
  } catch {
    return 0;
  }
}
function saveBest(d: DifficultyId, v: number) {
  try {
    localStorage.setItem(bestKey(d), String(v));
  } catch {
    /* private mode — play on */
  }
}
function loadPref(k: string, fb: string): string {
  try {
    return localStorage.getItem(k) ?? fb;
  } catch {
    return fb;
  }
}
function savePref(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* noop */
  }
}

const DIFF_MAP = Object.fromEntries(DIFFICULTIES.map((d) => [d.id, d])) as Record<
  DifficultyId,
  (typeof DIFFICULTIES)[number]
>;

const fmtTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/* ---------------- inline icons (no emoji) ---------------- */

const I = {
  play: (c = "currentColor") => (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill={c}>
      <path d="M4 2l10 6-10 6V2z" />
    </svg>
  ),
  pause: (c = "currentColor") => (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill={c}>
      <path d="M3 2h4v12H3zM9 2h4v12H9z" />
    </svg>
  ),
  restart: (c = "currentColor") => (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke={c} strokeWidth="2">
      <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" strokeLinecap="round" />
      <path d="M13.8 1.6v3.2h-3.2" fill={c} stroke="none" />
    </svg>
  ),
  sound: (c = "currentColor") => (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill={c}>
      <path d="M2 6h3l4-4v12l-4-4H2z" />
      <path d="M11.5 5.5a3.5 3.5 0 0 1 0 5" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  mute: (c = "currentColor") => (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill={c}>
      <path d="M2 6h3l4-4v12l-4-4H2z" />
      <path d="M11 6l4 4M15 6l-4 4" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  chevron: (dir: "up" | "down" | "left" | "right") => {
    const rot = { up: 0, right: 90, down: 180, left: 270 }[dir];
    return (
      <svg viewBox="0 0 16 16" className="w-6 h-6" fill="currentColor" style={{ transform: `rotate(${rot}deg)` }}>
        <path d="M8 3l6 8H2z" />
      </svg>
    );
  },
  trophy: (c = "currentColor") => (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill={c}>
      <path d="M4 2h8v2h2v2c0 1.7-1.3 3-3 3h-.3A4 4 0 0 1 9 10.9V12h2v2H5v-2h2v-1.1A4 4 0 0 1 5.3 9H5c-1.7 0-3-1.3-3-3V4h2V2zm-1 4V5h1v2.6A2 2 0 0 1 3 6zm10 0a2 2 0 0 1-1 1.6V5h1v1z" />
    </svg>
  ),
  logo: () => (
    <svg viewBox="0 0 32 32" className="w-8 h-8">
      <rect width="32" height="32" rx="6" fill="#0c2415" stroke="#2c5a3a" />
      <path d="M8 22V10h6v6h4v-6h6v12h-6v-6h-4v6z" fill="#a8f03e" />
      <circle cx="23" cy="12" r="1.6" fill="#ff4d6d" />
    </svg>
  ),
};

/* ---------------- component ---------------- */

interface Hud {
  score: number;
  length: number;
  eaten: number;
  time: number;
  speed: number;
}

export default function SnakeGame() {
  /* ---- state ---- */
  const [phase, setPhase] = useState<Phase>("menu");
  const [difficulty, setDifficulty] = useState<DifficultyId>(() => {
    const v = loadPref("snake.difficulty", "classic");
    return (DIFFICULTIES.some((d) => d.id === v) ? v : "classic") as DifficultyId;
  });
  const [best, setBest] = useState(() => loadBest(loadPref("snake.difficulty", "classic") as DifficultyId));
  const [muted, setMutedState] = useState(() => loadPref("snake.muted", "0") === "1");
  const [isNewBest, setIsNewBest] = useState(false);
  const [count, setCount] = useState(3);
  const [hud, setHud] = useState<Hud>({ score: 0, length: 4, eaten: 0, time: 0, speed: 8.2 });
  const [popKey, setPopKey] = useState(0);
  const [hasTouch] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches
  );
  const [boardSize, setBoardSize] = useState(320);

  /* ---- refs ---- */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View | null>(null);
  const worldRef = useRef<World>(createWorld(true, 116));
  const phaseRef = useRef<Phase>("menu");
  const diffRef = useRef(difficulty);
  const mutedRef = useRef(muted);
  const cdEndRef = useRef(0);
  const countRef = useRef(3);
  const deathAtRef = useRef(0);
  const demoResetAtRef = useRef(0);
  const lastSecRef = useRef(-1);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const actionsRef = useRef<Record<string, () => void>>({});
  const dirActionsRef = useRef<(d: Vec) => void>(() => {});

  const go = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  /* ---- actions ---- */

  const syncHud = (w: World, now: number) => {
    setHud({
      score: w.score,
      length: w.snake.length,
      eaten: w.eaten,
      time: Math.max(0, (now - w.startTime - w.pausedTotal) / 1000),
      speed: 1000 / w.speed,
    });
  };

  const startGame = () => {
    sfx.unlock();
    const now = performance.now();
    worldRef.current = createWorld(false, DIFF_MAP[diffRef.current].base, now);
    setIsNewBest(false);
    setHud({ score: 0, length: 4, eaten: 0, time: 0, speed: 1000 / DIFF_MAP[diffRef.current].base });
    lastSecRef.current = -1;
    countRef.current = 3;
    setCount(3);
    cdEndRef.current = now + 2100;
    go("countdown");
  };

  const togglePause = () => {
    const w = worldRef.current;
    const now = performance.now();
    if (phaseRef.current === "playing") {
      w.pausedAt = now;
      go("paused");
      sfx.pause();
    } else if (phaseRef.current === "paused") {
      const d = now - w.pausedAt;
      w.pausedTotal += d;
      if (w.bonus) w.bonus.until += d;
      go("playing");
      sfx.resume();
    }
  };

  const toMenu = () => {
    const now = performance.now();
    const nw = createWorld(true, 116, now);
    nw.particles = worldRef.current.particles;
    worldRef.current = nw;
    setHud({ score: 0, length: 4, eaten: 0, time: 0, speed: 1000 / DIFF_MAP[diffRef.current].base });
    go("menu");
  };

  const chooseDifficulty = (id: DifficultyId) => {
    if (phaseRef.current === "playing" || phaseRef.current === "countdown" || phaseRef.current === "dying") return;
    sfx.unlock();
    sfx.ui();
    diffRef.current = id;
    setDifficulty(id);
    savePref("snake.difficulty", id);
    setBest(loadBest(id));
  };

  const toggleMute = () => {
    const m = !mutedRef.current;
    mutedRef.current = m;
    setMutedState(m);
    setAudioMuted(m);
    savePref("snake.muted", m ? "1" : "0");
    if (!m) {
      sfx.unlock();
      sfx.ui();
    }
  };

  const pushDir = (d: Vec) => {
    sfx.unlock();
    const ph = phaseRef.current;
    if (ph === "menu" || ph === "over") {
      startGame();
      queueDirection(worldRef.current, d);
      return;
    }
    queueDirection(worldRef.current, d);
  };

  actionsRef.current = { startGame, togglePause, toMenu, toggleMute, restart: startGame };
  dirActionsRef.current = pushDir;

  /* ---- main loop ---- */
  useEffect(() => {
    setAudioMuted(mutedRef.current);
    let raf = 0;
    let last = performance.now();

    const handleEvent = (ev: ReturnType<typeof step>, w: World, now: number) => {
      if (ev === "eat") {
        sfx.eat();
        setPopKey((k) => k + 1);
        syncHud(w, now);
      } else if (ev === "bonus") {
        sfx.bonus();
        setPopKey((k) => k + 1);
        syncHud(w, now);
      } else if (ev === "die" || ev === "win") {
        if (ev === "win") sfx.win();
        else sfx.die();
        syncHud(w, now);
        deathAtRef.current = now + 850;
        go("dying");
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(50, now - last);
      last = now;
      const w = worldRef.current;
      const ph = phaseRef.current;
      const diff = DIFF_MAP[diffRef.current];

      if (ph === "countdown") {
        const remain = cdEndRef.current - now;
        const c = Math.max(1, Math.ceil(remain / 700));
        if (c !== countRef.current) {
          countRef.current = c;
          setCount(c);
          sfx.count();
        }
        if (remain <= 0) {
          w.startTime = now;
          go("playing");
          sfx.go();
        }
      } else if (ph === "playing") {
        w.acc += dt;
        let guard = 0;
        while (w.acc >= w.speed && guard++ < 4 && !w.deathCause) {
          w.acc -= w.speed;
          handleEvent(step(w, diff, now), w, now);
        }
        const sec = Math.floor(Math.max(0, now - w.startTime - w.pausedTotal) / 1000);
        if (sec !== lastSecRef.current) {
          lastSecRef.current = sec;
          syncHud(w, now);
        }
      } else if (ph === "menu") {
        if (demoResetAtRef.current && now >= demoResetAtRef.current) {
          const nw = createWorld(true, 116, now);
          nw.particles = w.particles;
          nw.floaters = w.floaters;
          worldRef.current = nw;
          demoResetAtRef.current = 0;
        } else {
          const dw = worldRef.current;
          dw.acc += dt;
          let guard = 0;
          while (dw.acc >= dw.speed && guard++ < 3) {
            dw.acc -= dw.speed;
            queueDirection(dw, aiChooseDir(dw));
            const ev = step(dw, diff, now);
            if (ev === "die" || ev === "win") demoResetAtRef.current = now + 900;
          }
        }
      } else if (ph === "dying" && now >= deathAtRef.current) {
        const timeSec = Math.max(0, (now - w.startTime - w.pausedTotal) / 1000);
        syncHud(w, now);
        if (!w.demo && w.score > loadBest(diffRef.current)) {
          saveBest(diffRef.current, w.score);
          setBest(w.score);
          setIsNewBest(true);
        }
        setHud((h) => ({ ...h, time: timeSec }));
        go("over");
      }

      updateFx(worldRef.current, dt, now, ph !== "paused");
      const canvas = canvasRef.current;
      const view = viewRef.current;
      if (canvas && view) {
        const ctx = canvas.getContext("2d");
        if (ctx) render(ctx, view, worldRef.current, now, ph);
      }
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- board sizing ---- */
  useEffect(() => {
    const zone = zoneRef.current;
    const canvas = canvasRef.current;
    if (!zone || !canvas) return;
    const fit = () => {
      const r = zone.getBoundingClientRect();
      const s = Math.max(160, Math.min(720, Math.floor(Math.min(r.width, r.height)) - 4));
      setBoardSize(s);
      viewRef.current = initView(canvas, s);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(zone);
    return () => ro.disconnect();
  }, []);

  /* ---- keyboard ---- */
  useEffect(() => {
    const DIRS: Record<string, Vec> = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      KeyW: { x: 0, y: -1 },
      KeyS: { x: 0, y: 1 },
      KeyA: { x: -1, y: 0 },
      KeyD: { x: 1, y: 0 },
    };
    const onKey = (e: KeyboardEvent) => {
      if (DIRS[e.code]) {
        e.preventDefault();
        dirActionsRef.current(DIRS[e.code]);
        return;
      }
      const A = actionsRef.current;
      switch (e.code) {
        case "Space":
        case "KeyP":
          e.preventDefault();
          if (phaseRef.current === "playing" || phaseRef.current === "paused") A.togglePause();
          else if (phaseRef.current === "menu" || phaseRef.current === "over") A.startGame();
          break;
        case "Enter":
          if (phaseRef.current === "menu" || phaseRef.current === "over") A.startGame();
          break;
        case "KeyR":
          A.startGame();
          break;
        case "KeyM":
          A.toggleMute();
          break;
        case "Escape":
          if (phaseRef.current === "playing") A.togglePause();
          else if (phaseRef.current === "over" || phaseRef.current === "paused") A.toMenu();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---- swipe on board ---- */
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      swipeRef.current = { x: t.clientX, y: t.clientY };
    };
    const onMove = (e: TouchEvent) => {
      if (!swipeRef.current) return;
      e.preventDefault();
      const t = e.touches[0];
      const dx = t.clientX - swipeRef.current.x;
      const dy = t.clientY - swipeRef.current.y;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
      dirActionsRef.current(
        Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) }
      );
      swipeRef.current = { x: t.clientX, y: t.clientY };
    };
    const onEnd = () => {
      swipeRef.current = null;
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, []);

  /* ---- auto-pause when tab hidden ---- */
  useEffect(() => {
    const onHide = () => {
      if (document.hidden && phaseRef.current === "playing") actionsRef.current.togglePause();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  /* ================= render ================= */

  const ph = phase;
  const diffDef = DIFF_MAP[difficulty];
  const playing = ph === "playing";
  const canPause = playing || ph === "paused";

  return (
    <div className="h-[100dvh] overflow-hidden flex flex-col max-w-[1220px] mx-auto w-full px-3 sm:px-5 py-3 sm:py-4 gap-3 relative z-10">
      {/* ---------- marquee header ---------- */}
      <header className="panel notch flex items-center justify-between gap-3 px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {I.logo()}
          <div className="min-w-0">
            <h1 className="font-pixel text-lime-bright text-sm sm:text-lg leading-none tracking-wide [text-shadow:0_0_18px_rgba(168,240,62,0.55)]">
              SNAKE
            </h1>
            <p className="text-[10px] sm:text-[11px] font-semibold tracking-[0.22em] text-moss-400 mt-1 truncate">
              NEON GARDEN ARCADE
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1.5" aria-hidden>
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-lime-glow"
              style={{ animation: `marqueeChase 1.5s ease-in-out ${i * 0.13}s infinite` }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`hidden sm:inline-block font-pixel text-[9px] px-2.5 py-1.5 border ${
              ph === "playing"
                ? "text-lime-glow border-lime-glow/50"
                : ph === "paused"
                ? "text-amber-coin border-amber-coin/50"
                : ph === "over" || ph === "dying"
                ? "text-berry border-berry/50"
                : "text-moss-300 border-moss-600"
            }`}
          >
            {ph === "menu" ? "ATTRACT" : ph === "countdown" ? "READY" : ph.toUpperCase()}
          </span>
          <button
            className="btn-ghost notch-sm p-2.5"
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            title="Sound (M)"
          >
            {muted ? I.mute() : I.sound()}
          </button>
          <button
            className={`btn-ghost notch-sm p-2.5 ${canPause ? "" : "opacity-40 pointer-events-none"}`}
            onClick={togglePause}
            aria-label={playing ? "Pause" : "Resume"}
            title="Pause (Space)"
          >
            {playing ? I.pause() : I.play()}
          </button>
          <button
            className={`btn-ghost notch-sm p-2.5 ${ph === "menu" ? "opacity-40 pointer-events-none" : ""}`}
            onClick={startGame}
            aria-label="Restart"
            title="Restart (R)"
          >
            {I.restart()}
          </button>
        </div>
      </header>

      {/* ---------- main: rails + board ---------- */}
      <div className="flex-1 min-h-0 flex gap-3">
        {/* left rail */}
        <aside className="hidden xl:flex flex-col gap-3 w-[248px] shrink-0">
          <div className="panel notch p-4">
            <h2 className="font-pixel text-[10px] text-moss-300 tracking-wider mb-3">DIFFICULTY</h2>
            <div className="flex flex-col gap-2">
              {DIFFICULTIES.map((d) => {
                const sel = d.id === difficulty;
                const locked = playing || ph === "countdown" || ph === "dying";
                return (
                  <button
                    key={d.id}
                    onClick={() => chooseDifficulty(d.id)}
                    disabled={locked}
                    className={`notch-sm text-left px-3 py-2.5 border transition-all duration-150 ${
                      sel
                        ? "border-amber-coin bg-[#241f0a] shadow-[0_0_16px_rgba(255,215,94,0.15)]"
                        : "border-moss-700 bg-[#0b1f13] hover:border-moss-400"
                    } ${locked ? "opacity-45 cursor-not-allowed" : "cursor-pointer active:translate-y-[1px]"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-pixel text-[10px] ${sel ? "text-amber-coin" : "text-moss-200"}`}>
                        {d.name}
                      </span>
                      <span className="flex gap-1">
                        {[0, 1, 2].map((p) => (
                          <span
                            key={p}
                            className={`w-1.5 h-1.5 rounded-full ${
                              p < d.pips ? (sel ? "bg-amber-coin" : "bg-lime-glow") : "bg-moss-700"
                            }`}
                          />
                        ))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[11px] text-moss-400 font-medium">{d.tag}</span>
                      <span className="text-[11px] font-bold text-moss-300">+{d.foodValue}/apple</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="panel notch p-4">
            <h2 className="font-pixel text-[10px] text-moss-300 tracking-wider mb-3">CONTROLS</h2>
            <ul className="space-y-2.5 text-[12.5px] font-medium text-moss-300">
              <li className="flex justify-between items-center gap-2">
                <span>Steer</span>
                <span className="flex gap-1">
                  <span className="kbd">ARROWS</span>
                  <span className="kbd">WASD</span>
                </span>
              </li>
              <li className="flex justify-between items-center gap-2">
                <span>Pause</span>
                <span className="kbd">SPACE</span>
              </li>
              <li className="flex justify-between items-center gap-2">
                <span>Restart</span>
                <span className="kbd">R</span>
              </li>
              <li className="flex justify-between items-center gap-2">
                <span>Sound</span>
                <span className="kbd">M</span>
              </li>
              <li className="flex justify-between items-center gap-2">
                <span>Back to menu</span>
                <span className="kbd">ESC</span>
              </li>
            </ul>
          </div>

          <div className="panel notch p-4 mt-auto">
            <div className="flex items-center gap-2 text-amber-coin mb-1.5">
              {I.trophy()}
              <span className="font-pixel text-[9px] tracking-wider">STAR BERRY</span>
            </div>
            <p className="text-[12px] leading-relaxed text-moss-400 font-medium">
              Every <span className="text-moss-200 font-bold">5 apples</span> a star berry appears —{" "}
              <span className="text-amber-coin font-bold">+{diffDef.bonusValue} pts</span>, worth 2 growth,
              gone in 6.5s.
            </p>
          </div>
        </aside>

        {/* board zone */}
        <main ref={zoneRef} className="flex-1 min-w-0 min-h-0 flex items-center justify-center relative">
          <div
            ref={frameRef}
            className="board-frame notch relative bg-moss-900 select-none"
            style={{ width: boardSize, height: boardSize, touchAction: "none" }}
          >
            <canvas ref={canvasRef} className="block" />

            {/* ---- overlays ---- */}
            {ph === "menu" && (
              <div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#04100a]/62 cursor-pointer"
                onClick={() => actionsRef.current.startGame()}
              >
                <p className="font-pixel text-[9px] sm:text-[10px] text-amber-coin blink-hard tracking-widest">
                  INSERT COIN
                </p>
                <h2 className="font-pixel text-3xl sm:text-5xl text-lime-bright text-center leading-tight [text-shadow:0_0_30px_rgba(168,240,62,0.6),0_4px_0_#2c5a3a] pop-in">
                  SNAKE
                </h2>
                <p className="text-[12px] sm:text-[13px] font-semibold tracking-[0.3em] text-moss-300 -mt-1">
                  NEON GARDEN EDITION
                </p>
                <button className="btn-arcade notch-sm px-6 py-3.5 text-[11px] mt-2 flex items-center gap-2.5">
                  {I.play("#06130b")}
                  PRESS START
                </button>
                <p className="text-[11.5px] text-moss-400 font-medium mt-1">
                  {hasTouch ? "swipe the board or use the pad" : "arrows / WASD to steer"} ·{" "}
                  <span className="text-moss-300">{diffDef.name}</span> selected
                </p>
                <p className="text-[10px] text-moss-400/70 font-medium">
                  attract mode running behind this panel
                </p>
              </div>
            )}

            {ph === "countdown" && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 pointer-events-none">
                <p className="font-pixel text-[10px] text-moss-300 tracking-widest rise-in">GET READY</p>
                <div
                  key={count}
                  className="count-pop font-pixel text-6xl sm:text-7xl text-lime-bright [text-shadow:0_0_36px_rgba(168,240,62,0.75),0_5px_0_#2c5a3a]"
                >
                  {count}
                </div>
              </div>
            )}

            {ph === "paused" && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-[#04100a]/72">
                <h2 className="font-pixel text-xl sm:text-2xl text-amber-coin pop-in [text-shadow:0_0_24px_rgba(255,215,94,0.5)]">
                  PAUSED
                </h2>
                <button
                  className="btn-arcade notch-sm px-6 py-3 text-[10px] flex items-center gap-2.5"
                  onClick={togglePause}
                >
                  {I.play("#06130b")}
                  RESUME
                </button>
                <p className="text-[11.5px] text-moss-400 font-medium">
                  <span className="kbd">SPACE</span> resume · <span className="kbd">ESC</span> quit to menu
                </p>
              </div>
            )}

            {ph === "over" && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#10040a]/78">
                <div className="panel notch p-5 sm:p-7 w-[86%] max-w-[380px] text-center rise-in border-berry/40">
                  <h2
                    className={`font-pixel text-lg sm:text-2xl ${
                      hud.score > 0 && isNewBest ? "text-amber-coin" : "text-berry"
                    } [text-shadow:0_0_26px_rgba(255,77,109,0.5)]`}
                  >
                    {worldRef.current.deathCause === "win" ? "PERFECT!" : "GAME OVER"}
                  </h2>
                  <p className="text-[12px] text-moss-400 font-medium mt-2">
                    {worldRef.current.deathCause === "self"
                      ? "you bit your own tail"
                      : worldRef.current.deathCause === "wall"
                      ? "straight into the garden wall"
                      : "the garden is completely full"}
                  </p>

                  {isNewBest && (
                    <div className="best-glow font-pixel text-[10px] text-amber-coin border border-amber-coin/60 inline-block px-3 py-2 mt-4 pop-in">
                      NEW HIGH SCORE
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {[
                      ["SCORE", String(hud.score).padStart(5, "0")],
                      ["BEST", String(best).padStart(5, "0")],
                      ["LENGTH", `${hud.length}`],
                      ["TIME", fmtTime(hud.time)],
                    ].map(([k, v]) => (
                      <div key={k} className="border border-moss-700 bg-[#0b1f13] notch-sm px-2 py-2.5">
                        <div className="text-[9px] font-bold tracking-[0.2em] text-moss-400">{k}</div>
                        <div className={`font-pixel text-[11px] mt-1.5 ${k === "SCORE" ? "text-lime-glow" : k === "BEST" ? "text-amber-coin" : "text-moss-200"}`}>
                          {v}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-5 justify-center">
                    <button
                      className="btn-arcade notch-sm px-5 py-3 text-[10px] flex items-center gap-2"
                      onClick={startGame}
                    >
                      {I.restart("#06130b")}
                      RETRY
                    </button>
                    <button className="btn-ghost notch-sm px-5 py-3 font-pixel text-[10px]" onClick={toMenu}>
                      MENU
                    </button>
                  </div>
                  <p className="text-[10.5px] text-moss-400 font-medium mt-3.5">
                    <span className="kbd">ENTER</span> retry · <span className="kbd">ESC</span> menu
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* right rail */}
        <aside className="hidden xl:flex flex-col gap-3 w-[248px] shrink-0">
          <div className="panel notch p-4">
            <div className="text-[9px] font-bold tracking-[0.25em] text-moss-400">SCORE</div>
            <div
              key={popKey}
              className={`font-pixel text-2xl text-lime-glow mt-2 score-punch [text-shadow:0_0_18px_rgba(168,240,62,0.5)]`}
            >
              {String(hud.score).padStart(6, "0")}
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-moss-700">
              <span className="text-amber-coin">{I.trophy()}</span>
              <span className="text-[9px] font-bold tracking-[0.25em] text-moss-400">BEST</span>
              <span className="font-pixel text-[11px] text-amber-coin ml-auto">
                {String(Math.max(best, hud.score)).padStart(6, "0")}
              </span>
            </div>
          </div>

          <div className="panel notch p-4">
            <h2 className="font-pixel text-[10px] text-moss-300 tracking-wider mb-3">THIS RUN</h2>
            <dl className="space-y-2.5">
              {[
                ["LENGTH", `${hud.length} segments`],
                ["APPLES", `${hud.eaten} eaten`],
                ["TIME", fmtTime(hud.time)],
                ["PACE", `${hud.speed.toFixed(1)} c/s`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-baseline">
                  <dt className="text-[10px] font-bold tracking-[0.18em] text-moss-400">{k}</dt>
                  <dd className="font-pixel text-[10px] text-moss-200">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="panel notch p-4">
            <h2 className="font-pixel text-[10px] text-moss-300 tracking-wider mb-3">SESSION</h2>
            <div className="space-y-2">
              <button
                className="w-full btn-ghost notch-sm px-3 py-2.5 font-pixel text-[9px] flex items-center justify-center gap-2"
                onClick={startGame}
                disabled={ph === "menu"}
                style={ph === "menu" ? { opacity: 0.45, pointerEvents: "none" } : undefined}
              >
                {I.restart()}
                RESTART RUN
              </button>
              <button
                className="w-full btn-ghost notch-sm px-3 py-2.5 font-pixel text-[9px] flex items-center justify-center gap-2"
                onClick={toMenu}
                disabled={ph === "menu"}
                style={ph === "menu" ? { opacity: 0.45, pointerEvents: "none" } : undefined}
              >
                QUIT TO MENU
              </button>
            </div>
          </div>

          <div className="panel notch px-4 py-3 mt-auto flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-[0.2em] text-moss-400">MODE</span>
            <span className="font-pixel text-[10px] text-amber-coin">{diffDef.name}</span>
          </div>
        </aside>
      </div>

      {/* ---------- mobile strip ---------- */}
      <div className="xl:hidden shrink-0 flex items-stretch gap-2">
        <div className="panel notch-sm px-3 py-2 flex-1 min-w-0">
          <div className="text-[8px] font-bold tracking-[0.22em] text-moss-400">SCORE</div>
          <div key={popKey} className="font-pixel text-sm text-lime-glow score-punch mt-0.5 truncate">
            {String(hud.score).padStart(6, "0")}
          </div>
        </div>
        <div className="panel notch-sm px-3 py-2 flex-1 min-w-0">
          <div className="text-[8px] font-bold tracking-[0.22em] text-moss-400">BEST</div>
          <div className="font-pixel text-sm text-amber-coin mt-0.5 truncate">
            {String(Math.max(best, hud.score)).padStart(6, "0")}
          </div>
        </div>
        <div className="panel notch-sm px-3 py-2 hidden sm:flex flex-col justify-center">
          <div className="text-[8px] font-bold tracking-[0.22em] text-moss-400">LENGTH</div>
          <div className="font-pixel text-sm text-moss-200 mt-0.5">{hud.length}</div>
        </div>
      </div>

      {/* ---------- mobile difficulty ---------- */}
      <div className="xl:hidden shrink-0 flex gap-2">
        {DIFFICULTIES.map((d) => {
          const sel = d.id === difficulty;
          const locked = playing || ph === "countdown" || ph === "dying";
          return (
            <button
              key={d.id}
              onClick={() => chooseDifficulty(d.id)}
              disabled={locked}
              className={`flex-1 notch-sm border px-2 py-2 font-pixel text-[8.5px] transition-colors ${
                sel
                  ? "border-amber-coin text-amber-coin bg-[#241f0a]"
                  : "border-moss-700 text-moss-300 bg-[#0b1f13]"
              } ${locked ? "opacity-45" : "active:translate-y-[1px]"}`}
            >
              {d.name}
            </button>
          );
        })}
      </div>

      {/* ---------- touch pad / desktop footer ---------- */}
      {hasTouch ? (
        <div className="xl:hidden shrink-0 flex justify-center pb-1">
          <div className="grid grid-cols-3 gap-1.5 w-[218px]">
            <span />
            <PadBtn onPress={() => pushDir({ x: 0, y: -1 })} label="Up">
              {I.chevron("up")}
            </PadBtn>
            <span />
            <PadBtn onPress={() => pushDir({ x: -1, y: 0 })} label="Left">
              {I.chevron("left")}
            </PadBtn>
            <PadBtn
              onPress={() => {
                if (phaseRef.current === "playing" || phaseRef.current === "paused") togglePause();
                else if (phaseRef.current === "menu" || phaseRef.current === "over") startGame();
              }}
              label="Pause or start"
              accent
            >
              {playing ? I.pause() : I.play()}
            </PadBtn>
            <PadBtn onPress={() => pushDir({ x: 1, y: 0 })} label="Right">
              {I.chevron("right")}
            </PadBtn>
            <span />
            <PadBtn onPress={() => pushDir({ x: 0, y: 1 })} label="Down">
              {I.chevron("down")}
            </PadBtn>
            <span />
          </div>
        </div>
      ) : (
        <footer className="hidden md:flex shrink-0 items-center justify-center gap-x-5 gap-y-1 flex-wrap text-[11.5px] text-moss-400 font-medium pb-1">
          <span>
            <span className="kbd">ARROWS</span> / <span className="kbd">WASD</span> steer
          </span>
          <span>
            <span className="kbd">SPACE</span> pause
          </span>
          <span>
            <span className="kbd">R</span> restart
          </span>
          <span>
            <span className="kbd">M</span> sound
          </span>
          <span className="text-moss-400/70">eat the coral apples · chase the gold star · mind the walls</span>
        </footer>
      )}
    </div>
  );
}

function PadBtn({
  children,
  onPress,
  label,
  accent,
}: {
  children: ReactNode;
  onPress: () => void;
  label: string;
  accent?: boolean;
}) {
  return (
    <button
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      className={`h-[62px] flex items-center justify-center border transition-transform duration-75 active:scale-90 ${
        accent
          ? "border-amber-coin/70 text-amber-coin bg-[#241f0a] active:bg-[#3a320f]"
          : "border-moss-600 text-lime-glow bg-[#0d2417] active:bg-[#173a22]"
      } notch-sm select-none`}
      style={{ touchAction: "none" }}
    >
      {children}
    </button>
  );
}
