import { useCallback, useEffect, useState } from "react";

const PIN_HASH_KEY = "oslife.auth.pinHash.v1";
const UNLOCKED_UNTIL_KEY = "oslife.auth.unlockedUntil.v1";
const IDLE_TIMEOUT_MS = 10 * 60 * 1000;

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type PinState =
  | { status: "loading" }
  | { status: "setup" }
  | { status: "locked" }
  | { status: "unlocked" };

export function usePin() {
  const [state, setState] = useState<PinState>({ status: "loading" });

  useEffect(() => {
    const storedHash = localStorage.getItem(PIN_HASH_KEY);
    if (!storedHash) {
      setState({ status: "setup" });
      return;
    }
    const untilRaw = sessionStorage.getItem(UNLOCKED_UNTIL_KEY);
    const until = untilRaw ? Number(untilRaw) : 0;
    if (until > Date.now()) {
      setState({ status: "unlocked" });
    } else {
      sessionStorage.removeItem(UNLOCKED_UNTIL_KEY);
      setState({ status: "locked" });
    }
  }, []);

  useEffect(() => {
    if (state.status !== "unlocked") return;
    const bump = () => {
      sessionStorage.setItem(UNLOCKED_UNTIL_KEY, String(Date.now() + IDLE_TIMEOUT_MS));
    };
    bump();
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const tick = window.setInterval(() => {
      const untilRaw = sessionStorage.getItem(UNLOCKED_UNTIL_KEY);
      if (!untilRaw || Number(untilRaw) <= Date.now()) {
        sessionStorage.removeItem(UNLOCKED_UNTIL_KEY);
        setState({ status: "locked" });
      }
    }, 15_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      window.clearInterval(tick);
    };
  }, [state.status]);

  const setPin = useCallback(async (pin: string) => {
    const hash = await sha256(pin);
    localStorage.setItem(PIN_HASH_KEY, hash);
    sessionStorage.setItem(UNLOCKED_UNTIL_KEY, String(Date.now() + IDLE_TIMEOUT_MS));
    setState({ status: "unlocked" });
  }, []);

  const tryUnlock = useCallback(async (pin: string): Promise<boolean> => {
    const stored = localStorage.getItem(PIN_HASH_KEY);
    if (!stored) return false;
    const hash = await sha256(pin);
    if (hash !== stored) return false;
    sessionStorage.setItem(UNLOCKED_UNTIL_KEY, String(Date.now() + IDLE_TIMEOUT_MS));
    setState({ status: "unlocked" });
    return true;
  }, []);

  const lock = useCallback(() => {
    sessionStorage.removeItem(UNLOCKED_UNTIL_KEY);
    setState({ status: "locked" });
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(PIN_HASH_KEY);
    sessionStorage.removeItem(UNLOCKED_UNTIL_KEY);
    setState({ status: "setup" });
  }, []);

  return { state, setPin, tryUnlock, lock, reset };
}
