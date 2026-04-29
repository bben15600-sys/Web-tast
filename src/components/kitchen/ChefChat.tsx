import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useKitchenTimers } from "@/hooks/useKitchenTimers";

type Msg = { role: "user" | "ai"; text: string };

const STORAGE_KEY = "oslife.kitchen.chef.v1";

const SUGGESTIONS = [
  "איך מכינים שניצל ל-40 איש?",
  "אין לי ביצים, מה אפשר להחליף בעוגת גזר?",
  "תן לי תפריט שבת ל-10 אורחים",
  "באיזו טמפרטורה אופים חלה?",
  "בישלתי יותר מדי אורז — מה לעשות איתו?",
];

export function ChefChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { add: addTimer } = useKitchenTimers();

  // Load persisted chat.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Msg[];
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch { /* noop */ }
  }, []);

  // Persist on every change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch { /* storage full / disabled */ }
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = async (text?: string) => {
    const userText = (text ?? input).trim();
    if (!userText || typing) return;
    setInput("");
    const newHistory: Msg[] = [...messages, { role: "user", text: userText }];
    setMessages(newHistory);
    setTyping(true);

    const apiMessages = newHistory.map((m) => ({
      role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
      content: m.text,
    }));

    const controller = new AbortController();
    abortRef.current = controller;

    let accumulated = "";
    let aiIndex = -1;

    try {
      const response = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          model: "claude-sonnet-4-6",
          mode: "chef",
        }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const raw = await response.text().catch(() => "");
        let detail = raw;
        try {
          const parsed = JSON.parse(raw) as { error?: string };
          detail = parsed.error ?? raw;
        } catch { /* keep raw */ }
        throw new Error(detail);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const obj = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
            const chunk = obj.choices?.[0]?.delta?.content;
            if (chunk) {
              accumulated += chunk;
              setMessages((prev) => {
                const next = [...prev];
                if (aiIndex === -1) {
                  aiIndex = next.length;
                  next.push({ role: "ai", text: accumulated });
                } else {
                  next[aiIndex] = { role: "ai", text: accumulated };
                }
                return next;
              });
            }
          } catch { /* ignore malformed chunk */ }
        }
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : "שגיאה לא ידועה";
      setMessages((prev) => [...prev, { role: "ai", text: `⚠️ ${detail}` }]);
    } finally {
      setTyping(false);
      abortRef.current = null;
    }
  };

  const clearChat = () => {
    if (messages.length === 0) return;
    if (!confirm("למחוק את כל ההודעות?")) return;
    setMessages([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
  };

  return (
    <section className="glass" style={{ ["--i" as string]: 1, padding: 0, display: "flex", flexDirection: "column", minHeight: "60dvh" } as React.CSSProperties}>
      <div
        className="card-header"
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--oslife-border)",
          margin: 0,
        }}
      >
        <div className="flex items-center gap-2">
          <span className="kitchen-chef-avatar" aria-hidden>👨‍🍳</span>
          <div className="flex flex-col">
            <h2 className="card-title">שף AI</h2>
            <span style={{ fontSize: 11, color: "var(--oslife-text-mute)" }}>
              Claude Sonnet 4.6 · מתמחה במטבח ישראלי וכמויות גדולות
            </span>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            style={{
              padding: "4px 10px",
              fontSize: 11,
              color: "var(--oslife-text-mute)",
              background: "transparent",
              border: "1px solid var(--oslife-chip-border)",
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            נקה
          </button>
        )}
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center text-center" style={{ padding: "24px 0", gap: 16 }}>
            <span style={{ fontSize: 44 }}>👨‍🍳</span>
            <p style={{ fontSize: 14, color: "var(--oslife-text-mid)", maxWidth: 420, lineHeight: 1.5 }}>
              תשאל על טכניקות, תחליפי חומרים, תזמון בצקים, כמויות לצבא — כל מה שצריך במטבח.
            </p>
            <div className="flex items-center gap-2" style={{ flexWrap: "wrap", justifyContent: "center" }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    background: "rgba(201,100,66,0.10)",
                    border: "1px solid rgba(201,100,66,0.24)",
                    color: "#E89A7D",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`chat-msg chat-msg-${m.role}`}
            style={{ alignSelf: m.role === "user" ? "flex-end" : "stretch", maxWidth: m.role === "user" ? "min(600px, 85%)" : "100%" }}
          >
            <div
              className="chat-bubble"
              style={m.role === "user"
                ? {
                    padding: "11px 16px",
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderEndEndRadius: 6,
                    fontSize: 14.5,
                    lineHeight: 1.55,
                  }
                : {
                    padding: 0,
                    background: "transparent",
                    border: "none",
                    fontFamily: "'Frank Ruhl Libre', 'Fraunces', Georgia, serif",
                    fontSize: 16,
                    lineHeight: 1.75,
                  }
              }
            >
              {m.role === "ai" ? (
                <ReactMarkdown
                  components={{
                    // Auto-detect "X דקות" in text and add a "התחל טיימר" button after it.
                    p: ({ children, ...props }) => <InlineTimerParagraph {...props} addTimer={addTimer}>{children}</InlineTimerParagraph>,
                  }}
                >
                  {m.text}
                </ReactMarkdown>
              ) : (
                m.text.split("\n").map((line, j) => <p key={j} style={{ margin: 0 }}>{line || " "}</p>)
              )}
            </div>
          </div>
        ))}
        {typing && (
          <div className="chat-msg chat-msg-ai" style={{ alignSelf: "stretch" }}>
            <div className="chat-typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div
        style={{
          padding: "12px 16px calc(16px + env(safe-area-inset-bottom))",
          borderTop: "1px solid var(--oslife-border)",
          display: "flex",
          gap: 8,
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder={typing ? "השף כותב…" : "שאל את השף…"}
          disabled={typing}
          style={{
            flex: 1,
            padding: "12px 16px",
            background: "var(--oslife-chip)",
            border: "1px solid var(--oslife-chip-border)",
            borderRadius: 18,
            color: "var(--oslife-text-strong)",
            fontSize: 14.5,
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        <button
          type="button"
          onClick={() => send()}
          disabled={!input.trim() || typing}
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            background: "#C96442",
            color: "white",
            border: "none",
            cursor: (!input.trim() || typing) ? "default" : "pointer",
            opacity: (!input.trim() || typing) ? 0.5 : 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          aria-label="שלח"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </section>
  );
}

/**
 * Renders a paragraph and, when it mentions a duration like "5 דקות" or "45 שניות",
 * tacks on an inline ⏲️ button that pushes a timer into the shared store.
 */
function InlineTimerParagraph({
  children,
  addTimer,
  ...rest
}: {
  children?: React.ReactNode;
  addTimer: (label: string, sec: number) => string;
} & React.HTMLAttributes<HTMLParagraphElement>) {
  const text = extractText(children);
  const match = text.match(/(\d+(?:\.\d+)?)\s*(דקות?|דק׳|שניות?|שעות?|שעה)/);
  const suggested = match ? parseDuration(Number(match[1]), match[2]) : null;

  return (
    <p {...rest}>
      {children}
      {suggested != null && (
        <button
          type="button"
          onClick={() => addTimer(text.slice(0, 40), suggested)}
          style={{
            marginInlineStart: 8,
            padding: "2px 10px",
            borderRadius: 999,
            background: "rgba(201,100,66,0.14)",
            border: "1px solid rgba(201,100,66,0.30)",
            color: "#C96442",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            verticalAlign: "middle",
          }}
          title={`התחל טיימר ל-${match?.[0]}`}
        >
          ⏲️ טיימר
        </button>
      )}
    </p>
  );
}

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return extractText((node as { props: { children?: React.ReactNode } }).props.children);
  }
  return "";
}

function parseDuration(num: number, unit: string): number | null {
  if (!Number.isFinite(num) || num <= 0) return null;
  if (unit.includes("שני")) return Math.round(num);
  if (unit.includes("שעה") || unit.includes("שעות")) return Math.round(num * 3600);
  return Math.round(num * 60); // default: minutes
}
