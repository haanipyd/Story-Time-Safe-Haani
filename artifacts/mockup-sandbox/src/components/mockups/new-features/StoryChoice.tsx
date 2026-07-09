import { useState } from "react";
import "./group.css";

const choices = [
  { emoji: "🌿", label: "Go into the forest", color: "#3D9970", bg: "#E8F5EF" },
  { emoji: "🏠", label: "Run back home", color: "#E07B39", bg: "#FDF0E6" },
  { emoji: "🦁", label: "Ask the lion for help", color: "#7B5EA7", bg: "#EDE8F5" },
];

export function StoryChoice() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", background: "#FDF7ED", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Status bar */}
      <div style={{ height: 44, background: "#FDF7ED" }} />

      {/* Header */}
      <div style={{ padding: "0 20px 12px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 13, color: "#A0855B", fontWeight: 700, letterSpacing: 1 }}>THE BRAVE RABBIT</div>
        <div style={{ flex: 1, height: 6, background: "#EDD9B8", borderRadius: 99 }}>
          <div style={{ width: "60%", height: "100%", background: "#E07B39", borderRadius: 99 }} />
        </div>
        <div style={{ fontSize: 13, color: "#A0855B", fontWeight: 700 }}>60%</div>
      </div>

      {/* Story illustration */}
      <div style={{ margin: "0 20px", background: "#FFF4E0", borderRadius: 24, padding: "28px 20px", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 16 }}>🐰</div>
        <p style={{ fontSize: 16, color: "#4A3728", lineHeight: 1.6, margin: 0, fontWeight: 600 }}>
          "The little rabbit Mia reached the edge of the big, dark forest. Her heart went <em>thump thump thump</em>."
        </p>
      </div>

      {/* Divider label */}
      <div style={{ textAlign: "center", margin: "20px 0 12px", fontSize: 18, fontWeight: 800, color: "#2D2016" }}>
        🤔 What should Mia do?
      </div>
      <div style={{ textAlign: "center", fontSize: 13, color: "#A0855B", marginBottom: 16, fontWeight: 600 }}>
        Tap to choose — you decide the story!
      </div>

      {/* Choices */}
      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        {choices.map((c, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              background: selected === i ? c.color : c.bg,
              border: `2.5px solid ${selected === i ? c.color : "transparent"}`,
              borderRadius: 18, padding: "16px 20px",
              cursor: "pointer", transition: "all 0.18s ease",
              boxShadow: selected === i ? `0 4px 16px ${c.color}44` : "0 2px 8px rgba(0,0,0,0.06)",
              transform: selected === i ? "scale(1.02)" : "scale(1)",
            }}
          >
            <span style={{ fontSize: 32 }}>{c.emoji}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: selected === i ? "#fff" : "#2D2016", textAlign: "left" }}>{c.label}</span>
            {selected === i && <span style={{ marginLeft: "auto", fontSize: 20 }}>✅</span>}
          </button>
        ))}
      </div>

      {/* Continue button */}
      <div style={{ padding: "20px 20px 40px" }}>
        <button
          style={{
            width: "100%", padding: "16px", borderRadius: 18, border: "none",
            background: selected !== null ? "#E07B39" : "#EDD9B8",
            color: selected !== null ? "#fff" : "#A0855B",
            fontSize: 17, fontWeight: 800, cursor: selected !== null ? "pointer" : "default",
            boxShadow: selected !== null ? "0 4px 16px #E07B3944" : "none",
            transition: "all 0.2s",
          }}
        >
          {selected !== null ? "Continue the story →" : "Pick an option above"}
        </button>
      </div>
    </div>
  );
}
