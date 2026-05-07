import { useCallback, useEffect, useRef, useState } from "react";

type Storage = "local" | "session";

/**
 * Estado React persistido em localStorage/sessionStorage.
 * - SSR-safe (usa lazy init).
 * - Sincroniza entre abas (storage event) quando local.
 * - Aceita versão para invalidar shapes antigos.
 */
export function usePersistedState<T>(
  key: string,
  initial: T | (() => T),
  options: { storage?: Storage; version?: number } = {}
) {
  const { storage = "local", version = 1 } = options;
  const storageObj = typeof window === "undefined"
    ? null
    : storage === "local" ? window.localStorage : window.sessionStorage;

  const fullKey = `pf:${key}:v${version}`;

  const read = useCallback((): T => {
    if (!storageObj) return typeof initial === "function" ? (initial as () => T)() : initial;
    try {
      const raw = storageObj.getItem(fullKey);
      if (raw == null) return typeof initial === "function" ? (initial as () => T)() : initial;
      return JSON.parse(raw) as T;
    } catch {
      return typeof initial === "function" ? (initial as () => T)() : initial;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullKey]);

  const [value, setValue] = useState<T>(read);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!storageObj) return;
    try {
      storageObj.setItem(fullKey, JSON.stringify(value));
    } catch {
      // quota / serialization — ignore
    }
  }, [fullKey, value, storageObj]);

  // Sync between tabs (only for localStorage)
  useEffect(() => {
    if (storage !== "local" || typeof window === "undefined") return;
    const handler = (e: StorageEvent) => {
      if (e.key !== fullKey || e.newValue == null) return;
      try {
        const parsed = JSON.parse(e.newValue) as T;
        setValue(parsed);
      } catch {
        // ignore
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [fullKey, storage]);

  const clear = useCallback(() => {
    storageObj?.removeItem(fullKey);
  }, [fullKey, storageObj]);

  return [value, setValue, clear] as const;
}
