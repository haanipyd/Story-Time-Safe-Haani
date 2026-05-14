import React from "react";
import { Play, Home, Moon, BookOpen } from "lucide-react";

const STAR_POSITIONS = [
  { x: 8, y: 5, s: 8, d: 0 }, { x: 22, y: 12, s: 12, d: 1.2 }, { x: 45, y: 3, s: 6, d: 0.5 },
  { x: 67, y: 8, s: 10, d: 2.1 }, { x: 82, y: 15, s: 7, d: 0.8 }, { x: 15, y: 22, s: 9, d: 3.0 },
  { x: 35, y: 18, s: 5, d: 1.7 }, { x: 55, y: 25, s: 11, d: 0.3 }, { x: 75, y: 20, s: 8, d: 2.5 },
  { x: 92, y: 30, s: 6, d: 1.0 }, { x: 5, y: 35, s: 10, d: 3.5 }, { x: 28, y: 40, s: 7, d: 0.7 },
  { x: 50, y: 35, s: 9, d: 2.2 }, { x: 70, y: 42, s: 5, d: 1.5 }, { x: 88, y: 38, s: 12, d: 0.2 },
  { x: 12, y: 55, s: 8, d: 4.0 }, { x: 38, y: 60, s: 6, d: 1.8 }, { x: 62, y: 55, s: 10, d: 0.6 },
  { x: 85, y: 65, s: 7, d: 2.8 }, { x: 20, y: 72, s: 5, d: 1.3 }, { x: 48, y: 78, s: 9, d: 3.2 },
  { x: 72, y: 75, s: 11, d: 0.9 }, { x: 95, y: 70, s: 6, d: 2.0 }, { x: 5, y: 85, s: 8, d: 1.6 },
  { x: 32, y: 88, s: 7, d: 3.8 }, { x: 58, y: 90, s: 5, d: 0.4 }, { x: 80, y: 85, s: 10, d: 2.4 },
  { x: 18, y: 95, s: 6, d: 1.1 }, { x: 42, y: 93, s: 9, d: 3.3 }, { x: 65, y: 97, s: 8, d: 0.1 },
];

const categories = [
  { id: "animals", emoji: "🦁", glow: "rgba(251,146,60,0.5)", border: "rgba(251,146,60,0.5)", bg: "rgba(251,146,60,0.15)" },
  { id: "space",   emoji: "🚀", glow: "rgba(96,165,250,0.5)",  border: "rgba(96,165,250,0.5)",  bg: "rgba(96,165,250,0.15)"  },
  { id: "bedtime", emoji: "🌙", glow: "rgba(196,181,253,0.5)", border: "rgba(196,181,253,0.5)", bg: "rgba(196,181,253,0.15)" },
  { id: "dragon",  emoji: "🐉", glow: "rgba(52,211,153,0.5)",  border: "rgba(52,211,153,0.5)",  bg: "rgba(52,211,153,0.15)"  },
];

const stories = [
  { id: 1, title: "The Sleepy Lion",      duration: "8 min",  emoji: "🦁💤" },
  { id: 2, title: "Rocket to the Stars",  duration: "12 min", emoji: "🚀✨" },
  { id: 3, title: "The Friendly Dragon",  duration: "6 min",  emoji: "🐉☁️" },
  { id: 4, title: "Ocean Friends",        duration: "10 min", emoji: "🐳🌊" },
];

export function Dreamland() {
  return (
    <div
      className="relative w-[390px] h-[844px] overflow-hidden flex flex-col select-none"
      style={{ background: "#0F172A", fontFamily: "'Nunito', system-ui, sans-serif" }}
    >
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; transform: scale(0.8); }
          50%       { opacity: 0.85; transform: scale(1.2); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(196,181,253,0.5); }
          50%       { box-shadow: 0 0 0 20px rgba(196,181,253,0); }
        }
      `}</style>

      {/* Background stars */}
      <div className="absolute inset-0 pointer-events-none">
        {STAR_POSITIONS.map((star, i) => (
          <div
            key={i}
            className="absolute text-white"
            style={{
              left: star.x + "%",
              top: star.y + "%",
              fontSize: star.s + "px",
              animation: "twinkle 4s ease-in-out infinite",
              animationDelay: star.d + "s",
            }}
          >
            {i % 2 === 0 ? "✦" : "★"}
          </div>
        ))}
        {/* soft nebula blobs */}
        <div style={{ position:"absolute", top:"-10%", left:"-20%", width:300, height:300, borderRadius:"50%", background:"#C4B5FD", filter:"blur(100px)", opacity:0.18 }} />
        <div style={{ position:"absolute", bottom:"10%", right:"-10%", width:250, height:250, borderRadius:"50%", background:"#7DD3FC", filter:"blur(100px)", opacity:0.10 }} />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden z-10" style={{ paddingBottom: 112 }}>

        {/* Now Playing card */}
        <div className="px-5 pt-12 pb-3">
          <div
            className="rounded-[28px] p-5"
            style={{ background:"rgba(15,23,42,0.85)", border:"1px solid rgba(196,181,253,0.3)", boxShadow:"0 4px 30px rgba(196,181,253,0.15)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">✨</span>
              <span className="font-extrabold text-base uppercase tracking-widest" style={{ color:"#C4B5FD" }}>Now Playing</span>
              <span className="text-lg">✨</span>
            </div>
            <div className="flex items-center gap-4">
              <div
                className="w-[68px] h-[68px] rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
                style={{ background:"#1E293B", border:"1px solid #334155" }}
              >
                🦁
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-xl mb-2 leading-tight">The Sleepy Lion</p>
                <div className="w-full rounded-full overflow-hidden mb-1" style={{ height:8, background:"#1E293B" }}>
                  <div className="h-full rounded-full w-[40%]" style={{ background:"linear-gradient(90deg,#C4B5FD,#7DD3FC)" }} />
                </div>
                <div className="flex justify-between text-xs font-semibold" style={{ color:"rgba(196,181,253,0.7)" }}>
                  <span>3:12</span><span>8:00</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category circles */}
        <div className="flex gap-4 px-5 py-4 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className="flex-shrink-0 w-[82px] h-[82px] rounded-full flex items-center justify-center text-4xl border-2"
              style={{
                background: cat.bg,
                borderColor: cat.border,
                boxShadow: "0 0 18px " + cat.glow,
              }}
            >
              {cat.emoji}
            </button>
          ))}
        </div>

        {/* Stories */}
        <div className="px-5 mt-2">
          <h2 className="text-white font-extrabold text-3xl mb-5" style={{ textShadow:"0 2px 12px rgba(196,181,253,0.4)" }}>
            Sleepy Stories
          </h2>
          <div className="flex flex-col gap-4">
            {stories.map((s) => (
              <button
                key={s.id}
                className="w-full flex items-center gap-4 rounded-[28px] p-4 text-left"
                style={{ background:"rgba(15,23,42,0.7)", border:"1px solid rgba(196,181,253,0.2)" }}
              >
                <div
                  className="w-[96px] h-[96px] rounded-[22px] flex items-center justify-center flex-shrink-0"
                  style={{ fontSize:46, background:"#1E293B", border:"1px solid #334155" }}
                >
                  {s.emoji}
                </div>
                <div className="py-1">
                  <p className="text-white font-bold text-xl leading-tight mb-2">{s.title}</p>
                  <span
                    className="inline-block px-4 py-1 rounded-full font-bold text-sm"
                    style={{ background:"rgba(30,41,59,0.9)", color:"#C4B5FD" }}
                  >
                    {s.duration}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom nav + floating play button */}
      <div className="absolute bottom-0 left-0 w-full z-20">
        {/* Floating play button */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-[58px]">
          <button
            className="w-[108px] h-[108px] rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg,#C4B5FD,#7DD3FC)",
              border: "4px solid #0F172A",
              boxShadow: "0 8px 32px rgba(196,181,253,0.55)",
              animation: "pulse-glow 3s ease-in-out infinite",
            }}
          >
            <Play className="w-12 h-12 fill-white text-white ml-1" />
          </button>
        </div>

        {/* Nav bar */}
        <div
          className="flex justify-between items-center px-10"
          style={{
            height: 100,
            background: "rgba(15,23,42,0.97)",
            borderTop: "1px solid rgba(196,181,253,0.2)",
            borderRadius: "40px 40px 0 0",
          }}
        >
          <button className="w-[72px] h-[72px] flex flex-col items-center justify-center gap-1" style={{ color:"#C4B5FD" }}>
            <Home className="w-9 h-9" strokeWidth={2.5} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background:"#C4B5FD", boxShadow:"0 0 8px #C4B5FD" }} />
          </button>

          <div className="w-[72px]" /> {/* spacer for floating button */}

          <button className="w-[72px] h-[72px] flex items-center justify-center" style={{ color:"#475569" }}>
            <BookOpen className="w-9 h-9" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
