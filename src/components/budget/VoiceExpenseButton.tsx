import { useRef, useState } from "react";

export type VoiceExpensePrefill = {
  name?: string;
  amount?: number;
  date?: string;
  paymentMethod?: string | null;
  categoryHint?: string | null;
  notes?: string | null;
};

type Props = {
  onExtracted: (prefill: VoiceExpensePrefill) => void;
};

// Minimal types for Web Speech API — not in lib.dom for non-Chromium browsers.
type WebSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type Stage = "idle" | "listening" | "parsing" | "error";

export function VoiceExpenseButton({ onExtracted }: Props) {
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [heardText, setHeardText] = useState<string | null>(null);
  const recRef = useRef<WebSpeechRecognition | null>(null);

  const parseTranscript = async (transcript: string) => {
    setStage("parsing");
    setHeardText(transcript);
    try {
      const response = await fetch("/api/parse-expense-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStage("error");
        setErrorMsg(typeof body.error === "string" ? body.error : `שגיאה ${response.status}`);
        return;
      }
      const extracted = body.extracted as VoiceExpensePrefill | undefined;
      if (!extracted) {
        setStage("error");
        setErrorMsg("השרת לא החזיר נתונים חוקיים");
        return;
      }
      setStage("idle");
      setErrorMsg(null);
      setHeardText(null);
      onExtracted(extracted);
    } catch (err) {
      setStage("error");
      setErrorMsg(err instanceof Error ? err.message : "שגיאה לא ידועה");
    }
  };

  const start = () => {
    const w = window as unknown as {
      SpeechRecognition?: new () => WebSpeechRecognition;
      webkitSpeechRecognition?: new () => WebSpeechRecognition;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setStage("error");
      setErrorMsg("הדפדפן לא תומך בהקלטה קולית. נסה ב-Chrome או Safari.");
      return;
    }

    const rec = new SR();
    rec.lang = "he-IL";
    rec.interimResults = false;
    rec.continuous = false;

    rec.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      if (transcript.trim()) parseTranscript(transcript);
      else {
        setStage("error");
        setErrorMsg("לא נקלט אף דיבור. נסה שוב בסביבה שקטה.");
      }
    };
    rec.onerror = (e) => {
      setStage("error");
      const code = e.error || "unknown";
      setErrorMsg(
        code === "not-allowed"
          ? "גישה למיקרופון נדחתה. אפשר הרשאה בדפדפן ונסה שוב."
          : code === "no-speech"
            ? "לא זוהה דיבור. נסה שוב וקרוב יותר למיקרופון."
            : `שגיאת הקלטה: ${code}`,
      );
    };
    rec.onend = () => {
      // If we're still "listening" when onend fires (no result), move to idle.
      setStage((s) => (s === "listening" ? "idle" : s));
    };

    recRef.current = rec;
    setErrorMsg(null);
    setHeardText(null);
    setStage("listening");
    rec.start();
  };

  const stop = () => {
    recRef.current?.stop();
    setStage("idle");
  };

  const toggle = () => {
    if (stage === "listening") stop();
    else if (stage !== "parsing") start();
  };

  const busy = stage === "listening" || stage === "parsing";
  const label =
    stage === "listening" ? "מקשיב..." :
    stage === "parsing" ? "מעבד..." :
    "אמור הוצאה";

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={stage === "parsing"}
        aria-label="הוסף הוצאה בקול"
        title="אמור משפט כמו: 'הוצאתי 50 שקל על קפה ברמזור'"
        style={{
          padding: "6px 12px",
          borderRadius: 10,
          background: stage === "listening" ? "rgba(52,211,153,0.20)" : "rgba(96,165,250,0.14)",
          border: `1px solid ${stage === "listening" ? "rgba(52,211,153,0.40)" : "rgba(96,165,250,0.30)"}`,
          color: stage === "listening" ? "#34D399" : "#60A5FA",
          fontSize: 12,
          fontWeight: 600,
          cursor: stage === "parsing" ? "default" : "pointer",
          fontFamily: "inherit",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          opacity: stage === "parsing" ? 0.7 : 1,
        }}
      >
        {stage === "listening" ? (
          <span className="voice-pulse" aria-hidden />
        ) : stage === "parsing" ? (
          <span className="voice-spinner" aria-hidden />
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}
        {label}
      </button>

      {heardText && stage === "parsing" && (
        <div
          style={{
            width: "100%",
            marginTop: 6,
            padding: "6px 12px",
            background: "rgba(96,165,250,0.08)",
            border: "1px solid rgba(96,165,250,0.24)",
            borderRadius: 8,
            color: "#60A5FA",
            fontSize: 11,
            fontStyle: "italic",
          }}
        >
          📢 "{heardText}"
        </div>
      )}

      {errorMsg && stage === "error" && (
        <div
          role="alert"
          style={{
            width: "100%",
            marginTop: 6,
            padding: "8px 12px",
            background: "rgba(251,113,133,0.08)",
            border: "1px solid rgba(251,113,133,0.28)",
            borderRadius: 8,
            color: "#FB7185",
            fontSize: 11,
            lineHeight: 1.4,
          }}
        >
          ⚠️ {errorMsg}
        </div>
      )}

      <style>{`
        .voice-pulse {
          width: 12px; height: 12px;
          border-radius: 999px;
          background: #34D399;
          animation: voice-pulse 900ms ease-in-out infinite;
        }
        .voice-spinner {
          width: 12px; height: 12px;
          border: 2px solid rgba(96,165,250,0.3);
          border-top-color: #60A5FA;
          border-radius: 999px;
          animation: voice-spin 700ms linear infinite;
        }
        @keyframes voice-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(52,211,153,0.6); }
          50% { transform: scale(1.2); box-shadow: 0 0 0 6px rgba(52,211,153,0); }
        }
        @keyframes voice-spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
