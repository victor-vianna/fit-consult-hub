import { buildChatConversationKey } from "@/utils/chat";

export const FEEDBACK_REPLY_CONTEXT_EVENT = "fit-consult:feedback-reply-context";

const FEEDBACK_REPLY_STORAGE_PREFIX = "fit-consult-hub:feedback-reply";
const MAX_PREVIEW_LENGTH = 180;
const MAX_CONTEXT_AGE_MS = 1000 * 60 * 60 * 24 * 7;

export type FeedbackReplySourceType = "weekly_feedback" | "workout_feedback";

export interface FeedbackReplyContext {
  id: string;
  personalId: string;
  alunoId: string;
  senderId: string;
  sourceType: FeedbackReplySourceType;
  sourceId: string;
  authorName: string;
  title: string;
  preview: string;
  createdAt?: string | null;
  queuedAt?: string;
}

function getStorageKey(personalId: string, alunoId: string, senderId: string) {
  return `${FEEDBACK_REPLY_STORAGE_PREFIX}:${senderId}:${buildChatConversationKey(personalId, alunoId)}`;
}

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeFeedbackReplyPreview(
  value: string | null | undefined,
  fallback = "Feedback enviado pelo aluno"
) {
  const compacted = compactText(String(value || ""));
  const preview = compacted || fallback;
  return preview.length > MAX_PREVIEW_LENGTH
    ? `${preview.slice(0, MAX_PREVIEW_LENGTH - 1).trimEnd()}...`
    : preview;
}

export function queueFeedbackReplyContext(context: FeedbackReplyContext) {
  if (typeof window === "undefined") return;

  const contextWithTimestamp = {
    ...context,
    queuedAt: context.queuedAt || new Date().toISOString(),
    preview: normalizeFeedbackReplyPreview(context.preview),
  };

  try {
    window.localStorage.setItem(
      getStorageKey(context.personalId, context.alunoId, context.senderId),
      JSON.stringify(contextWithTimestamp)
    );
  } catch {
    // Cache best-effort para manter o contexto de resposta ao trocar de tela.
  }

  window.dispatchEvent(
    new CustomEvent<FeedbackReplyContext>(FEEDBACK_REPLY_CONTEXT_EVENT, {
      detail: contextWithTimestamp,
    })
  );
}

export function readFeedbackReplyContext(
  personalId: string,
  alunoId: string,
  senderId: string
): FeedbackReplyContext | null {
  if (typeof window === "undefined") return null;

  const key = getStorageKey(personalId, alunoId, senderId);

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as FeedbackReplyContext;
    if (
      !parsed ||
      parsed.personalId !== personalId ||
      parsed.alunoId !== alunoId ||
      parsed.senderId !== senderId ||
      !parsed.sourceId ||
      !parsed.preview
    ) {
      window.localStorage.removeItem(key);
      return null;
    }

    if (parsed.queuedAt) {
      const queuedAt = new Date(parsed.queuedAt).getTime();
      if (Number.isFinite(queuedAt) && Date.now() - queuedAt > MAX_CONTEXT_AGE_MS) {
        window.localStorage.removeItem(key);
        return null;
      }
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

export function clearFeedbackReplyContext(personalId: string, alunoId: string, senderId: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(getStorageKey(personalId, alunoId, senderId));
  } catch {
    // best-effort
  }
}

export function buildFeedbackReplyMessage(context: FeedbackReplyContext, message: string) {
  const title = normalizeFeedbackReplyPreview(
    `${context.title} - ${context.authorName}`,
    context.title
  );
  const preview = normalizeFeedbackReplyPreview(context.preview);
  const quote = [title, preview]
    .filter(Boolean)
    .flatMap((line) => line.split("\n"))
    .map((line) => `> ${line}`)
    .join("\n");

  return `${quote}\n\n${message.trim()}`;
}
