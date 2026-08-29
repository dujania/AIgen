/* Tiny WebAudio chip-tune synth. Context is created lazily on first user gesture. */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

function ensure(): AudioContext | null {
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface ToneOpts {
  type?: OscillatorType;
  gain?: number;
  slide?: number; // target frequency to glide to
  delay?: number; // seconds
}

function tone(freq: number, dur: number, opts: ToneOpts = {}) {
  if (muted) return;
  const ac = ensure();
  if (!ac || !master) return;
  try {
    const { type = "square", gain = 0.12, slide, delay = 0 } = opts;
    const t0 = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch {
    /* audio is decorative — never break the game */
  }
}

export const sfx = {
  unlock() {
    ensure();
  },
  eat() {
    tone(540, 0.07, { gain: 0.11 });
    tone(810, 0.09, { gain: 0.09, delay: 0.055 });
  },
  bonus() {
    tone(660, 0.08, { gain: 0.11 });
    tone(880, 0.08, { gain: 0.11, delay: 0.07 });
    tone(1320, 0.14, { gain: 0.1, delay: 0.14 });
  },
  die() {
    tone(300, 0.5, { type: "sawtooth", gain: 0.14, slide: 48 });
    tone(180, 0.4, { type: "square", gain: 0.08, slide: 40, delay: 0.05 });
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, { gain: 0.1, delay: i * 0.1 }));
  },
  count() {
    tone(587, 0.09, { gain: 0.09 });
  },
  go() {
    tone(880, 0.18, { gain: 0.12 });
    tone(1175, 0.22, { gain: 0.1, delay: 0.06 });
  },
  pause() {
    tone(392, 0.08, { gain: 0.08 });
    tone(262, 0.1, { gain: 0.08, delay: 0.07 });
  },
  resume() {
    tone(262, 0.08, { gain: 0.08 });
    tone(392, 0.1, { gain: 0.08, delay: 0.07 });
  },
  ui() {
    tone(700, 0.05, { gain: 0.06 });
  },
};

export function setMuted(m: boolean) {
  muted = m;
}
