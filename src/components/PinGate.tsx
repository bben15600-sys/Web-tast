import { useEffect, useRef, useState } from "react";
import { usePin } from "@/hooks/usePin";

const PIN_LENGTH = 4;

export function PinGate({ children }: { children: React.ReactNode }) {
  const { state, setPin, tryUnlock, reset } = usePin();

  if (state.status === "loading") {
    return (
      <div style={fullscreenStyle}>
        <div className="holo-logo" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (state.status === "unlocked") {
    return <>{children}</>;
  }

  return (
    <PinScreen
      mode={state.status}
      onSubmit={async (pin) => (state.status === "setup" ? (setPin(pin), true) : tryUnlock(pin))}
      onReset={reset}
    />
  );
}

function PinScreen({
  mode,
  onSubmit,
  onReset,
}: {
  mode: "setup" | "locked";
  onSubmit: (pin: string) => Promise<boolean> | boolean | void;
  onReset: () => void;
}) {
  const [pin, setPinInput] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [stage, setStage] = useState<"enter" | "confirm">("enter");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [stage]);

  useEffect(() => {
    setError(null);
  }, [pin, confirmPin]);

  const handleDigit = async (digit: string) => {
    if (busy) return;
    const current = stage === "enter" ? pin : confirmPin;
    if (current.length >= PIN_LENGTH) return;
    const next = current + digit;
    if (stage === "enter") setPinInput(next);
    else setConfirmPin(next);

    if (next.length === PIN_LENGTH) {
      if (mode === "setup") {
        if (stage === "enter") {
          setStage("confirm");
        } else {
          if (next !== pin) {
            setError("הקודים לא תואמים — נסה שוב");
            setPinInput("");
            setConfirmPin("");
            setStage("enter");
            return;
          }
          setBusy(true);
          try {
            await onSubmit(next);
          } finally {
            setBusy(false);
          }
        }
      } else {
        setBusy(true);
        try {
          const ok = await onSubmit(next);
          if (!ok) {
            setError("קוד שגוי");
            setPinInput("");
          }
        } finally {
          setBusy(false);
        }
      }
    }
  };

  const handleBackspace = () => {
    if (stage === "enter") setPinInput((p) => p.slice(0, -1));
    else setConfirmPin((p) => p.slice(0, -1));
  };

  const displayed = stage === "enter" ? pin : confirmPin;

  const title = mode === "setup"
    ? stage === "enter" ? "בחר קוד PIN" : "הזן שוב לאישור"
    : "הזן קוד PIN";
  const subtitle = mode === "setup"
    ? stage === "enter"
      ? "4 ספרות — ישמש לנעילת האפליקציה"
      : "שחזור הקוד דורש איפוס מלא"
    : "האפליקציה ננעלה לאחר חוסר פעילות";

  return (
    <div style={fullscreenStyle}>
      <div
        className="glass"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          padding: "32px 28px",
          width: "min(360px, 90vw)",
        }}
      >
        <div className="holo-logo" style={{ width: 44, height: 44 }} />
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#F5F6FF", marginBottom: 4 }}>
            {title}
          </h1>
          <p style={{ fontSize: 12, color: "#6B7094" }}>{subtitle}</p>
        </div>

        <div className="flex items-center gap-3" style={{ direction: "ltr" }}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                background: displayed.length > i ? "#A78BFA" : "rgba(255,255,255,0.10)",
                boxShadow: displayed.length > i ? "0 0 8px rgba(167,139,250,0.6)" : undefined,
                transition: "background 180ms",
              }}
            />
          ))}
        </div>

        {error && (
          <div style={{ fontSize: 12, color: "#FB7185" }}>{error}</div>
        )}

        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: "repeat(3, 64px)",
            direction: "ltr",
          }}
        >
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <KeypadButton key={d} onClick={() => handleDigit(d)} disabled={busy}>
              {d}
            </KeypadButton>
          ))}
          <div />
          <KeypadButton onClick={() => handleDigit("0")} disabled={busy}>0</KeypadButton>
          <KeypadButton onClick={handleBackspace} disabled={busy} aria-label="מחק">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z" />
              <line x1="18" y1="9" x2="12" y2="15" />
              <line x1="12" y1="9" x2="18" y2="15" />
            </svg>
          </KeypadButton>
        </div>

        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          autoFocus
          value=""
          onChange={() => {}}
          onKeyDown={(e) => {
            if (/^[0-9]$/.test(e.key)) handleDigit(e.key);
            else if (e.key === "Backspace") handleBackspace();
          }}
          style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0 }}
          aria-hidden
        />

        {mode === "locked" && (
          <button
            type="button"
            onClick={() => {
              if (confirm("לאפס את קוד ה-PIN? זה לא משפיע על נתונים ב-Notion.")) onReset();
            }}
            style={{
              marginTop: 4,
              padding: "6px 12px",
              fontSize: 11,
              color: "#6B7094",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            איפוס קוד
          </button>
        )}
      </div>
    </div>
  );
}

function KeypadButton({
  children,
  onClick,
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 64,
        height: 56,
        borderRadius: 14,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "#F5F6FF",
        fontSize: 22,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontWeight: 500,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 120ms",
      }}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "rgba(167,139,250,0.18)";
      }}
      onPointerUp={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
      }}
      onPointerLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

const fullscreenStyle: React.CSSProperties = {
  minHeight: "100dvh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};
