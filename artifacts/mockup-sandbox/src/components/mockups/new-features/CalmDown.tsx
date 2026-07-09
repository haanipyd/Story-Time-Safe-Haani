import { useState, useEffect } from "react";
import "./group.css";

const calmStories = [
  { emoji: "🌊", title: "The Quiet Ocean", duration: "5 min" },
  { emoji: "🌙", title: "The Sleepy Moon", duration: "4 min" },
  { emoji: "🐘", title: "Thumbi's Calm Walk", duration: "6 min" },
];

const breatheSteps = ["Breathe in... 🌬️", "Hold... ✨", "Breathe out... 😮‍💨"];

export function CalmDown() {
  const [step, setStep] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s + 1) % 3);
      setExpanded((e) => !e);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", background: "linear-gradient(180deg, #1A1A4E 0%, #2D1B69 50%, #1A3A5C 100%)", minHeight: "100vh", display: "flex", flexDirection: "column", color: "#fff" }}>
      <div style={{ height: 44 }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 24px 8px" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#B8C0F0", letterSpacing: 1 }}>CALM MODE 🌙</div>
        <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 99, padding: "4px 14px", fontSize: 13, fontWeight: 700, color: "#B8C0F0" }}>
          ⏱ 5 min
        </div>
      </div>

      {/* Stars */}
      <div style={{ textAlign: "center", padding: "8px 0 4px", fontSize: 24, letterSpacing: 8, opacity: 0.7 }}>✨ ⭐ ✨</div>

      {/* Breathing circle */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0" }}>
        <div style={{ position: "relative", width: 180, height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Outer glow */}
          <div style={{
            position: "absolute", borderRadius: "50%",
            width: expanded ? 180 : 130, height: expanded ? 180 : 130,
            background: "rgba(130, 100, 255, 0.15)",
            transition: "all 2.2s ease-in-out",
          }} />
          {/* Middle ring */}
          <div style={{
            position: "absolute", borderRadius: "50%",
            width: expanded ? 150 : 105, height: expanded ? 150 : 105,
            background: "rgba(130, 100, 255, 0.2)",
            transition: "all 2.2s ease-in-out",
          }} />
          {/* Core circle */}
          <div style={{
            borderRadius: "50%",
            width: expanded ? 120 : 84, height: expanded ? 120 : 84,
            background: "linear-gradient(135deg, #8264FF, #5B8DB8)",
            boxShadow: "0 0 40px rgba(130,100,255,0.5)",
            transition: "all 2.2s ease-in-out",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: expanded ? 32 : 24,
          }}>
            {step === 0 ? "🌬️" : step === 1 ? "✨" : "😮‍💨"}
          </div>
        </div>
        <div style={{ marginTop: 20, fontSize: 20, fontWeight: 800, color: "#D8D0FF", textAlign: "center", minHeight: 32 }}>
          {breatheSteps[step]}
        </div>
        <div style={{ fontSize: 13, color: "#8890CC", marginTop: 6 }}>Follow the circle with your breath</div>
      </div>

      {/* Calm stories */}
      <div style={{ flex: 1, padding: "0 20px 8px" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#8890CC", letterSpacing: 1, marginBottom: 12 }}>
          CALMING STORIES FOR YOU
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {calmStories.map((s, i) => (
            <div
              key={i}
              style={{
                background: "rgba(255,255,255,0.08)", borderRadius: 16,
                padding: "14px 16px", display: "flex", alignItems: "center", gap: 14,
                border: i === 0 ? "1.5px solid rgba(130,100,255,0.5)" : "1.5px solid transparent",
              }}
            >
              <span style={{ fontSize: 28 }}>{s.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#E8E0FF" }}>{s.title}</div>
                <div style={{ fontSize: 12, color: "#8890CC", marginTop: 2 }}>{s.duration}</div>
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: i === 0 ? "rgba(130,100,255,0.8)" : "rgba(255,255,255,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
              }}>▶</div>
            </div>
          ))}
        </div>
      </div>

      {/* Parent note */}
      <div style={{ margin: "12px 20px 40px", background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: "12px 16px", display: "flex", gap: 10, alignItems: "center" }}>
        <span style={{ fontSize: 20 }}>💡</span>
        <span style={{ fontSize: 12, color: "#8890CC", lineHeight: 1.4 }}>Screen dims automatically in Calm Mode. Tap to brighten.</span>
      </div>
    </div>
  );
}
