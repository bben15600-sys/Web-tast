import { useRef, useState } from "react";

export type ReceiptPrefill = {
  name?: string;
  amount?: number;
  date?: string;
  paymentMethod?: string | null;
  categoryHint?: string | null;
  notes?: string | null;
  confidence?: number;
};

type Props = {
  onExtracted: (prefill: ReceiptPrefill) => void;
};

/**
 * Camera/file-picker button that sends the selected image to
 * /api/extract-receipt (Claude Vision) and hands the parsed fields
 * back via onExtracted. Parent decides what to do with the data
 * (usually: open TransactionFormModal with `prefill={...}`).
 */
export function ReceiptCaptureButton({ onExtracted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const readAsBase64 = (file: File): Promise<{ data: string; mimeType: string }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("FileReader returned non-string result"));
          return;
        }
        // result is "data:image/jpeg;base64,AAAAA..." — strip the prefix.
        const commaIdx = result.indexOf(",");
        if (commaIdx < 0) {
          reject(new Error("Invalid data URL"));
          return;
        }
        const data = result.slice(commaIdx + 1);
        const mimeMatch = result.slice(0, commaIdx).match(/data:([^;]+)/);
        resolve({ data, mimeType: mimeMatch?.[1] ?? file.type ?? "image/jpeg" });
      };
      reader.onerror = () => reject(reader.error ?? new Error("FileReader error"));
      reader.readAsDataURL(file);
    });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setStatus("loading");
    setErrorMsg(null);

    try {
      const { data, mimeType } = await readAsBase64(file);
      const response = await fetch("/api/extract-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: data, mimeType }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus("error");
        setErrorMsg(typeof body.error === "string" ? body.error : `שגיאה ${response.status}`);
        return;
      }
      const extracted = body.extracted as ReceiptPrefill | undefined;
      if (!extracted) {
        setStatus("error");
        setErrorMsg("השרת לא החזיר נתונים חוקיים");
        return;
      }
      setStatus("idle");
      onExtracted(extracted);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "שגיאה לא ידועה");
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleFile}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={status === "loading"}
        aria-label="צלם קבלה"
        title="צלם קבלה — Claude יחלץ את הפרטים"
        style={{
          padding: "6px 12px",
          borderRadius: 10,
          background: status === "loading"
            ? "rgba(201,100,66,0.10)"
            : "rgba(201,100,66,0.14)",
          border: "1px solid rgba(201,100,66,0.30)",
          color: "#C96442",
          fontSize: 12,
          fontWeight: 600,
          cursor: status === "loading" ? "default" : "pointer",
          fontFamily: "inherit",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          opacity: status === "loading" ? 0.7 : 1,
        }}
      >
        {status === "loading" ? (
          <>
            <span className="receipt-spinner" aria-hidden />
            מחלץ...
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            צלם קבלה
          </>
        )}
      </button>
      {errorMsg && status === "error" && (
        <div
          role="alert"
          style={{
            marginTop: 8,
            padding: "8px 12px",
            background: "rgba(251,113,133,0.08)",
            border: "1px solid rgba(251,113,133,0.28)",
            borderRadius: 8,
            color: "#FB7185",
            fontSize: 12,
            lineHeight: 1.5,
            width: "100%",
            flexBasis: "100%",
          }}
        >
          ⚠️ {errorMsg}
        </div>
      )}
      <style>{`
        .receipt-spinner {
          width: 12px; height: 12px;
          border: 2px solid rgba(201,100,66,0.3);
          border-top-color: #C96442;
          border-radius: 999px;
          display: inline-block;
          animation: receipt-spin 720ms linear infinite;
        }
        @keyframes receipt-spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
