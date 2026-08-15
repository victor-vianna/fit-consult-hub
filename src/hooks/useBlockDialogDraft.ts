import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearInterfaceMemory,
  hasMeaningfulValue,
  readInterfaceMemory,
  writeInterfaceMemory,
} from "@/utils/interfaceMemory";

/**
 * Persistência leve de rascunho para o WorkoutBlockDialog.
 * Guarda em localStorage com status em andamento; ignora edição (apenas novos blocos).
 */
export function useBlockDialogDraft<T extends Record<string, unknown>>(params: {
  scopeKey: string;
  open: boolean;
  isEditing: boolean;
  collect: () => T;
  apply: (draft: T) => void;
  hasContent?: (draft: T) => boolean;
  autoRestore?: boolean;
}) {
  const {
    scopeKey,
    open,
    isEditing,
    collect,
    apply,
    hasContent = defaultDraftHasContent,
    autoRestore = true,
  } = params;
  const version = BLOCK_DIALOG_DRAFT_VERSION;
  const [draftAvailable, setDraftAvailable] = useState(false);
  const collectRef = useRef(collect);
  const applyRef = useRef(apply);
  const hasContentRef = useRef(hasContent);
  collectRef.current = collect;
  applyRef.current = apply;
  hasContentRef.current = hasContent;

  // Detecta/restaura rascunho ao abrir (apenas em criacao)
  useEffect(() => {
    if (!open || isEditing) {
      setDraftAvailable(false);
      return;
    }

    const draft = readInterfaceMemory<T>({
      scope: getBlockDialogDraftScope(scopeKey),
      version,
      ttlMs: BLOCK_DIALOG_DRAFT_TTL_MS,
      hasContent: hasContentRef.current,
    });

    if (draft && autoRestore) {
      applyRef.current(draft.data);
      setDraftAvailable(false);
      return;
    }

    setDraftAvailable(Boolean(draft));
  }, [open, isEditing, scopeKey, version, autoRestore]);

  // Auto-save com debounce enquanto o dialog esta aberto e nao estamos editando
  useEffect(() => {
    if (!open || isEditing) return;
    const interval = setInterval(() => {
      const snapshot = collectRef.current();
      writeInterfaceMemory({
        scope: getBlockDialogDraftScope(scopeKey),
        version,
        data: snapshot,
        open: true,
        hasContent: hasContentRef.current,
      });
    }, 800);
    return () => clearInterval(interval);
  }, [open, isEditing, scopeKey, version]);

  const restore = useCallback(() => {
    const draft = readInterfaceMemory<T>({
      scope: getBlockDialogDraftScope(scopeKey),
      version,
      ttlMs: BLOCK_DIALOG_DRAFT_TTL_MS,
      hasContent: hasContentRef.current,
    });
    if (!draft) return;
    applyRef.current(draft.data);
    setDraftAvailable(false);
  }, [scopeKey, version]);

  const clear = useCallback(() => {
    clearInterfaceMemory({ scope: getBlockDialogDraftScope(scopeKey), version });
    setDraftAvailable(false);
  }, [scopeKey, version]);

  return { draftAvailable, restore, clear };
}

const BLOCK_DIALOG_DRAFT_VERSION = 2;
const BLOCK_DIALOG_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function getBlockDialogDraftScope(scopeKey: string) {
  return `workout:block-dialog:${scopeKey}`;
}

export function hasBlockDialogDraft<T extends Record<string, unknown>>(
  scopeKey: string,
  hasContent: (draft: T) => boolean = defaultDraftHasContent
) {
  return Boolean(
    readInterfaceMemory<T>({
      scope: getBlockDialogDraftScope(scopeKey),
      version: BLOCK_DIALOG_DRAFT_VERSION,
      ttlMs: BLOCK_DIALOG_DRAFT_TTL_MS,
      hasContent,
    })
  );
}

function defaultDraftHasContent<T extends Record<string, unknown>>(draft: T) {
  return Object.values(draft).some(hasMeaningfulValue);
}
