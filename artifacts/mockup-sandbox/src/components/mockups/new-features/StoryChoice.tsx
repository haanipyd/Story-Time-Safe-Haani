import { useState } from "react";
import "./group.css";

type AnswerState = "idle" | "wrong" | "hinted" | "correct";

const options = [
  {
    id: "carrot",
    correct: true,
    emoji: "🥕",
    label: "Carrot",
    image: "linear-gradient(135deg, #FF8C42 0%, #FFB347 100%)",
    wrongMsg: null,
  },
  {
    id: "plastic",
    correct: false,
    emoji: "🧴",
    label: "Plastic",
    image: "linear-gradient(135deg, #74B9FF 0%, #A29BFE 100%)",
    wrongMsg: "Rabbits can't eat plastic!",
  },
  {
    id: "mud",
    correct: false,
    emoji: "🟫",
    label: "Mud",
    image: "linear-gradient(135deg, #A0522D 0%, #D2B48C 100%)",
    wrongMsg: "Yuck! Mud isn't food!",
  },
];

const storyText =
  "Hoppy the rabbit was very hungry after playing all morning. He looked down at the forest floor and saw three things in front of him…";

export function StoryChoice() {
  const [wrongTaps, setWrongTaps] = useState(0);
  const [lastWrong, setLastWrong] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [tappedId, setTappedId] = useState<string | null>(null);

  function handleTap(opt: typeof options[0]) {
    setTappedId(opt.id);
    if (opt.correct) {
      setAnswerState("correct");
    } else {
      const next = wrongTaps + 1;
      setWrongTaps(next);
      setLastWrong(opt.id);
      setAnswerState(next >= 2 ? "hinted" : "wrong");
      setTimeout(() => {
        setLastWrong(null);
        setTappedId(null);
      }, 1200);
    }
  }

  const showHint = answerState === "hinted";

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", background: "#FDF7ED", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 44 }} />

      {/* Progress bar */}
      <div style={{ padding: "0 20px 4px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#A0855B", letterSpacing: 0.5 }}>HOPPY'S ADVENTURE</div>
        <div style={{ flex: 1, height: 6, background: "#EDD9B8", borderRadius: 99 }}>
          <div style={{ width: "45%", height: "100%", background: "#E07B39", borderRadius: 99, transition: "width 0.5s" }} />
        </div>
      </div>

      {/* Story card */}
      <div style={{ margin: "10px 16px 0", background: "#FFF4E0", borderRadius: 24, padding: "20px 18px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
        {/* Scene illustration */}
        <div style={{ textAlign: "center", fontSize: 64, lineHeight: 1, marginBottom: 14 }}>🐰🌿</div>
        {/* Narrated text */}
        <p style={{ margin: 0, fontSize: 15, color: "#4A3728", lineHeight: 1.65, fontWeight: 600, textAlign: "center" }}>
          {storyText}
        </p>
        {/* Audio playing indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12 }}>
          <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 18 }}>
            {[0.5, 1, 0.7, 0.9, 0.4].map((h, i) => (
              <div key={i} className="audio-bar" style={{ width: 3, height: `${h * 18}px`, background: "#E07B39", borderRadius: 2, opacity: 0.7, animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <span style={{ fontSize: 11, color: "#A0855B", fontWeight: 700 }}>Listening…</span>
        </div>
      </div>

      {/* Question */}
      <div style={{ textAlign: "center", padding: "18px 20px 6px" }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: "#2D2016" }}>🤔 What should Hoppy eat?</div>
        <div style={{ fontSize: 13, color: "#A0855B", marginTop: 4, fontWeight: 600 }}>
          {answerState === "correct"
            ? "🎉 Yes! Carrots are perfect for rabbits!"
            : answerState === "hinted"
            ? "Hint: Look for the vegetable! 👀"
            : wrongTaps > 0
            ? "Hmm, that doesn't seem right! Try again 🤔"
            : "Tap the right answer to continue the story"}
        </div>
      </div>

      {/* Choice tiles */}
      <div style={{ display: "flex", gap: 12, padding: "8px 16px 0", flex: 1 }}>
        {options.map((opt) => {
          const isWrong = lastWrong === opt.id;
          const isCorrectAndDone = answerState === "correct" && opt.correct;
          const isHinted = showHint && opt.correct;

          return (
            <button
              key={opt.id}
              onClick={() => answerState !== "correct" && handleTap(opt)}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                background: isCorrectAndDone ? "#E8F5EF" : "#fff",
                border: `3px solid ${isCorrectAndDone ? "#3D9970" : isWrong ? "#E05252" : isHinted ? "#F9C74F" : "#EDD9B8"}`,
                borderRadius: 22, padding: "18px 8px 14px",
                cursor: answerState === "correct" ? "default" : "pointer",
                boxShadow: isHinted
                  ? "0 0 0 4px rgba(249,199,79,0.35)"
                  : isCorrectAndDone
                  ? "0 4px 16px rgba(61,153,112,0.3)"
                  : "0 2px 8px rgba(0,0,0,0.06)",
                transform: isWrong ? "scale(0.94)" : isCorrectAndDone ? "scale(1.04)" : "scale(1)",
                transition: "all 0.22s ease",
                animation: isHinted ? "hint-pulse 1s ease-in-out infinite" : "none",
              }}
            >
              {/* Image area */}
              <div style={{
                width: 72, height: 72, borderRadius: 18,
                background: opt.image,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 40, marginBottom: 10,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                filter: isWrong ? "grayscale(0.5)" : "none",
                transition: "filter 0.2s",
              }}>
                {opt.emoji}
              </div>

              {/* Label */}
              <div style={{ fontSize: 14, fontWeight: 800, color: isCorrectAndDone ? "#3D9970" : isWrong ? "#E05252" : "#2D2016", textAlign: "center" }}>
                {opt.label}
              </div>

              {/* State overlay */}
              {isWrong && <div style={{ fontSize: 18, marginTop: 4 }}>❌</div>}
              {isCorrectAndDone && <div style={{ fontSize: 18, marginTop: 4 }}>✅</div>}
            </button>
          );
        })}
      </div>

      {/* Continue / feedback */}
      <div style={{ padding: "16px 16px 40px" }}>
        {answerState === "correct" ? (
          <button style={{
            width: "100%", padding: "15px", borderRadius: 18, border: "none",
            background: "#3D9970", color: "#fff", fontSize: 16, fontWeight: 800,
            boxShadow: "0 4px 16px rgba(61,153,112,0.4)", cursor: "pointer",
          }}>
            Continue the story →
          </button>
        ) : (
          <div style={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#FFF4E0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🔊</div>
            <span style={{ fontSize: 13, color: "#A0855B", fontWeight: 700 }}>Tap an option — Hoppy is waiting!</span>
          </div>
        )}
      </div>
    </div>
  );
}
