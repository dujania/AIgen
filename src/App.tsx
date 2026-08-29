import type { CSSProperties } from "react";
import SnakeGame from "./components/SnakeGame";

const FIREFLIES = Array.from({ length: 14 }).map((_, i) => ({
  left: `${(i * 37 + 11) % 97}%`,
  top: `${(i * 53 + 19) % 93}%`,
  size: 2 + (i % 3),
  dur: `${5.5 + (i % 5) * 1.7}s`,
  del: `${(i * 0.9) % 6}s`,
}));

export default function App() {
  return (
    <div className="relative h-full overflow-hidden scanlines">
      {/* layered night-garden backdrop */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1100px 700px at 18% -10%, rgba(44,90,58,0.55), transparent 60%)," +
            "radial-gradient(900px 620px at 100% 15%, rgba(29,74,44,0.5), transparent 62%)," +
            "radial-gradient(1000px 800px at 50% 118%, rgba(18,48,32,0.65), transparent 60%)," +
            "linear-gradient(180deg, #0a1c11 0%, #07130d 55%, #050e09 100%)",
        }}
      />
      {/* faint giant checkerboard */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05]"
        style={{
          background:
            "repeating-conic-gradient(#a8f03e 0% 25%, transparent 0% 50%) 0 0 / 96px 96px",
          maskImage: "radial-gradient(ellipse at 50% 42%, black 30%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 42%, black 30%, transparent 78%)",
        }}
      />
      {/* drifting fireflies */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        {FIREFLIES.map((f, i) => (
          <span
            key={i}
            className="firefly"
            style={
              {
                left: f.left,
                top: f.top,
                width: f.size,
                height: f.size,
                "--dur": f.dur,
                "--del": f.del,
              } as CSSProperties
            }
          />
        ))}
      </div>
      {/* vignette */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(2,8,5,0.55) 100%)",
        }}
      />

      <SnakeGame />
    </div>
  );
}
