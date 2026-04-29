import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import AppShell from "@/components/dashboard/AppShell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useBudgetData } from "@/hooks/useBudgetData";
import { buildBudgetChatContext } from "@/lib/chatContext";

interface SpeechRecognitionAlternative { transcript: string }
interface SpeechRecognitionResult { 0: SpeechRecognitionAlternative }
interface SpeechRecognitionResultList { [index: number]: SpeechRecognitionResult }
interface SpeechRecognitionEvent { results: SpeechRecognitionResultList }
interface SpeechRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (e: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
}

type ChatMode = "general" | "code";
type Msg = { role: "user" | "ai"; text: string; model?: string };
type Session = {
  id: string;
  title: string;
  mode: ChatMode;
  messages: Msg[];
  createdAt: number;
};

type PersistedState = {
  sessions: Session[];
  activeId: string | null;
  activeTab: ChatMode;
};

type ModelGroup = "חינם" | "זול" | "פרימיום" | "טופ" | "אוטומטי" | "Claude";
type ChatMode = "general" | "code" | "claude";
type ModelEntry = {
  id: string;
  label: string;
  tier: string;
  group: ModelGroup;
  modes: ChatMode[];
  /** If set, frontend posts to this endpoint instead of /api/chat. */
  endpoint?: "claude";
};
const MODELS: ModelEntry[] = [
  // Direct Anthropic — only shown in the Claude tab
  { id: "claude-opus-4-7",    label: "Opus 4.7",    tier: "הכי חכם · 1M context",        group: "Claude", modes: ["claude"], endpoint: "claude" },
  { id: "claude-opus-4-6",    label: "Opus 4.6",    tier: "1M context · 128K output",    group: "Claude", modes: ["claude"], endpoint: "claude" },
  { id: "claude-sonnet-4-6",  label: "Sonnet 4.6",  tier: "מאוזן · 1M context",          group: "Claude", modes: ["claude"], endpoint: "claude" },
  { id: "claude-haiku-4-5",   label: "Haiku 4.5",   tier: "מהיר · $1/1M input",           group: "Claude", modes: ["claude"], endpoint: "claude" },
  { id: "claude-opus-4-5",    label: "Opus 4.5",    tier: "דור קודם · יציב",             group: "Claude", modes: ["claude"], endpoint: "claude" },
  { id: "claude-sonnet-4-5",  label: "Sonnet 4.5",  tier: "דור קודם",                     group: "Claude", modes: ["claude"], endpoint: "claude" },
  // Smart routing — shows everywhere
  { id: "auto",                 label: "אוטומטי",              tier: "OpenRouter ניתוב",     group: "אוטומטי",  modes: ["general", "code"] },
  // Free tier
  { id: "qwen3-coder-free",     label: "Qwen3 Coder 480B",     tier: "חינם · לקוד",          group: "חינם",     modes: ["code"] },
  { id: "deepseek-r1-free",     label: "DeepSeek R1",           tier: "חינם · reasoning",     group: "חינם",     modes: ["general", "code"] },
  { id: "gemini-free",          label: "Gemini 2.0 Flash",      tier: "חינם · מהיר",          group: "חינם",     modes: ["general"] },
  { id: "gemini-thinking-free", label: "Gemini 2.0 Thinking",   tier: "חינם · חושב",           group: "חינם",     modes: ["general", "code"] },
  { id: "llama-free",           label: "Llama 3.3 70B",         tier: "חינם · גדול",          group: "חינם",     modes: ["general"] },
  // Cheap paid
  { id: "haiku",                label: "Claude Haiku 4.5",      tier: "זול · עברית מצוינת",    group: "זול",      modes: ["general", "code"] },
  { id: "gemini-flash",         label: "Gemini 2.5 Flash",      tier: "זול · מהיר",           group: "זול",      modes: ["general", "code"] },
  { id: "gpt-5-mini",           label: "GPT-5 Mini",            tier: "זול · מדויק",          group: "זול",      modes: ["general", "code"] },
  { id: "gpt-4o-mini",          label: "GPT-4o Mini",           tier: "זול · קלאסי",          group: "זול",      modes: ["general"] },
  // Premium
  { id: "sonnet",               label: "Claude Sonnet 4.5",     tier: "פרימיום · קוד+כתיבה",   group: "פרימיום",  modes: ["general", "code"] },
  { id: "gpt-5",                label: "GPT-5",                 tier: "פרימיום · כללי",        group: "פרימיום",  modes: ["general", "code"] },
  { id: "gemini-pro",           label: "Gemini 2.5 Pro",        tier: "פרימיום · ארוך-הקשר",   group: "פרימיום",  modes: ["general", "code"] },
  { id: "gpt-4o",               label: "GPT-4o",                tier: "פרימיום · מולטימודל",   group: "פרימיום",  modes: ["general"] },
  // Top tier
  { id: "opus",                 label: "Claude Opus 4.5",       tier: "טופ · הכי חכם",         group: "טופ",      modes: ["general", "code"] },
];
const MODEL_GROUP_ORDER: ModelGroup[] = ["Claude", "אוטומטי", "חינם", "זול", "פרימיום", "טופ"];

const QUICK_GENERAL = ["מה יש לי היום?", "מצב תקציב", "תסכם את השבוע", "מה עשיתי בחודש האחרון?"];
const QUICK_CODE    = ["תעזור לי עם bug ב-Next.js", "תכתוב קומפוננטה של טבלה", "תסביר useMemo מול useCallback"];

// v2 stores { sessions, activeId, activeTab }; v1 stored just the sessions array.
const STATE_KEY = "oslife.chat.state.v2";
const LEGACY_SESSIONS_KEY = "oslife.chat.sessions.v1";

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function initialSession(mode: ChatMode = "general"): Session {
  return {
    id: newId(),
    title: mode === "code" ? "שיחת קוד חדשה" : mode === "claude" ? "שיחה עם Claude" : "שיחה חדשה",
    mode,
    messages: [],
    createdAt: Date.now(),
  };
}

function loadPersistedState(): PersistedState | null {
  try {
    const v2 = localStorage.getItem(STATE_KEY);
    if (v2) {
      const parsed = JSON.parse(v2) as Partial<PersistedState>;
      if (Array.isArray(parsed?.sessions)) {
        return {
          sessions: parsed.sessions as Session[],
          activeId: typeof parsed.activeId === "string" ? parsed.activeId : null,
          activeTab: parsed.activeTab === "code" ? "code" : "general",
        };
      }
    }
    const legacy = localStorage.getItem(LEGACY_SESSIONS_KEY);
    if (legacy) {
      const sessions = JSON.parse(legacy) as Session[];
      if (Array.isArray(sessions) && sessions.length > 0) {
        return {
          sessions,
          activeId: sessions[0].id,
          activeTab: sessions[0].mode === "code" ? "code" : "general",
        };
      }
    }
  } catch {
    /* no-op */
  }
  return null;
}

const Chat = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ChatMode>("general");
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [model, setModel] = useState("auto");
  const [modelOpen, setModelOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const closeSidebar = () => setSidebarOpen(false);

  // Pull the user's current-month budget so general-mode questions like
  // "כמה הוצאתי על בילויים?" can be answered from real data. Opt-in —
  // the hook is always called (React rules) but passes enabled:false on
  // the code tab so no network requests fire there.
  const budgetQuery = useBudgetData({ enabled: activeTab === "general" });
  const prevBudgetQuery = useBudgetData({ enabled: activeTab === "general" && !!budgetQuery.data, monthOffset: -1 });
  const contextEnabled = activeTab === "general" && !!budgetQuery.data;
  const contextHasError = activeTab === "general" && !!budgetQuery.error;
  const budgetContext = useMemo(
    () =>
      contextEnabled && budgetQuery.data
        ? buildBudgetChatContext(budgetQuery.data, prevBudgetQuery.data ?? null)
        : null,
    [contextEnabled, budgetQuery.data, prevBudgetQuery.data],
  );

  // Load sessions + last active tab / session from localStorage on mount.
  useEffect(() => {
    const persisted = loadPersistedState();
    if (persisted) {
      setSessions(persisted.sessions);
      setActiveTab(persisted.activeTab);
      const tabSessions = persisted.sessions.filter((s) => s.mode === persisted.activeTab);
      const fallback = tabSessions[0] ?? persisted.sessions[0];
      const wanted = persisted.activeId
        ? persisted.sessions.find((s) => s.id === persisted.activeId)
        : undefined;
      setActiveId((wanted ?? fallback)?.id ?? "");
    } else {
      const first = initialSession("general");
      setSessions([first]);
      setActiveId(first.id);
    }
    setHydrated(true);
  }, []);

  // Persist sessions + active pointers on every change.
  useEffect(() => {
    if (!hydrated) return;
    try {
      const state: PersistedState = {
        sessions,
        activeId: activeId || null,
        activeTab,
      };
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch {
      /* no-op */
    }
  }, [hydrated, sessions, activeId, activeTab]);

  const visibleSessions = useMemo(
    () => sessions.filter((s) => s.mode === activeTab),
    [sessions, activeTab],
  );
  const active = useMemo(() => sessions.find((s) => s.id === activeId), [sessions, activeId]);
  const [sidebarQuery, setSidebarQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  // When switching tabs, re-point the active session if the current one belongs
  // to the other tab (creating a fresh session only if the tab is empty).
  useEffect(() => {
    if (!hydrated) return;
    if (active && active.mode === activeTab) return;
    const next = visibleSessions[0];
    if (next) {
      setActiveId(next.id);
    } else {
      const fresh = initialSession(activeTab);
      setSessions((arr) => [fresh, ...arr]);
      setActiveId(fresh.id);
    }
  }, [activeTab, hydrated, active, visibleSessions]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages.length, typing]);

  const updateActive = (fn: (s: Session) => Session) => {
    setSessions((arr) => arr.map((s) => (s.id === activeId ? fn(s) : s)));
  };

  const makeTitle = (firstMsg: string) => firstMsg.trim().slice(0, 40) || "שיחה חדשה";

  const send = async (textOverride?: string) => {
    const q = (textOverride ?? input).trim();
    if (!q || !active || typing) return;

    const userMsg: Msg = { role: "user", text: q };
    const isFirst = active.messages.length === 0;
    const history = active.messages;
    const chatMode = active.mode;

    updateActive((s) => ({
      ...s,
      title: isFirst ? makeTitle(q) : s.title,
      messages: [...s.messages, userMsg],
    }));
    setInput("");
    setTyping(true);

    const apiMessages = [
      ...history.map((m) => ({
        role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
        content: m.text,
      })),
      { role: "user" as const, content: q },
    ];

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let streamed = "";
    let appended = false;

    const appendDelta = (delta: string) => {
      streamed += delta;
      const snapshot = streamed;
      if (!appended) {
        appended = true;
        setTyping(false);
        updateActive((s) => ({
          ...s,
          messages: [...s.messages, { role: "ai", text: snapshot, model }],
        }));
      } else {
        updateActive((s) => {
          const arr = [...s.messages];
          const last = arr[arr.length - 1];
          if (last && last.role === "ai") {
            arr[arr.length - 1] = { ...last, text: snapshot };
          }
          return { ...s, messages: arr };
        });
      }
    };

    const showError = (text: string) => {
      if (appended) {
        updateActive((s) => {
          const arr = [...s.messages];
          const last = arr[arr.length - 1];
          if (last && last.role === "ai") {
            arr[arr.length - 1] = { ...last, text: `${last.text}\n\n⚠️ ${text}` };
          }
          return { ...s, messages: arr };
        });
      } else {
        updateActive((s) => ({
          ...s,
          messages: [...s.messages, { role: "ai", text: `⚠️ ${text}`, model }],
        }));
      }
    };

    try {
      const selectedModel = MODELS.find((m) => m.id === model);
      const endpoint = selectedModel?.endpoint === "claude" ? "/api/claude" : "/api/chat";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          model,
          mode: chatMode,
          // General-tab budget context works across both OpenRouter and
          // Claude-direct; send it whenever we have it.
          context: budgetContext ?? undefined,
        }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const raw = await response.text().catch(() => "");
        let detail = raw;
        try {
          const parsed = JSON.parse(raw) as { error?: string; message?: string };
          detail = parsed.error || parsed.message || raw;
        } catch { /* keep raw */ }
        throw new Error(`שרת הצ'אט החזיר שגיאה (${response.status}). ${detail}`);
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
        for (const raw of lines) {
          const line = raw.trim();
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const json = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const delta = json.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta.length > 0) appendDelta(delta);
          } catch {
            /* ignore partial JSON */
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "שגיאה לא ידועה";
      showError(msg);
    } finally {
      setTyping(false);
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  useEffect(() => () => abortRef.current?.abort(), []);

  // Keep the selected model compatible with the active tab. When the user
  // switches tabs, if the current model isn't offered in that tab, pick a
  // sensible default (first model in the tab's Claude / auto group).
  useEffect(() => {
    if (!active) return;
    const mode: ChatMode = active.mode;
    const valid = MODELS.find((m) => m.id === model && m.modes.includes(mode));
    if (valid) return;
    const fallback = MODELS.find((m) => m.modes.includes(mode));
    if (fallback) setModel(fallback.id);
  }, [active, model]);

  const startVoice = () => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognition;
      webkitSpeechRecognition?: new () => SpeechRecognition;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      alert("הדפדפן לא תומך בהקלטה קולית");
      return;
    }
    const rec = new SR();
    rec.lang = "he-IL";
    rec.interimResults = false;
    rec.continuous = false;
    setListening(true);
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const text = e.results[0][0].transcript;
      setInput((cur) => (cur ? cur + " " + text : text));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
  };

  const newChat = () => {
    const s = initialSession(activeTab);
    setSessions((arr) => [s, ...arr]);
    setActiveId(s.id);
  };

  const deleteSession = (id: string) => {
    setSessions((arr) => {
      const next = arr.filter((s) => s.id !== id);
      if (id === activeId) {
        const sameTab = next.filter((s) => s.mode === activeTab);
        setActiveId(sameTab[0]?.id ?? "");
      }
      return next;
    });
  };

  const commitRename = (id: string) => {
    const clean = renameDraft.trim();
    if (!clean) { setRenamingId(null); return; }
    setSessions((arr) => arr.map((s) => (s.id === id ? { ...s, title: clean } : s)));
    setRenamingId(null);
  };

  const QUICK = activeTab === "code" ? QUICK_CODE : QUICK_GENERAL;
  const currentModel = MODELS.find((m) => m.id === model) || MODELS[0];

  return (
    <AppShell bare>
      <div className="chat-page-root">
        {/* Sidebar */}
        {sidebarOpen && <div className="chat-sidebar-backdrop" onClick={closeSidebar} aria-hidden />}
        <aside className="chat-sidebar" data-open={sidebarOpen ? "true" : "false"}>
          <button
            type="button"
            className="chat-new-btn"
            onClick={() => { newChat(); closeSidebar(); }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>{activeTab === "code" ? "שיחת קוד חדשה" : activeTab === "claude" ? "שיחה חדשה עם Claude" : "שיחה חדשה"}</span>
          </button>

          <div className="chat-sidebar-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              value={sidebarQuery}
              onChange={(e) => setSidebarQuery(e.target.value)}
              placeholder="חיפוש בשיחות…"
              aria-label="חיפוש"
            />
          </div>

          <div className="chat-sidebar-tabs" role="tablist" aria-label="סוג שיחה">
            <button
              className="chat-sidebar-tab"
              role="tab"
              aria-selected={activeTab === "general"}
              onClick={() => { setActiveTab("general"); closeSidebar(); }}
            >
              שיחות
              <span className="chat-sidebar-tab-count">
                {sessions.filter((s) => s.mode === "general").length}
              </span>
            </button>
            <button
              className="chat-sidebar-tab"
              role="tab"
              aria-selected={activeTab === "code"}
              onClick={() => { setActiveTab("code"); closeSidebar(); }}
            >
              קוד
              <span className="chat-sidebar-tab-count">
                {sessions.filter((s) => s.mode === "code").length}
              </span>
            </button>
            <button
              className="chat-sidebar-tab chat-sidebar-tab-claude"
              role="tab"
              aria-selected={activeTab === "claude"}
              onClick={() => { setActiveTab("claude"); closeSidebar(); }}
              title="שיחה ישירה עם Claude דרך חשבון Anthropic"
            >
              Claude
              <span className="chat-sidebar-tab-count">
                {sessions.filter((s) => s.mode === "claude").length}
              </span>
            </button>
          </div>

          <div className="chat-sidebar-list">
            {(() => {
              const q = sidebarQuery.trim().toLowerCase();
              const filtered = q
                ? visibleSessions.filter((s) => s.title.toLowerCase().includes(q))
                : visibleSessions;
              const sorted = [...filtered].sort((a, b) => b.createdAt - a.createdAt);
              if (sorted.length === 0) {
                return (
                  <div className="chat-sidebar-empty">
                    {q ? "לא נמצאו שיחות" : activeTab === "code" ? "אין שיחות קוד" : "אין שיחות"}
                  </div>
                );
              }
              return groupSessionsByDate(sorted).map((group) => (
                <div key={group.label} className="chat-sidebar-group">
                  <div className="chat-sidebar-group-label">{group.label}</div>
                  {group.items.map((s) => {
                    const isActive = s.id === activeId;
                    const isRenaming = renamingId === s.id;
                    return (
                      <div key={s.id} className={`chat-sidebar-row ${isActive ? "is-active" : ""}`}>
                        {isRenaming ? (
                          <input
                            className="chat-sidebar-rename-input"
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRename(s.id);
                              else if (e.key === "Escape") setRenamingId(null);
                            }}
                            onBlur={() => commitRename(s.id)}
                            autoFocus
                            aria-label="שם חדש לשיחה"
                          />
                        ) : (
                          <button
                            className="chat-sidebar-row-main"
                            aria-current={isActive ? "true" : undefined}
                            onClick={() => { setActiveId(s.id); closeSidebar(); }}
                          >
                            <span className="chat-sidebar-row-title">{s.title}</span>
                          </button>
                        )}
                        {!isRenaming && (
                          <div className="chat-sidebar-row-actions">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenameDraft(s.title);
                                setRenamingId(s.id);
                              }}
                              aria-label="שנה שם"
                              title="שנה שם"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                              aria-label="מחק שיחה"
                              title="מחק"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ));
            })()}
          </div>
        </aside>

        {/* Main */}
        <section className="chat-main">
          {/* Header */}
          <div
            className="flex items-center gap-3 chat-page-header"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <button
              type="button"
              className="chat-sidebar-toggle"
              onClick={() => setSidebarOpen((o) => !o)}
              aria-label="פתח רשימת שיחות"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "#F5F6FF",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontFamily: "inherit",
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="flex items-center flex-1 min-w-0" style={{ gap: 8 }}>
              <span className="holo-logo" style={{ width: 22, height: 22, flexShrink: 0 }} />
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--oslife-text-strong)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {active?.title || "שיחה"}
              </span>
              {active?.mode === "general" && contextEnabled && (
                <span
                  style={{
                    fontSize: 10,
                    color: "#34D399",
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "rgba(52,211,153,0.10)",
                    border: "1px solid rgba(52,211,153,0.22)",
                    flexShrink: 0,
                  }}
                  title="נתוני התקציב זמינים לצ'אט"
                >
                  תקציב
                </span>
              )}
              {active?.mode === "general" && contextHasError && (
                <span
                  style={{ fontSize: 11, color: "#FB7185", flexShrink: 0 }}
                  title={budgetQuery.error ?? undefined}
                  aria-label="שגיאה בסנכרון התקציב"
                >
                  ⚠️
                </span>
              )}
            </div>

            <ThemeToggle compact />
            <div style={{ position: "relative" }}>
              <button className="chat-model-pill" onClick={() => setModelOpen((o) => !o)}>
                {currentModel.label} ▾
              </button>
              {modelOpen && (
                <div
                  style={{
                    position: "absolute",
                    insetInlineEnd: 0,
                    top: "calc(100% + 6px)",
                    zIndex: 20,
                    minWidth: 260,
                    maxHeight: "min(70vh, 520px)",
                    overflowY: "auto",
                    background: "rgba(18, 20, 44, 0.95)",
                    backdropFilter: "blur(24px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 14,
                    padding: 4,
                    boxShadow: "0 20px 40px -24px rgba(0,0,0,0.7)",
                  }}
                >
                  {MODEL_GROUP_ORDER.map((groupName) => {
                    const currentMode: ChatMode =
                      active?.mode === "code" ? "code"
                      : active?.mode === "claude" ? "claude"
                      : "general";
                    const groupModels = MODELS.filter(
                      (m) => m.group === groupName && m.modes.includes(currentMode),
                    );
                    if (groupModels.length === 0) return null;
                    return (
                      <div key={groupName}>
                        <div
                          style={{
                            padding: "8px 12px 4px",
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color: "#6B7094",
                          }}
                        >
                          {groupName}
                        </div>
                        {groupModels.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => {
                              setModel(m.id);
                              setModelOpen(false);
                            }}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-start",
                              gap: 2,
                              padding: "8px 12px",
                              borderRadius: 10,
                              background: m.id === model ? "rgba(167,139,250,0.12)" : "transparent",
                              border: "none",
                              color: m.id === model ? "#F5F6FF" : "#B4B8D4",
                              fontSize: 13,
                              fontWeight: 500,
                              width: "100%",
                              textAlign: "start",
                              cursor: "pointer",
                            }}
                          >
                            <span>{m.label}</span>
                            <span style={{ fontSize: 10, color: "#6B7094" }}>{m.tier}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {active && active.messages.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center text-center"
                style={{ flex: 1, padding: "48px 16px", gap: 12 }}
              >
                <span className="holo-logo" style={{ width: 44, height: 44 }} />
                <h3 style={{ fontSize: 22, fontWeight: 700, marginTop: 8, color: "#F5F6FF" }}>
                  {active.mode === "code"
                    ? "עוזר קוד"
                    : active.mode === "claude"
                      ? "Claude"
                      : "מה בראש שלך?"}
                </h3>
                <p style={{ fontSize: 13, color: "#B4B8D4", maxWidth: 380 }}>
                  {active.mode === "code"
                    ? "שאל שאלות על Next.js, TypeScript, הפרויקט שלך. תקבל קוד, הסברים, ודיבאג."
                    : active.mode === "claude"
                      ? "שיחה ישירה עם Claude דרך חשבון Anthropic שלך. Opus, Sonnet, Haiku — ללא מתווכים."
                      : "עוזר שמכיר את הלוז, התקציב, היעדים וההשקעות שלך. שאל מה שבא לך."}
                </p>
                <div className="chat-quick-replies" style={{ padding: 0, marginTop: 14, justifyContent: "center" }}>
                  {QUICK.map((q) => (
                    <button key={q} className="chat-quick-chip" onClick={() => send(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {active?.messages.map((m, i) => (
                  <div key={i} className={`chat-msg chat-msg-${m.role}`}>
                    {m.role === "ai" && m.model && (
                      <span className="chat-model-badge">
                        {MODELS.find((x) => x.id === m.model)?.label || m.model}
                      </span>
                    )}
                    <div className="chat-bubble">
                      {m.role === "ai" ? (
                        <ReactMarkdown>{m.text}</ReactMarkdown>
                      ) : (
                        m.text.split("\n").map((line, j) => <p key={j}>{line || "\u00A0"}</p>)
                      )}
                    </div>
                  </div>
                ))}
                {typing && (
                  <div className="chat-msg chat-msg-ai">
                    <div className="chat-bubble chat-typing">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="chat-input-row">
            <button
              className="chat-icon-btn"
              aria-label="הקלטה קולית (עברית)"
              onClick={startVoice}
              style={listening ? { color: "#FB7185", borderColor: "rgba(251,113,133,0.4)" } : undefined}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
              </svg>
            </button>
            <input
              className="chat-input"
              placeholder={typing ? "כותב תשובה..." : active?.mode === "code" ? "שאל על קוד..." : "כתוב הודעה..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              dir="rtl"
              disabled={typing}
            />
            <button
              className="chat-send-btn"
              onClick={() => send()}
              disabled={!input.trim() || typing}
              aria-label="שלח"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
};

type SessionGroup = { label: string; items: Session[] };
function groupSessionsByDate(sessions: Session[]): SessionGroup[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const msPerDay = 24 * 60 * 60 * 1000;
  const startOfYesterday = startOfToday - msPerDay;
  const sevenDaysAgo = startOfToday - 7 * msPerDay;
  const thirtyDaysAgo = startOfToday - 30 * msPerDay;

  const buckets: Record<string, Session[]> = {
    today: [],
    yesterday: [],
    sevenDays: [],
    thirtyDays: [],
    older: [],
  };
  for (const s of sessions) {
    const t = s.createdAt;
    if (t >= startOfToday) buckets.today.push(s);
    else if (t >= startOfYesterday) buckets.yesterday.push(s);
    else if (t >= sevenDaysAgo) buckets.sevenDays.push(s);
    else if (t >= thirtyDaysAgo) buckets.thirtyDays.push(s);
    else buckets.older.push(s);
  }
  const order: SessionGroup[] = [
    { label: "היום", items: buckets.today },
    { label: "אתמול", items: buckets.yesterday },
    { label: "7 הימים האחרונים", items: buckets.sevenDays },
    { label: "30 הימים האחרונים", items: buckets.thirtyDays },
    { label: "ישן יותר", items: buckets.older },
  ];
  return order.filter((g) => g.items.length > 0);
}

export default Chat;
