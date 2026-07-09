import { useState } from "react";
import "./group.css";

type State = "idle" | "recording" | "done";

export function VoiceRetell() {
  const [recordState, setRecordState] = useState<State>("idle");

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", background: "#FDF7ED", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 44 }} />

      {/* Header */}
      <div style={{ textAlign: "center", padding: "12px 24px 0" }}>
        <div style={{ display: "inline-block", background: "#FFF4E0", borderRadius: 99, padding: "6px 16px", fontSize: 13, fontWeight: 700, color: "#A0855B", marginBottom: 8 }}>
          🎉 Story finished!
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#2D2016", margin: "8px 0 4px", lineHeight: 1.2 }}>
          Now it's YOUR turn!
        </h1>
        <p style={{ fontSize: 15, color: "#7A6050", margin: 0, lineHeight: 1.5 }}>
          Can you tell me what happened<br />in the story?
        </p>
      </div>

      {/* Character */}
      <div style={{ textAlign: "center", padding: "24px 0 8px", fontSize: 80 }}>🦉</div>

      {/* Speech bubble */}
      <div style={{ margin: "0 28px", background: "#FFF4E0", borderRadius: 20, padding: "16px 20px", textAlign: "center", position: "relative", boxShadow: "0 2px 10px rgba(0,0,0,0.07)" }}>
        <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", width: 20, height: 10, background: "#FFF4E0", clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)", filter: "drop-shadow(0 -2px 2px rgba(0,0,0,0.04))" }} />
        <p style={{ margin: 0, fontSize: 15, color: "#4A3728", fontWeight: 600, lineHeight: 1.5 }}>
          {recordState === "idle" && "\"Who did the rabbit meet in the forest? What happened at the end?\""}
          {recordState === "recording" && "\"I'm listening! Tell me everything...\" 👂"}
          {recordState === "done" && "\"Wonderful! You're a great storyteller!\" 🌟"}
        </p>
      </div>

      {/* Recording button */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {recordState === "recording" && (
            <>
              <div className="pulse-ring" style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", background: "#FF6B4720", animation: "pulse 1.2s ease-out infinite" }} />
              <div className="pulse-ring" style={{ position: "absolute", width: 100, height: 100, borderRadius: "50%", background: "#FF6B4730", animation: "pulse 1.2s ease-out infinite 0.3s" }} />
            </>
          )}
          <button
            onMouseDown={() => setRecordState("recording")}
            onMouseUp={() => setRecordState("done")}
            onTouchStart={() => setRecordState("recording")}
            onTouchEnd={() => setRecordState("done")}
            style={{
              width: 84, height: 84, borderRadius: "50%", border: "none",
              background: recordState === "recording" ? "#FF6B47" : recordState === "done" ? "#3D9970" : "#E07B39",
              fontSize: 36, cursor: "pointer",
              boxShadow: `0 6px 24px ${recordState === "recording" ? "#FF6B4760" : "#E07B3944"}`,
              transition: "all 0.2s", transform: recordState === "recording" ? "scale(1.1)" : "scale(1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {recordState === "done" ? "✅" : "🎙️"}
          </button>
        </div>
        <p style={{ fontSize: 14, color: "#A0855B", fontWeight: 700, margin: 0, textAlign: "center" }}>
          {recordState === "idle" && "Press & hold to record"}
          {recordState === "recording" && "Recording... let go when done"}
          {recordState === "done" && "Recording saved!"}
        </p>
      </div>

      {/* Parent note */}
      <div style={{ margin: "0 20px 40px", background: "#EDF7F0", borderRadius: 16, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 24 }}>🎧</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#2D6A4F", marginBottom: 2 }}>For parents</div>
          <div style={{ fontSize: 12, color: "#52796F", lineHeight: 1.4 }}>Listen to your child's recording anytime from the Parent Dashboard</div>
        </div>
      </div>
    </div>
  );
}
