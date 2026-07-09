import { useState } from "react";
import "./group.css";

const feelings = [
  { emoji: "😊", label: "Happy", color: "#F9C74F", bg: "#FEF9E7", story: "Mau-Ma's Dance Party 🎶", desc: "A joyful story to celebrate!" },
  { emoji: "😢", label: "Sad", color: "#4A90D9", bg: "#EBF4FF", story: "The Brave Little Cloud 🌧️", desc: "A hug in story form." },
  { emoji: "😤", label: "Angry", color: "#E05252", bg: "#FEECEC", story: "Thumbi Learns to Breathe 🐘", desc: "Breathe with Thumbi." },
  { emoji: "😨", label: "Scared", color: "#7B5EA7", bg: "#EDE8F5", story: "The Cozy Night Light 🌙", desc: "Night isn't scary at all." },
  { emoji: "😴", label: "Sleepy", color: "#5B8DB8", bg: "#E8F1FA", story: "Dreamland Express 🚂", desc: "Drift off to dreamland." },
  { emoji: "🤩", label: "Excited", color: "#E07B39", bg: "#FDF0E6", story: "The Magic Mango Tree 🥭", desc: "Adventure awaits!" },
];

export function FeelingsPicker() {
  const [selected, setSelected] = useState<number | null>(null);
  const feeling = selected !== null ? feelings[selected] : null;

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", background: "#FDF7ED", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 44 }} />

      {/* Header */}
      <div style={{ padding: "16px 24px 20px", textAlign: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "#2D2016", margin: "0 0 6px" }}>
          How are you feeling? 💭
        </h1>
        <p style={{ fontSize: 14, color: "#7A6050", margin: 0, lineHeight: 1.4 }}>
          Pick your feeling and I'll find the perfect story for you
        </p>
      </div>

      {/* Feelings grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, padding: "0 20px" }}>
        {feelings.map((f, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            style={{
              background: selected === i ? f.color : f.bg,
              border: `3px solid ${selected === i ? f.color : "transparent"}`,
              borderRadius: 20, padding: "16px 8px", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              boxShadow: selected === i ? `0 4px 16px ${f.color}55` : "0 2px 8px rgba(0,0,0,0.06)",
              transform: selected === i ? "scale(1.06)" : "scale(1)",
              transition: "all 0.18s ease",
            }}
          >
            <span style={{ fontSize: 36, lineHeight: 1, display: "block" }}>{f.emoji}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: selected === i ? "#fff" : "#2D2016" }}>{f.label}</span>
          </button>
        ))}
      </div>

      {/* Story recommendation */}
      <div style={{ flex: 1, padding: "20px 20px 0" }}>
        {feeling ? (
          <div style={{ background: "#FFF4E0", borderRadius: 22, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#A0855B", letterSpacing: 1, marginBottom: 8 }}>PERFECT FOR YOU RIGHT NOW</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#2D2016", marginBottom: 4 }}>{feeling.story}</div>
            <div style={{ fontSize: 14, color: "#7A6050", marginBottom: 18 }}>{feeling.desc}</div>
            <button style={{ background: feeling.color, border: "none", borderRadius: 14, padding: "12px 28px", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: `0 4px 12px ${feeling.color}66` }}>
              ▶ Play now
            </button>
          </div>
        ) : (
          <div style={{ background: "#FFF4E0", borderRadius: 22, padding: "24px 20px", textAlign: "center", opacity: 0.6 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>☝️</div>
            <div style={{ fontSize: 15, color: "#7A6050", fontWeight: 600 }}>Pick a feeling above to get your story</div>
          </div>
        )}
      </div>

      <div style={{ height: 40 }} />
    </div>
  );
}
