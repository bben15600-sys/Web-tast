import { useCallback, useEffect, useState } from "react";

export type KitchenTimer = {
  id: string;
  label: string;
  durationSec: number;
  /** Wall-clock ms at which the timer will fire. Null when paused. */
  endsAt: number | null;
  /** Remaining seconds when paused. */
  remainingSec: number;
  state: "running" | "paused" | "done";
  createdAt: number;
};

type Listener = () => void;

// A tiny module-scoped store so every page/component in /kitchen shares
// the same timer set without prop-drilling or wiring React Context.
const state = {
  timers: [] as KitchenTimer[],
  listeners: new Set<Listener>(),
};

const subscribe = (l: Listener) => {
  state.listeners.add(l);
  return () => state.listeners.delete(l);
};
const emit = () => state.listeners.forEach((l) => l());

const beep = () => {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.0001;
    const t = ctx.currentTime;
    // Quick attack, decay, three beeps.
    for (let i = 0; i < 3; i++) {
      const start = t + i * 0.28;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
    }
    o.start(t);
    o.stop(t + 3 * 0.28 + 0.1);
  } catch { /* no audio context — silent fallback */ }
  try {
    if ("vibrate" in navigator) navigator.vibrate([200, 100, 200, 100, 200]);
  } catch { /* noop */ }
};

const tickIntervalId = (() => {
  if (typeof window === "undefined") return 0;
  return window.setInterval(() => {
    const now = Date.now();
    let changed = false;
    for (const t of state.timers) {
      if (t.state === "running" && t.endsAt != null && now >= t.endsAt) {
        t.state = "done";
        t.endsAt = null;
        t.remainingSec = 0;
        changed = true;
        beep();
      }
    }
    if (changed) emit();
    // Always re-emit once a second so UI can re-render the countdown.
    emit();
  }, 1000);
})();
// Never actually tear this down — timers live for the life of the tab.
void tickIntervalId;

export function useKitchenTimers() {
  const [, force] = useState({});
  useEffect(() => subscribe(() => force({})), []);

  const add = useCallback((label: string, durationSec: number) => {
    const id = `tmr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    state.timers.push({
      id,
      label: label.trim() || "טיימר",
      durationSec,
      endsAt: Date.now() + durationSec * 1000,
      remainingSec: durationSec,
      state: "running",
      createdAt: Date.now(),
    });
    emit();
    return id;
  }, []);

  const pause = useCallback((id: string) => {
    const t = state.timers.find((x) => x.id === id);
    if (!t || t.state !== "running" || t.endsAt == null) return;
    t.remainingSec = Math.max(0, Math.ceil((t.endsAt - Date.now()) / 1000));
    t.endsAt = null;
    t.state = "paused";
    emit();
  }, []);

  const resume = useCallback((id: string) => {
    const t = state.timers.find((x) => x.id === id);
    if (!t || t.state !== "paused") return;
    t.endsAt = Date.now() + t.remainingSec * 1000;
    t.state = "running";
    emit();
  }, []);

  const remove = useCallback((id: string) => {
    state.timers = state.timers.filter((x) => x.id !== id);
    emit();
  }, []);

  const reset = useCallback((id: string) => {
    const t = state.timers.find((x) => x.id === id);
    if (!t) return;
    t.endsAt = Date.now() + t.durationSec * 1000;
    t.remainingSec = t.durationSec;
    t.state = "running";
    emit();
  }, []);

  const clearAll = useCallback(() => {
    state.timers = [];
    emit();
  }, []);

  const timersWithLive = state.timers.map((t) => {
    if (t.state === "running" && t.endsAt != null) {
      return { ...t, remainingSec: Math.max(0, Math.ceil((t.endsAt - Date.now()) / 1000)) };
    }
    return { ...t };
  });

  return {
    timers: timersWithLive,
    add,
    pause,
    resume,
    remove,
    reset,
    clearAll,
  };
}
