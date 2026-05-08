import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Persistência leve de rascunho para o WorkoutBlockDialog.
 * Guarda em sessionStorage por personalId; ignora edição (apenas novos blocos).
 */
export function useBlockDialogDraft<T extends Record<string, unknown>>(params: {
  scopeKey: string;
  open: boolean;
  isEditing: boolean;
  collect: () => T;
  apply: (draft: T) => void;
}) {
  const { scopeKey, open, isEditing, collect, apply } = params;
  const storageKey = `pf:block-draft:${scopeKey}:v1`;
  const [draftAvailable, setDraftAvailable] = useState(false);
  const collectRef = useRef(collect);
  const applyRef = useRef(apply);
  collectRef.current = collect;
  applyRef.current = apply;

  // Detecta rascunho ao abrir (apenas em criação)
  useEffect(() => {
    if (!open || isEditing) {
      setDraftAvailable(false);
      return;
    }
    try {
      const raw = sessionStorage.getItem(storageKey);
      setDraftAvailable(!!raw);
    } catch {
      setDraftAvailable(false);
    }
  }, [open, isEditing, storageKey]);

  // Auto-save com debounce enquanto o dialog está aberto e não estamos editando
  useEffect(() => {
    if (!open || isEditing) return;
    const interval = setInterval(() => {
      try {
        const snapshot = collectRef.current();
        sessionStorage.setItem(storageKey, JSON.stringify(snapshot));
      } catch {
        // quota / serialização — ignora
      }
    }, 800);
    return () => clearInterval(interval);
  }, [open, isEditing, storageKey]);

  const restore = useCallback(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as T;
      applyRef.current(parsed);
      setDraftAvailable(false);
    } catch {
      // ignora
    }
  }, [storageKey]);

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // ignora
    }
    setDraftAvailable(false);
  }, [storageKey]);

  return { draftAvailable, restore, clear };
}
